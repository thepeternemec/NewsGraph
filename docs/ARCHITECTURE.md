# Architecture

One Next.js deployment on Vercel, one Postgres, one provider. Everything below fits on a page
because there is not much of it.

## The pieces

```
apps/web        the site  ─┐
                           ├─ one Vercel deployment
apps/api        the API   ─┘   mounted at /api/*
apps/worker     ingestion      called by a Vercel Cron route
packages/contracts   wire shapes (zod) — the single source of truth
packages/db          a Postgres client, nothing else
db/schema.sql        three tables and one function
```

`apps/api` is a Hono app. `apps/web/app/api/[[...route]]/route.ts` mounts it under `/api`, so the
site and the API are the same deployment with no CORS and no second host. The same Hono app runs
standalone on Node if you ever want that.

## A read request

```
client → /api/v2/news?beat_id=…&cursor=…
       → news.ts   verifies the signed cursor, runs one SQL query
       → Postgres  news_articles, filtered by topic and id boundary
       → a page of ≤8 items, re-bounded to ~1800 tokens, plus a new cursor
```

The cursor is an HMAC-signed `{beat, sequence, mode, expiry}`, not a session. That means the API
holds no state between calls and any instance can serve any request — which is what makes it fine
on serverless.

## Ingestion

```
Vercel Cron (*/15) → /api/cron/ingest → runIngestion()
        ├ one **Google News RSS** query per topic, quoted keywords OR'd,
        │   `when:1d`, English, four in flight at a time
        ├ drop results whose headline does not name the topic  ← see below
        ├ normalise: strip the " - Publisher" suffix, cap title 240
        └ append_news_articles(topic, batch)  ← one transaction per topic

**Google News is the default provider and it is free** — key-less, no quota.
`NEWSGRAPH_PROVIDER=newsapi` switches to the paid provider, which also supports
batching five topics per call (five topics per request rather than one) and
returns excerpts. The trade is real and deliberate: Google costs nothing but
gives a redirect URL and no excerpt.

Google matches the whole article, so its results **are** re-filtered on the
headline before storage. A topic's keyword must appear in the title to count.

This is the single most contentious rule here, so the reasoning is written down.
Google will happily return a film trailer that mentions a chip in passing, and
it can outrank real coverage — the first NVIDIA brief opened with one. Serious
coverage of a company names it, and coverage that does not is noise.

The cost is real and accepted: a story headlined "Chip stocks rally on AI
demand" no longer lands under NVIDIA even though it is about them. If a topic
looks thin, this rule is the first thing to reconsider — but check whether it is
thin or merely quiet first.
```

`append_news_articles` does three things atomically: inserts the batch, deduplicates on
`(beat_id, url)`, and stamps `news_ingestion_status`. Doing the insert and the freshness stamp in
one transaction is what stops `last_success_at` from ever disagreeing with what is actually
stored.

## Why `packages/contracts` matters

The same shape is used by the REST routes, the MCP tools, the OpenAPI document and the worker. If
a field changes it changes once, and the compiler finds every caller. It also refuses to describe
a field the API cannot return — which is the mechanism behind the project's one rule.

## Deliberate non-features

- **No article bodies.** Items carry a title, an excerpt and a publisher URL. There is no `body`
  column at any price.
- **No writes in the API.** Every route is read-only.
- **No sessions, no keys, no billing.** Read-only and public.
- **No queue.** Ingestion is one pass over the catalog; the advisory lock in the SQL makes
  concurrent runs safe rather than a scheduler's problem.

## Where things live

| Concern | File |
| --- | --- |
| The topic catalog | `packages/contracts/src/seed.ts` |
| Wire shapes | `packages/contracts/src/{beats,packs,news,errors}.ts` |
| SQL | `db/schema.sql`, and the queries in `apps/api/src/lib/news.ts` |
| Provider client | `apps/worker/src/newsapi.ts` |
| The schedule | `vercel.json` |
