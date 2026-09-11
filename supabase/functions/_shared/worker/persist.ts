// GENERATED FILE — do not edit directly.
// Source of truth: packages/contracts + apps/{api,worker}/src.
// Regenerate with: npm run sync:supabase

import type { SupabaseClient } from "npm:@supabase/supabase-js@^2.45.4";
import { createSupabaseClient, hasSupabaseEnv, latestPack } from "../db/index.ts";
import type { Beat, Item } from "../contracts/index.ts";
import type { ProviderArticle } from "./newsapi.ts";

/**
 * Persistence: raw articles + bounded packs.
 *
 * v0.3 model — English-only articles, no provider event clustering. All writes
 * are idempotent (articles upsert by provider URI, packs dedupe on cursor) and
 * an empty cycle never creates a pack.
 */

export interface PersistedCycle {
  pack_id: string | null;
  item_count: number;
  skipped: boolean;
}

export function canPersist(): boolean {
  return hasSupabaseEnv();
}

export async function persistCycle(
  beat: Beat,
  articles: ProviderArticle[],
  pack: { cursor: string; computed_at: string; item_count: number; token_estimate: number; receipt_id: string },
  items: Item[],
): Promise<PersistedCycle> {
  const db = createSupabaseClient();
  if (!db) throw new Error("Supabase not configured; cannot persist");

  // 1. Raw articles (dedupe by provider URI — the cost invariant's guard rail).
  const articleRows = articles.map((a) => ({
    provider_uri: a.uri,
    beat_id: beat.beat_id,
    title: a.title,
    body: a.body,
    published_at: a.dateTime ?? a.date,
    indexed_at: new Date().toISOString(),
    source_name: a.source?.title ?? a.source?.uri ?? null,
    sentiment: typeof a.sentiment === "number" ? a.sentiment : null,
    concepts: (a.concepts ?? []).map((c) => c.uri),
    lang: a.lang ?? "eng",
  }));
  if (articleRows.length > 0) {
    const { error: articlesError } = await db
      .from("articles_raw")
      .upsert(articleRows, { onConflict: "provider_uri" });
    if (articlesError) throw new Error(`articles_raw upsert failed: ${articlesError.message}`);
  }

  // 2. No new English items → no pack (keeps the stream noise-free).
  if (items.length === 0) {
    return { pack_id: null, item_count: 0, skipped: true };
  }

  // 3. Unchanged cursor → already persisted this snapshot; do not duplicate.
  const latest = await latestPack(db, beat.beat_id);
  if (latest && latest.cursor === pack.cursor) {
    return { pack_id: latest.pack_id, item_count: items.length, skipped: true };
  }

  // 4. Pack + items (one provider query serves every subscriber of the beat).
  const { data: packData, error: packError } = await db
    .from("packs")
    .insert({
      beat_id: beat.beat_id,
      computed_at: pack.computed_at,
      cursor: pack.cursor,
      item_count: pack.item_count,
      token_estimate: pack.token_estimate,
      receipt_id: pack.receipt_id,
    })
    .select("pack_id")
    .single();
  if (packError) throw new Error(`packs insert failed: ${packError.message}`);

  const itemRows = items.map((item, position) => ({
    pack_id: (packData as { pack_id: string }).pack_id,
    position,
    lede: item.lede,
    url: item.url,
    source: item.source,
    published_at: item.published_at,
    first_indexed_at: item.first_indexed_at,
    concepts: item.concepts,
    sentiment: item.sentiment,
    lang: item.lang ?? "eng",
  }));
  const { error: itemsError } = await db.from("pack_items").insert(itemRows);
  if (itemsError) throw new Error(`pack_items insert failed: ${itemsError.message}`);

  // 5. Advance the beat high-water mark.
  const { error: highWaterError } = await db
    .from("beats")
    .update({ high_water_at: pack.computed_at })
    .eq("beat_id", beat.beat_id);
  if (highWaterError) throw new Error(`beats high-water update failed: ${highWaterError.message}`);

  return {
    pack_id: (packData as { pack_id: string }).pack_id,
    item_count: items.length,
    skipped: false,
  };
}

export type { SupabaseClient };
