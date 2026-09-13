// Local integration harness: real Hono/MCP/SDK code, deterministic PostgREST
// fixture. No production reads, writes, model requests, or network sockets.
import assert from "node:assert/strict";
const beat = "b_bb964843350e";
process.env.SUPABASE_URL = "https://fixture.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "fixture-only-service-key";
process.env.PLEIADES_CURSOR_SECRET = "fixture-only-cursor-secret";
const { default: app } = await import("../apps/api/dist/index.js");
let rows = [];
function article(id, published = new Date().toISOString()) { return { id: String(id), beat_id: beat, title: `Fixture article ${id}`, excerpt: "Integration test content, not real news.", url: `https://example.com/story/${id}`, source: "Fixture publisher", published_at: published, first_indexed_at: new Date().toISOString() }; }
const json = value => new Response(JSON.stringify(value), { headers: { "Content-Type": "application/json" } });
const nativeFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
    const request = input instanceof Request ? input : new Request(input, init);
    const url = new URL(request.url);
    if (url.origin === "http://pleiades.test")
        return app.fetch(request);
    if (url.origin !== "https://fixture.supabase.co")
        throw new Error(`Unexpected external request to ${url.origin}`);
    if (url.pathname.endsWith("/news_ingestion_status")) {
        const state = { beat_id: beat, last_success_at: new Date().toISOString(), last_checked_at: new Date().toISOString() };
        return json(url.searchParams.has("beat_id") ? state : [state]);
    }
    if (url.pathname.endsWith("/news_articles")) {
        let selected = rows.filter(row => row.beat_id === url.searchParams.get("beat_id")?.slice(3));
        const after = url.searchParams.get("id");
        if (after?.startsWith("gt."))
            selected = selected.filter(row => BigInt(row.id) > BigInt(after.slice(3)));
        if (after?.startsWith("lt."))
            selected = selected.filter(row => BigInt(row.id) < BigInt(after.slice(3)));
        selected.sort((a, b) => (BigInt(a.id) > BigInt(b.id) ? 1 : -1) * (url.searchParams.get("order")?.includes("desc") ? -1 : 1));
        return json(selected.slice(0, Number(url.searchParams.get("limit") ?? 9)));
    }
    throw new Error(`Unexpected fixture path ${url.pathname}`);
};
try {
    process.env.PLEIADES_API_BASE_URL = "http://pleiades.test";
    rows = Array.from({ length: 12 }, (_, i) => article(i + 1));
    await import("./verify-integrations.mjs");
    const { PleiadesClient } = await import("../packages/sdk/dist/index.js");
    const client = new PleiadesClient({ baseUrl: "http://pleiades.test" });
    const baseline = await client.news(beat);
    assert.equal(baseline.items[0].id, "12");
    rows.push(...Array.from({ length: 19 }, (_, i) => article(i + 13)));
    // Publication can be old; arrival after the cursor must still be delivered.
    rows.push(article(32, new Date(Date.now() - 2 * 86400000).toISOString()));
    let cursor = baseline.cursor;
    const ids = [];
    for (let page = 0; page < 10; page++) {
        const result = await client.changes(beat, cursor);
        ids.push(...result.items.map(x => x.id));
        cursor = result.cursor;
        if (!result.has_more)
            break;
    }
    assert.deepEqual(ids, Array.from({ length: 20 }, (_, i) => String(i + 13)));
    assert.equal((await client.changes(beat, cursor)).items.length, 0);
    const replay = await client.changes(beat, baseline.cursor);
    assert.equal(replay.items[0].id, "13");
    const initial = await (await fetch(`http://pleiades.test/v2/news?beat_id=${beat}`)).json();
    const history = await (await fetch(`http://pleiades.test/v2/news?beat_id=${beat}&before=${encodeURIComponent(initial.history_cursor)}`)).json();
    assert(BigInt(history.items[0].id) < BigInt(initial.items.at(-1).id));
    const misuse = await fetch(`http://pleiades.test/v2/changes?beat_id=${beat}&cursor=${encodeURIComponent(initial.history_cursor)}`);
    assert.equal(misuse.status, 400);
    console.log("PASS reliable changes: 20 intervening articles, multiple pages, late arrival, retry replay, empty update, and separate history cursor");
    const failed = await fetch("http://pleiades.test/v2/news?beat_id=nonexistent");
    assert.equal(failed.status, 404);
    console.log("Local fixture verification complete. Production data and deployment remain unverified.");
}
finally {
    globalThis.fetch = nativeFetch;
}
