"use client";

import { useEffect, useState } from "react";
import SignalField from "@/components/signal-field";
import Beam from "@/components/beam";
import { BorderBeam } from "border-beam";

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

const TABS: Array<{ value: View; title: string }> = [
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

  const counts: Record<View, number | undefined> = {
    signals: stats?.total_items,
    clusters: stats?.total_events,
    corroboration: stats?.clustered_items,
  };

  return (
    <main className="shell">
      <Beam size="line" strength={0.5} className="beam-box beam-toolbar"><header className="app-toolbar">
        <div className="app-brand">
          <span>PLEIADES</span>
          <i />
          <small>live dashboard</small>
        </div>
        <div className="toolbar-flow">
          <span>{lastRefresh ? lastRefresh.toLocaleTimeString() : "connecting"}</span>
          <i>·</i> refreshes every 15s
        </div>
      </header></Beam>

      <div className="dash-layout">
        <Beam size="sm" strength={0.4} className="beam-box beam-sidebar"><aside className="dash-sidebar">
          <p className="side-label">Views</p>
          <nav className="side-nav" aria-label="Dashboard views">
            {TABS.map((t) => (
              <button
                key={t.value}
                type="button"
                className={`side-item${view === t.value ? " active" : ""}`}
                onClick={() => setView(t.value)}
                aria-current={view === t.value ? "page" : undefined}
              >
                <span className="mark" aria-hidden="true" />
                {t.title}
                <span className="side-count">{counts[t.value] ?? "…"}</span>
              </button>
            ))}
          </nav>
          <div className="side-foot">
            <a href="/">← Home</a>
          </div>
        </aside></Beam>

        <section className="dash-main">
          <div className="context-head" style={{ marginBottom: 32 }}>
            <div>
              <p className="kicker">Live dashboard</p>
              <h2>{TABS.find((t) => t.value === view)?.title}</h2>
            </div>
            <p>
              {lastRefresh
                ? `Updated ${lastRefresh.toLocaleTimeString()} · refreshes every 15s`
                : "Connecting…"}
            </p>
          </div>

          {view === "signals" && (
            <>
              <div className="stat-band">
                <Beam size="sm" strength={0.4}>
                  <div className="stat-cell">
                    <b>{stats?.beats ?? "…"}</b>
                    <span>beats</span>
                  </div>
                </Beam>
                <Beam size="sm" strength={0.4}>
                  <div className="stat-cell">
                    <b>{stats?.total_items ?? "…"}</b>
                    <span>signals indexed</span>
                  </div>
                </Beam>
                <Beam size="sm" strength={0.4}>
                  <div className="stat-cell">
                    <b>{stats?.total_events ?? "…"}</b>
                    <span>event clusters</span>
                  </div>
                </Beam>
                <Beam size="sm" strength={0.4}>
                  <div className="stat-cell">
                    <b>{stats?.clustered_items ?? "…"}</b>
                    <span>clustered items</span>
                  </div>
                </Beam>
                <Beam size="sm" strength={0.4}>
                  <div className="stat-cell">
                    <b>{stats?.max_corroboration ?? "…"}</b>
                    <span>max corroboration</span>
                  </div>
                </Beam>
              </div>

              <BorderBeam size="md" colorVariant="mono" theme="dark" strength={0.5}><div className="panel-card" style={{ marginTop: 20 }}>
                <h2>Signal field</h2>
                <SignalField items={stats?.recent ?? []} />
              </div></BorderBeam>

              <BorderBeam size="md" colorVariant="mono" theme="dark" strength={0.5}><div className="panel-card" style={{ marginTop: 20, padding: 0 }}>
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
              </div></BorderBeam>
            </>
          )}

          {view === "clusters" && (
            <BorderBeam size="md" colorVariant="mono" theme="dark" strength={0.5}><div className="panel-card" style={{ padding: 0 }}>
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
            </div></BorderBeam>
          )}

          {view === "corroboration" && (
            <BorderBeam size="md" colorVariant="mono" theme="dark" strength={0.5}><div className="panel-card" style={{ padding: 0 }}>
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
            </div></BorderBeam>
          )}
        </section>
      </div>

      <footer className="unified-footer">
        <div className="unified-footer-bottom">
          <span>pleiades — live dashboard</span>
          <span>“The number prioritizes. The evidence decides.”</span>
        </div>
      </footer>
    </main>
  );
}
