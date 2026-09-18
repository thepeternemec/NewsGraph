import { z } from "zod";

/** Stable beat identifier: `b_` + 12 hex characters (legacy v0.1 format, preserved). */
export const BEAT_ID_PATTERN = /^b_[0-9a-f]{12}$/;

/** Language codes are ISO 639-2/3 triples, e.g. `eng`, `deu`, `zho`. */
export const LanguageCodeSchema = z.string().regex(/^[a-z]{3}$/);

export const BeatSchema = z.object({
  beat_id: z.string().regex(BEAT_ID_PATTERN),
  label: z.string(),
  /** The exchange ticker or coin symbol, for display. */
  ticker: z.string(),
  /**
   * Which market this belongs to. A coin and a company can share a ticker —
   * Sui and Sun Communities are both SUI — and nothing in the symbol says which
   * is which, so the data has to.
   */
  asset: z.enum(["equity", "crypto"]).optional(),
  /**
   * Headline keywords. This is the matching mechanism: English articles whose
   * *title* contains any of these. Deliberately names rather than bare tickers
   * — "S" or "NOW" as a keyword matches most of the English language.
   */
  keywords: z.array(z.string()).min(1),
  /** Wikipedia concept URIs. Optional: the catalog matches on keywords. */
  concept_uris: z.array(z.string().url()).optional(),
  /** newsapi.ai Topic Page URI, for a curated topic profile. */
  topic_page_uri: z.string().optional(),
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
