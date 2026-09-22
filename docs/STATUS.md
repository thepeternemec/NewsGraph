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

- `/v2/topics` — **1035 topics**: 934 US-listed equities (the S&P 500, the S&P 400, and earlier
  additions) and the top 100 crypto assets. Paginated, and each carries `beat_id`, `label`,
  `ticker`, `asset`, `status`, `article_count` and `recent_12h`
- `/v2/news` — **~57,600 articles** from **Google News RSS**, free and key-less, 24-hour window
- Ingestion is **free**: no API key, no quota. `NEWSGRAPH_PROVIDER=newsapi` switches back to the
  paid provider, which is no longer the default precisely so it stops burning credits
- `/v2/changes` — signed, topic-bound cursors; a replay returns nothing rather than duplicates
- `/v2/brief` — the top three headlines **verbatim**, with source and UTC time. Deliberately not a
  summary: a brief that paraphrases can be wrong while reading well
- `/v2/tools` and `/mcp` — the same handlers, in OpenAI and MCP shape
- **Rate limits** — 120 requests/minute anonymous, 1200 with a key. Keys are optional and unlock no
  data; they raise a ceiling
- The site: landing, pricing, six docs pages, FAQ, dashboard, connect, `auth.md`

**Ingestion is scheduled and running.** Vercel Cron calls `/api/cron/ingest` every fifteen minutes;
all 1035 topics are checked on that cycle, and 966 of them currently carry articles. The 68 that do
not are thin small-caps with nothing published in a 24-hour window, not failures.

## Not built

- **WebSocket push.** Clients poll; there is no subscribe. `changes` already has the cursor
  semantics a push would need.
- **Write access.** Everything is read-only, by design rather than by omission.
- **Article ledes.** Google News carries no prose, so an item is a headline and nothing else.
- **Self-serve keys.** A key is issued by `npm run key:issue` on the server. There is no account,
  no sign-in and no form, so an agent cannot obtain a higher limit without a human.
- **Registration.** `auth.md` is published and states plainly that no registration is required
  *and* none is offered. The OAuth machinery the protocol describes does not exist.

## What to build next

Ordered by what unblocks the most. Each is scoped to one pull request.

1. **Self-serve keys, via WorkOS AuthKit.** The gap a real user hits first: the API is free and
   public, but the higher limit needs a human to run a script. AuthKit gives users accounts so they
   can hold their own key. This is the largest item here and the only one that needs a dependency.
2. **Article ledes.** One request per article, so it needs a budget and a decision about which
   articles are worth it. Everything downstream — clustering, a real brief — is blocked on it.
3. **A Python client.** `packages/sdk` was a thin TypeScript wrapper and has been removed. A Python
   one would be used by more people than anything else on this list.
4. **Push instead of poll.** `changes` already has the cursor semantics WebSocket needs.
5. **Cover the last 68 topics.** Thin small-caps with no 24-hour coverage. Either widen their
   keywords, lengthen their window, or accept that quiet is the answer.

## Known issues

- **A test file was previously vacuous.** `docs.test.ts`'s tool guard iterated over tool names it
  expected to find in the docs; no doc named one, so the loop never ran and the check could not
  fail. It is two-way now, but the shape is worth remembering: a guard that cannot fail is worse
  than no guard, because it reads as coverage.
- **`docs.test.ts` covers markdown, not the site.** It checks `AGENTS.md`, `README.md` and
  `STATUS.md`. A code sample on a page is outside it, which is how `/connect` advertised a deleted
  package for weeks without anything failing.
- **The 68 topics without coverage** may be genuine quiet or an over-strict headline filter. Worth
  watching across a few cycles before changing either.

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
