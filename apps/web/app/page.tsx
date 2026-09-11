"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  Clock,
  FileX,
  Gauge,
  Hash,
  KeyRound,
  Link2Off,
} from "lucide-react";
import Marquee from "@/components/ui/marquee/marquee";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "https://dnnoypytdfvsdenykooq.supabase.co/functions/v1/api";

interface Stats {
  beats: number;
  total_articles: number;
  total_clusters: number;
  english_only: boolean;
  clusters: Array<{
    cluster_id: string;
    beat_id: string;
    label: string;
    articles: number;
    latest_at: string | null;
  }>;
  recent: Array<{
    beat_label: string;
    lede: string;
    source: string;
    url: string;
    published_at: string;
    lang: string | null;
  }>;
}

interface Catalog {
  beats: Array<{ beat_id: string; label: string }>;
}

const RAILS = [
  "MCP",
  "Coinbase x402",
  "Virtuals ACP",
  "REST API",
  "WebSocket",
  "Telegram",
  "Discord",
];

const VERBS = [
  {
    verb: "POST /resolve",
    asks: "A task in English",
    returns: "stable beat_id, warm first",
    price: "free → $0.001",
    next: true,
  },
  {
    verb: "POST /poll",
    asks: "Has this beat moved?",
    returns: "moved:false, or a pack",
    price: "$0.0005 / $0.004",
    next: false,
  },
  {
    verb: "POST /delta",
    asks: "What exactly, since the cursor?",
    returns: "items newer than high-water",
    price: "$0.004 / $0.02",
    next: false,
  },
  {
    verb: "POST /brief",
    asks: "A human asked a question",
    returns: "3–6 cited sentences + pack",
    price: "$0.03",
    next: true,
  },
  {
    verb: "POST /watch",
    asks: "Keep this beat warm",
    returns: "24-hour hold at 60 or 15 min",
    price: "$0.15 / $0.50 day",
    next: true,
  },
];

const INVARIANTS = [
  {
    icon: KeyRound,
    title: "No raw keys",
    desc: "Agents never receive a newsapi.ai key and never see the query language underneath. Beats are the whole interface.",
    tag: "invariant 01",
  },
  {
    icon: FileX,
    title: "No bodies",
    desc: "Packs never contain full article text. No body field exists at any price on this rail.",
    tag: "invariant 02",
  },
  {
    icon: Clock,
    title: "30-day wall",
    desc: "The agent rail never serves content older than 30 days. Not for a bigger customer. Not once.",
    tag: "invariant 03",
  },
  {
    icon: Link2Off,
    title: "No per-call chain",
    desc: "x402 funds a balance; calls draw against it off-chain. Settling an empty poll on-chain would cost more than the call.",
    tag: "invariant 04",
  },
  {
    icon: Gauge,
    title: "Resolve stays cheap",
    desc: "The front door is free to 100 calls a day and near-free after that, permanently. Never meter the funnel.",
    tag: "invariant 05",
  },
  {
    icon: Hash,
    title: "Deterministic beats",
    desc: "Two agents describing the same task hash to the same beat_id. Always — so a cursor stays valid across runtimes.",
    tag: "invariant 06",
  },
];

const LATENCY = [
  { name: "Pleiades", minutes: "2.4", fill: 3, us: true },
  { name: "Serper", minutes: "7.1", fill: 10, us: false },
  { name: "Brave", minutes: "9.8", fill: 14, us: false },
  { name: "Tavily", minutes: "11.6", fill: 16, us: false },
  { name: "Exa", minutes: "13.0", fill: 18, us: false },
  { name: "Perplexity", minutes: "14.4", fill: 20, us: false },
];

