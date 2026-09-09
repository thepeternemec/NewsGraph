import {
  ItemSchema,
  PackSchema,
  PACK_LIMITS,
  type Beat,
  type Item,
  type Pack,
} from "@pleiades/contracts";
import type { ProviderArticle } from "./newsapi.js";
import { linkArticlesToEvents } from "./events.js";

/**
 * Build a bounded pack from provider articles.
 *
 * Phase 1 invariants (docs/ARCHITECTURE.md §2):
 *  - ≤8 items, ≤800 token estimate, lede ≤320 chars, never full bodies
 *  - sorted newest-first
 *  - event_id/corroboration from provider event clusters when available
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

export function providerArticleToItem(
  article: ProviderArticle,
  now: Date,
  eventId: string | null = null,
  corroboration = 0,
): Item {
  const publishedAt = article.dateTime ?? article.date ?? new Date(0).toISOString();
  const bodyLede = article.body ? article.body.slice(0, PACK_LIMITS.max_lede_chars) : "";
  const lede = (article.title ? `${article.title}. ` : "") + bodyLede;

  return ItemSchema.parse({
    lede: lede.slice(0, PACK_LIMITS.max_lede_chars),
    url: article.url ?? `https://eventregistry.org/article/${article.uri}`,
    source: article.source?.title ?? article.source?.uri ?? "unknown source",
    published_at: publishedAt,
    first_indexed_at: now.toISOString(),
    event_id: eventId,
    corroboration,
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

/**
 * @param events provider event clusters for the same window; optional for
 *               backward compatibility (clustering is skipped when omitted)
 */
export function buildPack(
  beat: Beat,
  articles: ProviderArticle[],
  now: Date,
  events: Parameters<typeof linkArticlesToEvents>[1] = [],
): BuildPackResult {
  const { eventUriByArticle, corroborationByEvent } = linkArticlesToEvents(articles, events);

  // Preferred linkage: the article's own eventUri (from includeArticleEventUri)
  // plus the event's cluster size. Fall back to membership lists when present.
  const countByEvent = new Map<string, number>();
  for (const e of events) {
    const count = e.totalArticleCount ?? e.sourceCount;
    if (count != null) countByEvent.set(e.uri, count);
  }

  const items = articles
    .slice()
    .sort((a, b) => (b.dateTime ?? b.date ?? "").localeCompare(a.dateTime ?? a.date ?? ""))
    .slice(0, PACK_LIMITS.max_items)
    .map((a) => {
      const eventUri = a.eventUri ?? eventUriByArticle.get(a.uri) ?? null;
      const corroboration = eventUri
        ? (countByEvent.get(eventUri) ?? corroborationByEvent.get(eventUri) ?? 0)
        : 0;
      return providerArticleToItem(a, now, eventUri, corroboration);
    });

  const tokenEstimate = items.reduce(
    (sum, item) => sum + estimateTokens(item.lede) + estimateTokens(item.source) + 8,
    0,
  );

  // Cursor: high-water mark = max published time. Receipts are placeholder
  // until the ledger billing loop lands (Phase 0/4); persisted packs carry
  // receipt_id 'pending' so the contract shape stays stable.
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
