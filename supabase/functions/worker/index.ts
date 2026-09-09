import { SEED_BEATS } from "../_shared/contracts/index.ts";
import { NewsApiClient, toProviderDate } from "../_shared/worker/newsapi.ts";
import { buildPack } from "../_shared/worker/pack.ts";

/**
 * Ingestion cycle — Supabase Edge Function (Phase 1).
 *
 * Triggered by the schedule in supabase/config.toml ([functions.worker] schedule)
 * or manually via HTTP GET. One invocation = one pass over the beats.
 * Persistence (Supabase Postgres), event linkage, and Realtime emission are
 * the next Phase 1 steps — see docs/ARCHITECTURE.md §4.
 */

async function runCycle(beats: readonly { beat_id: string; label: string; concept_uris: string[]; languages: string[] }[]) {
  const apiKey = Deno.env.get("NEWSAPI_API_KEY");
  if (!apiKey) {
    throw new Error("NEWSAPI_API_KEY not set. Run: supabase secrets set NEWSAPI_API_KEY");
  }

  const client = new NewsApiClient(apiKey);
  const now = new Date();
  const windowStart = new Date(now.getTime() - 6 * 60 * 60 * 1000);
  const summaries: Array<{ beat_id: string; label: string; items: number; tokens: number }> = [];

  for (const beat of beats) {
    try {
      const articles = await client.getArticles({
        apiKey,
        conceptUri: beat.concept_uris,
        lang: beat.languages,
        dateStart: toProviderDate(windowStart),
        dateEnd: toProviderDate(now),
      });
      const { pack } = buildPack(
        { ...beat, topic_filters: [], excludes: "", state: "warm", refresh_interval_minutes: 60, freshness_slo_minutes: 90 },
        articles,
        now,
      );
      summaries.push({ beat_id: beat.beat_id, label: beat.label, items: pack.item_count, tokens: pack.token_estimate });
    } catch (error) {
      console.error(`cycle failed for ${beat.beat_id}:`, error);
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
