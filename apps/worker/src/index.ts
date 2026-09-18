/**
 * Ingestion.
 *
 * One pass over the catalog: ask the provider for each topic, normalise,
 * persist. Called by the Vercel Cron route in `apps/web`, and runnable
 * directly with `npm run ingest`.
 */
import { SEED_BEATS, type Beat } from "@newsgraph/contracts";
import { db, env, hasDatabaseEnv } from "@newsgraph/db";
import { NewsApiClient, type ProviderArticle } from "./newsapi.js";
import { searchGoogleNews } from "./googlenews.js";
import { persistNews } from "./ingest-news.js";

/**
 * Which provider to pull from.
 *
 * `google` is the default: Google News RSS is free and key-less, so a large
 * catalog costs nothing but time. `newsapi` is still implemented and selectable
 * with NEWSGRAPH_PROVIDER=newsapi, but it burns provider credits — which is why
 * it is no longer the default.
 */
const PROVIDER = (env("NEWSGRAPH_PROVIDER") ?? "google").toLowerCase();

/**
 * Google has no cross-topic batching, so its cost is one request per topic.
 * These bound how hard we hit it.
 */
const GOOGLE_CONCURRENCY = Math.max(1, Number(env("NEWSGRAPH_CONCURRENCY") ?? 4));

/**
 * The window is the last day only, and every query is filtered to financial
 * news. Both are deliberate: this is a market product, and a week-old general
 * news article is noise.
 */
const WINDOW_HOURS = 24;
const FINANCE_CATEGORY = "news/Business";

/**
 * Topics per provider call.
 *
 * The provider accepts a list of keywords OR'd together, so 300 topics cost
 * ~60 calls rather than 300. The trade-off is real: a batch returns at most
 * `articlesCount` results, so a busy keyword can crowd out a quiet one in the
 * same batch. Smaller batches are fairer and more expensive; five is the
 * compromise, and it is tunable without a deploy.
 */
const BATCH_SIZE = Math.max(1, Number(env("NEWSGRAPH_BATCH_SIZE") ?? 5));
const ARTICLES_PER_BATCH = 100;

/**
 * Does a headline belong to this topic?
 *
 * The provider's own title matching is looser than it looks — asking for
 * "Bitcoin" returned a headline about Ethereum. Checking the keyword against
 * the title here means a batched result only lands on the topics it genuinely
 * names, which makes batching *more* precise than querying one topic at a time.
 */
export function titleMatches(title: string, keywords: string[]): boolean {
  const haystack = title.toLowerCase();
  return keywords.some((keyword) => haystack.includes(keyword.toLowerCase()));
}

export interface BeatResult {
  beat_id: string;
  label: string;
  fetched: number;
  inserted: number;
  error?: string;
}

