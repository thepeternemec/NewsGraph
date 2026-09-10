"use client";

import { useEffect, useState } from "react";
import FluidTabs from "@/components/ui/fluid-tabs/fluid-tabs";
import Antigravity from "@/components/antigravity";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "https://dnnoypytdfvsdenykooq.supabase.co/functions/v1/api";

interface Stats {
  beats: number;
  total_items: number;
  total_events: number;
  clustered_items: number;
  max_corroboration: number;
  last_ingestion_at: string | null;
  by_beat: Array<{
    beat_id: string;
    label: string;
    items: number;
    events: number;
    corroboration_max: number;
  }>;
  recent: Array<{
    beat_label: string;
    lede: string;
    source: string;
    url: string;
    event_id: string | null;
    corroboration: number;
    published_at: string;
  }>;
  clusters: Array<{
    event_id: string;
    beat_id: string;
    title: string | null;
    source_count: number;
    beat_label: string;
  }>;
  top_corroborated: Array<{
    beat_label: string;
    lede: string;
    source: string;
    url: string;
    corroboration: number;
  }>;
}

type View = "signals" | "clusters" | "corroboration";

const TABS = [
  { value: "signals", title: "Signals" },
  { value: "clusters", title: "Clusters" },
  { value: "corroboration", title: "Corroboration" },
];

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [view, setView] = useState<View>("signals");
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/v1/stats`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as Stats;
        if (!cancelled) {
          setStats(data);
          setLastRefresh(new Date());
        }
      } catch {
        /* backend paused */
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
    <main className="shell">
      <header className="app-toolbar">
        <div className="app-brand">
          <span>PLEIADES</span>
          <i />
          <small>live dashboard</small>
        </div>
        <div className="toolbar-flow">
          <span>live</span>
          <i>·</i> signals <i>·</i> clusters <i>·</i> corroboration
        </div>
        <div className="app-toolbar-actions">
          <a className="toolbar-action" href="/">← Home</a>
        </div>
      </header>

      <section className="unified-context" style={{ paddingTop: 64 }}>
        <div className="context-head">
          <div>
            <p className="kicker">Live dashboard</p>
            <h2>News terminal, live.</h2>
          </div>
          <p>
            {lastRefresh
              ? `Updated ${lastRefresh.toLocaleTimeString()} · refreshes every 15s`
              : "Connecting…"}
          </p>
        </div>

        <FluidTabs
          value={view}
          onValueChange={(v) => setView(v as View)}
          tabs={TABS}
        />

        <div style={{ marginTop: 28 }}>
          {view === "signals" && (
            <>
              <div className="stat-band">
                <div>
                  <b>{stats?.beats ?? "…"}</b>
                  <span>beats</span>
                </div>
                <div>
                  <b>{stats?.total_items ?? "…"}</b>
                  <span>signals indexed</span>
                </div>
                <div>
                  <b>{stats?.total_events ?? "…"}</b>
                  <span>event clusters</span>
                </div>
                <div>
                  <b>{stats?.clustered_items ?? "…"}</b>
                  <span>clustered items</span>
                </div>
                <div>
                  <b>{stats?.max_corroboration ?? "…"}</b>
                  <span>max corroboration</span>
                </div>
              </div>

              <div className="panel-card" style={{ marginTop: 20 }}>
                <h2>Signal field</h2>
                <div style={{ width: "100%", height: 400, position: "relative" }}>
                  <Antigravity
                    count={320}
                    magnetRadius={8}
                    ringRadius={7}
                    waveSpeed={0.4}
                    waveAmplitude={0.8}
                    particleSize={1.6}
                    lerpSpeed={0.05}
                    color="#ededE8"
                    autoAnimate
                    particleVariance={0.7}
                    pulseSpeed={3}
                    particleShape="capsule"
                    fieldStrength={10}
                  />
                </div>
              </div>

              <div className="panel-card" style={{ marginTop: 20, padding: 0 }}>
                <div className="windowbar" style={{ padding: "18px 24px" }}>
                  <span className="dots" aria-hidden="true">
                    <span className="dot" />
                    <span className="dot" />
                    <span className="dot" />
                  </span>
                  <span className="title">latest signals</span>
                  <span className="live">streaming</span>
                </div>
                <div className="terminal-feed" style={{ border: 0, marginTop: 0 }}>
                  {(stats?.recent ?? []).slice(0, 20).map((item, i) => (
                    <div key={i} className="feed-line">
                      <span className="tag">{item.beat_label}</span>
                      <a className="txt" href={item.url} target="_blank" rel="noreferrer" style={{ color: "#c9c9c3", textDecoration: "none" }}>
                        {item.lede}
                      </a>
                      <span className="src">
                        {item.event_id ? `◈${item.corroboration || "—"}` : "·"} {item.source}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {view === "clusters" && (
            <div className="panel-card" style={{ padding: 0 }}>
              <div className="windowbar" style={{ padding: "18px 24px" }}>
                <span className="dots" aria-hidden="true">
                  <span className="dot" />
                  <span className="dot" />
                  <span className="dot" />
                </span>
                <span className="title">event clusters · {stats?.total_events ?? 0} total</span>
              </div>
              <div className="terminal-feed" style={{ border: 0, marginTop: 0 }}>
                {(stats?.clusters ?? []).map((c) => (
                  <div key={c.event_id} className="feed-line">
                    <span className="tag">{c.beat_label}</span>
                    <span className="txt">{c.title ?? c.event_id}</span>
                    <span className="src" title={c.event_id}>◈ {c.source_count} sources</span>
                  </div>
                ))}
                {(stats?.clusters ?? []).length === 0 && (
                  <div className="feed-line">
                    <span className="tag">awaiting</span>
                    <span className="txt">No event clusters yet — backend is paused.</span>
                    <span className="src">pleiades</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {view === "corroboration" && (
            <div className="panel-card" style={{ padding: 0 }}>
              <div className="windowbar" style={{ padding: "18px 24px" }}>
                <span className="dots" aria-hidden="true">
                  <span className="dot" />
                  <span className="dot" />
                  <span className="dot" />
                </span>
                <span className="title">most corroborated stories · ranked by source count</span>
              </div>
              <div className="terminal-feed" style={{ border: 0, marginTop: 0 }}>
                {(stats?.top_corroborated ?? []).map((it, i) => (
                  <div key={i} className="feed-line">
                    <span className="tag" style={{ color: "#ededE8", fontWeight: 600 }}>◈ {it.corroboration}</span>
                    <a className="txt" href={it.url} target="_blank" rel="noreferrer" style={{ color: "#c9c9c3", textDecoration: "none" }}>
                      {it.lede}
                    </a>
                    <span className="src">{it.source} · {it.beat_label}</span>
                  </div>
                ))}
                {(stats?.top_corroborated ?? []).length === 0 && (
                  <div className="feed-line">
                    <span className="tag">awaiting</span>
                    <span className="txt">No corroborated stories yet — backend is paused.</span>
                    <span className="src">pleiades</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      <footer className="unified-footer">
        <div className="unified-footer-bottom">
          <span>pleiades — live dashboard</span>
          <span>“The number prioritizes. The evidence decides.”</span>
        </div>
      </footer>
    </main>
  );
}
