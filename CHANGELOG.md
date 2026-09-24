# Changelog

Not a version history — the project is one deployment, not a set of releases. This
is a record of decisions, because the reasoning is the thing that gets lost.

## 2026-09-22

- **`/v2/stories`** — the events behind a topic, not the coverage of them.
  Near-identical headlines are grouped and ordered by how many publishers carried
  each, so eleven reports of one court ruling appear as one story. Deliberately
  not an LLM: token overlap is deterministic, free and testable. On SPCX, 165
  articles screen down to 72 stories, the largest carried by 42 publishers.
- **`?q=` matches tickers.** It matched company names only, so `?q=spcx` found
  nothing while `?q=space` found SpaceX. Every ticker tested until then happened
  to appear inside its own company name.
- **The catalog is 1035 topics**, including SPCX. It is built from index
  constituents, which cannot see a recent IPO — a blind spot now written down.
- **Monetization plan** in `docs/MONETIZATION.md`: $0.20/day as a prepaid balance,
  because Stripe's fee exceeds a $0.20 charge. Phase 1 (a usage ledger that
  records and does not enforce) is live.

## 2026-09-21

- **Monetization groundwork** — `docs/MONETIZATION.md`, and the tables it needs.
- **The site was checked against the API and largely did not match.** The
  quickstart described a system three catalogs old; `/connect` advertised an SDK
  package that had been deleted; the FAQ promised stablecoin payments that were
  never built; the hero claimed 150,000 publishers, a number with no source.
  Fabricated numbers and stale claims are treated as bugs here.

## 2026-09-20

- **Guard rails, both earned the hard way.** A `pre-push` hook refuses to rewrite
  `main`, and branch protection enforces it server-side, because a pushed commit
  was amended once and came within one command of erasing a contributor's work. A
  `pre-commit` hook refuses code that does not compile, because a build was twice
  run with its output sent to `/dev/null` and the next command tested a stale
  artefact.
- **Drift guards.** Tests that assert the docs against the code: stated catalog
  sizes, tool lists both ways, and that no doc describes the pre-Google-News item
  shape. Every stale claim found that day was wrong for weeks and broke no test.

## 2026-09-19

- **1035 topics**: the S&P 500, the S&P 400, and the top 100 crypto assets.
- **Rate limiting with optional keys** — 120 requests/minute anonymous, 1200 with a
  key. Keys raise a ceiling; they unlock no data.
- **`/v2/brief`** — the top three headlines verbatim, with no synthesis. A brief
  that paraphrases can be wrong while reading well.
- **`/v2/topics` pagination**, and `article_count` / `recent_12h` per topic.
