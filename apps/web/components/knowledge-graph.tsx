"use client";

import { useEffect, useMemo, useState } from "react";
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type SimulationNodeDatum,
} from "d3-force";

interface Beat {
  beat_id: string;
  label: string;
  items: number;
  events?: number;
}
interface Cluster {
  event_id: string;
  beat_id: string;
  title: string | null;
  source_count: number;
}

interface GNode extends SimulationNodeDatum {
  id: string;
  type: "beat" | "event";
  label: string;
  r: number;
  source_count?: number;
}

export default function KnowledgeGraph({
  byBeat,
  clusters,
}: {
  byBeat: Beat[];
  clusters: Cluster[];
}) {
  const [nodes, setNodes] = useState<GNode[]>([]);
  const [edges, setEdges] = useState<Array<[string, string]>>([]);
  const [hover, setHover] = useState<string | null>(null);

  const built = useMemo(() => {
    const beats = byBeat.filter((b) => b.items > 0 || (b.events ?? 0) > 0);
    const beatIds = new Set(beats.map((b) => b.beat_id));
    const cs = clusters.filter((c) => beatIds.has(c.beat_id));
    return { beats, cs };
  }, [byBeat, clusters]);

  useEffect(() => {
    const { beats, cs } = built;
    const nodes: GNode[] = [
      ...beats.map((b) => ({
        id: b.beat_id,
        type: "beat" as const,
        label: b.label,
        r: 9 + Math.min(13, Math.log(b.items + 1) * 3.2),
      })),
      ...cs.map((c) => ({
        id: c.event_id,
        type: "event" as const,
        label: c.title ?? c.event_id,
        r: 3.5 + Math.min(9, Math.log(c.source_count + 1) * 2),
        source_count: c.source_count,
      })),
    ];
    const links = cs.map((c) => ({ source: c.beat_id, target: c.event_id }));
    setEdges(cs.map((c) => [c.beat_id, c.event_id]));

    const sim = forceSimulation(nodes)
      .force(
        "link",
        forceLink(links)
          .id((d) => (d as GNode).id)
          .distance(78),
      )
      .force("charge", forceManyBody().strength(-240))
      .force("collide", forceCollide().radius((d) => (d as GNode).r + 5))
      .force("center", forceCenter(420, 260));

    sim.on("tick", () => {
      setNodes(nodes.map((n) => ({ ...n, x: n.x ?? 0, y: n.y ?? 0 })));
    });

    return () => {
      sim.stop();
    };
  }, [built]);

  const pos = useMemo(() => {
    const m = new Map<string, { x: number; y: number }>();
    for (const n of nodes) m.set(n.id, { x: n.x ?? 0, y: n.y ?? 0 });
    return m;
  }, [nodes]);

  const hoveredSet = useMemo(() => {
    if (!hover) return new Set<string>();
    const s = new Set<string>([hover]);
    for (const [a, b] of edges) {
      if (a === hover) s.add(b);
      if (b === hover) s.add(a);
    }
    return s;
  }, [hover, edges]);

  return (
    <div style={{ width: "100%", overflow: "hidden" }}>
      <svg viewBox="0 0 840 520" width="100%" style={{ display: "block" }}>
        <g>
          {edges.map(([a, b], i) => {
            const pa = pos.get(a);
            const pb = pos.get(b);
            if (!pa || !pb) return null;
            const active = hover && (a === hover || b === hover);
            return (
              <line
                key={i}
                x1={pa.x}
                y1={pa.y}
                x2={pb.x}
                y2={pb.y}
                stroke={active ? "#7f7f7a" : "#2d2d2d"}
                strokeWidth={active ? 1 : 0.5}
              />
            );
          })}
        </g>
        <g>
          {nodes.map((n) => {
            const dimmed = hover && !hoveredSet.has(n.id);
            const isBeat = n.type === "beat";
            return (
              <g
                key={n.id}
                transform={`translate(${n.x ?? 0},${n.y ?? 0})`}
                onMouseEnter={() => setHover(n.id)}
                onMouseLeave={() => setHover(null)}
                style={{ opacity: dimmed ? 0.25 : 1, transition: "opacity .15s", cursor: "pointer" }}
              >
                <circle
                  r={n.r}
                  fill={isBeat ? "#ededE8" : "#0d0d0d"}
                  stroke={isBeat ? "#0d0d0d" : "#7f7f7a"}
                  strokeWidth={1}
                />
                <text
                  dy={isBeat ? -n.r - 6 : (hover === n.id ? -n.r - 6 : 4)}
                  textAnchor="middle"
                  fontSize={isBeat ? 10 : 9}
                  fill={isBeat ? "#ededE8" : "#7f7f7a"}
                  fontFamily="var(--font-mono), monospace"
                  letterSpacing={isBeat ? 0 : "-.02em"}
                >
                  {n.label.length > (isBeat ? 26 : 34)
                    ? n.label.slice(0, isBeat ? 26 : 34) + "…"
                    : n.label}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
      <p className="mono" style={{ color: "#7f7f7a", fontSize: 9, letterSpacing: ".08em", textTransform: "uppercase", margin: "8px 0 0" }}>
        ● beats — size ∝ signals · ○ event clusters — size ∝ corroboration · hover to trace
      </p>
    </div>
  );
}
