/**
 * Shared content for the NewsGraph site.
 *
 * Only what is actually referenced lives here: the price card, the roadmap and
 * the FAQ. The beat catalog is fetched live, and page-specific copy sits with
 * its page rather than in a grab bag of unused exports.
 */

/** The public news API. Read-only, no credential, no billing. */
export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "/api";

export const PRICES = [
  {
    label: "the rate",
    price: "$0.20",
    desc: "A day. Watch up to fifty tickers as hard as the fifteen-minute schedule allows — about 5,000 checks.",
  },
  {
    label: "top up · 30 days",
    price: "$6",
    desc: "One charge, drawn down a day at a time. A balance cannot surprise you with a bill.",
  },
  {
    label: "top up · 90 days",
    price: "$18",
    desc: "The same rate, and less of it goes to card fees — 95% of it reaches us rather than 92%.",
  },
  {
    label: "top up · 300 days",
    price: "$60",
    desc: "For an agent that runs all year without anyone thinking about it.",
  },
];

export const ROADMAP = [
  {
    when: "Shipped",
    what: "Beat catalog, frozen contract, article clusters per beat, poll and delta against persisted packs, receipts, and metered billing behind a flag",
  },
  {
    when: "In progress",
    what: "Topic queries rebuilt for a 100-beat catalog, and live ingestion switched back on",
  },
  {
    when: "Next",
    what: "Task-to-topic resolution, scheduled watches, briefs, an MCP server and WebSocket push",
  },
  {
    when: "Later",
    what: "Self-serve billing, the desk export rail, and coverage beyond English",
  },
];

export const FAQ = [
  {
    q: "What is actually live today?",
    a: "The catalog, the agent tool schema, pricing, stats, poll and delta against persisted packs, and webhooks — against 20 seeded English beats that each carry their own article cluster. Built but not yet switched on: metered billing and receipts. Not built: task-to-topic resolution, watches and briefs. Live ingestion is paused while the topic queries are rebuilt for a 100-beat catalog, so the terminal shows the current state of the graph rather than a moving one.",
  },
  {
    q: "Is this a search engine?",
    a: "No, and it is not trying to be. Search answers a question once and forgets it. NewsGraph keeps a cursor per topic, so the question your agent asks on a schedule is whether anything moved — and nothing moved is a cheap, successful, billable answer.",
  },
  {
    q: "Do I get article bodies?",
    a: "Never. No body field exists at any price. A page holds at most 8 items, each with a headline, a link that resolves to the article, the publisher's name and the time it was published. You get the signal and the citation; you fetch the story yourself.",
  },
  {
    q: "How fast is before the mainstream?",
    a: "Topics refresh on a 60-minute target with a 90-minute freshness SLO, and market topics are built to tighten to 5–15 minutes. Every item carries first_indexed_at next to published_at, so lead time is a field in the payload rather than a marketing line. The public comparison harness ships with the next milestone; until then the board on the site is illustrative.",
  },
  {
    q: "How do I get access?",
    a: "The catalog, the tool definitions and pricing need no credential at all, so you can evaluate the whole contract before spending anything. Early access beyond that is operator-granted while self-serve billing is built: send a note with your use case and you get an account plus a starting balance when metering is switched on.",
  },
  {
    q: "How does billing work?",
    a: "Nothing, today — billing is not switched on and no mechanism in this codebase can charge you. The plan when it is: $0.20 a day, bought as a prepaid balance and drawn down one day at a time. A balance cannot surprise you with a bill, which is the point. Seven days are free and need no card.",
  },
  {
    q: "Can my agent pay for itself?",
    a: "That is the design, and it is not live yet. Because the balance is metered per answer rather than licensed per seat, an agent that checks a topic every hour costs about fourteen cents a day — so it can fund its own context out of whatever value it creates. A default daily ceiling of $0.50 and 50 distinct topics keeps a runaway loop from becoming an incident.",
  },
];

export function hhmm(iso: string | null): string {
  if (!iso) return "\u2014";
  return `${iso.slice(11, 16)}Z`;
}
