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
    label: "check · nothing new",
    price: "$0.0005",
    desc: "Most checks come back empty. Empty is a real answer, and it is nearly free.",
  },
  {
    label: "check · something moved",
    price: "$0.004",
    desc: "Under a cent for a bounded, cited pack. Reuse is rewarded, re-reading is not.",
  },
  {
    label: "delta · cold",
    price: "$0.02",
    desc: "On-demand compute against the replica, cached for 15 minutes.",
  },
  {
    label: "brief",
    price: "$0.03",
    desc: "The only call that spends a mid-tier model. Kept off the cheap path on purpose.",
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
    a: "Usage-based, per answer. A check that returns nothing costs $0.0005 and a check that returns a cited pack costs $0.004. There is no seat, no platform fee and no monthly minimum. You can pay per call, or top up a prepaid balance and draw down from it — card, invoice and stablecoin are all accepted.",
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
