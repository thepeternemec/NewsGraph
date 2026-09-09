# Pleiades — Architecture

System design for the Real-Time News Terminal. Phase tags refer to [ROADMAP.md](ROADMAP.md).

## 1. Big picture

```
                     ┌─────────────────────────────────────────────────────┐
                     │              newsapi.ai (Event Registry)            │
                     │  concept-URI search · event clusters · sentiment    │
                     └───────────────────────┬─────────────────────────────┘
                                             │ getArticles / getEvents
                                             ▼
 ┌───────────────────────────────────────────────────────────────────────────────┐
 │  ingestion worker (Supabase Edge Function, cron) — Phase 1                     │
 │  scheduler → fetch per beat → dedupe → event linkage → LLM triage (Phase 5)    │
 │  → materialize pack (≤8 items, ≤800 tokens) → advance high-water mark          │
 └───────────────────────┬───────────────────────────────────────────────────────┘
                         │ persist
                         ▼
 ┌───────────────────────────────────────────────────────────────────────────────┐
 │  Supabase (Postgres) — the single system of record                            │
 │  beats · articles_raw · packs · pack_items · ledgers · receipts · webhooks    │
 │  Realtime broadcasts on pack insert (Phase 2 push)                             │
 └───────────────┬───────────────────────────────────┬───────────────────────────┘
                 │ reads                             │ Realtime / poll
                 ▼                                   ▼
 ┌──────────────────────────┐        ┌───────────────────────────────────────────┐
 │  REST API (Edge Function)│        │  Delivery edges                             │
 │  /v1/catalog /tools      │        │  · WS push via Supabase Realtime (Phase 2) │
 │  /v1/poll /delta (meter) │        │  · webhooks → customer CMS (Phase 2)       │
 │  /v1/pricing /openapi    │        │  · Telegram / Discord bots (Phase 3)       │
 │  x402 rails (Phase 4)    │        │  · MCP server (Phase 4)                    │
 └──────────┬───────────────┘        │  · Virtuals ACP jobs & memos (Phase 4)     │
            │                        └───────────────────────────────────────────┘
            ▼
   consumers: trading stacks · agents · creators · newsrooms
```

## 2. Core invariants

1. **One provider query serves all subscribers of a beat.** Packs are materialized per beat, never per user request. Provider cost is `O(beats × refresh_rate)`, not `O(users)`. This is the economic foundation of the whole product.
2. **One item format everywhere.** `@pleiades/contracts` defines the item/pack schema; REST, WS, webhooks, bots, ACP memos, and briefings all reuse it. No surface invents its own shape.
3. **Bounded tokens, amortized intelligence.** All enrichment (summaries, importance, signals, narratives) is computed once at pack time. Consumers never pay a per-user LLM cost.
4. **Rail-agnostic billing.** Receipts carry a `rail` field; prepaid `X-PAYMENT` credentials, x402 USDC, and Stripe are interchangeable rails on the same ledger.
5. **Pull is the reference protocol; push is an accelerator.** WS events and webhooks are delta pages with the same cursor/receipt semantics as REST poll/delta.

## 3. Components

| Component | Repo path | Phase | Notes |
|---|---|---|---|
| Canonical schemas | `packages/contracts` | 0 | Zod schemas + types + error codes + seed catalog (20 beats) |
| TypeScript SDK | `packages/sdk` | 0 | Typed client: catalog/poll/delta + webhook registration |
| Realtime client | `packages/realtime` | 2 | `PleiadesRealtime`: pack inserts → canonical packs via Supabase Realtime |
| REST API (runtime) | `supabase/functions/api` | 0–4 | Hono on Supabase Edge Functions — the canonical deployment |
| REST API (dev mirror) | `apps/api` | 0–4 | Same routes on Node for local dev; optional Vercel fallback |
| Ingestion worker (runtime) | `supabase/functions/worker` | 1–2 | Scheduled Edge Function: newsapi.ai → packs → webhook delivery |
| Ingestion worker (dev mirror) | `apps/worker` | 1–2 | Node dev surface; logic synced to the function |
| Bots | `apps/bots` | 3 | Telegram/Discord delivery over the pack pipeline |
| Landing site | `apps/web` | parallel | pleiades.news — the only thing hosted on Vercel |
| DB schema | `supabase/migrations` | 1 | packs, items, ledgers, receipts, webhooks |
| Deno shared modules | `supabase/functions/_shared` | 0 | GENERATED — keep in sync via `npm run sync:supabase` |
| Sync generator | `scripts/sync-supabase.mjs` | 0 | Single source of truth → Deno bundles |
| CI | `.github/workflows/ci.yml` | 0 | build → test → drift check + deno check |

