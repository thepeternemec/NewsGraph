// GENERATED FILE — do not edit directly.
// Source of truth: packages/contracts + apps/{api,worker}/src.
// Regenerate with: npm run sync:supabase

import { z } from "npm:zod@^3.24.1";
/**
 * Minimal typed client for the newsapi.ai (Event Registry) API.
 * Base URL and endpoint shapes per the provider documentation:
 * https://newsapi.ai/documentation
 */
export const NEWSAPI_BASE_URL = "https://eventregistry.org/api/v1";
const ProviderArticleSchema = z
    .object({
    uri: z.string(),
    /** Public article URL — the provider `uri` is a numeric id, not a URL. */
    url: z.string().url().optional(),
    /** Article language code (e.g. "eng"). */
    lang: z.string().optional(),
    title: z.string(),
    body: z.string().optional().default(""),
    date: z.string().optional(),
    dateTime: z.string().optional(),
    source: z.object({ uri: z.string().optional(), title: z.string().optional() }).passthrough(),
    sentiment: z.number().min(-1).max(1).nullable().optional(),
    concepts: z
        .array(z.object({ uri: z.string() }).passthrough())
        .optional(),
})
    .passthrough();
const ProviderArticlesResponseSchema = z.object({
    articles: z
        .object({
        results: z.array(ProviderArticleSchema),
        pages: z.number().int().optional(),
        totalResults: z.number().int().optional(),
    })
        .passthrough(),
});
export type ProviderArticle = z.infer<typeof ProviderArticleSchema>;
export interface GetArticlesParams {
    apiKey: string;
    /** Primary filter: Wikipedia concept URIs, e.g. http://en.wikipedia.org/wiki/Nvidia. */
    conceptUri?: string[];
    /** Secondary filter: exact-phrase keywords. Comma-separate for multi-term. */
    keyword?: string[];
    keywordLoc?: "title" | "body";
    /** AND/OR logic for multiple keywords. */
    keywordOper?: "and" | "or";
    /** newsapi.ai category URIs (resolve via suggest(type:"categories")). */
    categoryUri?: string[];
    /** News source URIs (resolve via suggest(type:"sources")). */
    sourceUri?: string[];
    /** Filter by where sources are based (resolve via suggest(type:"locations")). */
    sourceLocationUri?: string[];
    /** Locations mentioned in content. */
    locationUri?: string[];
    /** ISO 639-2/3 language codes, e.g. ["eng", "deu"] */
    lang?: string[];
    /** YYYY-MM-DD */
    dateStart: string;
    /** YYYY-MM-DD */
    dateEnd: string;
    /** 1–100 */
    articlesCount?: number;
    articlesPage?: number;
    /** Skip near-duplicate stories. */
    skipDuplicates?: boolean;
    includeSentiment?: boolean;
}
export class NewsApiClient {
    constructor(private readonly apiKey: string, private readonly baseUrl: string = NEWSAPI_BASE_URL, private readonly fetchImpl: typeof fetch = fetch) { }
    /**
     * Fetch articles for a beat window. One provider call serves every
     * subscriber of that beat — the core cost invariant of the platform.
     */
    async getArticles(params: GetArticlesParams): Promise<ProviderArticle[]> {
        const body = {
            apiKey: this.apiKey,
            conceptUri: params.conceptUri,
            keyword: params.keyword,
            keywordLoc: params.keywordLoc,
            keywordOper: params.keywordOper,
            categoryUri: params.categoryUri,
            sourceUri: params.sourceUri,
            sourceLocationUri: params.sourceLocationUri,
            locationUri: params.locationUri,
            lang: params.lang,
            dateStart: params.dateStart,
            dateEnd: params.dateEnd,
            articlesCount: params.articlesCount ?? 100,
            articlesPage: params.articlesPage ?? 1,
            resultType: "articles",
            articlesSortBy: "date",
            includeArticleConcepts: false,
            includeArticleBody: true,
            articleBodyLen: 320,
            isDuplicateFilter: params.skipDuplicates === false ? undefined : "skipDuplicates",
            // Sentiment is returned via the includeFields mechanism.
            includeFields: params.includeSentiment === false ? undefined : "sentiment",
        };
        const response = await this.fetchImpl(`${this.baseUrl}/article/getArticles`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(20000),
        });
        if (!response.ok) {
            throw new Error(`newsapi.ai getArticles failed: HTTP ${response.status}`);
        }
        const parsed = ProviderArticlesResponseSchema.parse(await response.json());
        return parsed.articles.results;
    }
    /**
     * Articles from a pre-configured newsapi.ai Topic Page — the curated topic
     * profile that replaces hand-coded concept URIs (the MCP server's
     * get_topic_page_articles path).
     */
    async getTopicPageArticles(params: {
        uri: string;
        articlesCount?: number;
        articlesSortBy?: "date" | "rel" | "sourceImportance" | "socialScore";
    }): Promise<ProviderArticle[]> {
        const body = {
            apiKey: this.apiKey,
            uri: params.uri,
            resultType: "articles",
            articleBodyLen: 300,
            articlesCount: params.articlesCount ?? 100,
            articlesSortBy: params.articlesSortBy ?? "date",
        };
        const response = await this.fetchImpl(`${this.baseUrl}/article/getArticlesForTopicPage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(20000),
        });
        if (!response.ok) {
            throw new Error(`newsapi.ai getArticlesForTopicPage failed: HTTP ${response.status}`);
        }
        const parsed = ProviderArticlesResponseSchema.parse(await response.json());
        return parsed.articles.results;
    }
}
/** YYYY-MM-DD in UTC. */
export function toProviderDate(d: Date): string {
    return d.toISOString().slice(0, 10);
}
