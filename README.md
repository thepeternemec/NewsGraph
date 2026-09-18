---
name: NewsGraph
type: api
category: real-time news context for AI agents
auth: none (read-only, public)
pricing: free while in early access
topics: 20
articles: 532
languages: eng
live: https://newsgraph.vercel.app
api: https://newsgraph.vercel.app/api
repo: https://github.com/thepeternemec/NewsGraph
license: MIT
---

# NewsGraph

<p align="center">
  <a href="https://github.com/thepeternemec/NewsGraph/stargazers"><img src="https://img.shields.io/github/stars/thepeternemec/NewsGraph?style=for-the-badge&logo=github&color=yellow" alt="Stars"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=for-the-badge" alt="MIT"></a>
  <a href="https://github.com/thepeternemec/NewsGraph/commits/main"><img src="https://img.shields.io/github/last-commit/thepeternemec/NewsGraph?style=flat-square" alt="Last commit"></a>
  <a href="https://github.com/thepeternemec/NewsGraph/issues"><img src="https://img.shields.io/github/issues/thepeternemec/NewsGraph?style=for-the-badge&color=orange" alt="Issues"></a>
</p>

**Real-time news context for AI agents.** An agent asks a topic and a cursor, and gets back either
**"nothing moved"** or **a small pack of cited stories**. Read-only, no credential, no billing.

Live at **[newsgraph.vercel.app](https://newsgraph.vercel.app)** · API at
`https://newsgraph.vercel.app/api`

> ### Start with [docs/STATUS.md](docs/STATUS.md)
>
> What works today with verified numbers, what is not built, and the six things worth building
> next. It is one page and it is the honest state of this repository.

---

## Quick start

```bash
git clone https://github.com/thepeternemec/NewsGraph.git
cd NewsGraph
npm install
npm run build:packages     # contracts and db must exist before the apps compile
npm test                   # no network, no database, no API key
npm run dev                # the site and the API on http://localhost:3000
```

Then, against production — nothing below needs a credential:

```bash
NEWS=https://newsgraph.vercel.app/api

curl "$NEWS/v2/topics"                            # the catalog, with per-topic status
curl "$NEWS/v2/news?beat_id=b_bb964843350e"       # articles for one topic
curl "$NEWS/v2/changes?beat_id=b_bb964843350e&cursor=<cursor>"
curl "$NEWS/v2/tools"                             # the same tools in OpenAI shape
```

---

## The canonical loop

```
1. GET  /v2/topics                          pick a beat_id (once)
2. GET  /v2/news?beat_id=…                  read the baseline, keep the cursor
3. later: GET /v2/changes?beat_id=…&cursor=…
4. if moved: quote the headlines and cite the links
5. store the new cursor
```

Step 3 is the product. It returns only what appeared since that cursor, and an empty page is a
**success** — it means nothing happened.

`docs/ARCHITECTURE.md` explains the design; `AGENTS.md` is the same loop written for a coding
agent to follow.

---

## How it runs

**Everything is on Vercel.** One deployment serves the site and the API; the database is Postgres
from the Vercel dashboard, and ingestion is a Vercel Cron.

```
apps/web             the site, and the API mounted at /api/*   → Vercel
apps/api             the Hono app that serves /api/*           → @newsgraph/api
apps/worker          ingestion: provider → normalise → store    → run by the cron route
packages/contracts   every wire shape as a zod schema
packages/db          a Postgres client, and nothing else
db/schema.sql        three tables and one function
```

```
client → /api/v2/news?beat_id=…&cursor=…
       → apps/api  (one SQL query, signed cursor)
       → Postgres
       → ≤8 items, ~1800 tokens, plus a new cursor
```

`apps/api` is a Hono app mounted by `apps/web/app/api/[[...route]]/route.ts`, so there is no
second host, no CORS and no generated copy to keep in sync. It still runs standalone on Node via
`apps/api/src/server.ts` if you ever want that.

Setup, environment and the first ingestion: **[docs/GO-LIVE.md](docs/GO-LIVE.md)**.

---

## Rules that will come up in review

1. **Never claim more than the code does.** Every capability carries a status in STATUS.md and the
   README. Ship something, update those in the same PR.
2. **Wire shapes live in `packages/contracts`.** Change the schema, not just the handler.
3. **No article bodies, ever.** Items carry a headline, a link and the publisher's name. There is
   no `body` field at any price, and adding one is out of scope.
4. **The schema is in the repository.** Change `db/schema.sql` when you change the SQL — it is
   idempotent, so `npm run db:setup` re-applies it safely.

---

## Contributing

**[CONTRIBUTING-FIRST-PR.md](CONTRIBUTING-FIRST-PR.md)** — fresh clone to merged change.

The cheapest real contribution is a **topic**: seventeen of the twenty have no articles, and
[there is an issue template](https://github.com/thepeternemec/NewsGraph/issues/new?template=topic_request.yml)
that needs no code at all. After that, scheduling the worker (#1 in STATUS.md) is the single
highest-value change in the repository.

MIT licensed. No CLA. [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) has the ground rules.

---

## Docs

| Document | What it covers |
| --- | --- |
| **[docs/STATUS.md](docs/STATUS.md)** | **Where the project is, and what to build next** |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | How the pieces fit together |
| [docs/GO-LIVE.md](docs/GO-LIVE.md) | Database, environment, first ingestion |
| [AGENTS.md](AGENTS.md) | Integration guide for coding agents |
| [newsgraph.vercel.app/docs](https://newsgraph.vercel.app/docs) | The docs site |
