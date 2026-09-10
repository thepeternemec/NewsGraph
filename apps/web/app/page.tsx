"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  Bot,
  Braces,
  Cpu,
  MessageSquare,
  Radio,
  Satellite,
} from "lucide-react";
import Marquee from "@/components/ui/marquee/marquee";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "https://dnnoypytdfvsdenykooq.supabase.co/functions/v1/api";

interface Stats {
  beats: number;
  total_items: number;
  total_events: number;
  clustered_items: number;
  max_corroboration: number;
  recent: Array<{
    beat_label: string;
    lede: string;
    source: string;
    url: string;
    event_id: string | null;
    corroboration: number;
  }>;
}

const RAILS = ["REST API", "WebSocket", "MCP", "Virtuals ACP", "Coinbase x402", "Telegram", "Discord"];

const PILLARS = [
  {
    kicker: "01 · Ingest",
    title: "Thousands of sources, one beat each",
    desc: "Every topic is a living query. Pleiades polls continuously and expands coverage without you touching a config file.",
    mock: `> beat b_bb964843350e · NVIDIA
  window   last 24h · refresh 60m
  query    concept + keyword + category
  matched  1,412 articles
  dedupe   skipDuplicates
  latency  0.8s`,
  },
  {
    kicker: "02 · Cluster",
    title: "One story, every source that ran it",
    desc: "Articles are deduplicated and linked into events. Corroboration tells you how many independent sources back a claim.",
    mock: `event eng-11991401
  "Saudi Arabia Runs Out of Easy
   Routes for Oil to Bypass Iran"
  sources     561
  first seen  04:12Z
  sentiment   -0.31
  status      corroborated`,
  },
  {
    kicker: "03 · Deliver",
    title: "The same object, every rail",
    desc: "A bounded pack — never full article bodies. Poll it, stream it, or let an agent consume it over MCP or ACP.",
    mock: `{
  "beat_id": "b_bb964843350e",
  "moved": true,
  "item_count": 8,
  "token_estimate": 742,
  "receipt_id": "r_8f21…"
}`,
  },
];

const FEATURES = [
  { icon: Braces, title: "REST API", desc: "Cursor-based poll and delta. Opaque signed cursors, beat-bound, 30-day depth ceiling.", tag: "GET /v1/catalog" },
  { icon: Radio, title: "WebSocket", desc: "A pack the moment a beat advances. Every push reuses the pull contract — no second mental model.", tag: "wss /v1/ws" },
  { icon: Bot, title: "MCP", desc: "Drop-in tools for agent frameworks. Resolve, poll and delta without writing a client.", tag: "tools: 3" },
  { icon: Cpu, title: "Virtuals ACP", desc: "Accounts, jobs and memos. Pay for a briefing on-chain; the memo is the pack.", tag: "jobs · memos" },
  { icon: Satellite, title: "Coinbase x402", desc: "Per-call settlement in USDC over HTTP 402. No subscription, no sales call.", tag: "HTTP 402" },
  { icon: MessageSquare, title: "Bots", desc: "Telegram and Discord delivery for humans in the loop — same pack, formatted for chat.", tag: "alerts" },
];

const FAQ = [
  {
    q: "What is actually live today?",
    a: "The contract is live: catalog, poll, delta, pricing, webhooks and stats. 20 beats are seeded and returning real clustered items. Live ingestion is paused while topic queries are rebuilt for a 100-topic catalog — everything on the dashboard is real data already ingested.",
  },
  {
    q: "Where does the data come from?",
    a: "newsapi.ai (Event Registry): concept-URI and category queries, event clustering, sentiment and duplicate filtering across global sources. Pleiades adds ranking, corroboration, bucketing into bounded packs, and the delivery rails.",
  },
  {
    q: "How fast is \u201cbefore the mainstream\u201d?",
    a: "Beats refresh on a 60-minute target with a 90-minute freshness SLO, and market beats are built to tighten to 5\u201315 minutes. Delta reads are ordered by publication time, so you see a story when it publishes, not when it trends.",
  },
  {
    q: "Do I get article bodies?",
    a: "No — deliberately. A pack holds at most 8 items and a bounded token estimate, with a lede of at most 320 characters plus publisher URL, source, timestamp, concepts, sentiment and corroboration. You get the signal and the citation; you fetch the body yourself.",
  },
  {
    q: "How do I get access?",
    a: "Early access is operator-granted while x402 self-serve settlement is wired. Send a note with your use case — trading, newsroom, agent product — and you get a credential plus a starting balance. Every call returns a receipt you can reconcile.",
  },
  {
    q: "Can my agent pay for itself?",
    a: "That is the design. x402 lets an agent settle a call in USDC over HTTP 402, and Virtuals ACP lets it take a job and return a structured memo. No human in the loop, no invoice.",
  },
];

