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

---

# The pricing plan: $0.20 a day

## Why it cannot be charged daily

Stripe takes **2.9% + $0.30** per successful charge and enforces a **$0.50
minimum**. A $0.20 charge pays out **-$0.1058** — you would pay to collect it.

```
     charge      fee       net    kept
     $ 0.20 $ 0.3058 $ -0.1058  -52.9%   <- a loss, and below the minimum
     $ 0.50 $ 0.3145 $  0.1855   37.1%
     $ 6.00 $ 0.4740 $  5.5260   92.1%
     $18.00 $ 0.8220 $ 17.1780   95.4%
     $60.00 $ 2.0400 $ 57.9600   96.6%
```

So **$0.20/day is the rate, not the transaction.** A balance is bought in blocks
and drawn down a day at a time. This is not a workaround — it is also the better
product, because a customer on a prepaid balance cannot be surprised by a bill,
which is the main reason people distrust usage-based pricing.

## The plan

| | |
| --- | --- |
| **Trial** | 7 days, no card |
| **Rate** | **$0.20 / day** |
| **Top up** | $6 · 30 days — $18 · 90 days — $60 · 300 days |
| **Included** | The whole API. Roughly **50 topics watched continuously** |

Blocks are priced so the fee falls with size: 92% kept at $6, 97% at $60. $6 is
the floor, because below it Stripe's cut climbs faster than the price does.

## What a day buys

Ingestion is free — Google News is key-less — so the cost of serving is a
function invocation and one indexed query. **The limit is not cost, it is
abuse.** A day is capped at about **5,000 calls**, which is what continuous
watching actually looks like:

```
1 topic  polled every 15 minutes  =    96 checks/day
50 topics polled every 15 minutes = 4,800 checks/day
```

So "$0.20/day" is a promise with a number behind it: watch up to fifty tickers
as hard as the schedule allows.

## Where the per-call prices go

They do not disappear. The micro-prices already recorded in `usage_ledger`
become the **overage rate** past the daily cap:

| Past the cap | Cost |
| --- | --- |
| check · nothing new | $0.0005 |
| check · something moved | $0.004 |
| brief | $0.03 |

That is the argument for keeping phase 1's metering rather than deleting it: the
ledger measures fair use, and it is the only thing that can tell a heavy customer
apart from an abusive one.

## Why this is cheap, deliberately

$0.20/day is **$6 a month** — a land-grab price, not a sustainable one. It is
defensible only while ingestion is free and the catalogue is the only cost
centre. Two things would end it:

- a paid news provider (newsapi.ai at volume)
- publisher URL resolution, which needs a browser or a paid backend per article

Both are on the roadmap. The price is deliberately below what it costs to run
well, and the honest framing is that it buys adoption rather than margin.

## The flow

```
Landing        "$0.20 a day. Watch fifty tickers as hard as the schedule allows."
                CTA: 7 days free, no card     ← the trial, stated as time

Sign up        AuthKit, email only. Key issued. Trial balance written.

Agent profile  days remaining · topics watched · calls today against the cap
                balance · recent briefs · the ledger

Day boundary   draw $0.20. At zero, calls return 402 with a top-up link.

Top up         Stripe Checkout, one-off. $6 / $18 / $60.
               Keyed by session id, so a replayed webhook cannot credit twice.
```

## What to watch

- **$0.20 is a guess until traffic exists.** Phase 1 is recording real costs now;
  read `usageSummary` before the trial size is fixed, not after.
- **The 5,000-call cap is a policy, not a discovery.** It follows from 50 topics
  at the polling interval, and both halves of that are changeable.
- **A daily draw-down needs a scheduler.** The same Vercel Cron that ingests can
  draw balances, on the same tick.
