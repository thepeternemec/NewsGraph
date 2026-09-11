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
  WebhookRegisteredSchema,
  WebhookRegistrationRequestSchema,
} from "../contracts/index.ts";
import {
  createSupabaseClient,
  getDashboardStats,
  hasSupabaseEnv,
  insertWebhook,
  listWebhooks,
  revokeWebhook,
} from "../db/index.ts";
import { errorByCode } from "./errors.ts";
import { openapi } from "./openapi.ts";
import { getPollSnapshot } from "./store.ts";

export const SERVICE = {
  name: "pleiades",
  version: "0.2.0",
  tagline: "The real-time news terminal.",
} as const;

const app = new Hono();

// ── CORS (public API; consumed by the dashboard and agents) ─────────
app.use("*", async (c, next) => {
  c.header("Access-Control-Allow-Origin", "*");
  c.header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  c.header("Access-Control-Allow-Headers", "Content-Type, X-PAYMENT, Authorization, Idempotency-Key");
  if (c.req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }
  await next();
});

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

// ── Dashboard stats (public; drives the demo UI) ────────────────────
app.get("/v1/stats", async (c) => {
  if (!hasSupabaseEnv()) return errorByCode(c, "database_not_configured");
  const db = createSupabaseClient();
  if (!db) return errorByCode(c, "database_not_configured");
  try {
    return c.json(await getDashboardStats(db));
  } catch (error) {
    console.error("stats failed:", error);
    return errorByCode(c, "internal_error");
  }
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
      daily_cap_micros: 500000,
      distinct_beats_per_day: 50,
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

// ── Webhooks (Phase 2) ──────────────────────────────────────────────
// Single-operator mode until workspaces land (Phase 6): no per-agent
// scoping yet. The secret is returned exactly once, at registration.
app.post("/v1/webhooks", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = WebhookRegistrationRequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorByCode(c, "invalid_request", { detail: parsed.error.issues });
  }
  const { url, beat_ids } = parsed.data;

  const target = new URL(url);
  if (target.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(target.hostname)) {
    return errorByCode(c, "invalid_request", { detail: "url must be https" });
  }
  const unknown = beat_ids.filter((id) => !SEED_BEATS.some((b) => b.beat_id === id));
  if (unknown.length > 0) {
    return errorByCode(c, "beat_unavailable", { detail: unknown });
  }
  if (!hasSupabaseEnv()) return errorByCode(c, "database_not_configured");
  const db = createSupabaseClient();
  if (!db) return errorByCode(c, "database_not_configured");

  const secret =
    crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  try {
    const row = await insertWebhook(db, { url, beat_ids, hmac_secret: secret });
    return c.json(
      WebhookRegisteredSchema.parse({
        webhook_id: row.webhook_id,
        url: row.url,
        beat_ids: row.beat_ids,
        state: row.state,
        created_at: row.created_at,
        secret,
      }),
      201,
    );
  } catch (error) {
    console.error("webhook registration failed:", error);
    return errorByCode(c, "internal_error");
  }
});

app.get("/v1/webhooks", async (c) => {
  if (!hasSupabaseEnv()) return errorByCode(c, "database_not_configured");
  const db = createSupabaseClient();
  if (!db) return errorByCode(c, "database_not_configured");
  try {
    return c.json({ webhooks: await listWebhooks(db) });
  } catch (error) {
    console.error("webhook list failed:", error);
    return errorByCode(c, "internal_error");
  }
});

app.delete("/v1/webhooks/:id", async (c) => {
  const id = c.req.param("id");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return errorByCode(c, "invalid_request", { detail: "webhook_id must be a uuid" });
  }
  if (!hasSupabaseEnv()) return errorByCode(c, "database_not_configured");
  const db = createSupabaseClient();
  if (!db) return errorByCode(c, "database_not_configured");
  try {
    await revokeWebhook(db, id);
    return c.json({ webhook_id: id, state: "revoked" });
  } catch (error) {
    console.error("webhook revoke failed:", error);
    return errorByCode(c, "internal_error");
  }
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
