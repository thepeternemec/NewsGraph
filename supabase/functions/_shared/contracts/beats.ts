// GENERATED FILE — do not edit directly.
// Source of truth: packages/contracts + apps/{api,worker}/src.
// Regenerate with: npm run sync:supabase

import { z } from "npm:zod@^3.24.1";

/** Stable beat identifier: `b_` + 12 hex characters (legacy v0.1 format, preserved). */
export const BEAT_ID_PATTERN = /^b_[0-9a-f]{12}$/;

/** Language codes are ISO 639-2/3 triples, e.g. `eng`, `deu`, `zho`. */
export const LanguageCodeSchema = z.string().regex(/^[a-z]{3}$/);

export const BeatSchema = z.object({
  beat_id: z.string().regex(BEAT_ID_PATTERN),
  label: z.string(),
  /** Wikipedia concept URIs — the exact dialect newsapi.ai queries with. */
  concept_uris: z.array(z.string().url()),
  /** newsapi.ai Topic Page URI — the preferred curated topic profile (v0.2). */
  topic_page_uri: z.string().optional(),
  /** Exact-phrase keywords as a secondary filter (MCP search pattern). */
  keywords: z.array(z.string()).optional(),
  topic_filters: z.array(z.string()),
  languages: z.array(LanguageCodeSchema),
  excludes: z.string(),
  state: z.enum(["warm", "cold"]),
  refresh_interval_minutes: z.number().int().positive(),
  freshness_slo_minutes: z.number().int().positive(),
});
export type Beat = z.infer<typeof BeatSchema>;

export const CatalogResponseSchema = z.object({
  beats: z.array(BeatSchema),
});
export type CatalogResponse = z.infer<typeof CatalogResponseSchema>;
