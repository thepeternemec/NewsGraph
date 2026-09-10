"use client";

import Antigravity from "@/components/antigravity";

export interface SignalItem {
  beat_label: string;
  lede: string;
  source: string;
  url: string;
  corroboration?: number;
}

/** Scattered anchor points — kept off-centre so the particle ring stays visible. */
const POSITIONS: Array<{ left: string; top: string }> = [
  { left: "3%", top: "7%" },
  { left: "35%", top: "2%" },
  { left: "67%", top: "9%" },
  { left: "4%", top: "40%" },
  { left: "70%", top: "38%" },
  { left: "14%", top: "69%" },
  { left: "47%", top: "74%" },
  { left: "71%", top: "67%" },
];

export default function SignalField({ items }: { items: SignalItem[] }) {
  const shown = items.slice(0, POSITIONS.length);

  return (
    <div className="signal-field">
      <div className="signal-canvas">
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

      <div className="signal-labels">
        {shown.map((item, i) => (
          <a
            key={i}
            className="signal-label"
            href={item.url}
            target="_blank"
            rel="noreferrer"
            style={{
              left: POSITIONS[i].left,
              top: POSITIONS[i].top,
              animationDelay: `${i * 110}ms`,
            }}
            title={`${item.source}${item.corroboration ? ` · ◈${item.corroboration}` : ""}`}
          >
            <span className="tag">{item.beat_label}</span>
            <span className="headline">{item.lede}</span>
            <span className="meta">
              {item.corroboration ? `◈${item.corroboration} · ` : ""}
              {item.source}
            </span>
          </a>
        ))}
        {shown.length === 0 && (
          <span className="signal-empty">awaiting signals — ingestion paused</span>
        )}
      </div>
    </div>
  );
}
