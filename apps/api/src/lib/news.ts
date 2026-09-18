import { db as connect, env, hasDatabaseEnv } from "@newsgraph/db";
import { SEED_BEATS, type NewsArticle } from "@newsgraph/contracts";
export class NewsError extends Error {
    constructor(public code: string, message: string, public status = 400) { super(message); }
}
const encoder = new TextEncoder();
const encode = (value: string) => btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const decode = (value: string) => atob(value.replace(/-/g, "+").replace(/_/g, "/"));
async function key() { const secret = env("NEWSGRAPH_CURSOR_SECRET"); if (!secret)
    throw new NewsError("service_unavailable", "News storage is not configured.", 503); return crypto.subtle.importKey("raw", encoder.encode(`newsgraph:news-cursor:v2:${secret}`), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]); }
export async function signCursor(beat: string, seq: string, mode: "changes" | "history" = "changes", now = Date.now()) {
    const payload = encode(JSON.stringify({ v: 2, b: beat, s: seq, m: mode, e: now + 30 * 86400000 }));
    const bytes = new Uint8Array(await crypto.subtle.sign("HMAC", await key(), encoder.encode(payload)));
    return `${payload}.${encode(String.fromCharCode(...bytes))}`;
}
export async function readCursor(cursor: string, beat: string, mode: "changes" | "history", now = Date.now()) {
    try {
        const [payload, signature, extra] = cursor.split(".");
        if (!payload || !signature || extra)
            throw 0;
        const valid = await crypto.subtle.verify("HMAC", await key(), Uint8Array.from(decode(signature), c => c.charCodeAt(0)), encoder.encode(payload));
        if (!valid)
            throw 0;
        const data = JSON.parse(decode(payload));
        if (data.v !== 2 || data.b !== beat || data.m !== mode || !/^\d+$/.test(data.s) || !Number.isFinite(data.e))
            throw 0;
        if (data.e <= now)
            throw new NewsError("cursor_expired", "This cursor expired after 30 days. Read latest news to establish a new baseline.", 410);
        return data.s as string;
    }
    catch (error) {
        if (error instanceof NewsError)
            throw error;
        throw new NewsError("invalid_cursor", "Cursor is invalid or belongs to another topic or operation.");
    }
}
export function db() { if (!hasDatabaseEnv())
    throw new NewsError("service_unavailable", "News storage is not configured.", 503); return connect(); }
export function topicById(id: string) { const topic = SEED_BEATS.find(t => t.beat_id === id); if (!topic)
    throw new NewsError("unknown_topic", "Choose a supported topic from newsgraph_topics.", 404); return topic; }
export function freshness(last: string | null, minutes: number) { return { status: !last ? "unavailable" : Date.now() - Date.parse(last) > minutes * 60000 ? "stale" : "fresh", last_success_at: last }; }
/** Bounds on the catalog page. A default of 100 keeps a naive client honest;
 *  a high ceiling lets one that genuinely needs the whole catalog ask once. */
export const TOPIC_PAGE_DEFAULT = 100;
export const TOPIC_PAGE_MAX = 1000;

export async function topics(query = "", limit = TOPIC_PAGE_DEFAULT, offset = 0) {
    type StatusRow = { beat_id: string; last_success_at: string | null; last_checked_at: string | null };
    type CountRow = { beat_id: string; total: number; recent: number };
    let statusRows: StatusRow[];
    let countRows: CountRow[];
    try {
        // Counts belong on the catalog: `status` says whether a check succeeded,
        // not whether there is anything behind it. Without these a topic with 400
        // stored articles and one with none are indistinguishable.
        [statusRows, countRows] = await Promise.all([
            db()`select beat_id, last_success_at, last_checked_at from news_ingestion_status` as unknown as Promise<StatusRow[]>,
            db()`select beat_id,
                        count(*)::int as total,
                        count(*) filter (where published_at > now() - interval '12 hours')::int as recent
                 from news_articles group by beat_id` as unknown as Promise<CountRow[]>,
        ]);
    }
    catch {
        throw new NewsError("service_unavailable", "News storage is not ready.", 503);
    }
    const terms = query.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(w => w.length >= 2 && !new Set(["the", "and", "news", "about", "latest", "follow", "keep", "with", "what", "changes", "tell"]).has(w));
    const matched = SEED_BEATS.filter(t => !terms.length || terms.some(word => t.label.toLowerCase().includes(word)));
    const page = matched.slice(offset, offset + limit);
    const rows = page.map(t => { const state = statusRows.find(s => s.beat_id === t.beat_id); const counts = countRows.find((c) => c.beat_id === t.beat_id);
        return { beat_id: t.beat_id, label: t.label, ticker: t.ticker,
            article_count: counts?.total ?? 0,
            recent_12h: counts?.recent ?? 0, ...freshness(state?.last_success_at ?? null, t.freshness_slo_minutes), last_checked_at: state?.last_checked_at ?? null }; });
    const consumed = offset + rows.length;
    // `total` is the size of the match, not of the page: a client should be able
    // to report "540 topics" without walking every page to count them.
    return { topics: rows, total: matched.length, limit, offset, has_more: consumed < matched.length,
        next_offset: consumed < matched.length ? consumed : null };
}
export function boundedPage<T>(rows: T[], budget = 1800) { const items: T[] = []; let tokens = 0; for (const row of rows.slice(0, 8)) {
    const size = Math.ceil(new TextEncoder().encode(JSON.stringify(row)).length / 3);
    if (items.length && tokens + size > budget)
        break;
    items.push(row);
    tokens += size;
} return { items, estimated_tokens: tokens, has_more: rows.length > items.length }; }
export async function newsPage(beatId: string, cursor?: string, history = false) {
    topicById(beatId);
    const sql = db();
    const sequence = cursor ? await readCursor(cursor, beatId, history ? "history" : "changes") : null;
    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    // Reading backwards for history, forwards for changes and for the baseline.
    const ascending = !!cursor && !history;
    const direction = ascending ? sql`asc` : sql`desc`;
    const boundary = sequence
        ? history ? sql`and id < ${sequence}::bigint` : sql`and id > ${sequence}::bigint`
        : sql``;
    let data: NewsArticle[];
    let state: { last_success_at: string | null } | undefined;
    try {
        const results = await Promise.all([
            sql`select id::text, beat_id, title, excerpt, url, source, published_at, first_indexed_at
                from news_articles
                where beat_id = ${beatId} and published_at >= ${since}
                ${boundary}
                order by id ${direction}
                limit 9`,
            sql`select last_success_at from news_ingestion_status where beat_id = ${beatId} limit 1`,
        ]);
        data = results[0] as unknown as NewsArticle[];
        state = (results[1] as unknown as Array<{ last_success_at: string | null }>)[0];
    }
    catch {
        throw new NewsError("service_unavailable", "Coverage could not be loaded. Please try again shortly.", 503);
    }
    const rows = (data ?? []).map((row: NewsArticle) => ({ ...row, id: String(row.id) })) as NewsArticle[];
    const bounded = boundedPage(rows);
    const isChange = !!cursor && !history;
    // Initial latest view establishes a baseline at the newest ingested ID. History uses a separate signed cursor.
    const nextSeq = isChange ? bounded.items.at(-1)?.id ?? sequence ?? "0" : rows[0]?.id ?? "0";
    return { ...bounded, cursor: await signCursor(beatId, history ? (bounded.items.at(-1)?.id ?? sequence ?? "0") : nextSeq, history ? "history" : "changes"), history_cursor: await signCursor(beatId, bounded.items.at(-1)?.id ?? sequence ?? "0", "history"), freshness: freshness(state?.last_success_at ?? null, topicById(beatId).freshness_slo_minutes) };
}

