import { SEED_BEATS } from "../_shared/contracts/index.ts";
import { createSupabaseClient } from "../_shared/db/index.ts";
import { NewsApiClient, toProviderDate } from "../_shared/worker/newsapi.ts";
import { buildPack } from "../_shared/worker/pack.ts";
import { persistCycle, canPersist } from "../_shared/worker/persist.ts";
import { deliverWebhooksForPack } from "../_shared/worker/deliver.ts";

/**
 * Ingestion cycle — Supabase Edge Function (Phase 1).
 *
 * Triggered by the schedule in supabase/config.toml ([functions.worker] schedule)
 * or manually via HTTP GET. One invocation = one pass over the beats:
 *
 *   fetch (newsapi.ai) → event linkage → dedupe → pack → persist (Supabase)
 *
 * Persistence is skipped in dry-run when Supabase is not configured
 * (local dev), matching the Node dev mirror in apps/worker.
 */

async function runCycle(beats: typeof SEED_BEATS) {
  const apiKey = Deno.env.get("NEWSAPI_API_KEY");
  if (!apiKey) {
    throw new Error("NEWSAPI_API_KEY not set. Run: supabase secrets set NEWSAPI_API_KEY");
  }

  const client = new NewsApiClient(apiKey);
  const now = new Date();
  // 24h window for the first backfill; steady-state cron can narrow this.
  const windowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const persist = canPersist();
  const summaries: Array<Record<string, unknown>> = [];

  for (const beat of beats) {
    try {
      const [articles, events] = await Promise.all([
        client.getArticles({
          apiKey,
          conceptUri: beat.concept_uris,
          lang: beat.languages,
          dateStart: toProviderDate(windowStart),
          dateEnd: toProviderDate(now),
        }),
        client.getEvents({
          conceptUri: beat.concept_uris,
          lang: beat.languages,
          dateStart: toProviderDate(windowStart),
          dateEnd: toProviderDate(now),
        }),
      ]);

      const { pack } = buildPack(beat, articles, now, events);
      const summary: Record<string, unknown> = {
        beat_id: beat.beat_id,
        label: beat.label,
        items: pack.item_count,
        tokens: pack.token_estimate,
        events: events.length,
        persisted: false,
      };

      if (persist) {
        const result = await persistCycle(beat, articles, events, pack, pack.items);
        summary.persisted = !result.skipped;
        summary.skipped = result.skipped;
        if (result.pack_id) summary.pack_id = result.pack_id;
        if (!result.skipped) {
          const delivery = await deliverWebhooksForPack(createSupabaseClient(), beat.beat_id, pack);
          summary.webhooks = { attempted: delivery.attempted, delivered: delivery.delivered, failed: delivery.failed };
        }
      }

      summaries.push(summary);
      console.log(`[worker] ${beat.label}: ${pack.item_count} items, ${events.length} events, persisted=${persist}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[worker] cycle failed for ${beat.beat_id}:`, message);
      summaries.push({ beat_id: beat.beat_id, label: beat.label, error: message });
    }
  }

  return summaries;
}

Deno.serve(async (req) => {
  if (req.method !== "GET" && req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405 });
  }

  const pilot = (Deno.env.get("PLEIADES_PILOT_BEATS") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const beats = pilot.length > 0 ? SEED_BEATS.filter((b) => pilot.includes(b.beat_id)) : SEED_BEATS;

  try {
    const summaries = await runCycle(beats);
    return new Response(
      JSON.stringify({ ok: true, beats: summaries.length, summaries }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "internal_error", detail: String(error) }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
