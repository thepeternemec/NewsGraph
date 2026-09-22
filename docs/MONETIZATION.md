# Monetization

The decision: **the API stops being anonymous and starts being metered.** A trial
balance is granted on signup, calls draw it down, and Stripe tops it up. Each
account has a profile showing its agents, usage and balance.

This document is the plan. The schema is in `db/schema.sql`; the rest is not
built.

## What this costs us

Thirteen statements across fifteen files promise the API needs no credential,
no signup and no billing. **All of them become false.** They are:

```
README.md · AGENTS.md · docs/STATUS.md · docs/ARCHITECTURE.md
llms.txt · auth.md · skill.md · /docs · /docs/quickstart
/docs/connect · /pricing · the landing · the dashboard
```

They must be rewritten in the same commit that enforces metering, not after.
This repository has spent a day chasing claims that quietly stopped being true —
an SDK that had been deleted, a catalog described as four topics three catalogs
after it grew, an `excerpt` field that only legacy rows populate. Shipping the
meter first and the docs later would be the same mistake at the largest scale
yet.

`auth.md` is the sharpest case: it was published stating *"register nothing,
send no credential"*, and it is the file agents read first.

## Money is integers

Costs are stored in **micro-dollars**: $0.0005 is `500`. Never a float. A float
accumulates error across millions of sub-cent calls, and the error would fall in
our favour, which is the worst direction for it to fall.

## The ledger is the source of truth

`api_usage` counts requests per minute in a bucket. It can rate-limit; it cannot
bill, because it aggregates and forgets individual calls. `usage_ledger` records
one row per billable call with `cost_micro` and `credits_after`, so a dispute is
answerable without replaying history.

Enforcement is one transaction: read balance, refuse if short, else decrement and
write the ledger row.

## Prices

Already published on the landing and `/pricing`, so they are not a new decision:

| Call | Cost | Micro |
| --- | --- | --- |
| check · nothing new | $0.0005 | 500 |
| check · something moved | $0.004 | 4,000 |
| delta · cold | $0.02 | 20,000 |
| brief | $0.03 | 30,000 |

Trial: **$5.00**, no card.

## One design note against the decision

Metering *everything* means a customer pays to discover what they can buy —
`/v2/topics` is the call that tells you what exists. Charging for it puts a
toll booth in front of the shop window.

The recommendation is that the catalog is **free and rate-limited**, and every
call that returns news is metered. That is a one-line exception rather than an
architecture change, and it keeps discovery free. Recorded here so the choice is
deliberate rather than forgotten.

## Build order

Each phase is independently shippable.

1. **The ledger, recording only.** No enforcement. Proves the costs are right
   against real traffic before anyone is refused.
2. **Accounts and keys.** WorkOS AuthKit for identity; a key is issued on signup.
   This is the self-serve key gap already open as #1 in STATUS.md.
3. **Balance and enforcement.** 402 when short, with a top-up link. Never a
   silent failure.
4. **Stripe top-up.** Checkout for a one-off balance. The `topups` table is
   keyed by Checkout session id so a replayed webhook cannot credit twice.
5. **The agent profile.** What your agents watch, calls this month, burn rate,
   balance, recent briefs.
6. **Rewrite the thirteen.** Landing, pricing, docs, `auth.md`, `llms.txt`.

Phases 1–3 are the product. 4 is plumbing. 5 is what makes it feel like
something. 6 is not optional and is the one most likely to be skipped.

## Open questions

- **Prepaid balances are stored value.** In some jurisdictions that carries
  obligations a subscription does not. Worth a lawyer before phase 4, not after.
- **What happens to the free surface at the moment of enforcement?** Existing
  integrations break the day a key is required. A deprecation window with
  `X-Newsgraph-Deprecation` headers costs little and keeps the promise that this
  project does not surprise its users.
