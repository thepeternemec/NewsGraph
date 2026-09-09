import { SEED_BEATS } from "@pleiades/contracts";
import { NewsApiClient, toProviderDate } from "./newsapi.js";
import { buildPack } from "./pack.js";

/**
 * Ingestion cycle — Phase 1 skeleton.
 *
 * Currently: fetch → dedupe → build pack → print (dry-run).
 * Next (Phase 1): persist to Supabase, event linkage, advance high-water,
 * emit for push (Phase 2), LLM enrichment (Phase 5).
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
  const windowStart = new Date(now.getTime() - 6 * 60 * 60 * 1000); // last 6h (pilot)

  for (const beat of beats) {
    try {
      const articles = await client.getArticles({
        apiKey,
        conceptUri: beat.concept_uris,
        lang: beat.languages,
        dateStart: toProviderDate(windowStart),
        dateEnd: toProviderDate(now),
      });
      const { pack } = buildPack(beat, articles, now);
      console.log(`[pleiades-worker] ${beat.label}: ${pack.item_count} items, ${pack.token_estimate} tokens`);
      if (process.env.PLEIADES_DRY_RUN !== "false") {
        console.log(JSON.stringify(pack, null, 2));
      }
      // TODO(Phase 1): persist pack, advance high-water mark, emit event.
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
    process.env.PLEIADES_DRY_RUN === "false" ? "" : " (dry-run)"
  }`,
);

await runCycle(beats);

// Keep polling on an interval when requested. Production scheduling (Phase 1)
// should use a dedicated host — Vercel Cron is not suitable for beat fan-out.
if (process.env.PLEIADES_LOOP === "true") {
  setInterval(() => void runCycle(beats), 60_000);
}
