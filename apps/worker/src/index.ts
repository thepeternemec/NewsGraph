import { SEED_BEATS } from "@pleiades/contracts";
import { createSupabaseClient } from "@pleiades/db";
import { NewsApiClient, toProviderDate } from "./newsapi.js";
import { buildPack } from "./pack.js";
import { persistCycle, canPersist } from "./persist.js";
import { deliverWebhooksForPack } from "./deliver.js";

/**
 * Ingestion cycle — Node dev mirror of the Supabase Edge Function.
 *
 * articles (English only) → bounded pack → persist.
 * No provider event clustering: a beat's article bucket IS its article cluster.
 */
async function runCycle(beats = SEED_BEATS): Promise<void> {
  const apiKey = process.env.NEWSAPI_API_KEY;
  if (!apiKey) {
    console.error("[pleiades-worker] NEWSAPI_API_KEY is not set. Set it in .env (see .env.example).");
    process.exitCode = 1;
    return;
  }

  const client = new NewsApiClient(apiKey);
  const now = new Date();
  const windowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const persist = canPersist();

  for (const beat of beats) {
    try {
      const articles = beat.topic_page_uri
        ? await client.getTopicPageArticles({ uri: beat.topic_page_uri })
        : await client.getArticles({
            apiKey,
            conceptUri: beat.concept_uris,
            keyword: beat.keywords,
            lang: ["eng"],
            dateStart: toProviderDate(windowStart),
            dateEnd: toProviderDate(now),
          });

      const { pack } = buildPack(beat, articles, now);
      console.log(
        `[pleiades-worker] ${beat.label}: ${pack.item_count} english items, persisted=${persist}`,
      );

      if (persist) {
        const result = await persistCycle(beat, articles, pack, pack.items);
        if (!result.skipped) {
          const delivery = await deliverWebhooksForPack(createSupabaseClient(), beat.beat_id, pack);
          if (delivery.attempted > 0) {
            console.log(
              `[pleiades-worker] webhooks: ${delivery.delivered}/${delivery.attempted} delivered`,
            );
          }
        }
      } else {
        console.log(JSON.stringify(pack, null, 2));
      }
    } catch (error) {
      console.error(`[pleiades-worker] cycle failed for ${beat.beat_id}:`, error);
    }
  }
}

const pilot = (process.env.PLEIADES_PILOT_BEATS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const beats = pilot.length > 0 ? SEED_BEATS.filter((b) => pilot.includes(b.beat_id)) : SEED_BEATS;

console.log(
  `[pleiades-worker] starting cycle: ${beats.length} beat(s)${
    canPersist() ? "" : " (dry-run — Supabase not configured)"
  }`,
);

await runCycle(beats);

if (process.env.PLEIADES_LOOP === "true") {
  setInterval(() => void runCycle(beats), 60_000);
}
