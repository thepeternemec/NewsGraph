"use client";

import { useEffect, useState } from "react";
import SignalField from "@/components/signal-field";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "https://dnnoypytdfvsdenykooq.supabase.co/functions/v1/api";

interface Stats {
  beats: number;
  total_articles: number;
  total_clusters: number;
  english_only: boolean;
  last_ingestion_at: string | null;
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

type View = "signals" | "clusters";

const TABS: Array<{ value: View; title: string }> = [
  { value: "signals", title: "Signals" },
  { value: "clusters", title: "Article clusters" },
];

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [view, setView] = useState<View>("signals");
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
    const id = setInterval(load, 15000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const counts: Record<View, number | undefined> = {
    signals: stats?.total_articles,
    clusters: stats?.total_clusters,
  };

  return (
    <>
      <nav className="nav">
        <div className="nav-pill">
          <a className="nav-logo" href="/">
            PLEIADES <i /> <small>dashboard</small>
          </a>
          <span className="nav-links">
            {TABS.map((t) => (
              <button
                key={t.value}
                type="button"
                className="nav-link"
                onClick={() => setView(t.value)}
                style={view === t.value ? { color: "#fff", background: "rgba(255,255,255,0.06)" } : undefined}
              >
                {t.title}
                <span style={{ marginLeft: 8, color: "var(--text-ghost)", fontFamily: "var(--font-mono)", fontSize: 10 }}>
                  {counts[t.value] ?? "…"}
                </span>
              </button>
            ))}
          </span>
          <a className="nav-cta" href="/">← Home</a>
        </div>
      </nav>

      <main className="wrap" style={{ paddingTop: 132, paddingBottom: 96 }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24, marginBottom: 28 }}>
          <div>
            <span className="sec-eyebrow">Live terminal · English only</span>
            <h1 style={{ margin: 0, fontSize: "clamp(30px, 4vw, 44px)", lineHeight: 1.05, letterSpacing: "-0.035em", color: "#fff", fontWeight: 600 }}>
              {TABS.find((t) => t.value === view)?.title}
            </h1>
          </div>
          <span style={{ font: "11px var(--font-mono), monospace", color: "var(--text-ghost)" }}>
            {stamp ? `updated ${stamp}` : "connecting…"}
          </span>
        </div>

        <div className="metrics" style={{ borderTop: 0, paddingTop: 0 }}>
          <div className="metrics-grid">
            <div>
              <div className="metric-num">{stats?.beats ?? "…"}</div>
              <div className="metric-label">Beats</div>
            </div>
            <div>
              <div className="metric-num">{stats?.total_articles ?? "…"}</div>
              <div className="metric-label">English articles</div>
            </div>
            <div>
              <div className="metric-num">{stats?.total_clusters ?? "…"}</div>
              <div className="metric-label">Article clusters</div>
            </div>
            <div>
              <div className="metric-num" style={{ fontFamily: "var(--font-mono)", fontSize: 22 }}>
                {stats?.last_ingestion_at ? stats.last_ingestion_at.slice(11, 16) + "Z" : "—"}
              </div>
              <div className="metric-label">Last ingest</div>
            </div>
          </div>
        </div>

        {view === "signals" ? (
          <>
            <div className="mock" style={{ marginTop: 40 }}>
              <div className="mock-bar">
                <span className="mock-dots"><span /><span /><span /></span>
                <span className="mock-title">signal field</span>
                <span className="mock-live">streaming</span>
              </div>
              <SignalField
                items={(stats?.recent ?? []).map((r) => ({
                  beat_label: r.beat_label,
                  lede: r.lede,
                  source: r.source,
                  url: r.url,
                }))}
              />
            </div>

            <div className="mock" style={{ marginTop: 24 }}>
              <div className="mock-bar">
                <span className="mock-dots"><span /><span /><span /></span>
                <span className="mock-title">latest signals</span>
                <span className="mock-live">english</span>
              </div>
              <div className="mock-feed">
                {(stats?.recent ?? []).slice(0, 24).map((it, i) => (
                  <a key={i} className="mock-row" href={it.url} target="_blank" rel="noreferrer">
                    <span className="k">{it.beat_label}</span>
                    <span className="v">{it.lede}</span>
                    <span className="s">{it.source}</span>
                  </a>
                ))}
                {(stats?.recent ?? []).length === 0 && (
                  <div className="mock-row">
                    <span className="k">awaiting</span>
                    <span className="v">Ingestion paused while the topic catalog is rebuilt.</span>
                    <span className="s">system</span>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="mock" style={{ marginTop: 40 }}>
            <div className="mock-bar">
              <span className="mock-dots"><span /><span /><span /></span>
              <span className="mock-title">article clusters · one per beat</span>
              <span className="mock-live">{stats?.total_clusters ?? 0} active</span>
            </div>
            <div className="mock-feed">
              {(stats?.clusters ?? []).map((c) => (
                <div key={c.cluster_id} className="mock-row">
                  <span className="k" title={c.cluster_id}>{c.label}</span>
                  <span className="v">
                    {c.articles} english article{c.articles === 1 ? "" : "s"}
                  </span>
                  <span className="s">
                    {c.latest_at ? `latest ${c.latest_at.slice(11, 16)}Z` : "—"}
                  </span>
                </div>
              ))}
              {(stats?.clusters ?? []).length === 0 && (
                <div className="mock-row">
                  <span className="k">awaiting</span>
                  <span className="v">No clusters yet — ingestion is paused.</span>
                  <span className="s">system</span>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="site">
        <div className="wrap">
          <div className="footer-row">
            <div className="footer-brand-line">
              <span className="footer-co">PLEIADES</span>
              <span style={{ color: "var(--border-strong)" }}>/</span>
              <span className="footer-address">live dashboard</span>
            </div>
            <div className="footer-links">
              <a href="/">Home</a>
              <a href="/#api">Contract</a>
              <a href="/#faq">FAQ</a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
