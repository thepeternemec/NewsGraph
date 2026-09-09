import type { SupabaseClient } from "@supabase/supabase-js";
import { BeatSchema, ItemSchema, type Beat, type Item } from "@pleiades/contracts";

/** Read-side queries used by the API Edge Function. */

export interface LatestPackRow {
  pack_id: string;
  beat_id: string;
  computed_at: string;
  cursor: string;
  item_count: number;
  token_estimate: number;
  receipt_id: string;
}

export async function findBeat(db: SupabaseClient, beatId: string): Promise<Beat | null> {
  const { data } = await db.from("beats").select("*").eq("beat_id", beatId).maybeSingle();
  if (!data) return null;
  const parsed = BeatSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

/** Newest pack for a beat, or null when ingestion has not produced one yet. */
export async function latestPack(db: SupabaseClient, beatId: string): Promise<LatestPackRow | null> {
  const { data, error } = await db
    .from("packs")
    .select("pack_id, beat_id, computed_at, cursor, item_count, token_estimate, receipt_id")
    .eq("beat_id", beatId)
    .order("computed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`latestPack failed: ${error.message}`);
  return (data as LatestPackRow | null) ?? null;
}

/** Items of a pack in display order; rows failing schema validation are skipped. */
interface PackItemRow {
  lede: string;
  url: string;
  source: string;
  published_at: string;
  first_indexed_at: string;
  event_id: string | null;
  corroboration: number;
  concepts: string[];
  sentiment: number | null;
  summary?: string | null;
  importance?: number | null;
  signal_types?: string[] | null;
  tickers?: string[] | null;
  narrative_id?: string | null;
}

export async function packItems(db: SupabaseClient, packId: string): Promise<Item[]> {
  const { data, error } = await db
    .from("pack_items")
    .select("*")
    .eq("pack_id", packId)
    .order("position", { ascending: true });
  if (error) throw new Error(`packItems failed: ${error.message}`);
  const items: Item[] = [];
  for (const row of (data ?? []) as PackItemRow[]) {
    const parsed = ItemSchema.safeParse({
      lede: row.lede,
      url: row.url,
      source: row.source,
      published_at: row.published_at,
      first_indexed_at: row.first_indexed_at,
      event_id: row.event_id,
      corroboration: row.corroboration,
      concepts: row.concepts ?? [],
      sentiment: row.sentiment,
      ...(row.summary != null ? { summary: row.summary } : {}),
      ...(row.importance != null ? { importance: row.importance } : {}),
      ...(row.signal_types?.length ? { signal_types: row.signal_types } : {}),
      ...(row.tickers?.length ? { tickers: row.tickers } : {}),
      ...(row.narrative_id != null ? { narrative_id: row.narrative_id } : {}),
    });
    if (parsed.success) items.push(parsed.data);
  }
  return items;
}
