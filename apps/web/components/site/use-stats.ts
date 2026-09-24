"use client";

import { useEffect, useState } from "react";
import { API_BASE } from "./content";

/**
 * One live poll of the public news API, shared by the pages that show real
 * data. `/v2/topics` drives the counts; the first topic that has articles
 * drives the ticker. Both are public and read-only — no credential, no billing.
 */

interface Topic {
  beat_id: string;
  label: string;
  status: string;
  last_success_at: string | null;
  last_checked_at: string | null;
}

interface NewsItem {
  id: string;
  beat_id: string;
  title: string;
  url: string;
  source: string;
  published_at: string;
  first_indexed_at: string;
}

export interface Stats {
  /** Topics in the catalog. */
    beats: number;
  /** Topics that currently have articles. */
  live: number;
}

export function useNewsGraphStats(intervalMs = 20000) {
  const [topics, setTopics] = useState<Topic[]>([]);
  // The catalog is paginated, so `topics.length` is the size of a page capped at
  // 1000 and the headline number stopped there. The API reports the real total.
  const [total, setTotal] = useState(0);
  const [items, setItems] = useState<NewsItem[]>([]);
  const [stamp, setStamp] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`${API_BASE}/v2/topics?limit=1000`, { cache: "no-store" });
        if (cancelled || !res.ok) return;
        const data = (await res.json()) as { topics?: Topic[]; total?: number };
        const list = data.topics ?? [];
        setTopics(list);
          setTotal(data.total ?? list.length);

        const fundable = list.find((t) => t.status !== "unavailable");
        if (fundable) {
          const news = await fetch(`${API_BASE}/v2/news?beat_id=${fundable.beat_id}`, {
            cache: "no-store",
          });
          if (!cancelled && news.ok) {
            const page = (await news.json()) as { items?: NewsItem[] };
            setItems(page.items ?? []);
          }
        }
        setStamp(new Date().toLocaleTimeString());
      } catch {
        /* offline or unreachable — pages render their empty states */
      }
    }

    load();
    const id = setInterval(load, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [intervalMs]);

  const labelOf = new Map(topics.map((t) => [t.beat_id, t.label]));
  const stats: Stats = {
    beats: total || topics.length,
    live: topics.filter((t) => t.status !== "unavailable").length,
  };

  // One mapped shape, so callers never have to know the API's field names.
  const mapped = items.map((i) => ({
    id: i.id,
    beat_id: i.beat_id,
    beat_label: labelOf.get(i.beat_id) ?? "NEWSGRAPH",
    lede: i.title,
    source: i.source,
    url: i.url,
    published_at: i.published_at,
    lang: "eng",
  }));

  const ticker = mapped.length
    ? mapped.slice(0, 8)
    : [
        {
          beat_label: "NEWSGRAPH",
          lede: "Awaiting the next ingestion cycle.",
          source: "system",
          url: "#",
          published_at: "",
          lang: "eng",
        },
      ];

  return { stats, topics, items: mapped, stamp, ticker };
}
