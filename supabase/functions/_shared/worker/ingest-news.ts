// GENERATED FILE — do not edit directly.
// Source of truth: packages/contracts + apps/{api,worker}/src.
// Regenerate with: npm run sync:supabase

import { createSupabaseClient } from "../db/index.ts";
import type { ProviderArticle } from "./newsapi.ts";
export function normalizeArticles(articles: ProviderArticle[], now = new Date()) {
    const seen = new Set<string>();
    return articles.flatMap(article => {
        if (article.lang !== "eng" || !article.url)
            return [];
        let url: URL;
        try {
            url = new URL(article.url);
        }
        catch {
            return [];
        }
        if (article.url.length > 2048 || !["http:", "https:"].includes(url.protocol))
            return [];
        url.hash = "";
        for (const key of [...url.searchParams.keys()])
            if (key.startsWith("utm_") || ["fbclid", "gclid"].includes(key))
                url.searchParams.delete(key);
        const canonical = url.toString();
        if (seen.has(canonical))
            return [];
        seen.add(canonical);
        const date = new Date(article.dateTime ?? article.date ?? "");
        if (!Number.isFinite(date.getTime()) || date.getTime() < now.getTime() - 30 * 86400000 || date.getTime() > now.getTime() + 300000)
            return [];
        const plain = (s: string) => s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
        const title = plain(article.title).slice(0, 240);
        if (!title)
            return [];
        return [{ provider_uri: article.uri, title, excerpt: plain(article.body ?? "").slice(0, 320), url: canonical, source: plain(article.source.title ?? article.source.uri ?? url.hostname).slice(0, 120), published_at: date.toISOString() }];
    }).sort((a, b) => a.published_at.localeCompare(b.published_at) || a.url.localeCompare(b.url));
}
export async function persistNews(beatId: string, articles: ProviderArticle[]) { const db = createSupabaseClient(); if (!db)
    throw new Error("News database is not configured"); const rows = normalizeArticles(articles); const { data, error } = await db.rpc("append_news_articles", { p_beat_id: beatId, p_articles: rows }); if (error)
    throw new Error(`news persistence failed: ${error.code}`); return { received: articles.length, accepted: rows.length, inserted: Number(data) }; }
