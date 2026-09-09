// GENERATED FILE — do not edit directly.
// Source of truth: packages/contracts + apps/{api,worker}/src.
// Regenerate with: npm run sync:supabase

import { Hono } from "npm:hono@^4.6.14";
import {
  BeatSchema,
  PollRequestSchema,
  PRICE_CARD,
  SEED_BEATS,
  TOOL_DEFINITIONS,
} from "../contracts/index.ts";
import { errorByCode } from "./errors.ts";
import { openapi } from "./openapi.ts";
import { getPollSnapshot } from "./store.ts";

export const SERVICE = {
  name: "pleiades",
  version: "0.2.0",
  tagline: "The real-time news terminal.",
} as const;

const app = new Hono();

// ── Service descriptor ──────────────────────────────────────────────
app.get("/", (c) =>
  c.json({
    service: "Pleiades",
    version: SERVICE.version,
    description:
      "Real-time news terminal for agents and humans. News ingestion is not yet enabled in this codebase (Phase 1).",
    endpoints: {
      health: "/health",
      readiness: "/ready",
      catalog: "/v1/catalog",
      tools: "/v1/tools",
      pricing: "/v1/pricing",
      documentation: "/docs",
      openapi: "/openapi.json",
    },
  }),
);

// ── Health & readiness ──────────────────────────────────────────────
app.get("/health", (c) => c.json({ ok: true, service: SERVICE.name, version: SERVICE.version }));

// Readiness will verify the database migration table once Supabase is wired (Phase 1).
app.get("/ready", (c) => c.json({ ok: true, note: "database check pending Phase 1 wiring" }));

// ── Catalog ─────────────────────────────────────────────────────────
app.get("/v1/catalog", (c) => {
  const beats = [...SEED_BEATS]
    .map((b) => BeatSchema.parse(b))
    .sort((a, b) => a.label.localeCompare(b.label));
  return c.json({ beats });
});

// ── Agent tool definitions ──────────────────────────────────────────
app.get("/v1/tools", (c) => c.json({ tools: TOOL_DEFINITIONS }));

// ── Pricing (Phase 0 fix F3) ────────────────────────────────────────
app.get("/v1/pricing", (c) =>
  c.json({
    currency: PRICE_CARD.currency,
    unit: PRICE_CARD.unit,
    calls: PRICE_CARD.calls,
    depth_multipliers: PRICE_CARD.depth_multipliers,
    caps: {
      depth_ceiling_days: 30,
      pack_max_items: 8,
      pack_token_estimate: 800,
    },
    deposits: {
      manual: {
        rail: "manual",
        tiers: [
          {
            gross_micros: PRICE_CARD.manual_tier.gross_micros,
            fee_micros: "0",
            net_micros: PRICE_CARD.manual_tier.net_micros,
            buys_moved_polls: PRICE_CARD.manual_tier.buys_moved_polls,
          },
        ],
        instructions: "Operator-managed grants in v0.2; x402 self-service lands in Phase 4.",
      },
    },
  }),
);

// ── Resolve (Phase 0 fix F1: honest 503, never a bare 500) ──────────
app.post("/v1/resolve", (c) =>
  errorByCode(c, "resolution_unavailable", {
    message: "Live task resolution requires the graph adapter (Phase 1). Use /v1/catalog.",
  }),
);

// ── Metered routes: served from persisted packs once ingestion lands ─
// When Supabase is not configured (local dev without a stack), the routes
// return `pack_not_ready` — the correct contract state for no packs.
app.post("/v1/poll", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = PollRequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorByCode(c, "invalid_request", { detail: parsed.error.issues });
  }
  const known = SEED_BEATS.some((b) => b.beat_id === parsed.data.beat_id);
  if (!known) {
    return errorByCode(c, "beat_unavailable");
  }
  try {
    const snapshot = await getPollSnapshot(parsed.data.beat_id, parsed.data.cursor);
    if (snapshot) return c.json(snapshot);
  } catch (error) {
    console.error("poll snapshot failed:", error);
    return errorByCode(c, "internal_error");
  }
  return errorByCode(c, "pack_not_ready", {
    message: "No packs yet for this beat. Ingestion produces them on its schedule.",
  });
});

app.post("/v1/delta", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = PollRequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorByCode(c, "invalid_request", { detail: parsed.error.issues });
  }
  const known = SEED_BEATS.some((b) => b.beat_id === parsed.data.beat_id);
  if (!known) {
    return errorByCode(c, "beat_unavailable");
  }
  try {
    // Phase 1 delta: single-pack snapshot (multi-page delta lands with
    // per-pack pagination in a later iteration).
    const snapshot = await getPollSnapshot(parsed.data.beat_id, parsed.data.cursor);
    if (snapshot) return c.json(snapshot);
  } catch (error) {
    console.error("delta snapshot failed:", error);
    return errorByCode(c, "internal_error");
  }
  return errorByCode(c, "pack_not_ready", {
    message: "No packs yet for this beat. Ingestion produces them on its schedule.",
  });
});

// ── Docs & spec ─────────────────────────────────────────────────────
app.get("/docs", (c) =>
  c.json({
    guide: "https://github.com/pleiades/pleiades/tree/main/docs",
    openapi: "/openapi.json",
    roadmap: "https://github.com/pleiades/pleiades/blob/main/docs/ROADMAP.md",
  }),
);

app.get("/openapi.json", (c) => c.json(openapi));

// JSON 404 fallback.
app.notFound((c) => errorByCode(c, "invalid_request", { detail: "not_found" }));

export default app;