## 4. Data flow — one beat cycle

```
beat (catalog) ─ refresh_interval_minutes ─▶ scheduler
  └▶ newsapi.ai getArticles(concept_uris, languages, window, skipDuplicates)
  └▶ event linkage: getEvents → event_id + corroboration
  └▶ normalize → articles_raw (upsert by provider URI)
  └▶ pack generation: rank → ≤8 items → ≤800 token estimate → lede ≤320 chars
  └▶ persist pack + advance high-water → new signed cursor
  └▶ emit: Supabase Realtime / WS / webhook / bot push (Phase 2+)
```

## 5. The ledger

- `ledgers` — per-principal prepaid balance (micros, integer strings on the wire).
- `receipts` — immutable: `receipt_id, agent_id, call, beat_id, amount_micros, rail, settled_at`.
- Rails today: `manual` (legacy v0.1) · `prepaid` · later `x402`, `acp`, `stripe`.
- Metered calls require an idempotency key (Phase 0 fix F2): repeat of a settled key replays the original response and receipt, never re-debits.

## 6. Deployment — Supabase-first (decided)

**Supabase is the single platform** for the backend; **Vercel hosts only the website/docs**.

- **Postgres, Auth, Storage:** Supabase. Schema in `supabase/migrations` (`supabase db push`).
- **REST API:** `supabase/functions/api` Edge Function (public, `verify_jwt = false`). `apps/api` remains a Node dev mirror — same routes, no drift (generated from canonical sources).
- **Ingestion:** `supabase/functions/worker` Edge Function, scheduled via `[functions.worker] schedule` in `config.toml` (or pg_cron for per-beat fan-out later). One invocation = one pass; keep enrichment bounded to fit Edge Function limits.
- **Push:** Supabase Realtime on `packs` inserts — no dedicated WebSocket server. A dedicated gateway is only a later option if fan-out outgrows Realtime plan caps.
- **Web/docs:** `apps/web` (Next.js) on Vercel — the only Vercel usage. Legacy v0.1 origin `openbeat.vercel.app` stays until cutover.
- **Deno shared code:** `supabase/functions/_shared` is generated by `npm run sync:supabase` from `packages/contracts` + `apps/{api,worker}/src` (single source of truth). CI fails on drift (`npm run check:supabase`) and type-checks the functions with Deno.
- **Secrets:** `supabase secrets set NEWSAPI_API_KEY …`; `.env` for local Node dev (never committed).

## 7. Phase alignment

| Phase | Builds |
|---|---|
| 0 | contract fixes: idempotency, `/v1/pricing`, `/openapi.json`, clean resolve errors |
| 1 | live ingestion: worker + Supabase → real packs behind poll/delta |
| 2 | WebSocket + signed webhooks |
| 3 | Telegram + Discord bots |
| 4 | MCP server, x402 rail, Virtuals ACP jobs/memos |
| 5 | intelligence layer: triage, summaries, signals, narratives, briefings, self-service beats |
| 6 | scale: multi-tenancy, self-service billing, catalog expansion, compliance |

Full detail in [ROADMAP.md](ROADMAP.md); contract sketches in [V2-CONTRACT.md](V2-CONTRACT.md).
