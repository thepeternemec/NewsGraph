"use client";

import { useState } from "react";
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

const PIPELINE = [
  { n: "01", title: "Discover", body: "Scan thousands of sources continuously and expand topic coverage — every beat is a living query." },
  { n: "02", title: "Cluster", body: "Deduplicate and link articles into events, scoring corroboration across distinct sources." },
  { n: "03", title: "Filter", body: "Cut the noise: relevance, sentiment, and bounded signal packs — never full article bodies." },
  { n: "04", title: "Deliver", body: "Ship the same structured signal to APIs, sockets, bots, and agent-native rails." },
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
    <main className="mx-auto max-w-6xl px-6 pb-24">
      <header className="flex items-center justify-between border-b border-border py-6">
        <span className="text-sm font-bold tracking-[0.2em]">
          <span aria-hidden="true">⋆</span> PLEIADES
        </span>
        <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          real-time news terminal
        </span>
      </header>

      <section className="py-16">
        <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
          Real-Time News Terminal
        </p>
        <h1 className="mt-4 text-5xl font-bold leading-[1.05] tracking-tight sm:text-7xl">
          The signal, before it
          <br />
          reaches the mainstream.
        </h1>
        <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
          Pleiades scans thousands of sources around the clock, clusters stories into
          events, and delivers structured, actionable intelligence — to humans and
          autonomous agents alike.
        </p>

        <div className="mt-10">
          <LiveNewsBoard />
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Magnetic>
            <a
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-lg bg-foreground px-5 py-3 text-sm font-semibold text-background"
            >
              Open live dashboard <ArrowRight size={14} />
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

      <section className="border-t border-border py-16">
        <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
          How it works
        </p>
        <div className="mt-8 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-4">
          {PIPELINE.map((s) => (
            <div key={s.n} className="bg-background p-6">
              <span className="text-[11px] tracking-[0.2em] text-muted-foreground">
                {s.n}
              </span>
              <h3 className="mt-3 text-sm font-bold">{s.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-border py-16">
        <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
          Agent surfaces
        </p>
        <h2 className="mt-4 max-w-2xl text-3xl font-bold tracking-tight">
          Built for agents. And the people behind them.
        </h2>
        <div className="mt-8 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {SKILLS.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="bg-background p-5">
              <Icon size={16} strokeWidth={1.75} className="text-muted-foreground" />
              <h3 className="mt-3 text-sm font-bold">{label}</h3>
              <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-border py-16">
        <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
          Who it&apos;s for
        </p>
        <h2 className="mt-4 text-3xl font-bold tracking-tight">Meet you where you are.</h2>
        <div className="mt-8">
          <FluidTabs
            value={persona}
            onValueChange={(v) => setPersona(v as PersonaKey)}
            tabs={Object.entries(PERSONAS).map(([value, p]) => ({ value, title: p.title }))}
          />
          <div className="mt-6 max-w-2xl">
            <h3 className="text-sm font-bold">{PERSONAS[persona].title}</h3>
            <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
              {PERSONAS[persona].body}
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-border pt-10 text-[13px] text-muted-foreground">
        <p>“Markets move on news in seconds. Pleiades ensures you never miss the signal.”</p>
        <p className="mt-3 text-[11px]">
          The world&apos;s most responsive, scalable, and adaptable news infrastructure.
        </p>
      </footer>
    </main>
  );
}