const ROADMAP = [
  { when: "Live", what: "Contract, 20 beats, clustering, corroboration, webhooks, live dashboard" },
  { when: "Now", what: "Rebuilding topic queries on newsapi.ai Topic Pages → 100-topic catalog" },
  { when: "Next", what: "WebSocket push, Telegram + Discord delivery, MCP server" },
  { when: "Later", what: "x402 self-serve settlement, Virtuals ACP jobs, narrative + signal layer" },
];

export default function Home() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [stamp, setStamp] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/v1/stats`, { cache: "no-store" });
        if (res.ok && !cancelled) {
          setStats((await res.json()) as Stats);
          setStamp(new Date().toLocaleTimeString());
        }
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
  const ticker = items.length
    ? items
    : [{ beat_label: "PLEIADES", lede: "Awaiting the next ingestion cycle.", source: "system", url: "#", event_id: null, corroboration: 0 }];

  return (
    <>
      <nav className="nav">
        <div className="nav-pill">
          <span className="nav-logo">
            PLEIADES <i /> <small>terminal</small>
          </span>
          <span className="nav-links">
            <a className="nav-link" href="#terminal">Terminal</a>
            <a className="nav-link" href="#how">How it works</a>
            <a className="nav-link" href="#api">Contract</a>
            <a className="nav-link" href="#faq">FAQ</a>
          </span>
          <a className="nav-cta" href="/dashboard">Open terminal</a>
        </div>
      </nav>

      <main>
        {/* HERO */}
        <section className="hero" id="terminal">
          <div className="wrap">
            <span className="eyebrow">
              <span className="eyebrow-tag">Early access</span>
              {stats?.beats ?? 20} beats live
              <span style={{ color: "var(--border-strong)" }}>·</span>
              signals <span style={{ color: "var(--text-secondary)" }}>{stats?.total_items ?? "\u2026"}</span>
              <span style={{ color: "var(--border-strong)" }}>·</span>
              clusters <span style={{ color: "var(--text-secondary)" }}>{stats?.total_events ?? "\u2026"}</span>
            </span>

            <h1>The signal, before it reaches the mainstream.</h1>
            <p className="lede">
              Pleiades is a real-time news terminal for people and agents who cannot wait for
              the trend. It watches thousands of sources, clusters every story into events,
              scores corroboration, and hands you a bounded, structured pack — over an API,
              a socket, a bot, or an agent-native rail.
            </p>

            <div className="hero-cta">
              <a className="btn-primary" href="/dashboard">
                Open the live terminal <ArrowRight size={14} />
              </a>
              <a className="btn-ghost" href="#api">Read the contract</a>
            </div>
            <p className="hero-tiny">
              no credit card · operator-granted credential · receipts on every call
            </p>

            <div className="mock" style={{ marginTop: 46 }}>
              <div className="mock-bar">
                <span className="mock-dots"><span /><span /><span /></span>
                <span className="mock-title">pleiades — live terminal</span>
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
                  {items.slice(0, 6).map((it, i) => (
                    <div key={i} className="mock-row">
                      <span className="k">{it.beat_label}</span>
                      <span className="v">{it.lede}</span>
                      <span className="s">
                        {it.corroboration ? `\u25c8${it.corroboration} · ` : ""}{it.source}
                      </span>
                    </div>
                  ))}
                  {items.length === 0 && (
                    <div className="mock-row">
                      <span className="k">awaiting</span>
                      <span className="v">Ingestion paused while topic queries are rebuilt.</span>
                      <span className="s">system</span>
                    </div>
                  )}
                </div>
                <div className="mock-foot">
                  <span>poll · /v1/poll</span>
                  <span>cursor · signed</span>
                  <span>max 8 items / 800 tokens</span>
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
                <div className="metric-num">{stats?.beats ?? "\u2026"}</div>
                <div className="metric-label">Beats configured and polling — each a living topic query</div>
              </div>
              <div>
                <div className="metric-num">{stats?.total_items ?? "\u2026"}</div>
                <div className="metric-label">Signals indexed into bounded, citable packs</div>
              </div>
              <div>
                <div className="metric-num">{stats?.total_events ?? "\u2026"}</div>
                <div className="metric-label">Event clusters — one story, many sources</div>
              </div>
              <div>
                <div className="metric-num">
                  {stats?.max_corroboration ?? "\u2026"}<small>×</small>
                </div>
                <div className="metric-label">Peak corroboration on a single story</div>
              </div>
            </div>
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

        {/* PILLARS */}
        <section className="scaffold" id="how">
          <div className="wrap">
            <div className="sec-head">
              <span className="sec-eyebrow">How it works</span>
              <h2 className="sec-title">Firehose in. Signal out. Nothing in between.</h2>
              <p className="sec-sub">
                Three stages run continuously, per topic. You subscribe to the output of the
                third and never think about the first two.
              </p>
            </div>

            <div className="pillars-grid">
              {PILLARS.map((p) => (
                <article key={p.kicker} className="pillar">
                  <div className="pillar-mock">
                    <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{p.mock}</pre>
                  </div>
                  <div className="pillar-body">
                    <div className="pillar-kicker">{p.kicker}</div>
                    <h3 className="pillar-title">{p.title}</h3>
                    <p className="pillar-desc">{p.desc}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* SHOWCASE */}
        <section className="scaffold" id="api">
          <div className="wrap">
            <div className="showcase">
              <div>
                <span className="sec-eyebrow">The contract</span>
                <h3>A pack you can reason about.</h3>
                <p>
                  Every response is the same small object. Bounded size means bounded cost —
                  in tokens, in latency, in money. Cursors are opaque and beat-bound; save
                  them and you never re-read what you have already seen.
                </p>
                <ul>
                  <li>At most 8 items and an 800-token estimate per pack</li>
                  <li>Lede capped at 320 characters — citation, not reproduction</li>
                  <li>Receipt ID on every metered call, reconcilable in USD micros</li>
                  <li>
                    <code style={{ fontFamily: "var(--font-mono)", color: "#aaa" }}>moved:false</code>{" "}
                    is a successful, billable, cursor-advancing answer
                  </li>
                </ul>
              </div>
              <div className="code">
                <div className="code-bar">POST /v1/poll · 200 OK</div>
                <pre>{`{
  "beat_id": "b_bb964843350e",
  "beat_label": "NVIDIA",
  "moved": true,
  "item_count": 3,
  "token_estimate": 412,
  "cursor": "eyJiZWF0…",
  "receipt_id": "r_8f21c4",
  "items": [
    {
      "lede": "Ambarella Q2 2027 earnings call…",
      "source": "The Motley Fool",
      "published_at": "2026-09-09T20:30:00Z",
      "event_id": "eng-11992096",
      "corroboration": 12,
      "sentiment": 0.18
    }
  ]
}`}</pre>
              </div>
            </div>

            <div className="showcase flip">
              <div>
                <span className="sec-eyebrow">Corroboration</span>
                <h3>Know what the market already believes.</h3>
                <p>
                  Single-source noise is easy to publish and easy to regret. Pleiades links
                  every article to its event cluster, so each item carries the number of
                  independent sources that ran the same story. A 561-source cluster is a fact;
                  a one-source claim is a rumour you can rank below it.
                </p>
                <ul>
                  <li>Cluster titles in plain language, not IDs</li>
                  <li>A ranked corroboration view across the whole catalog</li>
                  <li>Sentiment per item, so you can filter agreement and disagreement</li>
                </ul>
              </div>
              <div className="mock">
                <div className="mock-bar">
                  <span className="mock-dots"><span /><span /><span /></span>
                  <span className="mock-title">clusters · ranked by corroboration</span>
                </div>
                <div className="mock-feed">
                  <div className="mock-row">
                    <span className="k">STRAIT OF HORMUZ</span>
                    <span className="v">Saudi Arabia Runs Out of Easy Routes for Oil to Bypass Iran War</span>
                    <span className="s">◈ 561</span>
                  </div>
                  <div className="mock-row">
                    <span className="k">FEDERAL RESERVE</span>
                    <span className="v">Dollar Recovers on Smaller Treasury Buyback and Higher T-Note Yields</span>
                    <span className="s">◈ 175</span>
                  </div>
                  <div className="mock-row">
                    <span className="k">NVIDIA</span>
                    <span className="v">Ambarella Q2 2027 Earnings Call Transcript</span>
                    <span className="s">◈ 12</span>
                  </div>
                </div>
                <div className="mock-foot">
                  <span>events · linked</span>
                  <span>sources · counted</span>
                  <span style={{ marginLeft: "auto" }}>sentiment · per item</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section className="scaffold">
          <div className="wrap">
            <div className="sec-head">
              <span className="sec-eyebrow">Rails</span>
              <h2 className="sec-title">Six ways to consume the same signal.</h2>
              <p className="sec-sub">
                Pick the rail that matches your runtime. The payload never changes shape, so
                moving from a polling loop to a socket is a transport decision, not a rewrite.
              </p>
            </div>
            <div className="features">
              {FEATURES.map(({ icon: Icon, title, desc, tag }) => (
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

        {/* AUDIENCES */}
        <section className="scaffold">
          <div className="wrap">
            <div className="sec-head">
              <span className="sec-eyebrow">Who it is for</span>
              <h2 className="sec-title">Written for a runtime, readable by a human.</h2>
            </div>
            <div className="showcase">
              <div>
                <h3>Traders &amp; desks</h3>
                <p>
                  Machine-speed alerts with corroboration already attached, so your strategy
                  can size conviction instead of reacting to headlines.
                </p>
                <ul>
                  <li>Structured signals, not prose</li>
                  <li>Sentiment and cluster size on every item</li>
                  <li>Deterministic JSON for algorithmic stacks</li>
                </ul>
              </div>
              <div>
                <h3>Agents &amp; applications</h3>
                <p>
                  A real-time intelligence layer your system calls like any other tool — and,
                  with x402 and ACP, pays for on its own.
                </p>
                <ul>
                  <li>MCP tools and a stable REST contract</li>
                  <li>x402 per-call settlement in USDC</li>
                  <li>ACP jobs whose memo is the pack itself</li>
                </ul>
              </div>
            </div>
            <div className="showcase">
              <div>
                <h3>Creators &amp; analysts</h3>
                <p>
                  See which narratives are forming while they are still cheap to write about,
                  with every claim traceable to a publisher.
                </p>
                <ul>
                  <li>Event clusters reveal a rising story early</li>
                  <li>Publisher URLs on every item for citation</li>
                  <li>Coverage gaps visible across sources</li>
                </ul>
              </div>
              <div>
                <h3>Newsrooms</h3>
                <p>
                  Discovery and confirmation in one pass. Corroboration counts tell you how
                  well a story is already covered before you commit a reporter.
                </p>
                <ul>
                  <li>Cluster ranking replaces manual scanning</li>
                  <li>Source-level attribution built in</li>
                  <li>Webhooks into your CMS</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ROADMAP */}
        <section className="scaffold">
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
                <div key={r.when} className="feature" style={{ minHeight: 150 }}>
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
              The terminal is open. Watch the catalog stream, then wire your stack to the same
              contract.
            </p>
            <div className="cta-row">
              <a className="btn-primary" href="/dashboard">Open the live terminal <ArrowRight size={14} /></a>
              <a className="btn-ghost" href="#api">Read the contract</a>
            </div>
            <p className="cta-tiny">early access · operator-granted credentials · every call receipted</p>
          </div>
        </section>

        <footer className="site">
          <div className="wrap">
            <div className="footer-row">
              <div className="footer-brand-line">
                <span className="footer-co">PLEIADES</span>
                <span style={{ color: "var(--border-strong)" }}>/</span>
                <span className="footer-address">real-time news terminal</span>
              </div>
              <div className="footer-links">
                <a href="/dashboard">Terminal</a>
                <a href="#api">Contract</a>
                <a href="#faq">FAQ</a>
                <a href="#terminal">Top ↑</a>
              </div>
            </div>
            <div className="footer-row" style={{ marginTop: 10 }}>
              <span className="footer-address">
                markets move on news in seconds — built for agents and the people behind them
              </span>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}
