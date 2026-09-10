"use client";

import { useEffect, useState } from "react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "https://dnnoypytdfvsdenykooq.supabase.co/functions/v1/api";

interface RecentItem {
  beat_label: string;
  lede: string;
  source: string;
  url: string;
  corroboration: number;
}

interface Stats {
  total_items: number;
  total_events: number;
  max_corroboration: number;
  recent: RecentItem[];
}

export default function LiveNewsBoard() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/v1/stats`, { cache: "no-store" });
        if (res.ok && !cancelled) setStats((await res.json()) as Stats);
      } catch {
        /* board stays empty until the backend is reachable */
      }
    }
    load();
    const id = setInterval(load, 15000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const recent = stats?.recent ?? [];
  const tickerItems = recent.length > 0 ? recent : PLACEHOLDER;

  return (
    <div className="perspective">
      <div className="ticker-wrap">
        <div className="ticker">
          {[...tickerItems, ...tickerItems].map((item, i) => (
            <span key={i} className="ticker-item">
              <b>{item.beat_label}</b> · {item.lede}
            </span>
          ))}
        </div>
      </div>

      <div className="news-board" style={{ marginTop: 18 }}>
        {recent.slice(0, 9).map((item, i) => (
          <article
            key={i}
            className="news-card"
            style={{ animationDelay: `${i * 70}ms` }}
          >
            <span className="tag">{item.beat_label}</span>
            <p className="lede">{item.lede}</p>
            <div className="meta">
              <span>{item.source}</span>
              <span className="corr">
                {item.corroboration > 0 ? `◈ ${item.corroboration}` : "·"}
              </span>
            </div>
          </article>
        ))}
      </div>

      <p className="hint" style={{ marginTop: 14, color: "var(--muted)", fontSize: "0.75rem" }}>
        live stream · {stats?.total_items ?? "…"} signals · {stats?.total_events ?? "…"} event
        clusters · max corroboration {stats?.max_corroboration ?? "…"}
      </p>
    </div>
  );
}

const PLACEHOLDER: RecentItem[] = [
  { beat_label: "Markets", lede: "Scanning thousands of sources for the first signal.", source: "Pleiades", url: "#", corroboration: 0 },
  { beat_label: "Policy", lede: "Clustering stories before they reach the mainstream.", source: "Pleiades", url: "#", corroboration: 0 },
  { beat_label: "AI", lede: "Structured, filtered, ready for agents and humans.", source: "Pleiades", url: "#", corroboration: 0 },
];
