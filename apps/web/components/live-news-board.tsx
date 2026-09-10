"use client";

import Marquee from "@/components/ui/marquee/marquee";
import { BorderBeam } from "border-beam";

export interface RecentItem {
  beat_label: string;
  lede: string;
  source: string;
  url: string;
  corroboration: number;
}

export interface Stats {
  total_items: number;
  total_events: number;
  max_corroboration: number;
  recent: RecentItem[];
}

export default function LiveNewsBoard({ stats }: { stats: Stats | null }) {
  const recent = stats?.recent ?? [];
  const ticker = recent.length > 0 ? recent : PLACEHOLDER;

  return (
    <BorderBeam size="md" colorVariant="mono" theme="dark" strength={0.6}>
      <div className="scanner">
      <div className="windowbar">
        <span className="dots" aria-hidden="true">
          <span className="dot" />
          <span className="dot" />
          <span className="dot" />
        </span>
        <span className="title">pleiades — live terminal</span>
        <span className="live">streaming</span>
      </div>

      <div className="terminal-ticker">
        <Marquee speed={60} gap="4rem" pauseOnHover>
          <div className="flex items-center">
            {ticker.map((item, i) => (
              <span key={i} className="whitespace-nowrap text-[11px] text-[#c9c9c3]">
                <span className="font-semibold text-[#ededE8]">{item.beat_label}</span>
                <span className="mx-3 text-[#444]">·</span>
                {item.lede}
              </span>
            ))}
          </div>
        </Marquee>
      </div>

      <div className="terminal-feed">
        {recent.slice(0, 8).map((item, i) => (
          <div key={i} className="feed-line">
            <span className="tag">{item.beat_label}</span>
            <span className="txt">{item.lede}</span>
            <span className="src">
              {item.corroboration > 0 ? `◈${item.corroboration}` : "·"} {item.source}
            </span>
          </div>
        ))}
        {recent.length === 0 && (
          <div className="feed-line">
            <span className="tag">awaiting</span>
            <span className="txt">Backend is paused while topic queries are rebuilt.</span>
            <span className="src">pleiades</span>
          </div>
        )}
        </div>
      </div>
    </BorderBeam>
  );
}

const PLACEHOLDER: RecentItem[] = [
  { beat_label: "Markets", lede: "Scanning thousands of sources for the first signal.", source: "Pleiades", url: "#", corroboration: 0 },
  { beat_label: "Policy", lede: "Clustering stories before they reach the mainstream.", source: "Pleiades", url: "#", corroboration: 0 },
  { beat_label: "AI", lede: "Structured, filtered, ready for agents and humans.", source: "Pleiades", url: "#", corroboration: 0 },
];
