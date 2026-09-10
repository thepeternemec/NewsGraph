"use client";

import { useState } from "react";
import {
  Activity,
  ArrowRight,
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
import LiveNewsBoard from "@/components/live-news-board";

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
  traders: {
    title: "Traders",
    body: "Machine-speed alerts and structured market signals, ready to plug directly into algorithmic trading stacks or human workflows.",
  },
  creators: {
    title: "Content creators",
    body: "Early narratives and emerging topics before they trend, with pre-written summaries and context for faster production.",
  },
  agents: {
    title: "AI agents & applications",
    body: "A real-time intelligence layer: structured data feeds agents can consume, interpret, and act on autonomously.",
  },
  media: {
    title: "Media & journalists",
    body: "Streamlined discovery, curation, and publication — track developments, confirm stories, scale editorial intelligence.",
  },
} as const;

type PersonaKey = keyof typeof PERSONAS;

export default function Home() {
  const [persona, setPersona] = useState<PersonaKey>("traders");

  return (
    <main className="page">
      <header className="nav">
        <span className="brand">
          <span className="stars" aria-hidden="true">⋆</span> PLEIADES
        </span>
        <span className="nav-note">real-time news terminal</span>
      </header>

      <section className="hero">
        <p className="kicker">REAL-TIME NEWS TERMINAL</p>
        <h1>
          The signal, before it reaches
          <br />
          the mainstream.
        </h1>
        <p className="sub">
          Pleiades scans thousands of sources around the clock, clusters stories into
          events, and delivers structured, actionable intelligence — to humans and
          autonomous agents alike.
        </p>

        <LiveNewsBoard />

        <div className="cta-row">
          <Magnetic>
            <a className="cta-btn" href="/dashboard">
              Open live dashboard <ArrowRight size={14} style={{ verticalAlign: "-2px" }} />
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
            onValueSelect={(v) => console.log(v)}
          />
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Built for agents. And the people behind them.</h2>
          <p>
            Every capability ships as a programmable primitive — the same structured
            signal, delivered wherever you work.
          </p>
        </div>
        <div className="skills-grid">
          {SKILLS.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="skill">
              <div className="icon"><Icon size={18} strokeWidth={1.75} /></div>
              <h3>{label}</h3>
              <p>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Meet you where you are.</h2>
          <p>From solo traders to autonomous agents — the right signal, in the right format.</p>
        </div>
        <FluidTabs
          value={persona}
          onValueChange={(v) => setPersona(v as PersonaKey)}
          tabs={Object.entries(PERSONAS).map(([value, p]) => ({ value, title: p.title }))}
        />
        <div className="persona-panel">
          <h3>{PERSONAS[persona].title}</h3>
          <p>{PERSONAS[persona].body}</p>
        </div>
      </section>

      <footer className="foot">
        <p>“Markets move on news in seconds. Pleiades ensures you never miss the signal.”</p>
        <p className="small">
          The world&apos;s most responsive, scalable, and adaptable news infrastructure.
        </p>
      </footer>
    </main>
  );
}
