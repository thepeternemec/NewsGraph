import { z } from "zod";
import { BEAT_ID_PATTERN } from "./beats.js";

/**
 * A single news item. v0.1 fields are required; Phase 5 enrichment fields
 * (summary, importance, signal_types, tickers, narrative_id, audience_briefs)
 * are additive and optional. Full article bodies are never included.
 */
export const ItemSchema = z.object({
  /** Short text, at most 320 characters. */
  lede: z.string().max(320),
  url: z.string().url(),
  source: z.string(),
  published_at: z.string(),
  first_indexed_at: z.string(),
  /** Legacy: provider event cluster id. Always null — clusters are per beat. */
  event_id: z.string().nullable().optional(),
  /** Legacy: distinct sources in a provider cluster. Always 0. */
  corroboration: z.number().int().nonnegative().optional(),
  concepts: z.array(z.string()),
  /** ISO 639-2/3 language code of the article. */
  lang: z.string().optional(),
  /** Score from −1 to 1, or null when unavailable. */
  sentiment: z.number().min(-1).max(1).nullable(),

  // ── Phase 5 enrichment (optional) ───────────────────────────────
  summary: z.string().max(160).optional(),
  importance: z.number().int().min(0).max(100).optional(),
  signal_types: z.array(z.string()).optional(),
  tickers: z.array(z.string()).optional(),
  narrative_id: z.string().optional(),
  audience_briefs: z
    .object({
      trader: z.string().max(240).optional(),
      creator: z.string().max(240).optional(),
      editorial: z.string().max(240).optional(),
    })
    .optional(),
});
export type Item = z.infer<typeof ItemSchema>;

/** A moved pack: at most 8 items within a bounded token estimate. */
export const PackSchema = z.object({
  beat_id: z.string().regex(BEAT_ID_PATTERN),
  beat_label: z.string(),
  computed_at: z.string(),
  freshness_slo_minutes: z.number().int().positive(),
  cursor: z.string().max(2048),
  moved: z.literal(true),
  item_count: z.number().int().min(0).max(8),
  items: z.array(ItemSchema).max(8),
  token_estimate: z.number().int().nonnegative().max(800),
  receipt_id: z.string(),
});
export type Pack = z.infer<typeof PackSchema>;

/** An unchanged poll: compact shape, no `items` key. */
export const UnchangedPollSchema = z.object({
  beat_id: z.string().regex(BEAT_ID_PATTERN),
  moved: z.literal(false),
  cursor: z.string().max(2048),
  item_count: z.literal(0),
  receipt_id: z.string(),
});
export type UnchangedPoll = z.infer<typeof UnchangedPollSchema>;

/** Poll/delta response union: full pack when moved, compact shape otherwise. */
export const PollResponseSchema = z.discriminatedUnion("moved", [
  PackSchema,
  UnchangedPollSchema,
]);
export type PollResponse = z.infer<typeof PollResponseSchema>;

export const PollRequestSchema = z.object({
  beat_id: z.string().regex(BEAT_ID_PATTERN),
  cursor: z.string().max(2048).optional(),
  depth_days: z.number().int().min(1).max(30).optional(),
});
export type PollRequest = z.infer<typeof PollRequestSchema>;

/** Hard limits of the pack contract. */
export const PACK_LIMITS = {
  max_items: 8,
  max_token_estimate: 800,
  max_lede_chars: 320,
  max_cursor_chars: 2048,
  max_depth_days: 30,
  max_body_bytes: 16 * 1024,
} as const;
