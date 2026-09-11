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
  lang?: string | null;
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
      lang: row.lang ?? undefined,
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
  total_articles: number;
  total_clusters: number;
  english_only: boolean;
  last_ingestion_at: string | null;
  by_beat: Array<{
    beat_id: string;
    label: string;
    articles: number;
    last_computed_at: string | null;
  }>;
  /** Article clusters — one per beat: the beat's bucket of English articles. */
  clusters: Array<{
    cluster_id: string;
    beat_id: string;
    label: string;
    articles: number;
    latest_at: string | null;
  }>;
  recent: Array<{
    beat_label: string;
    lede: string;
    source: string;
    url: string;
    published_at: string;
    lang: string | null;
  }>;
  timeline: Array<{ day: string; articles: number }>;
}

const ENGLISH = "eng";

/**
 * Aggregate the pipeline for the dashboard.
 *
 * v0.3: English-only. No provider event clustering — an article cluster is a
 * beat's bucket of articles, so `clusters` is derived from beats + packs.
 */
export async function getDashboardStats(db: SupabaseClient): Promise<DashboardStats> {
  const [beatsRes, packsRes, itemsRes] = await Promise.all([
    db.from("beats").select("beat_id, label"),
    db.from("packs").select("pack_id, beat_id, computed_at, item_count"),
    db
      .from("pack_items")
      .select("pack_id, lede, url, source, published_at, lang")
      .or(`lang.is.null,lang.eq.${ENGLISH}`)
      .order("published_at", { ascending: false })
      .limit(1000),
  ]);

  const beats = (beatsRes.data ?? []) as Array<{ beat_id: string; label: string }>;
  const packs = (packsRes.data ?? []) as Array<{
    pack_id: string; beat_id: string; computed_at: string; item_count: number;
  }>;
  const items = (itemsRes.data ?? []) as Array<{
    pack_id: string; lede: string; url: string; source: string;
    published_at: string; lang: string | null;
  }>;

  const beatByPack = new Map(packs.map((p) => [p.pack_id, p.beat_id]));
  const labelById = new Map(beats.map((b) => [b.beat_id, b.label]));
  const computedByBeat = new Map<string, string | null>();
  for (const p of packs) {
    const prev = computedByBeat.get(p.beat_id);
    if (!prev || p.computed_at > prev) computedByBeat.set(p.beat_id, p.computed_at);
  }

  const articlesByBeat = new Map<string, number>();
  const latestByBeat = new Map<string, string | null>();
  for (const b of beats) {
    articlesByBeat.set(b.beat_id, 0);
    latestByBeat.set(b.beat_id, null);
  }
  for (const it of items) {
    const beatId = beatByPack.get(it.pack_id);
    if (!beatId) continue;
    articlesByBeat.set(beatId, (articlesByBeat.get(beatId) ?? 0) + 1);
    const prev = latestByBeat.get(beatId);
    if (!prev || it.published_at > prev) latestByBeat.set(beatId, it.published_at);
  }

  const by_beat = beats
    .map((b) => ({
      beat_id: b.beat_id,
      label: b.label,
      articles: articlesByBeat.get(b.beat_id) ?? 0,
      last_computed_at: computedByBeat.get(b.beat_id) ?? null,
    }))
    .filter((b) => b.articles > 0)
    .sort((a, b) => b.articles - a.articles);

  const clusters = by_beat.map((b) => ({
    cluster_id: b.beat_id,
    beat_id: b.beat_id,
    label: b.label,
    articles: b.articles,
    latest_at: latestByBeat.get(b.beat_id) ?? null,
  }));

  const recent = items.slice(0, 40).map((it) => ({
    beat_label: labelById.get(beatByPack.get(it.pack_id) ?? "") ?? "unknown",
    lede: it.lede,
    source: it.source,
    url: it.url,
    published_at: it.published_at,
    lang: it.lang,
  }));

  const dayMap = new Map<string, number>();
  for (const it of items) {
    const day = (it.published_at ?? "").slice(0, 10);
    if (!day) continue;
    dayMap.set(day, (dayMap.get(day) ?? 0) + 1);
  }
  const timeline = [...dayMap.entries()]
    .map(([day, articles]) => ({ day, articles }))
    .sort((a, b) => a.day.localeCompare(b.day));

  const lastIngestion = computedByBeat.size > 0
    ? [...computedByBeat.values()].filter(Boolean).sort().pop() ?? null
    : null;

  return {
    beats: beats.length,
    total_articles: items.length,
    total_clusters: clusters.length,
    english_only: true,
    last_ingestion_at: lastIngestion,
    by_beat,
    clusters,
    recent,
    timeline,
  };
}
