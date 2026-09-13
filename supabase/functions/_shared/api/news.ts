// GENERATED FILE — do not edit directly.
// Source of truth: packages/contracts + apps/{api,worker}/src.
// Regenerate with: npm run sync:supabase

import { createSupabaseClient, env } from "../db/index.ts";
import { SEED_BEATS, type NewsArticle } from "../contracts/index.ts";
export class NewsError extends Error {
    constructor(public code: string, message: string, public status = 400) { super(message); }
}
const encoder = new TextEncoder();
const encode = (value: string) => btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const decode = (value: string) => atob(value.replace(/-/g, "+").replace(/_/g, "/"));
async function key() { const secret = env("PLEIADES_CURSOR_SECRET") ?? env("SUPABASE_SERVICE_ROLE_KEY"); if (!secret)
    throw new NewsError("service_unavailable", "News storage is not configured.", 503); return crypto.subtle.importKey("raw", encoder.encode(`pleiades:news-cursor:v2:${secret}`), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]); }
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
export function db() { const client = createSupabaseClient(); if (!client)
    throw new NewsError("service_unavailable", "News storage is not configured.", 503); return client; }
export function topicById(id: string) { const topic = SEED_BEATS.find(t => t.beat_id === id); if (!topic)
    throw new NewsError("unknown_topic", "Choose a supported topic from pleiades_topics.", 404); return topic; }
export function freshness(last: string | null, minutes: number) { return { status: !last ? "unavailable" : Date.now() - Date.parse(last) > minutes * 60000 ? "stale" : "fresh", last_success_at: last }; }
export async function topics(query = "") {
    const { data, error } = await db().from("news_ingestion_status").select("beat_id,last_success_at,last_checked_at");
    if (error)
        throw new NewsError("service_unavailable", "News storage is not ready.", 503);
    const terms = query.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(w => w.length >= 2 && !new Set(["the", "and", "news", "about", "latest", "follow", "keep", "with", "what", "changes", "tell"]).has(w));
    return { topics: SEED_BEATS.filter(t => !terms.length || terms.some(word => t.label.toLowerCase().includes(word))).map(t => { const state = data?.find(s => s.beat_id === t.beat_id); return { beat_id: t.beat_id, label: t.label, ...freshness(state?.last_success_at ?? null, t.freshness_slo_minutes), last_checked_at: state?.last_checked_at ?? null }; }) };
}
export function boundedPage<T>(rows: T[], budget = 1800) { const items: T[] = []; let tokens = 0; for (const row of rows.slice(0, 8)) {
    const size = Math.ceil(new TextEncoder().encode(JSON.stringify(row)).length / 3);
    if (items.length && tokens + size > budget)
        break;
    items.push(row);
    tokens += size;
} return { items, estimated_tokens: tokens, has_more: rows.length > items.length }; }
export async function newsPage(beatId: string, cursor?: string, history = false) {
    const topic = topicById(beatId), client = db();
    const sequence = cursor ? await readCursor(cursor, beatId, history ? "history" : "changes") : null;
    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    let request = client.from("news_articles").select("id::text,beat_id,title,excerpt,url,source,published_at,first_indexed_at").eq("beat_id", beatId).gte("published_at", since).order("id", { ascending: !!cursor && !history }).limit(9);
    if (sequence)
        request = history ? request.lt("id", sequence) : request.gt("id", sequence);
    const [{ data, error }, { data: state, error: stateError }] = await Promise.all([request, client.from("news_ingestion_status").select("last_success_at").eq("beat_id", beatId).maybeSingle()]);
    if (error || stateError)
        throw new NewsError("service_unavailable", "Coverage could not be loaded. Please try again shortly.", 503);
    const rows = (data ?? []).map(row => ({ ...row, id: String(row.id) })) as NewsArticle[];
    const bounded = boundedPage(rows);
    const isChange = !!cursor && !history;
    // Initial latest view establishes a baseline at the newest ingested ID. History uses a separate signed cursor.
    const nextSeq = isChange ? bounded.items.at(-1)?.id ?? sequence ?? "0" : rows[0]?.id ?? "0";
    return { ...bounded, cursor: await signCursor(beatId, history ? (bounded.items.at(-1)?.id ?? sequence ?? "0") : nextSeq, history ? "history" : "changes"), history_cursor: await signCursor(beatId, bounded.items.at(-1)?.id ?? sequence ?? "0", "history"), freshness: freshness(state?.last_success_at ?? null, topic.freshness_slo_minutes) };
}
