// GENERATED FILE — do not edit directly.
// Source of truth: packages/contracts + apps/{api,worker}/src.
// Regenerate with: npm run sync:supabase

import {
  ItemSchema,
  PackSchema,
  PACK_LIMITS,
  type Beat,
  type Item,
  type Pack,
} from "../contracts/index.ts";
import type { ProviderArticle } from "./newsapi.ts";

/**
 * Build a bounded pack from provider articles.
 *
 * Model (v0.3):
 *  - English only — non-English articles are dropped before ranking
 *  - No provider event clustering: articles are bucketed per beat, and the
 *    beat's bucket is its "article cluster"
 *  - ≤8 items, ≤800 token estimate, lede ≤320 chars, never full bodies
 */

/** Rough token estimate: ~4 chars/token, rounded up. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Portable base64url — runs on Node ≥16 and Deno (both expose global `btoa`).
 * Safe here because cursors are ASCII (beat id + ISO timestamp).
 */
export function toBase64Url(input: string): string {
  return btoa(input).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export const ENGLISH = "eng";

/** English-only gate. Providers omit lang on some feeds; missing means English. */
export function isEnglish(article: ProviderArticle): boolean {
  return (article.lang ?? ENGLISH) === ENGLISH;
}

export function providerArticleToItem(article: ProviderArticle, now: Date): Item {
  const publishedAt = article.dateTime ?? article.date ?? new Date(0).toISOString();
  const bodyLede = article.body ? article.body.slice(0, PACK_LIMITS.max_lede_chars) : "";
  const lede = (article.title ? `${article.title}. ` : "") + bodyLede;

  return ItemSchema.parse({
    lede: lede.slice(0, PACK_LIMITS.max_lede_chars),
    url: article.url ?? `https://eventregistry.org/article/${article.uri}`,
    source: article.source?.title ?? article.source?.uri ?? "unknown source",
    published_at: publishedAt,
    first_indexed_at: now.toISOString(),
    concepts: (article.concepts ?? []).map((c) => c.uri),
    lang: article.lang ?? ENGLISH,
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
    .filter(isEnglish)
    .slice()
    .sort((a, b) => (b.dateTime ?? b.date ?? "").localeCompare(a.dateTime ?? a.date ?? ""))
    .slice(0, PACK_LIMITS.max_items)
    .map((a) => providerArticleToItem(a, now));

  const tokenEstimate = items.reduce(
    (sum, item) => sum + estimateTokens(item.lede) + estimateTokens(item.source) + 8,
    0,
  );

  // Cursor: high-water mark = max published time. Receipts are placeholder
  // until the ledger billing loop lands; persisted packs carry receipt_id
  // 'pending' so the contract shape stays stable.
  const highWater =
    items.length > 0
      ? items.reduce((max, i) => (i.published_at > max ? i.published_at : max), "")
      : now.toISOString();

  const pack = PackSchema.parse({
    beat_id: beat.beat_id,
    beat_label: beat.label,
    computed_at: now.toISOString(),
    freshness_slo_minutes: beat.freshness_slo_minutes,
    cursor: toBase64Url(`${beat.beat_id}:${highWater}`),
    moved: true,
    item_count: items.length,
    items,
    token_estimate: Math.min(tokenEstimate, PACK_LIMITS.max_token_estimate),
    receipt_id: "dry_run",
  });

  return { pack, includedUris: items.map((i) => i.url) };
}
