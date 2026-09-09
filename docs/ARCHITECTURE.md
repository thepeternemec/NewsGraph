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
 │  apps/worker — ingestion & pack generation (Phase 1)                           │
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
 │  apps/api (Hono)         │        │  Delivery edges                             │
 │  /v1/catalog /tools      │        │  · WS gateway (Phase 2)                    │
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
| TypeScript SDK | `packages/sdk` | 0 | Thin typed client for catalog/poll/delta |
| REST API | `apps/api` | 0–4 | Hono; Vercel-deployable via `src/vercel.ts` |
| Ingestion worker | `apps/worker` | 1 | newsapi.ai client + pack builder; scheduler fan-out per beat |
| Bots | `apps/bots` | 3 | Telegram/Discord delivery over the pack pipeline |
| Landing site | `apps/web` | parallel | pleiades.news vision page |
| DB schema | `infra/supabase/migrations` | 1 | packs, items, ledgers, receipts, webhooks |
| CI | `.github/workflows/ci.yml` | 0 | install → build → test |

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

## 6. Deployment

- **API + web:** Vercel (Hono via `src/vercel.ts`; Next.js app). Monorepo root-directory config per project.
- **Worker:** dedicated always-on host (Railway / Fly / ECS) or Supabase Edge + pg_cron — Vercel Cron plan limits make it unsuitable for per-beat fan-out.
- **WS:** Supabase Realtime first; dedicated gateway later if fan-out grows.
- **Secrets:** `.env` (never committed); provider key = `NEWSAPI_API_KEY`; Supabase keys per environment.

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
