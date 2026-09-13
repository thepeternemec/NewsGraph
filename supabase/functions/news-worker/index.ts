import { SEED_BEATS } from "../_shared/contracts/index.ts";
import { createSupabaseClient } from "../_shared/db/index.ts";
import { NewsApiClient, toProviderDate } from "../_shared/worker/newsapi.ts";
import { persistNews } from "../_shared/worker/ingest-news.ts";
// The initial production catalog refreshes three pilot topics. Expand only
// after checking source relevance and the provider's request allowance.
const PILOT = ["b_bb964843350e", "b_191edd8895e2", "b_dab9c000dca5"];
Deno.serve(async (req) => {
    const respond = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
    if (req.method !== "POST")
        return respond({ error: "method_not_allowed" }, 405);
    const db = createSupabaseClient();
    if (!db)
        return respond({ error: "database_unavailable" }, 503);
    const token = req.headers.get("x-pleiades-worker-key") ?? "";
    if (!token)
        return respond({ error: "unauthorized" }, 401);
    const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token))), b => b.toString(16).padStart(2, "0")).join("");
    const { data: authorized, error: authError } = await db.from("news_worker_keys").select("token_hash").eq("token_hash", digest).maybeSingle();
    if (authError || !authorized)
        return respond({ error: "unauthorized" }, 401);
    const apiKey = Deno.env.get("NEWSAPI_API_KEY");
    if (!apiKey)
        return respond({ error: "provider_not_configured" }, 503);
    const ids = (Deno.env.get("PLEIADES_PILOT_BEATS") ?? PILOT.join(",")).split(",");
    const beats = SEED_BEATS.filter(beat => ids.includes(beat.beat_id));
    const client = new NewsApiClient(apiKey);
    const now = new Date();
    const summaries = [];
    for (const beat of beats) {
        try {
            // Window starts at the last successful check with a one-day overlap.
            // Failed or incomplete fetches do not advance successful freshness.
            const { data: state } = await db.from("news_ingestion_status").select("last_success_at").eq("beat_id", beat.beat_id).maybeSingle();
            const start = new Date(Math.max(now.getTime() - 30 * 86400000, (state?.last_success_at ? Date.parse(state.last_success_at) : now.getTime()) - 86400000));
            const articles = [];
            let complete = false;
            for (let page = 1; page <= 5; page++) {
                // NVIDIA's broad concept feed exceeds the pilot allowance.
                // Require a headline mention for this topic instead of marking
                // an incomplete broad search as successfully refreshed.
                const nvidia = beat.beat_id === "b_bb964843350e";
                const batch = await client.getArticles({ apiKey, conceptUri: beat.concept_uris, keyword: nvidia ? ["Nvidia"] : beat.keywords, keywordLoc: nvidia ? "title" : undefined, lang: ["eng"], dateStart: toProviderDate(start), dateEnd: toProviderDate(now), articlesPage: page });
                articles.push(...batch);
                if (batch.length < 100) {
                    complete = true;
                    break;
                }
            }
            if (!complete)
                throw new Error("source_window_exceeds_500_articles");
            const result = await persistNews(beat.beat_id, articles);
            summaries.push({ beat_id: beat.beat_id, ...result });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "ingestion_failed";
            await db.from("news_ingestion_status").upsert({ beat_id: beat.beat_id, last_checked_at: new Date().toISOString(), last_error: message }, { onConflict: "beat_id" });
            summaries.push({ beat_id: beat.beat_id, error: message });
        }
    }
    const ok = beats.length > 0 && summaries.every(s => !("error" in s));
    return respond({ ok, summaries }, ok ? 200 : 502);
});
