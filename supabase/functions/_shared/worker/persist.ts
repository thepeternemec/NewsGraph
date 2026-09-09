// GENERATED FILE — do not edit directly.
// Source of truth: packages/contracts + apps/{api,worker}/src.
// Regenerate with: npm run sync:supabase

import type { SupabaseClient } from "npm:@supabase/supabase-js@^2.45.4";
import { createSupabaseClient, hasSupabaseEnv } from "../db/index.ts";
import type { Beat, Item } from "../contracts/index.ts";
import type { ProviderArticle, ProviderEvent } from "./newsapi.ts";
import { eventArticleUris } from "./newsapi.ts";

/**
 * Phase 1 persistence: raw articles + event clusters → packs.
 * All writes are idempotent (upserts keyed by provider URI), so a scheduler
 * that runs the cycle twice cannot double-count items.
 */

export interface PersistedCycle {
  pack_id: string;
  item_count: number;
  event_count: number;
}

export function canPersist(): boolean {
  return hasSupabaseEnv();
}

export async function persistCycle(
  beat: Beat,
  articles: ProviderArticle[],
  events: ProviderEvent[],
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
    event_uri: null as string | null,
  }));
  const { error: articlesError } = await db
    .from("articles_raw")
    .upsert(articleRows, { onConflict: "provider_uri" });
  if (articlesError) throw new Error(`articles_raw upsert failed: ${articlesError.message}`);

  // 2. Event clusters (upsert keyed by provider event URI).
  const eventRows = events.map((e) => ({
    provider_event_uri: e.uri,
    beat_id: beat.beat_id,
    title: e.title ?? null,
    first_seen_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
    source_count: eventArticleUris(e).length > 0 ? 0 : e.sourceCount ?? e.totalArticleCount ?? 0,
  }));
  if (eventRows.length > 0) {
    const { error: eventsError } = await db
      .from("events")
      .upsert(eventRows, { onConflict: "provider_event_uri" });
    if (eventsError) throw new Error(`events upsert failed: ${eventsError.message}`);
  }

  // 3. Pack + items (one provider query serves every subscriber).
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
    event_id: item.event_id,
    corroboration: item.corroboration,
    concepts: item.concepts,
    sentiment: item.sentiment,
  }));
  if (itemRows.length > 0) {
    const { error: itemsError } = await db.from("pack_items").insert(itemRows);
    if (itemsError) throw new Error(`pack_items insert failed: ${itemsError.message}`);
  }

  // 4. Advance the beat high-water mark.
  const { error: highWaterError } = await db
    .from("beats")
    .update({ high_water_at: pack.computed_at })
    .eq("beat_id", beat.beat_id);
  if (highWaterError) throw new Error(`beats high-water update failed: ${highWaterError.message}`);

  return {
    pack_id: (packData as { pack_id: string }).pack_id,
    item_count: items.length,
    event_count: eventRows.length,
  };
}

export type { SupabaseClient };
