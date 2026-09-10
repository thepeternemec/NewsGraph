"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  Activity,
  Bot,
  Braces,
  Cpu,
  MessageSquare,
  Radio,
  Satellite,
  Zap,
} from "lucide-react";
import Magnetic from "@/components/ui/magnetic-button/magnetic-button";
import ExpandingAction from "@/components/ui/expanding-action/expanding-action";
import FluidTabs from "@/components/ui/fluid-tabs/fluid-tabs";
import LiveNewsBoard, { type Stats } from "@/components/live-news-board";
import Beam from "@/components/beam";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "https://dnnoypytdfvsdenykooq.supabase.co/functions/v1/api";

const PIPELINE = [
  { n: "01", title: "Discover", body: "Scan thousands of sources continuously and expand topic coverage — every beat is a living query." },
  { n: "02", title: "Cluster", body: "Deduplicate and link articles into events, scoring corroboration across distinct sources." },
  { n: "03", title: "Filter", body: "Cut the noise: relevance, sentiment, and bounded signal packs — never full article bodies." },
  { n: "04", title: "Deliver", body: "Ship the same structured signal to APIs, sockets, bots, and agent-native rails." },
];

const SKILLS = [
  { icon: Braces, label: "REST API", desc: "Cursor-based poll & delta streams of bounded, structured packs." },
  { icon: Radio, label: "WebSocket", desc: "Real-time push the moment a beat advances." },
  { icon: Bot, label: "MCP", desc: "Drop-in tools for any agent framework." },
  { icon: Cpu, label: "Virtuals ACP", desc: "On-chain jobs & memos for agent commerce." },
  { icon: Satellite, label: "x402", desc: "USDC payments settled over HTTP 402." },
  { icon: MessageSquare, label: "Bots", desc: "Telegram & Discord alerts in your workflow." },
  { icon: Activity, label: "Clustering", desc: "Cross-source corroboration on every story." },
  { icon: Zap, label: "Signals", desc: "Sentiment, tickers, narratives — structured, not prose." },
];

const PERSONAS = {
  traders: { title: "Traders", body: "Machine-speed alerts and structured market signals, ready to plug directly into algorithmic trading stacks or human workflows." },
  creators: { title: "Content creators", body: "Early narratives and emerging topics before they trend, with pre-written summaries and context for faster production." },
  agents: { title: "AI agents & applications", body: "A real-time intelligence layer: structured data feeds agents can consume, interpret, and act on autonomously." },
  media: { title: "Media & journalists", body: "Streamlined discovery, curation, and publication — track developments, confirm stories, scale editorial intelligence." },
} as const;

type PersonaKey = keyof typeof PERSONAS;

