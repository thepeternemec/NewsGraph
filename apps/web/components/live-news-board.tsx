"use client";

import { useEffect, useState } from "react";
import Marquee from "@/components/ui/marquee/marquee";
import SpotlightCard from "@/components/ui/spotlight-card/spotlight-card";

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
  const ticker = recent.length > 0 ? recent : PLACEHOLDER;

  return (
    <div>
      <Marquee
        speed={70}
        gap="4rem"
        pauseOnHover
        containerClassName="border-y border-border bg-[var(--bg-soft)] py-3"
      >
        <div className="flex items-center">
          {ticker.map((item, i) => (
            <span key={i} className="whitespace-nowrap text-[13px] text-muted-foreground">
              <span className="font-semibold text-foreground">{item.beat_label}</span>
              <span className="mx-3 opacity-40">·</span>
              {item.lede}
            </span>
          ))}
        </div>
      </Marquee>

      <div className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
        {recent.slice(0, 9).map((item, i) => (
          <SpotlightCard
            key={i}
            className="rounded-xl border border-border bg-[var(--panel)] p-4"
          >
            <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              {item.beat_label}
            </span>
            <p className="mt-2 text-[13px] leading-relaxed text-foreground">
              {item.lede}
            </p>
            <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="truncate">{item.source}</span>
              <span className="ml-3 shrink-0">
                {item.corroboration > 0 ? `◈ ${item.corroboration}` : "·"}
              </span>
            </div>
          </SpotlightCard>
        ))}
      </div>

      <p className="mt-4 text-[11px] text-muted-foreground">
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
