# NewsGraph — Architecture

System design for NewsGraph. This document reflects the simplified system layout described in [STATUS.md](STATUS.md).

---

## 1. Big picture

```
                    ┌─────────────────────────────────────────────────────────┐
                    │               newsapi.ai (Event Registry)               │
                    │         concept-URI / keyword queries · articles        │
                    └────────────────────────────┬────────────────────────────┘
                                                 │ getArticles
                                                 ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│  Ingestion Worker (Edge Function: news-worker)                                              │
│  fetch per beat → normalizeArticles (lang="eng", clean URLs, dedup) → persistNews           │
└────────────────────────────────────────┬────────────────────────────────────────────────────┘
                                         │ append_news_articles (RPC)
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│  Supabase (Postgres) — single system of record                                              │
│  beats · news_articles · news_ingestion_status · news_worker_keys                           │
└────────────────────────────────────────┬────────────────────────────────────────────────────┘
                                         │ typed reads (@newsgraph/db)
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│  REST API & MCP (Edge Function: news-api / canonical: apps/api)                             │
│  GET /v2/topics · GET /v2/news · GET /v2/changes · GET /v2/tools · /mcp · /health           │
│  (Read-only, no credentials required, no billing/metering)                                  │
└────────────────────────────────────────┬────────────────────────────────────────────────────┘
                                         │ JSON / MCP Protocol
                                         ▼
                 Consumers: AI agents · MCP clients · terminal apps · web UI
```

---

## 2. Core principles & invariants

1. **Read-only and open:** The news API requires no credentials, API keys, or metering rails for consumers. An agent queries a topic and gets back either "nothing moved" or cited stories.
2. **Single source of truth for contracts:** `packages/contracts` defines wire shapes (Zod schemas and TypeScript types) shared across REST routes, MCP tools, and ingestion workers. No surface invents its own shape.
3. **Canonical Node sources with generated Deno mirrors:** Canonical backend code is authored in Node (`packages/contracts`, `packages/db`, `apps/api`, `apps/worker`). Deno Edge Functions consume these via generated modules in `supabase/functions/_shared/`. CI strictly enforces that generated modules do not drift.
4. **Clean separation of data access:** Database operations live exclusively in `packages/db` as pure functions accepting a Supabase client, keeping them testable against stubs.

---

## 3. System components

| Component | Repository path | Role & Description |
|---|---|---|
| **Contracts** | `packages/contracts` | Canonical Zod schemas, TypeScript types, error codes, and seed topic catalog (`SEED_BEATS`). |
| **Database layer** | `packages/db` | Typed read access over Supabase client (`getTopics`, `getNews`, `getChanges`, `resolveCursor`). |
| **API (Canonical)** | `apps/api` | Canonical Hono application serving `/v2/*`, `/mcp`, and `/health`. Copied to `news-api` Edge Function. |
| **Worker (Canonical)** | `apps/worker` | News normalization and persistence logic (`normalizeArticles`, `persistNews`, `NewsApiClient`). |
| **Website** | `apps/web` | Public landing page, documentation, dashboard, and connection guides. |
| **Edge Functions** | `supabase/functions/` | Deployed Edge Functions (`news-api`, `news-worker`) and generated shared code (`_shared/`). |
| **Sync generator** | `scripts/sync-supabase.mjs` | Rewrites Node source modules to Deno-compatible imports in `_shared/`. |

---

## 4. Request path

Clients interact with NewsGraph via REST endpoints or the Model Context Protocol (MCP):

```
Client (Agent / Browser)
   │
   ▼
Edge Function: news-api (Hono)
   ├── GET /v2/topics    -> db.getTopics(client)
   ├── GET /v2/news      -> db.getNews(client, { beat_id, limit, since })
   ├── GET /v2/changes   -> db.getChanges(client, { beat_id, cursor, limit })
   ├── GET /v2/tools     -> Tool descriptions (OpenAI format)
   ├── ALL /mcp          -> MCP Server transport (list_tools, call_tool)
   └── GET /health       -> Service health status
   │
   ▼
packages/db (queries)
   │
   ▼
Supabase Postgres
   ├── beats
   └── news_articles
```

- **Validation:** Requests are validated against `packages/contracts` Zod schemas.
- **Cursor-based changes:** `/v2/changes` accepts a signed cursor generated by `packages/db`. If no new articles have been published since the cursor, it reports nothing moved rather than returning duplicates.

---

## 5. Ingestion pipeline

The ingestion worker (`news-worker`) runs on a trigger/timer to sync upstream news:

```
Provider (newsapi.ai)
   │
   │ (batches of up to 100 articles)
   ▼
apps/worker/src/newsapi.ts (NewsApiClient)
   │
   ▼
apps/worker/src/ingest-news.ts (normalizeArticles)
   │  1. Language filter: retain only English (`lang === "eng"`)
   │  2. URL sanitization: strip tracking parameters (`utm_*`, `fbclid`, `gclid`), remove hash
   │  3. Deduplication: in-memory URL deduplication per batch
   │  4. HTML stripping: strip tags from title and body excerpt
   │  5. Bounds checking: limit title to 240 chars, excerpt to 320 chars, source to 120 chars
   │  6. Timestamp sanity: drop articles older than 30 days or > 5 mins in future
   ▼
persistNews -> db.rpc("append_news_articles")
   │
   ▼
Postgres `news_articles` table
```

Freshness status is tracked per beat in `news_ingestion_status` (`last_checked_at`, `last_success_at`, `last_error`).

---

## 6. How contracts keep surfaces in agreement

`packages/contracts` is the central contract repository:
- **REST routes:** `apps/api/src/lib/news-routes.ts` validates incoming query parameters and formats outgoing responses using schemas from `packages/contracts`.
- **MCP server:** `apps/api/src/lib/mcp.ts` defines tool definitions directly from the same contract schemas.
- **Worker:** `apps/worker/src/newsapi.ts` maps provider responses into types consistent with the contract expectations.

Because all surfaces import the same Zod definitions and TypeScript types, schema updates propagate immediately across the REST API, MCP tools, and ingestion worker.

---

## 7. Supabase Edge Functions & Drift prevention

Supabase Edge Functions execute in the Deno runtime, whereas the core codebase uses Node.js and TypeScript project references.

1. **Generated code:** `supabase/functions/_shared/` contains Deno-compatible versions of `packages/contracts`, `packages/db`, `apps/api/src/lib`, and `apps/worker/src`.
2. **Synchronization:** `scripts/sync-supabase.mjs` transforms imports (e.g. replacing package imports with relative paths and specifying `npm:` specifiers).
3. **Drift check in CI:**
   ```bash
   npm run check:supabase  # runs: node scripts/sync-supabase.mjs --check
   ```
   If any developer modifies Node source files without running `npm run sync:supabase`, CI fails immediately.
4. **Type safety:** CI runs `deno check` on Edge Functions to ensure Deno-compatibility without runtime errors.