export default function Home() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [persona, setPersona] = useState<PersonaKey>("traders");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/v1/stats`, { cache: "no-store" });
        if (res.ok && !cancelled) setStats((await res.json()) as Stats);
      } catch {
        /* backend paused — board shows awaiting state */
      }
    }
    load();
    const id = setInterval(load, 15000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <main className="shell" id="top">
      <Beam size="line" strength={0.5} className="beam-box beam-toolbar"><header className="app-toolbar">
        <div className="app-brand">
          <span>PLEIADES</span>
          <i />
          <small>real-time news terminal</small>
        </div>
        <div className="toolbar-flow">
          <span>live</span>
          <i>·</i> discover <i>·</i> cluster <i>·</i> deliver
        </div>
        <div className="app-toolbar-actions">
          <a className="toolbar-action" href="#method">Method</a>
          <a className="toolbar-action" href="/dashboard">Dashboard</a>
        </div>
      </header></Beam>

      <section className="unified-hero">
        <div className="app-intro">
          <p className="kicker">Real-Time News Terminal</p>
          <h1>The signal, before it reaches the mainstream.</h1>
          <p>
            Pleiades scans thousands of sources around the clock, clusters stories into
            events, and delivers structured, actionable intelligence — to humans and
            autonomous agents alike.
          </p>

          <div className="actions">
            <Magnetic>
              <a className="button-primary" href="/dashboard">
                Open live dashboard <ArrowRight size={13} />
              </a>
            </Magnetic>
            <ExpandingAction
              trigger="Start building"
              items={[
                { value: "api", label: "REST API" },
                { value: "ws", label: "WebSocket" },
                { value: "mcp", label: "MCP" },
                { value: "bots", label: "Bots" },
              ]}
            />
          </div>

          <div className="app-proof">
            <Beam size="sm" strength={0.4}>
              <div className="proof-cell">
                <b>{stats?.total_items ?? "…"}</b>
                <span>signals indexed</span>
              </div>
            </Beam>
            <Beam size="sm" strength={0.4}>
              <div className="proof-cell">
                <b>{stats?.total_events ?? "…"}</b>
                <span>event clusters</span>
              </div>
            </Beam>
            <Beam size="sm" strength={0.4}>
              <div className="proof-cell">
                <b>{stats?.max_corroboration ?? "…"}</b>
                <span>max corroboration</span>
              </div>
            </Beam>
          </div>
        </div>

        <LiveNewsBoard stats={stats} />
      </section>

      <section className="unified-context" id="method">
        <div className="context-head">
          <div>
            <p className="kicker">How it works</p>
            <h2>One connected pipeline.</h2>
          </div>
          <p>
            From raw source firehose to a structured signal pack — the same object,
            delivered everywhere you work.
          </p>
        </div>
        <div className="outcome-grid">
          {PIPELINE.map((s) => (
            <Beam key={s.n} size="sm" strength={0.45}><div className="outcome-card">
              <span>{s.n}</span>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </div></Beam>
          ))}
        </div>
      </section>

      <section className="unified-context">
        <div className="context-head">
          <div>
            <p className="kicker">Agent surfaces</p>
            <h2>Built for agents. And the people behind them.</h2>
          </div>
          <p>
            Every capability ships as a programmable primitive — the same structured
            signal, in the format you consume.
          </p>
        </div>
        <div className="skill-grid">
          {SKILLS.map(({ icon: Icon, label, desc }) => (
            <Beam key={label} size="sm" strength={0.45}><div className="skill-cell">
              <Icon size={15} strokeWidth={1.75} className="ic" />
              <h3>{label}</h3>
              <p>{desc}</p>
            </div></Beam>
          ))}
        </div>
      </section>

      <section className="unified-context">
        <div className="context-head">
          <div>
            <p className="kicker">Who it&apos;s for</p>
            <h2>Meet you where you are.</h2>
          </div>
          <p>From solo traders to autonomous agents — the right signal, at the right time, in the right format.</p>
        </div>
        <FluidTabs
          value={persona}
          onValueChange={(v) => setPersona(v as PersonaKey)}
          tabs={Object.entries(PERSONAS).map(([value, p]) => ({ value, title: p.title }))}
        />
        <div style={{ maxWidth: 640, marginTop: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 500, color: "#ededE8", letterSpacing: "-.04em" }}>
            {PERSONAS[persona].title}
          </h3>
          <p style={{ color: "#90908b", fontSize: 13, lineHeight: 1.7, marginTop: 8 }}>
            {PERSONAS[persona].body}
          </p>
        </div>
      </section>

      <section className="open-source-band">
        <Beam size="md" strength={0.6}><div className="open-source-inner">
          <div>
            <p className="kicker" style={{ margin: 0 }}>Built in the open</p>
            <h2>The news infrastructure for the agent era.</h2>
            <p>
              A structured intelligence layer that traders, creators, agents, and
              newsrooms all read from — one signal, many surfaces.
            </p>
          </div>
          <Magnetic>
            <a className="button-primary" href="/dashboard">
              See it live <ArrowRight size={13} />
            </a>
          </Magnetic>
        </div></Beam>
      </section>

      <footer className="unified-footer">
        <div className="unified-footer-top">
          <div className="app-brand">
            <span style={{ fontSize: 15, color: "#ededE8", fontWeight: 600 }}>PLEIADES</span>
            <small>real-time news terminal</small>
          </div>
          <a className="toolbar-action" href="#top">Back to top ↑</a>
        </div>
        <div className="unified-footer-bottom">
          <span>“Markets move on news in seconds.”</span>
          <span>pleiades — the signal, before it reaches the mainstream</span>
        </div>
      </footer>
    </main>
  );
}
