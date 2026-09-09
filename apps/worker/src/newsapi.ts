import { z } from "zod";

/**
 * Minimal typed client for the newsapi.ai (Event Registry) API.
 * Base URL and endpoint shapes per the provider documentation:
 * https://newsapi.ai/documentation
 */

export const NEWSAPI_BASE_URL = "https://eventregistry.org/api/v1";

const ProviderArticleSchema = z
  .object({
    uri: z.string(),
    title: z.string(),
    body: z.string().optional().default(""),
    date: z.string().optional(),
    dateTime: z.string().optional(),
    source: z.object({ uri: z.string().optional(), title: z.string().optional() }).passthrough(),
    sentiment: z.number().min(-1).max(1).nullable().optional(),
    concepts: z
      .array(z.object({ uri: z.string(), label: z.string().optional() }).passthrough())
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
  /** Wikipedia concept URIs, e.g. http://en.wikipedia.org/wiki/Nvidia */
  conceptUri?: string[];
  keywords?: string[];
  /** ISO 639-2/3 language codes, e.g. ["eng", "deu"] */
  lang?: string[];
  /** YYYY-MM-DD */
  dateStart: string;
  /** YYYY-MM-DD */
  dateEnd: string;
  /** 1–100 */
  articlesCount?: number;
  /** Skip near-duplicate stories. */
  skipDuplicates?: boolean;
  includeSentiment?: boolean;
}

export class NewsApiClient {
  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string = NEWSAPI_BASE_URL,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  /**
   * Fetch articles for a beat window. One provider call serves every
   * subscriber of that beat — the core cost invariant of the platform.
   */
  async getArticles(params: GetArticlesParams): Promise<ProviderArticle[]> {
    const body = {
      apiKey: this.apiKey,
      conceptUri: params.conceptUri,
      keyword: params.keywords,
      lang: params.lang,
      dateStart: params.dateStart,
      dateEnd: params.dateEnd,
      articlesCount: params.articlesCount ?? 100,
      isDuplicateFilter: params.skipDuplicates === false ? undefined : "skipDuplicates",
      // Sentiment is returned via the includeFields mechanism.
      includeFields: params.includeSentiment === false ? undefined : "sentiment",
    };

    const response = await this.fetchImpl(`${this.baseUrl}/article/getArticles`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(
        `newsapi.ai getArticles failed: HTTP ${response.status} ${await response.text()}`,
      );
    }

    const parsed = ProviderArticlesResponseSchema.parse(await response.json());
    return parsed.articles.results;
  }

  /** Placeholder — event clustering lands with the Phase 1 event linkage. */
  async getEvents(_params: unknown): Promise<never> {
    throw new Error("getEvents not implemented yet (Phase 1 event linkage)");
  }
}

/** YYYY-MM-DD in UTC. */
export function toProviderDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
