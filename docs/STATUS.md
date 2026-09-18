# Where the project is

Last verified: **2026-09-14** against production. Every number was read from the live system.

## What this is

An agent asks a topic and a cursor, and gets back either **"nothing moved"** or **a small pack of
cited stories**. Read-only. No credential, no billing.

## What exists

One API, one worker, one website. Nine packages became two.

| | |
| --- | --- |
| `apps/api` | `GET /v2/topics`, `/v2/news`, `/v2/changes`, `/v2/tools`, `/mcp`, `/health` |
| `apps/worker` | Ingestion: provider → English filter → dedupe → store |
| `packages/contracts` | Every wire shape as a zod schema — the single source of truth |
| `packages/db` | A Postgres client, and nothing else |
| `apps/web` | The site |
| `db/schema.sql` | Three tables and one function |

`apps/api` is a Hono app mounted at `/api/*` by the Next app, so the site and the API are one
Vercel deployment. There is no generated code and no second runtime.

## Verified working

- `/v2/topics` — **1034 topics**, the S&P 500 plus earlier additions. Each carries `beat_id`, `label`,
  `ticker`, `status`, `article_count` and `recent_12h`
- `/v2/news` — **~32,000 articles** from **Google News RSS**, free and key-less, 24-hour window
- Ingestion is **free**: no API key, no quota. `NEWSGRAPH_PROVIDER=newsapi` switches back to the
  paid provider, which is no longer the default precisely so it stops burning credits
- `/v2/changes` — signed, topic-bound cursors; a replay returns nothing rather than duplicates
- `/v2/tools` and `/mcp` — the same handlers, in OpenAI and MCP shape
- The site: landing, pricing, five docs pages, FAQ, dashboard, connect

The three pilot topics are `stale`, not healthy: they ingested once and have not been rescheduled.
**Nothing is scheduled** — `cron.job` is empty. That is the single biggest gap.

## Not built

- **Scheduled ingestion.** The worker runs, but nothing calls it on a timer.
- **`POST /v2/brief`** — a written summary rather than a list.
- **WebSocket push.** Clients poll; there is no subscribe.
- **Write access.** Everything is read-only.
- **Per-topic article counts** in `/v2/topics`, so a client cannot see where the data is without
  querying each topic.

## What to build next

Ordered by what unblocks the most. Each is scoped to one pull request.

1. **Excerpts.** Google News carries no prose, so items have a headline and nothing else. Fetching
   the lede would mean one request per article.
2. **Restore crypto when it earns its place.** Crypto was removed deliberately: a coin trades
   continuously and a share does not, and mixing them made both harder to reason about. The stored
   articles are untouched, so restoring the list is a paste into `seed.ts`.
3. **Build `brief`.** The contract is the easy part; the interesting question is what a good
   three-sentence brief contains.
4. **A Python client.** `packages/sdk` was a thin TypeScript wrapper and has been removed. A Python
   one would be used immediately by more people than anything else here.
5. **Push instead of poll.** `changes` already has the cursor semantics WebSocket needs.

## Known issues

- `apps/web/app/(site)/docs/` and the pricing page still describe an earlier, larger API. They are
  the next thing to rewrite.

## Verify any of this yourself

No credential, and the first three need no database.

```bash
git clone https://github.com/thepeternemec/NewsGraph.git
cd NewsGraph && npm install && npm run build:packages && npm test
```

```bash
NEWS=https://newsgraph.vercel.app/api
curl "$NEWS/v2/topics"                              # 4 topics
curl "$NEWS/v2/news?beat_id=b_bb964843350e"         # NVIDIA
```

If the site ever disagrees with these commands, **the site is wrong** — open an issue.

## How this stays true

**Never let the site or the docs claim more than the code does.** If you ship something, update
this file and the README in the same pull request.
