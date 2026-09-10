import type { SupabaseClient } from "@supabase/supabase-js";
import {
  BeatSchema,
  ItemSchema,
  PackSchema,
  type Beat,
  type Item,
  type Pack,
  type Webhook,
} from "@pleiades/contracts";

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

/** Assemble the canonical pack from a packs row + its items (API and Realtime). */
export async function loadPack(
  db: SupabaseClient,
  beatId: string,
  latest: LatestPackRow,
): Promise<Pack | null> {
  const beat = await findBeat(db, beatId);
  if (!beat) return null;
  const items = await packItems(db, latest.pack_id);
  return PackSchema.parse({
    beat_id: latest.beat_id,
    beat_label: beat.label,
    computed_at: latest.computed_at,
    freshness_slo_minutes: beat.freshness_slo_minutes,
    cursor: latest.cursor,
    moved: true,
    item_count: items.length,
    items,
    token_estimate: latest.token_estimate,
    receipt_id: latest.receipt_id,
  });
}

// ── Webhooks (Phase 2) ───────────────────────────────────────────────

export interface WebhookRow {
  webhook_id: string;
  url: string;
  beat_ids: string[];
  hmac_secret: string;
  state: "active" | "failed" | "revoked";
  created_at: string;
}

export async function insertWebhook(
  db: SupabaseClient,
  row: { url: string; beat_ids: string[]; hmac_secret: string },
): Promise<WebhookRow> {
  // Single-operator mode until workspaces land (Phase 6): all webhooks are
  // owned by the "operator" principal, satisfying the NOT NULL agent_id.
  const { data, error } = await db
    .from("webhooks")
    .insert({ ...row, agent_id: "operator" })
    .select()
    .single();
  if (error) throw new Error(`insertWebhook failed: ${error.message}`);
  return data as WebhookRow;
}

export async function listWebhooks(db: SupabaseClient): Promise<Webhook[]> {
  const { data, error } = await db
    .from("webhooks")
    .select("webhook_id, url, beat_ids, state, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`listWebhooks failed: ${error.message}`);
  return (data ?? []) as Webhook[];
}

export async function revokeWebhook(db: SupabaseClient, webhookId: string): Promise<boolean> {
  const { error } = await db
    .from("webhooks")
    .update({ state: "revoked" })
    .eq("webhook_id", webhookId)
    .eq("state", "active");
  if (error) throw new Error(`revokeWebhook failed: ${error.message}`);
  return true;
}

/** Active webhooks subscribed to a beat (full rows incl. secret, for delivery). */
export async function activeWebhooksForBeat(
  db: SupabaseClient,
  beatId: string,
): Promise<WebhookRow[]> {
  const { data, error } = await db
    .from("webhooks")
    .select("*")
    .contains("beat_ids", [beatId])
    .eq("state", "active");
  if (error) throw new Error(`activeWebhooksForBeat failed: ${error.message}`);
  return (data ?? []) as WebhookRow[];
}
