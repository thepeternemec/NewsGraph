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

// ── Dashboard stats (Phase 0 demo surface) ───────────────────────────

export interface DashboardStats {
  beats: number;
  total_items: number;
  total_events: number;
  clustered_items: number;
  max_corroboration: number;
  last_ingestion_at: string | null;
  by_beat: Array<{
    beat_id: string;
    label: string;
    items: number;
    events: number;
    corroboration_max: number;
    last_computed_at: string | null;
  }>;
  recent: Array<{
    beat_label: string;
    lede: string;
    source: string;
    url: string;
    event_id: string | null;
    corroboration: number;
    published_at: string;
  }>;
  clusters: Array<{
    event_id: string;
    beat_id: string;
    title: string | null;
    source_count: number;
    beat_label: string;
  }>;
  top_corroborated: Array<{
    beat_label: string;
    lede: string;
    source: string;
    url: string;
    corroboration: number;
  }>;
  timeline: Array<{ day: string; items: number; events: number }>;
}

/** Aggregate the pipeline's state for the dashboard. Data is small enough
 *  to pull and aggregate in-process (20 beats, ~hundreds of items/events). */
export async function getDashboardStats(db: SupabaseClient): Promise<DashboardStats> {
  const [beatsRes, packsRes, itemsRes, eventsRes] = await Promise.all([
    db.from("beats").select("beat_id, label"),
    db.from("packs").select("pack_id, beat_id, computed_at, item_count"),
    db.from("pack_items")
      .select("pack_id, lede, url, source, published_at, event_id, corroboration")
      .order("published_at", { ascending: false })
      .limit(1000),
    db.from("events").select("event_id, beat_id, title, source_count"),
  ]);

  const beats = (beatsRes.data ?? []) as Array<{ beat_id: string; label: string }>;
  const packs = (packsRes.data ?? []) as Array<{
    pack_id: string; beat_id: string; computed_at: string; item_count: number;
  }>;
  const items = (itemsRes.data ?? []) as Array<{
    pack_id: string; lede: string; url: string; source: string;
    published_at: string; event_id: string | null; corroboration: number;
  }>;
  const events = (eventsRes.data ?? []) as Array<{
    event_id: string; beat_id: string; title: string | null; source_count: number;
  }>;

  const beatByPack = new Map(packs.map((p) => [p.pack_id, p.beat_id]));
  const labelById = new Map(beats.map((b) => [b.beat_id, b.label]));
  const computedByBeat = new Map<string, string | null>();
  for (const p of packs) {
    const prev = computedByBeat.get(p.beat_id);
    if (!prev || p.computed_at > prev) computedByBeat.set(p.beat_id, p.computed_at);
  }

  const itemsByBeat = new Map<string, number>();
  const corrMaxByBeat = new Map<string, number>();
  const eventsByBeat = new Map<string, number>();
  for (const b of beats) {
    itemsByBeat.set(b.beat_id, 0);
    corrMaxByBeat.set(b.beat_id, 0);
    eventsByBeat.set(b.beat_id, 0);
  }
  let clustered = 0;
  let maxCorr = 0;
  for (const it of items) {
    const beatId = beatByPack.get(it.pack_id);
    if (beatId) itemsByBeat.set(beatId, (itemsByBeat.get(beatId) ?? 0) + 1);
    if (it.event_id) clustered += 1;
    if (it.corroboration > 0) {
      maxCorr = Math.max(maxCorr, it.corroboration);
      if (beatId) corrMaxByBeat.set(beatId, Math.max(corrMaxByBeat.get(beatId) ?? 0, it.corroboration));
    }
  }
  for (const ev of events) {
    eventsByBeat.set(ev.beat_id, (eventsByBeat.get(ev.beat_id) ?? 0) + 1);
  }

  const by_beat = beats
    .map((b) => ({
      beat_id: b.beat_id,
      label: b.label,
      items: itemsByBeat.get(b.beat_id) ?? 0,
      events: eventsByBeat.get(b.beat_id) ?? 0,
      corroboration_max: corrMaxByBeat.get(b.beat_id) ?? 0,
      last_computed_at: computedByBeat.get(b.beat_id) ?? null,
    }))
    .filter((b) => b.items > 0 || b.events > 0)
    .sort((a, b) => b.items - a.items);

  const recent = items.slice(0, 25).map((it) => ({
    beat_label: labelById.get(beatByPack.get(it.pack_id) ?? "") ?? "unknown",
    lede: it.lede,
    source: it.source,
    url: it.url,
    event_id: it.event_id,
    corroboration: it.corroboration,
    published_at: it.published_at,
  }));

  const clusters = events
    .map((ev) => ({
      event_id: ev.event_id,
      beat_id: ev.beat_id,
      title: ev.title,
      source_count: ev.source_count,
      beat_label: labelById.get(ev.beat_id) ?? "unknown",
    }))
    .sort((a, b) => b.source_count - a.source_count)
    .slice(0, 40);

  const top_corroborated = items
    .filter((it) => it.corroboration > 0)
    .sort((a, b) => b.corroboration - a.corroboration)
    .slice(0, 20)
    .map((it) => ({
      beat_label: labelById.get(beatByPack.get(it.pack_id) ?? "") ?? "unknown",
      lede: it.lede,
      source: it.source,
      url: it.url,
      corroboration: it.corroboration,
    }));

  const dayMap = new Map<string, { items: number; events: number }>();
  for (const it of items) {
    const day = (it.published_at ?? "").slice(0, 10);
    if (!day) continue;
    const cur = dayMap.get(day) ?? { items: 0, events: 0 };
    cur.items += 1;
    dayMap.set(day, cur);
  }
  const timeline = [...dayMap.entries()]
    .map(([day, v]) => ({ day, items: v.items, events: v.events }))
    .sort((a, b) => a.day.localeCompare(b.day));

  const lastIngestion = computedByBeat.size > 0
    ? [...computedByBeat.values()].filter(Boolean).sort().pop() ?? null
    : null;

  return {
    beats: beats.length,
    total_items: items.length,
    total_events: events.length,
    clustered_items: clustered,
    max_corroboration: maxCorr,
    last_ingestion_at: lastIngestion,
    by_beat,
    recent,
    clusters,
    top_corroborated,
    timeline,
  };
}