const PRICES = [
  {
    label: "poll · empty",
    price: "$0.0005",
    desc: "Most mornings, most beats have not moved. Empty is a feature, not a failure.",
  },
  {
    label: "poll moved / delta warm",
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

const SEGMENT_ROWS: Array<[string, string, string]> = [
  ["Question", "What is happening on this?", "Full history"],
  ["Depth", "≤ 30 days", "2014 →"],
  ["Shape", "Pack · 8 ledes", "Bodies · ranges"],
  ["Cite", "Publisher URL", "Contracted feed"],
];

const AUDIENCES = [
  {
    title: "Traders & desks",
    desc: "Machine-speed awareness on English coverage, deduplicated and time-ordered, so a strategy reacts to structure instead of a headline.",
    tag: "poll on a schedule",
  },
  {
    title: "Agents & products",
    desc: "A real-time layer your system calls like any other tool — and, with x402 and ACP, pays for on its own without an invoice.",
    tag: "MCP · ACP · 402",
  },
  {
    title: "Newsrooms & creators",
    desc: "See which narratives are forming while they are still cheap to write about, with every claim traceable to a publisher.",
    tag: "citation on every item",
  },
];

const ROADMAP = [
  { when: "Live", what: "Catalog, 20 seeded beats, English article clusters, poll, delta, webhooks, live terminal" },
  { when: "Now", what: "Topic queries for a 100-beat catalog; resolve, receipts, the meter and prepaid keys" },
  { when: "Next", what: "Brief and watch verbs, MCP server, WebSocket push, Telegram + Discord, lead-time harness" },
  { when: "Later", what: "x402 self-serve settlement, ACP jobs, prepaid and invoice rails, desk export" },
];

const FAQ = [
  {
    q: "What is actually live today?",
    a: "Live now: the catalog, agent tool schema, pricing, stats, poll, delta and webhooks, against 20 seeded English beats that each carry their own article cluster. Not live yet: resolve, receipts, brief, watch, the meter, the MCP server and x402 settlement. Live ingestion is paused while the topic queries are rebuilt for a 100-beat catalog, so the terminal shows the current state of the graph rather than a moving one.",
  },
  {
    q: "Is this a search engine?",
    a: "No, and it is not trying to be. Search answers a question once and forgets it. Pleiades keeps a cursor per beat, so the question your agent asks on a schedule is \u201chas this moved since I last looked?\u201d — and \u201cno\u201d is a cheap, successful, billable answer.",
  },
  {
    q: "Do I get article bodies?",
    a: "Never. No body field exists at any price on the agent rail. A pack holds at most 8 items with ledes capped at 320 characters, a bounded token estimate, and publisher URL, source, timestamp, language, concepts and sentiment on every item. You get the signal and the citation; you fetch the body yourself.",
  },
  {
    q: "How fast is \u201cbefore the mainstream\u201d?",
    a: "Beats refresh on a 60-minute target with a 90-minute freshness SLO, and market beats are built to tighten to 5\u201315 minutes. Every item carries first_indexed_at next to published_at, so lead time is a field in the payload rather than a marketing line. The public comparison harness ships with the next milestone; until then the board above is illustrative.",
  },
  {
    q: "How do I get access?",
    a: "Polling is free while the meter is wired, so early access is operator-granted rather than self-serve. Send a note with your use case — trading, newsroom, agent product — and you get access plus a starting balance when billing turns on. Every metered call will then return a receipt you can reconcile in USD micros.",
  },
  {
    q: "Can my agent pay for itself?",
    a: "That is the design, and it is not live yet. x402 will take a deposit in USDC on Base so calls draw against a balance off-chain, meaning a $0.0005 empty poll never touches the chain. A default daily cap of $0.50 and 50 distinct beats per identity keeps a looping tool call from becoming an incident.",
  },
];

function hhmm(iso: string | null): string {
  if (!iso) return "—";
  return `${iso.slice(11, 16)}Z`;
}

export default function Home() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [beats, setBeats] = useState<Array<{ beat_id: string; label: string }>>([]);
  const [stamp, setStamp] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [statsRes, catalogRes] = await Promise.all([
          fetch(`${API_BASE}/v1/stats`, { cache: "no-store" }),
          fetch(`${API_BASE}/v1/catalog`, { cache: "no-store" }),
        ]);
        if (cancelled) return;
        if (statsRes.ok) setStats((await statsRes.json()) as Stats);
        if (catalogRes.ok) {
          const catalog = (await catalogRes.json()) as Catalog;
          setBeats(catalog.beats ?? []);
        }
        setStamp(new Date().toLocaleTimeString());
      } catch {
        /* paused */
      }
    }
    load();
    const id = setInterval(load, 20000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const items = stats?.recent ?? [];
  const counts = new Map((stats?.clusters ?? []).map((c) => [c.beat_id, c]));
  const catalogRows = [...beats]
    .sort((a, b) => {
      const ca = counts.get(a.beat_id)?.articles ?? 0;
      const cb = counts.get(b.beat_id)?.articles ?? 0;
      if (cb !== ca) return cb - ca;
      return a.label.localeCompare(b.label);
    })
    .slice(0, 6);
  const ticker = items.length
    ? items.slice(0, 8)
    : [{ beat_label: "PLEIADES", lede: "Awaiting the next ingestion cycle.", source: "system", url: "#", published_at: "", lang: "eng" }];

  return (
    <>
      <nav className="nav">
        <div className="nav-pill">
          <a className="nav-logo" href="/">
            PLEIADES <i /> <small>agent rail</small>
          </a>
          <span className="nav-links">
            <a className="nav-link" href="#contract">How it works</a>
            <a className="nav-link" href="#pricing">Pricing</a>
            <a className="nav-link" href="#install">API</a>
            <a className="nav-link" href="#faq">FAQ</a>
          </span>
          <a className="nav-cta" href="/dashboard">Open terminal</a>
        </div>
      </nav>

      <main>
        {/* HERO */}
        <section className="hero" id="top">
          <div className="wrap">
            <span className="eyebrow">
              <span className="eyebrow-tag">Live API</span>
              {stats?.beats ?? 20} topics
              <span style={{ color: "var(--border-strong)" }}>·</span>
              150,000 publishers
              <span style={{ color: "var(--border-strong)" }}>·</span>
              English sources
            </span>

            <h1>The real-time news API for AI agents.</h1>
            <p className="lede">
              Pleiades watches 150,000 publishers around the clock and returns a short, cited brief
              whenever a topic your agent follows changes. Your agent asks on a schedule; Pleiades
              answers what moved and who reported it — at publish time, not at trend time.
            </p>

            <div className="hero-cta">
              <a className="btn-primary" href="/dashboard">
                Open the live terminal <ArrowRight size={14} />
              </a>
              <a className="btn-ghost" href="#install">Explore the API</a>
            </div>
            <p className="hero-tiny">
              English only · at most 8 items a call · no article bodies · free while we are in early access
            </p>

            <div className="mock" style={{ marginTop: 46 }}>
              <div className="mock-bar">
                <span className="mock-dots"><span /><span /><span /></span>
                <span className="mock-title">pleiades — your agent asks, pleiades answers</span>
                <span className="mock-live">streaming</span>
              </div>
              <div className="mock-body">
                <div className="mock-ticker">
                  <Marquee speed={55} gap="3.5rem" pauseOnHover>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      {ticker.map((it, i) => (
                        <span key={i} style={{ whiteSpace: "nowrap", font: "11px var(--font-mono), monospace", color: "#bdbdbd" }}>
                          <span style={{ color: "#fff", fontWeight: 600 }}>{it.beat_label}</span>
                          <span style={{ margin: "0 12px", color: "#333" }}>·</span>
                          {it.lede}
                        </span>
                      ))}
                    </div>
                  </Marquee>
                </div>
                <div className="mock-feed">
                  <div className="mock-row">
                    <span className="k">01 resolve</span>
                    <span className="v">{`{"task": "due diligence on Nvidia China exposure"}`}</span>
                    <span className="s">free · next</span>
                  </div>
                  <div className="mock-row">
                    <span className="k">→ beat_id</span>
                    <span className="v">b_bb964843350e · NVIDIA</span>
                    <span className="s">warm</span>
                  </div>
                  <div className="mock-row">
                    <span className="k">02 poll</span>
                    <span className="v">moved: false — nothing since cursor c_eyJiIjoi…</span>
                    <span className="s">$0.0005</span>
                  </div>
                  <div className="mock-row">
                    <span className="k">02 poll</span>
                    <span className="v">moved: true · pack · {items.length || 3} items</span>
                    <span className="s">$0.004</span>
                  </div>
                  {items.slice(0, 3).map((it, i) => (
                    <div key={i} className="mock-row">
                      <span className="k">{it.beat_label}</span>
                      <span className="v">{it.lede}</span>
                      <span className="s">{it.source}</span>
                    </div>
                  ))}
                  {items.length === 0 && (
                    <div className="mock-row">
                      <span className="k">awaiting</span>
                      <span className="v">Ingestion paused while the topic catalog is rebuilt.</span>
                      <span className="s">system</span>
                    </div>
                  )}
                </div>
                <div className="mock-foot">
                  <span>poll · /v1/poll</span>
                  <span>empty · $0.0005</span>
                  <span>moved · $0.004</span>
                  <span>≤8 items / ≤800 tokens</span>
                  <span style={{ marginLeft: "auto" }}>{stamp ? `updated ${stamp}` : "connecting…"}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* METRICS */}
        <section className="metrics">
          <div className="wrap">
            <div className="metrics-grid">
              <div>
                <div className="metric-num">150,000</div>
                <div className="metric-label">Publishers watched continuously — every story traced to its source</div>
              </div>
              <div>
                <div className="metric-num">≤8</div>
                <div className="metric-label">Stories per answer — small enough to read, cheap enough to ask hourly</div>
              </div>
              <div>
                <div className="metric-num">≤800</div>
                <div className="metric-label">Tokens per answer, so a news check fits a small context window</div>
              </div>
              <div>
                <div className="metric-num">30d</div>
                <div className="metric-label">Depth on the agent API — recent by design, never a full archive</div>
              </div>
            </div>
            <p className="hero-tiny" style={{ marginTop: 34 }}>
              {stats?.total_articles
                ? `live · ${stats.beats} topics · ${stats.total_articles} english articles · ${stats.total_clusters} article clusters · updated ${stamp || "\u2026"}`
                : `${stats?.beats ?? 20} topics configured · ingestion paused while the topic catalog is rebuilt`}
            </p>
          </div>
        </section>

        {/* RAILS rail */}
        <section className="rail">
          <Marquee speed={40} gap="2.5rem" pauseOnHover>
            <div className="rail-items">
              {RAILS.map((r) => (
                <span key={r} className="rail-item"><i />{r}</span>
              ))}
            </div>
          </Marquee>
        </section>

        {/* 01 CATEGORY */}
        <section className="scaffold" id="category">
          <div className="wrap">
            <div className="sec-head">
              <span className="sec-eyebrow">01 · Category</span>
              <h2 className="sec-title">This is not search.</h2>
              <p className="sec-sub">
                Search is commoditised at about $0.0012 a query. Pleiades is scheduled awareness —
                state, cluster breadth and a cursor. If a feature only makes sense in the left
                column, it belongs to a product we are not building.
              </p>
            </div>

            <div className="showcase">
              <div>
                <h3>Who asks: a human once, or a machine forever.</h3>
                <p>
                  A search box answers a question and forgets it. A beat keeps state. Your agent
                  polls a cursor and gets one of exactly two answers — nothing moved, or a bounded
                  pack. There is no result page to re-rank and no ranking to argue with.
                </p>
                <ul>
                  <li>No search box. No playground. No news homepage.</li>
                  <li>Builders copy a worker; they do not copy a screenshot.</li>
                  <li>Empty is a real answer, and it is nearly free.</li>
                </ul>
              </div>
              <div className="mock">
                <div className="mock-bar">
                  <span className="mock-dots"><span /><span /><span /></span>
                  <span className="mock-title">$0.0012 / query</span>
                  <span className="mock-title" style={{ marginLeft: "auto" }}>per wake-up</span>
                </div>
                <div className="mock-feed">
                  <div className="mock-row" style={{ background: "var(--bg-raised)" }}>
                    <span className="k">axis</span>
                    <span className="v" style={{ color: "var(--text-muted)" }}>search</span>
                    <span className="s" style={{ color: "var(--text-muted)" }}>scheduled awareness</span>
                  </div>
                  <div className="mock-row">
                    <span className="k">Who asks</span>
                    <span className="v">A human, once</span>
                    <span className="s">A machine, forever</span>
                  </div>
                  <div className="mock-row">
                    <span className="k">What wins</span>
                    <span className="v">Recall and ranking</span>
                    <span className="s">State + breadth</span>
                  </div>
                  <div className="mock-row">
                    <span className="k">Unit of billing</span>
                    <span className="v">Per query</span>
                    <span className="s">Per wake-up</span>
                  </div>
                  <div className="mock-row">
                    <span className="k">Incumbent</span>
                    <span className="v">Exa · Tavily · Brave · Serper</span>
                    <span className="s">None</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 02 CONTRACT */}
        <section className="scaffold" id="contract">
          <div className="wrap">
            <div className="sec-head">
              <span className="sec-eyebrow">02 · Contract</span>
              <h2 className="sec-title">Five verbs. One cursor.</h2>
              <p className="sec-sub">
                Field names freeze after week three; identifiers in mono are exact. The agent rail
                never serves bodies, and will never serve content older than 30 days.
              </p>
            </div>

            <div className="mock">
              <div className="mock-bar">
                <span className="mock-dots"><span /><span /><span /></span>
                <span className="mock-title">GET /v1/tools · the five verbs</span>
                <span className="mock-live">live</span>
              </div>
              <div className="mock-feed">
                <div className="mock-row" style={{ background: "var(--bg-raised)" }}>
                  <span className="k">verb</span>
                  <span className="v" style={{ color: "var(--text-muted)" }}>asks → returns</span>
                  <span className="s" style={{ color: "var(--text-muted)" }}>status · price</span>
                </div>
                {VERBS.map((v) => (
                  <div key={v.verb} className="mock-row">
                    <span className="k" style={{ textTransform: "none", letterSpacing: "0.02em", color: "var(--text-primary)", fontSize: 11 }}>
                      {v.verb}
                    </span>
                    <span className="v">
                      {v.asks} <span style={{ color: "var(--text-ghost)" }}>→</span> {v.returns}
                    </span>
                    <span className="s">
                      {v.next && <span style={{ color: "var(--text-ghost)" }}>next · </span>}
                      {v.price}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mock-foot">
                <span>GET /v1/catalog · POST /v1/poll · POST /v1/delta ship today</span>
                <span>resolve · brief · watch · receipts next</span>
                <span style={{ marginLeft: "auto" }}>cursor is opaque, signed, beat-bound</span>
              </div>
            </div>

            <div className="showcase">
              <div>
                <span className="sec-eyebrow">The pack</span>
                <h3>A pack is not an article list.</h3>
                <p>
                  It is the smallest object that lets a model write one correct, cited sentence.
                  Source breadth — distinct publishers inside the beat&rsquo;s article cluster — is
                  the field competitors cannot copy, because they never had to compute it.
                </p>
                <ul>
                  <li>Citations point at publishers. Receipts point at Pleiades. The two identifiers never merge.</li>
                  <li>At most 8 items, 320-character ledes, ≤800 p95 tokens — citation, not reproduction.</li>
                  <li>first_indexed_at on every item: the lead-time claim, in the payload.</li>
                </ul>
              </div>
              <div className="code">
                <div className="code-bar">POST /v1/poll · 200 OK · moved</div>
                <pre>{`{
  "beat_id": "b_dab9c000dca5",
  "beat_label": "EU AI Act",
  "moved": true,
  "item_count": 3,
  "token_estimate": 611,
  "cursor": "c_eyJiIjoi…",
  "receipt_id": "r_01JQ8ZK4M2X",
  "items": [
    {
      "lede": "The Commission opened consultation on GPAI transparency obligations, with responses due 14 October.",
      "source": "Reuters",
      "published_at": "2026-09-09T06:41:00Z",
      "first_indexed_at": "2026-09-09T06:43:00Z",
      "lang": "eng",
      "sentiment": -0.12
    }
  ]
}`}</pre>
              </div>
            </div>
          </div>
        </section>

        {/* 03 CATALOG */}
        <section className="scaffold" id="catalog">
          <div className="wrap">
            <div className="sec-head">
              <span className="sec-eyebrow">03 · Catalog</span>
              <h2 className="sec-title">Demand grows the graph. We do not guess it.</h2>
              <p className="sec-sub">
                Warm beats will be precomputed; cold beats compute on demand and promote once two
                distinct paying agents read them inside seven days. Publishing buyer counts is the
                point — builders should self-select toward packs that are already cheap and fast.
              </p>
            </div>

            <div className="showcase">
              <div>
                <h3>One beat, one article cluster.</h3>
                <p>
                  We do not re-cluster the world for you. A beat is a living query, and its English
                  articles form that beat&rsquo;s article cluster — deduplicated and ordered by
                  publication time. What you subscribe to is exactly what you get: no opaque
                  grouping, no story-merging you did not ask for.
                </p>
                <ul>
                  <li>Cluster per beat, addressed by a stable beat_id</li>
                  <li>English only, so no translation drift in the stream</li>
                  <li>Newest first, with a cursor that never skips and never repeats</li>
                  <li>Every beat carries a warm or cold state you can route on</li>
                </ul>
              </div>
              <div className="mock">
                <div className="mock-bar">
                  <span className="mock-dots"><span /><span /><span /></span>
                  <span className="mock-title">GET /v1/catalog · live</span>
                  <span className="mock-live">{stats?.total_clusters ?? 0} active</span>
                </div>
                <div className="mock-feed">
                  {catalogRows.map((b) => {
                    const c = counts.get(b.beat_id);
                    const n = c?.articles ?? 0;
                    return (
                      <div key={b.beat_id} className="mock-row">
                        <span className="k" title={b.beat_id}>{b.label}</span>
                        <span className="v">
                          {n} english article{n === 1 ? "" : "s"}
                          {c?.latest_at ? ` · newest ${hhmm(c.latest_at)}` : " · awaiting ingestion"}
                        </span>
                        <span className="s">{n > 0 ? "◈ warm" : "◇ cold"}</span>
                      </div>
                    );
                  })}
                  {catalogRows.length === 0 && (
                    <div className="mock-row">
                      <span className="k">awaiting</span>
                      <span className="v">Catalog unreachable — the terminal shows what it last saw.</span>
                      <span className="s">system</span>
                    </div>
                  )}
                </div>
                <div className="mock-foot">
                  <span>warm · precomputed</span>
                  <span>cold · on demand</span>
                  <span style={{ marginLeft: "auto" }}>promotion + buyer counts next</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 04 LEAD TIME */}
        <section className="scaffold" id="lead-time">
          <div className="wrap">
            <div className="sec-head">
              <span className="sec-eyebrow">04 · Lead time</span>
              <h2 className="sec-title">The claim is a measurement.</h2>
              <p className="sec-sub">
                Minutes from publisher timestamp to first appearance in the index, against Exa,
                Tavily, Brave, Serper and Perplexity grounding. Every pack already carries its own
                evidence as first_indexed_at.
              </p>
            </div>

            <div className="mock">
              <div className="mock-bar">
                <span className="mock-dots"><span /><span /><span /></span>
                <span className="mock-title">median minutes · breaking sample · last 7d</span>
                <span className="mock-live">harness next</span>
              </div>
              <div className="mock-feed">
                {LATENCY.map((l) => (
                  <div key={l.name} className="mock-row">
                    <span className="k" style={l.us ? { color: "var(--text-primary)" } : undefined}>{l.name}</span>
                    <span className="v">
                      <span style={{ color: l.us ? "#fff" : "#5f5f5f" }}>{"█".repeat(l.fill)}</span>
                      <span style={{ color: "#242424" }}>{"░".repeat(20 - l.fill)}</span>
                    </span>
                    <span className="s" style={l.us ? { color: "var(--text-primary)" } : undefined}>{l.minutes}</span>
                  </div>
                ))}
              </div>
              <div className="mock-foot">
                <span>target board · illustrative until the public harness ships</span>
                <span style={{ marginLeft: "auto" }}>flat category → $0.004 is unsupportable</span>
              </div>
            </div>
            <p className="hero-tiny">
              a category that comes back flat is better learned in week six than month nine — the
              harness ships open source and runs on the same workers that serve the rail.
            </p>
          </div>
        </section>

        {/* 05 PRICE CARD */}
        <section className="scaffold" id="pricing">
          <div className="wrap">
            <div className="sec-head">
              <span className="sec-eyebrow">05 · Price card</span>
              <h2 className="sec-title">Charge the wake-up, not the month.</h2>
              <p className="sec-sub">
                Empty is nearly free so hourly polling is rational. Cold is dear so reuse is
                rewarded. Prices live in a table, not in code.
              </p>
            </div>

            <div className="features" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
              {PRICES.map((p) => (
                <div key={p.label} className="feature" style={{ minHeight: 200 }}>
                  <span className="feature-tag" style={{ marginTop: 0, paddingTop: 0 }}>{p.label}</span>
                  <div className="metric-num" style={{ fontSize: 30, margin: "14px 0 10px" }}>{p.price}</div>
                  <p className="feature-desc">{p.desc}</p>
                </div>
              ))}
            </div>
            <p className="hero-tiny" style={{ marginTop: 18 }}>
              published ahead of the meter · calling is free today, billing turns on with the ledger
            </p>

            <div className="showcase">
              <div>
                <span className="sec-eyebrow">Caps</span>
                <h3>A looping tool call is the default failure mode.</h3>
                <p>
                  Not a theoretical risk — it is the first thing a misconfigured agent does. Caps
                  ship with the meter, so a runaway loop hits a wall instead of an invoice.
                </p>
                <ul>
                  <li>Default daily ceiling: $0.50 per identity</li>
                  <li>50 distinct beats per day per identity</li>
                  <li>8 items and 800 tokens are enforced in schema today</li>
                  <li>The 30-day depth wall lands with the meter</li>
                </ul>
              </div>
              <div className="code">
                <div className="code-bar">builder estimate · not a subscription</div>
                <pre>{`beats watched              3
polls per beat / day      24
move rate                 30%
briefs per day             1
────────────────────────────
est. agent-day         $0.14
≈ 30 days              $4.25`}</pre>
              </div>
            </div>
          </div>
        </section>

        {/* 06 SETTLEMENT */}
        <section className="scaffold" id="settlement">
          <div className="wrap">
            <div className="sec-head">
              <span className="sec-eyebrow">
                06 · Settlement <span className="eyebrow-tag" style={{ marginLeft: 8 }}>next</span>
              </span>
              <h2 className="sec-title">402 is the onboarding.</h2>
              <p className="sec-sub">
                An unprovisioned agent has to decide whether to pay without asking a human. The
                challenge will state what it is buying, what it costs, and where the schema lives.
              </p>
            </div>

            <div className="showcase">
              <div>
                <h3>Deposit once. Draw off-chain.</h3>
                <p>
                  The same retry loop works on x402, prepaid credit and invoice. A $5 card top-up
                  loses about 9% to processing; the same deposit in USDC on Base loses about
                  0.016%. That — not &ldquo;agents have wallets&rdquo; — is why the crypto rail
                  exists.
                </p>
                <ul>
                  <li>No per-call chain write: a deposit funds a balance, calls draw against it</li>
                  <li>Settling an empty poll on-chain would cost more than the call</li>
                  <li>One retry loop for x402, prepaid and invoice</li>
                </ul>
              </div>
              <div className="code">
                <div className="code-bar">HTTP 402 Payment Required · next</div>
                <pre>{`nonce: n_01JQ8ZK4M2X
{
  "amount_micros": 4000,
  "currency": "USDC",
  "accepts": ["x402-base", "prepaid", "invoice"],
  "min_deposit_micros": { "x402-base": 5000000 },
  "resource": {
    "call": "delta",
    "beat_id": "b_dab9c000dca5",
    "beat_label": "EU AI Act",
    "description": "Items newer than cursor."
  },
  "docs": "/v1/tools"
}`}</pre>
              </div>
            </div>
          </div>
        </section>

        {/* 07 RECEIPTS */}
        <section className="scaffold" id="receipts">
          <div className="wrap">
            <div className="sec-head">
              <span className="sec-eyebrow">
                07 · Receipts <span className="eyebrow-tag" style={{ marginLeft: 8 }}>next</span>
              </span>
              <h2 className="sec-title">Prove payment. Never provenance.</h2>
              <p className="sec-sub">
                GET /v1/receipts?since= will be the reconciliation view. When a model tells its user
                something it learned from a pack, the URL it shows is the publisher&rsquo;s — never
                ours.
              </p>
            </div>

            <div className="showcase">
              <div>
                <h3>Two identifiers that never merge.</h3>
                <p>
                  Receipts point at Pleiades: what was called, for which beat, for how many micros,
                  and when it settled. Citations point at publishers: the only thing a downstream
                  user should ever see.
                </p>
                <ul>
                  <li>Every metered call will return a receipt_id reconcilable in USD micros</li>
                  <li>Every item carries the publisher URL, source, timestamp and language</li>
                  <li>You are plumbing. Stay plumbing.</li>
                </ul>
              </div>
              <div className="code">
                <div className="code-bar">GET /v1/receipts?since=2026-09-09T00:00:00Z · next</div>
                <pre>{`receipt          call    beat              micros  settled
r_01JQ8ZK4M2X    delta   b_dab9c000dca5      4000  07:00:12Z
r_01JQ8ZK4N91    poll    b_bb964843350e       500  07:00:14Z
r_01JQ8ZK518C    poll    b_191edd8895e2       500  07:00:15Z
r_01JQ8ZL02AA    brief   b_dab9c000dca5     30000  08:12:03Z

// what the user should see — never our domain
The Commission opened consultation on GPAI transparency
obligations, with responses due 14 October.
https://www.reuters.com/…`}</pre>
              </div>
            </div>
          </div>
        </section>

        {/* THE INVARIANTS */}
        <section className="scaffold" id="invariants">
          <div className="wrap">
            <div className="sec-head">
              <span className="sec-eyebrow">The invariants</span>
              <h2 className="sec-title">Six promises that do not move.</h2>
              <p className="sec-sub">
                Every one of these is a constraint on us, not a feature for you. They are what make
                a cursor worth storing and a price worth trusting.
              </p>
            </div>
            <div className="features">
              {INVARIANTS.map(({ icon: Icon, title, desc, tag }) => (
                <div key={title} className="feature">
                  <span className="feature-icon"><Icon size={14} strokeWidth={1.75} /></span>
                  <h3 className="feature-title">{title}</h3>
                  <p className="feature-desc">{desc}</p>
                  <span className="feature-tag">{tag}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 08 INSTALL */}
        <section className="scaffold" id="install">
          <div className="wrap">
            <div className="sec-head">
              <span className="sec-eyebrow">08 · Install</span>
              <h2 className="sec-title">Boring tools survive model churn.</h2>
              <p className="sec-sub">
                An OpenAI-compatible tool schema ships today; an MCP server that hits the same
                handlers ships next. The open spec publishes beat_id canonicalisation, the pack
                schema and the five verbs — not the graph.
              </p>
            </div>

            <div className="showcase">
              <div>
                <h3>Resolve once, poll forever.</h3>
                <p>
                  A cron job, a wallet and two requests. If your agent can call a tool, it can hold
                  a beat through a news cycle without a human in the loop. Polling and delta work
                  today; resolve joins them with the canonicalisation spec.
                </p>
                <ul>
                  <li>Deterministic beats: the same task will hash to the same beat_id</li>
                  <li>Cursor comes back on every call — store it and never re-read</li>
                  <li>8 items and 800 tokens, enforced by the pack schema</li>
                </ul>
              </div>
              <div className="code">
                <div className="code-bar">// poll forever — live today</div>
                <pre>{`curl -s $PLEIADES/v1/poll \\
  -H "Content-Type: application/json" \\
  -d '{"beat_id":"b_bb964843350e","cursor":null}'

# resolve (task → beat_id) ships next
curl -s $PLEIADES/v1/resolve \\
  -H "Content-Type: application/json" \\
  -d '{"task":"I am writing a due diligence
       memo on Nvidia China exposure"}'

# x402 deposit + X-PAYMENT credential land with the meter`}</pre>
              </div>
            </div>

            <div className="showcase flip" style={{ alignItems: "start" }}>
              <div className="code">
                <div className="code-bar">GET /v1/tools · live</div>
                <pre>{`{
  "tools": [{
    "type": "function",
    "function": {
      "name": "pleiades_poll",
      "description": "Ask whether a beat has
        moved since the cursor. Prefer this
        on a schedule.",
      "parameters": {
        "type": "object",
        "properties": {
          "beat_id": { "type": "string" },
          "cursor": { "type": ["string","null"] }
        },
        "required": ["beat_id"]
      }
    }
  }]
}`}</pre>
              </div>
              <div className="code">
                <div className="code-bar">MCP · same handlers · next</div>
                <pre>{`// not served yet — GET /v1/tools is live today
{
  "mcpServers": {
    "pleiades": {
      "url": "https://pleiades.news/mcp",
      "headers": {
        "X-PAYMENT": "\${PLEIADES_CREDENTIAL}"
      }
    }
  }
}`}</pre>
              </div>
            </div>

            <div className="code" style={{ marginTop: 40 }}>
              <div className="code-bar">beat_id canonicalisation · public spec</div>
              <pre>{`canonical = sorted(concept_uris).join("|")
          + "::" + sorted(topic_filters).join("|")
          + "::" + sorted(languages).join("|")

beat_id = "b_" + sha256(canonical).hexdigest()[:12]

# Published so external implementations can converge on it.
# Not enforced yet: seeded beats carry literal ids until
# resolve ships. Changing it later breaks stored cursors.`}</pre>
            </div>
          </div>
        </section>

        {/* 09 SEGMENTATION */}
        <section className="scaffold" id="segmentation">
          <div className="wrap">
            <div className="sec-head">
              <span className="sec-eyebrow">09 · Segmentation</span>
              <h2 className="sec-title">Agents get now. Desks get then.</h2>
              <p className="sec-sub">
                The dividing line is time depth, not content depth. If a fund could replace a
                six-figure archive contract with forty dollars of metered agent calls, the new rail
                would eat the business it was meant to extend.
              </p>
            </div>

            <div className="showcase">
              <div>
                <h3>Two rails, one graph.</h3>
                <p>
                  The agent rail is a bounded pack inside a 30-day window: enough to answer what is
                  happening, cheap enough to ask every hour. The desk rail is the archive — bodies,
                  ranges and export, contracted and dated back to 2014.
                </p>
                <ul>
                  <li>Agent rail: pack of ≤8 ledes, publisher URL, ≤30 days, per wake-up</li>
                  <li>Desk rail: export, bodies, ranges, contracted feed</li>
                  <li>Same beats underneath, so nothing has to be reconciled twice</li>
                </ul>
              </div>
              <div className="mock">
                <div className="mock-bar">
                  <span className="mock-dots"><span /><span /><span /></span>
                  <span className="mock-title">segmentation · depth is the line</span>
                </div>
                <div className="mock-feed">
                  <div className="mock-row" style={{ background: "var(--bg-raised)" }}>
                    <span className="k">need</span>
                    <span className="v" style={{ color: "var(--text-muted)" }}>agent rail</span>
                    <span className="s" style={{ color: "var(--text-muted)" }}>desk rail</span>
                  </div>
                  {SEGMENT_ROWS.map(([need, agent, desk]) => (
                    <div key={need} className="mock-row">
                      <span className="k">{need}</span>
                      <span className="v">{agent}</span>
                      <span className="s">{desk}</span>
                    </div>
                  ))}
                </div>
                <div className="mock-foot">
                  <span>compute once</span>
                  <span>sell many times</span>
                  <span style={{ marginLeft: "auto" }}>charge the wake-up</span>
                </div>
              </div>
            </div>

            <div className="features" style={{ marginTop: 40 }}>
              {AUDIENCES.map((a) => (
                <div key={a.title} className="feature" style={{ minHeight: 190 }}>
                  <h3 className="feature-title">{a.title}</h3>
                  <p className="feature-desc">{a.desc}</p>
                  <span className="feature-tag">{a.tag}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* STATUS */}
        <section className="scaffold" id="status">
          <div className="wrap">
            <div className="sec-head">
              <span className="sec-eyebrow">Status</span>
              <h2 className="sec-title">What is shipped, and what is not.</h2>
              <p className="sec-sub">
                Early users deserve to know exactly where the line is. This is it.
              </p>
            </div>
            <div className="features" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
              {ROADMAP.map((r) => (
                <div key={r.when} className="feature" style={{ minHeight: 160 }}>
                  <span className="feature-tag" style={{ marginTop: 0, paddingTop: 0 }}>{r.when}</span>
                  <p className="feature-desc" style={{ marginTop: 12 }}>{r.what}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="scaffold" id="faq">
          <div className="wrap-tight">
            <div className="sec-head">
              <span className="sec-eyebrow">FAQ</span>
              <h2 className="sec-title">The questions we get first.</h2>
            </div>
            <div className="faq">
              {FAQ.map((f) => (
                <details key={f.q}>
                  <summary>{f.q}</summary>
                  <div className="a">{f.a}</div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="cta-section">
          <div className="wrap">
            <h2 className="cta-title">Never miss the signal.</h2>
            <p className="cta-sub">
              Tell Pleiades which topics matter, then let your agent ask what changed. One API,
              every story cited back to the publisher that broke it.
            </p>
            <div className="cta-row">
              <a className="btn-primary" href="/dashboard">Open the live terminal <ArrowRight size={14} /></a>
              <a className="btn-ghost" href="#install">Explore the API</a>
            </div>
            <p className="cta-tiny">
              English only · free while we are in early access · one API call at a time
            </p>
          </div>
        </section>

        <footer className="site">
          <div className="wrap">
            <div className="footer-row">
              <div className="footer-brand-line">
                <span className="footer-co">PLEIADES</span>
                <span style={{ color: "var(--border-strong)" }}>/</span>
                <span className="footer-address">agent rail · spec v1</span>
              </div>
              <div className="footer-links">
                <a href="/dashboard">Terminal</a>
                <a href="#contract">How it works</a>
                <a href="#pricing">Pricing</a>
                <a href="#install">API</a>
                <a href="#faq">FAQ</a>
              </div>
            </div>
            <div className="footer-row" style={{ marginTop: 10 }}>
              <span className="footer-address">
                the real-time news API for AI agents · markets move on news in seconds
              </span>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}
