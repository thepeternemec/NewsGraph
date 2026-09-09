import {
  ItemSchema,
  PackSchema,
  PACK_LIMITS,
  type Beat,
  type Item,
  type Pack,
} from "@pleiades/contracts";
import type { ProviderArticle } from "./newsapi.js";

/**
 * Build a bounded pack from provider articles.
 *
 * Phase 1 invariants (docs/ARCHITECTURE.md §2):
 *  - ≤8 items, ≤800 token estimate, lede ≤320 chars, never full bodies
 *  - sorted newest-first
 *  - event clustering (event_id/corroboration) is a TODO until event linkage lands
 */

/** Rough token estimate: ~4 chars/token, rounded up. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function providerArticleToItem(article: ProviderArticle, now: Date): Item {
  const publishedAt = article.dateTime ?? article.date ?? new Date(0).toISOString();
  const bodyLede = article.body ? article.body.slice(0, PACK_LIMITS.max_lede_chars) : "";
  const lede = (article.title ? `${article.title}. ` : "") + bodyLede;

  return ItemSchema.parse({
    lede: lede.slice(0, PACK_LIMITS.max_lede_chars),
    url: article.uri,
    source: article.source?.title ?? article.source?.uri ?? "unknown source",
    published_at: publishedAt,
    first_indexed_at: now.toISOString(),
    event_id: null, // Phase 1: event linkage
    corroboration: 0, // Phase 1: distinct sources in cluster
    concepts: (article.concepts ?? []).map((c) => c.uri),
    sentiment:
      typeof article.sentiment === "number"
        ? Math.max(-1, Math.min(1, article.sentiment))
        : null,
  });
}

export interface BuildPackResult {
  pack: Pack;
  /** Provider URIs included, for dedupe against persistence. */
  includedUris: string[];
}

export function buildPack(beat: Beat, articles: ProviderArticle[], now: Date): BuildPackResult {
  const items = articles
    .slice()
    .sort((a, b) => (b.dateTime ?? b.date ?? "").localeCompare(a.dateTime ?? a.date ?? ""))
    .slice(0, PACK_LIMITS.max_items)
    .map((a) => providerArticleToItem(a, now));

  const tokenEstimate = items.reduce(
    (sum, item) => sum + estimateTokens(item.lede) + estimateTokens(item.source) + 8,
    0,
  );

  // Dry-run cursor: high-water mark = max published time. Real signed cursors
  // and receipt ids arrive with the ledger wiring (Phase 1).
  const highWater =
    items.length > 0
      ? items.reduce((max, i) => (i.published_at > max ? i.published_at : max), "")
      : now.toISOString();

  const pack = PackSchema.parse({
    beat_id: beat.beat_id,
    beat_label: beat.label,
    computed_at: now.toISOString(),
    freshness_slo_minutes: beat.freshness_slo_minutes,
    cursor: Buffer.from(`${beat.beat_id}:${highWater}`).toString("base64url"),
    moved: true,
    item_count: items.length,
    items,
    token_estimate: Math.min(tokenEstimate, PACK_LIMITS.max_token_estimate),
    receipt_id: "dry_run", // ledger lands in Phase 1
  });

  return { pack, includedUris: items.map((i) => i.url) };
}
