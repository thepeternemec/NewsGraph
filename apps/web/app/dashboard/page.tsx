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

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      {sub ? <span className="stat-sub">{sub}</span> : null}
    </div>
  );
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
    <main className="dash">
      <header className="dash-head">
        <div>
          <span className="kicker">LIVE · SUPABASE → PLEIADES</span>
          <h1>News Terminal</h1>
        </div>
        <div className="dash-meta">
          <span className="pulse" aria-hidden="true" />
          {lastRefresh
            ? `updated ${lastRefresh.toLocaleTimeString()}`
            : "connecting…"}
        </div>
      </header>

      {error && !stats ? (
        <div className="dash-error">
          <p>Could not reach the API.</p>
          <code>{error}</code>
          <p className="hint">
            Ensure the worker has run once ({API_BASE}/../worker) and the API is
            deployed.
          </p>
        </div>
      ) : (
        <>
          <section className="stats-row">
            <StatCard label="Beats" value={String(stats?.beats ?? "…")} />
            <StatCard label="News items" value={String(stats?.total_items ?? "…")} />
            <StatCard label="Event clusters" value={String(stats?.total_events ?? "…")} />
            <StatCard
              label="Clustered items"
              value={String(stats?.clustered_items ?? "…")}
              sub="linked to an event"
            />
            <StatCard
              label="Max corroboration"
              value={String(stats?.max_corroboration ?? "…")}
              sub="sources on one story"
            />
          </section>

          <section className="dash-grid">
            <div className="panel">
              <h2>Items per beat</h2>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={stats?.by_beat ?? []} layout="vertical" margin={{ left: 120 }}>
                  <CartesianGrid stroke="#1f1f1f" horizontal={false} />
                  <XAxis type="number" stroke="#8a8a8a" allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="label"
                    stroke="#8a8a8a"
                    width={118}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{ background: "#0d0d0d", border: "1px solid #1f1f1f" }}
                    labelStyle={{ color: "#f5f5f5" }}
                  />
                  <Bar dataKey="items" fill="#ffffff" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="panel">
              <h2>Pipeline</h2>
              <div className="flow">
                <div className="flow-node"><b>newsapi.ai</b><span>source</span></div>
                <div className="flow-arrow">→</div>
                <div className="flow-node"><b>worker</b><span>ingest · cluster</span></div>
                <div className="flow-arrow">→</div>
                <div className="flow-node">
                  <b>supabase</b>
                  <span>{stats?.beats} beats · {stats?.total_events} events</span>
                </div>
                <div className="flow-arrow">→</div>
                <div className="flow-node"><b>api</b><span>/v1/*</span></div>
                <div className="flow-arrow">→</div>
                <div className="flow-node"><b>you</b><span>dashboard</span></div>
              </div>
              <p className="hint">
                The worker polls newsapi.ai on a 15-minute cron, clusters articles
                into events, and persists packs. This dashboard reads the API
                every 15 seconds.
              </p>
            </div>
          </section>

          <section className="panel">
            <h2>Latest signals</h2>
            <ul className="feed">
              {(stats?.recent ?? []).map((item, i) => (
                <li key={i} className="feed-item">
                  <div className="feed-main">
                    <span className="beat-tag">{item.beat_label}</span>
                    <p className="lede">{item.lede}</p>
                    <span className="src">{item.source}</span>
                  </div>
                  <div className="feed-meta">
                    {item.event_id ? (
                      <span className="cluster" title={`cluster ${item.event_id}`}>
                        ◈ {item.corroboration || "—"}
                      </span>
                    ) : (
                      <span className="nocluster">·</span>
                    )}
                    <a href={item.url} target="_blank" rel="noreferrer">source ↗</a>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </main>
  );
}