/** How many headlines a brief carries. Three is a sentence's worth of news. */
export const BRIEF_ITEMS = 3;

export interface BriefItem {
    lede: string;
    source: string;
    url: string;
    published_at: string;
    first_indexed_at: string;
}

/**
 * Render a brief as text.
 *
 * Pure and exported so the property that matters can be asserted: the output
 * contains every lede verbatim and nothing that was not in the input. The
 * moment someone adds a connective or a conclusion, that test fails — which is
 * the point, because a synthesised brief can be wrong while reading well.
 */
export function renderBrief(label: string, items: BriefItem[]): string {
    if (!items.length) return `${label} — nothing moved.`;
    const lines = items.map((item, i) => `${i + 1}. ${item.lede} (${item.source}, ${item.published_at.slice(11, 16)}Z)`);
    return `${label} — ${items.length} ${items.length === 1 ? "story" : "stories"}\n${lines.join("\n")}`;
}

/**
 * A brief: the top few headlines, verbatim, with who published them and when.
 *
 * Deliberately **not** a summary. Nothing here is rewritten, reordered or
 * inferred — every word is the publisher's lede or a label we added. A brief
 * that paraphrases is a brief that can be wrong while looking authoritative,
 * and the rule in this repo is that we cite rather than summarise.
 *
 * `text` is the same facts concatenated for convenience. It is a rendering, not
 * a synthesis: if you diff it against `items` you will find nothing extra.
 */
export async function brief(beatId: string, cursor?: string, history = false) {
    const topic = topicById(beatId);
    const sql = db();
    const sequence = cursor ? await readCursor(cursor, beatId, history ? "history" : "changes") : null;
    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const ascending = !!cursor && !history;
    const direction = ascending ? sql`asc` : sql`desc`;
    const boundary = sequence
        ? history ? sql`and id < ${sequence}::bigint` : sql`and id > ${sequence}::bigint`
        : sql``;
    let rows: NewsArticle[];
    let state: { last_success_at: string | null } | undefined;
    try {
        const results = await Promise.all([
            sql`select id::text, beat_id, title, excerpt, url, source, published_at, first_indexed_at
                from news_articles
                where beat_id = ${beatId} and published_at >= ${since}
                ${boundary}
                order by id ${direction}
                limit ${BRIEF_ITEMS + 1}`,
            sql`select last_success_at from news_ingestion_status where beat_id = ${beatId} limit 1`,
        ]);
        rows = ((results[0] ?? []) as unknown as NewsArticle[]).slice(0, BRIEF_ITEMS);
        state = (results[1] as unknown as Array<{ last_success_at: string | null }>)[0];
    }
    catch {
        throw new NewsError("service_unavailable", "Coverage could not be loaded. Please try again shortly.", 503);
    }

    const items: BriefItem[] = (rows ?? []).map((row: NewsArticle) => ({
        lede: row.title,
        source: row.source,
        url: row.url,
        published_at: row.published_at,
        // Lead time as a field, so "before the mainstream" stays measurable.
        first_indexed_at: row.first_indexed_at,
    }));
    const isChange = !!cursor && !history;
    const nextSeq = isChange ? (rows.at(-1)?.id ?? sequence ?? "0") : (rows[0]?.id ?? "0");

    return {
        beat_id: beatId,
        ticker: topic.ticker,
        label: topic.label,
        generated_at: new Date().toISOString(),
        ...freshness(state?.last_success_at ?? null, topic.freshness_slo_minutes),
        count: items.length,
        items,
        // Assembled, never written. See the note above.
        text: renderBrief(topic.label, items),
        cursor: await signCursor(beatId, String(nextSeq), "changes"),
        history_cursor: await signCursor(beatId, String(rows.at(-1)?.id ?? sequence ?? "0"), "history"),
    };
}