export interface IngestionResult {
  beats: number;
  /** Provider calls actually made. The point of batching is that this is far below `beats`. */
  calls: number;
  inserted: number;
  results: BeatResult[];
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Stamp a topic's freshness so `/v2/topics` stops reporting it unavailable. */
async function markStatus(beatId: string, count: number, failed: boolean): Promise<void> {
  const sql = db();
  await sql`
    insert into news_ingestion_status (beat_id, last_checked_at, last_success_at, last_article_count)
    values (${beatId}, now(), ${failed ? null : new Date()}, ${count})
    on conflict (beat_id) do update set
      last_checked_at = now(),
      last_success_at = case when ${failed} then news_ingestion_status.last_success_at else now() end,
      last_article_count = ${count}`;
}

export async function runIngestion(): Promise<IngestionResult> {
  if (!hasDatabaseEnv()) throw new Error("DATABASE_URL is not set");
  const now = new Date();
  const apiKey = env("NEWSAPI_API_KEY") ?? "";
  if (PROVIDER === "newsapi" && !apiKey) throw new Error("NEWSAPI_API_KEY is not set");

  const client = new NewsApiClient(apiKey);
  const results: BeatResult[] = [];
  let inserted = 0;
  let calls = 0;

  if (PROVIDER === "google") {
    return runGoogle(SEED_BEATS as Beat[], now);
  }

  const batches: Beat[][] = [];
  for (let i = 0; i < SEED_BEATS.length; i += BATCH_SIZE) {
    batches.push(SEED_BEATS.slice(i, i + BATCH_SIZE) as Beat[]);
  }

  for (const batch of batches) {
    const keywords = [...new Set(batch.flatMap((b) => b.keywords))];
    let articles: ProviderArticle[] = [];
    let failure: string | undefined;

    try {
      calls += 1;
      articles = await client.getArticles({
        apiKey,
        keyword: keywords,
        keywordLoc: "title",
        keywordOper: "or",
        categoryUri: [FINANCE_CATEGORY],
        lang: ["eng"],
        dateStart: iso(new Date(now.getTime() - WINDOW_HOURS * 3600 * 1000)),
        dateEnd: iso(now),
        articlesCount: ARTICLES_PER_BATCH,
        skipDuplicates: true,
      });
    } catch (error) {
      // One failed call fails only its own batch.
      failure = (error as Error).message;
    }

    for (const beat of batch) {
      if (failure) {
        await markStatus(beat.beat_id, 0, true).catch(() => {});
        results.push({ beat_id: beat.beat_id, label: beat.label, fetched: 0, inserted: 0, error: failure });
        continue;
      }
      const mine = articles.filter((a) => titleMatches(a.title, beat.keywords));
      try {
        const written = mine.length ? await persistNews(beat.beat_id, mine) : { inserted: 0 };
        inserted += written.inserted;
        await markStatus(beat.beat_id, written.inserted, false);
        results.push({ beat_id: beat.beat_id, label: beat.label, fetched: mine.length, inserted: written.inserted });
      } catch (error) {
        const message = (error as Error).message;
        await markStatus(beat.beat_id, 0, true).catch(() => {});
        results.push({ beat_id: beat.beat_id, label: beat.label, fetched: mine.length, inserted: 0, error: message });
      }
    }
  }

  return { beats: SEED_BEATS.length, calls, inserted, results };
}


/**
 * One Google News request per topic, a few at a time.
 *
 * Note the deliberate difference from the paid provider: Google matches against
 * the whole article, not just the headline, so results are *not* re-filtered by
 * keyword. An article about Nvidia's supplier is correctly an Nvidia story even
 * when the headline never says "Nvidia".
 */
async function runGoogle(beats: Beat[], now: Date): Promise<IngestionResult> {
  const results: BeatResult[] = [];
  let inserted = 0;
  let calls = 0;

  let cursor = 0;
  async function worker(): Promise<void> {
    while (cursor < beats.length) {
      const beat = beats[cursor++];
      if (!beat) return;
      try {
        calls += 1;
        const fetched = await searchGoogleNews([...beat.keywords]);
        // Google matches the whole article, so a film trailer that mentions the
        // chip in passing arrives under the NVIDIA topic — and can outrank real
        // coverage. Requiring the keyword in the headline is what "has this
        // ticker moved?" actually means; it costs recall on stories that name
        // the company only in the body, and that is the right trade for a
        // product whose answer is a headline.
        const articles = fetched.filter((a) => titleMatches(a.title, beat.keywords));
        const written = articles.length ? await persistNews(beat.beat_id, articles) : { inserted: 0 };
        inserted += written.inserted;
        await markStatus(beat.beat_id, written.inserted, false);
        results.push({ beat_id: beat.beat_id, label: beat.label, fetched: fetched.length, inserted: written.inserted });
      } catch (error) {
        const message = (error as Error).message;
        await markStatus(beat.beat_id, 0, true).catch(() => {});
        results.push({ beat_id: beat.beat_id, label: beat.label, fetched: 0, inserted: 0, error: message });
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(GOOGLE_CONCURRENCY, beats.length) }, worker));
  return { beats: beats.length, calls, inserted, results };
}
