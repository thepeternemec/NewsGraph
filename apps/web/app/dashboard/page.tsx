"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
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
          setError(null);
          setLastRefresh(new Date());
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
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

      <section className="unified-context" style={{ paddingTop: 72 }}>
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

        {error && !stats && (
          <div className="panel-card">
            <p style={{ color: "#a2a29d", fontSize: 13, margin: 0 }}>
              Could not reach the API. <code style={{ color: "#ededE8" }}>{error}</code>
            </p>
          </div>
        )}

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
          <h2>Signals per beat</h2>
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={stats?.by_beat ?? []} layout="vertical" margin={{ left: 130 }}>
              <CartesianGrid stroke="#2d2d2d" horizontal={false} />
              <XAxis type="number" stroke="#7f7f7a" allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="label"
                stroke="#7f7f7a"
                width={124}
                tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
              />
              <Tooltip
                contentStyle={{ background: "#0d0d0d", border: "1px solid #2d2d2d", borderRadius: 8 }}
                labelStyle={{ color: "#ededE8" }}
                itemStyle={{ color: "#ededE8" }}
                cursor={{ fill: "#ffffff08" }}
              />
              <Bar dataKey="items" fill="#ededE8" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
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
                <a className="txt" href={item.url} target="_blank" rel="noreferrer"
                   style={{ color: "#c9c9c3", textDecoration: "none" }}>
                  {item.lede}
                </a>
                <span className="src">
                  {item.event_id ? `◈${item.corroboration || "—"}` : "·"} {item.source}
                </span>
              </div>
            ))}
            {(stats?.recent ?? []).length === 0 && (
              <div className="feed-line">
                <span className="tag">awaiting</span>
                <span className="txt">Backend is paused while topic queries are rebuilt.</span>
                <span className="src">pleiades</span>
              </div>
            )}
          </div>
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
