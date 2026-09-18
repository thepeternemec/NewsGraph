"use client";

import { useEffect, useRef, useState } from "react";

/** Clusters to load articles for. One request each, so this stays small. */
const CLUSTER_LIMIT = 10;

/**
 * The tickers a visitor most likely wants. Everything else is one search away.
 * Chosen for recognition, not for volume.
 */
const POPULAR = ["NVDA", "AAPL", "MSFT", "TSLA", "GOOGL", "AMZN", "META", "AMD", "NFLX", "AVGO"];
import SignalField from "@/components/signal-field";
import FluidTabs from "@/components/ui/fluid-tabs/fluid-tabs";
import {
  AccordionRoot,
  AccordionItem,
  AccordionItemTrigger,
  AccordionItemContent,
} from "@/components/ui/accordion/accordion";
import { hhmm } from "@/components/site/content";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "/api";

interface Topic {
  beat_id: string;
  label: string;
  ticker: string;
  /** Everything stored for this topic, and how much of it is from the last 12h. */
  article_count: number;
  recent_12h: number;
  status: string;
  last_success_at: string | null;
  last_checked_at: string | null;
}

interface Article {
  id: string;
  beat_id: string;
  title: string;
  excerpt: string;
  url: string;
  source: string;
  published_at: string;
  first_indexed_at: string;
}

type View = "signals" | "clusters";

const TABS: Array<{ value: View; title: string }> = [
  { value: "signals", title: "Signals" },
  { value: "clusters", title: "Article clusters" },
];

export default function Dashboard() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  // One entry per rendered cluster. Bounded on purpose: the catalog holds ~150
  // topics and one request each would be 150 calls from the browser.
  const [clusters, setClusters] = useState<Array<{ topic: Topic; articles: Article[] }>>([]);
  const [view, setView] = useState<View>("signals");
  const [stamp, setStamp] = useState("");
  /** The ticker the signal field is showing. Defaults to the first with news. */
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  /** Article ids already on screen, so newly polled ones can be animated in. */
  const seen = useRef<Set<string>>(new Set());
  const [arrived, setArrived] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        // One request for the whole catalog: the metrics sum across it and the
        // search filters it locally. A paging client would use the default 100.
        const res = await fetch(`${API_BASE}/v2/topics?limit=1000`, { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { topics?: Topic[] };
        const list = data.topics ?? [];
        setTopics(list);

        setStamp(new Date().toLocaleTimeString());


      } catch {
        /* paused */
      }
    }
    load();
    const id = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // Clusters are ten requests. Fetch them once, when that tab is first opened —
  // polling them every 15s spent most of an anonymous caller's whole budget.
  useEffect(() => {
    if (view !== "clusters" || clusters.length > 0 || topics.length === 0) return;
    let cancelled = false;
    (async () => {
      const withData = topics.filter((t) => t.status !== "unavailable").slice(0, CLUSTER_LIMIT);
      const loaded = await Promise.all(
        withData.map(async (topic) => {
          try {
            const res = await fetch(`${API_BASE}/v2/news?beat_id=${topic.beat_id}`, { cache: "no-store" });
            if (!res.ok) return { topic, articles: [] };
            const page = (await res.json()) as { items?: Article[] };
            return { topic, articles: page.items ?? [] };
          } catch {
            return { topic, articles: [] };
          }
        }),
      );
      if (!cancelled) setClusters(loaded);
    })();
    return () => {
      cancelled = true;
    };
  }, [view, topics, clusters.length]);

  const funded = topics.filter((t) => t.status !== "unavailable");
  const active = selected ?? funded[0]?.beat_id ?? null;
  const activeTopic = topics.find((t) => t.beat_id === active);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/v2/news?beat_id=${active}`, { cache: "no-store" });
        if (cancelled) return;
        const page = res.ok ? ((await res.json()) as { items?: Article[] }) : {};
        if (cancelled) return;
        const items = page.items ?? [];
        const fresh = new Set(items.filter((i) => !seen.current.has(i.id)).map((i) => i.id));
        // Only animate when there is a baseline — everything is "new" on first paint.
        setArrived(seen.current.size ? fresh : new Set());
        items.forEach((i) => seen.current.add(i.id));
        setArticles(items);
      } catch {
        if (!cancelled) setArticles([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [active]);

  const live = topics.filter((t) => t.status !== "unavailable").length;
  /** Everything published in the last 12 hours, across the whole catalog. */
  const movedRecently = topics.reduce((sum, t) => sum + (t.recent_12h ?? 0), 0);

  const term = query.trim().toLowerCase();
  const matches = term
    ? topics.filter((t) => t.ticker.toLowerCase().includes(term) || t.label.toLowerCase().includes(term))
    : [];
  const suggestions = matches.slice(0, 8);
  // With no query, show the curated ten plus whatever is selected, so the active
  // ticker is never hidden by not being popular.
  const visible = term
    ? matches.slice(0, 12)
    : [...POPULAR.map((k) => topics.find((t) => t.ticker === k)).filter((t): t is Topic => Boolean(t)),
       ...(activeTopic && !POPULAR.includes(activeTopic.ticker) ? [activeTopic] : [])];
  const labelOf = new Map(topics.map((t) => [t.beat_id, t.label]));
  const counts: Record<View, number | undefined> = {
    signals: articles.length || undefined,
    clusters: topics.length || undefined,
  };

  return (
    <>
      <nav className="nav">
        <div className="nav-pill">
          <a className="nav-logo" href="/">
            NEWSGRAPH
          </a>
          <span className="nav-links">
            {/* Sona UI's FluidTabs: the active surface slides between tabs rather
                than switching instantly, which makes the relation between the two
                views legible. It was already vendored and unused. */}
            <FluidTabs
              ariaLabel="Dashboard view"
              size="sm"
              variant="capsule"
              value={view}
              onValueChange={(next) => setView(next as View)}
              tabs={TABS.map((t) => ({
                value: t.value,
                title: (
                  <>
                    {t.title}
                    <span className="tab-count">{counts[t.value] ?? "…"}</span>
                  </>
                ),
              }))}
            />
          </span>
          <a className="nav-cta" href="/">← Home</a>
        </div>
      </nav>

      <main className="wrap" style={{ paddingTop: 132, paddingBottom: 96 }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24, marginBottom: 28 }}>
          <div>
            <span className="sec-eyebrow">Live graph · English only · one cluster per beat</span>
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
              <div className="metric-num">{topics.length || "…"}</div>
              <div className="metric-label">Topics in the catalog</div>
            </div>
            <div>
              <div className="metric-num">{topics.length ? movedRecently.toLocaleString() : "…"}</div>
              <div className="metric-label">Articles moved in the last 12h</div>
            </div>
            <div>
              <div className="metric-num">{live || "…"}</div>
              <div className="metric-label">Topics currently carrying articles</div>
            </div>
            <div>
              <div className="metric-num" style={{ fontFamily: "var(--font-mono)", fontSize: 22 }}>
                {stamp || "—"}
              </div>
              <div className="metric-label">Last ingest</div>
            </div>
          </div>
          <p className="hero-tiny" style={{ marginTop: 30 }}>
            read-only · no credential · topics, news and changes since a cursor
          </p>
        </div>

        {view === "signals" ? (
          <>
            {/* Ten recognisable tickers, plus a search over all of them — a wall
                of 165 chips is not navigable. */}
            <div className="ticker-picker">
              <div className="ticker-search">
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Search ${topics.length} tickers or companies…`}
                  aria-label="Search tickers"
                />
                {query.trim().length > 0 && (
                  <div className="ticker-suggest">
                    {suggestions.map((t) => (
                      <button
                        key={t.beat_id}
                        type="button"
                        className="ticker-suggest-row"
                        onClick={() => {
                          setSelected(t.beat_id);
                          setQuery("");
                        }}
                      >
                        <span className="s-tick">{t.ticker}</span>
                        <span className="s-name">{t.label}</span>
                        <span className="s-status">{t.status}</span>
                      </button>
                    ))}
                    {suggestions.length === 0 && (
                      <div className="ticker-suggest-row is-empty">No ticker matches “{query.trim()}”</div>
                    )}
                  </div>
                )}
              </div>

              <div className="ticker-bar">
                {visible.map((t) => (
                  <button
                    key={t.beat_id}
                    type="button"
                    className={`ticker-chip${t.beat_id === active ? " active" : ""}`}
                    onClick={() => setSelected(t.beat_id)}
                  >
                    <span className="c-tick">{t.ticker}</span>
                    <span className="c-name">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mock" style={{ marginTop: 18 }}>
              <div className="mock-bar">
                <span className="mock-dots"><span /><span /><span /></span>
                <span className="mock-title">
                  signal field · {activeTopic?.label ?? "no ticker selected"}
                  <span className="tz">all times UTC</span>
                </span>
                <span className="mock-live">{articles.length} items</span>
              </div>
              <SignalField
                items={articles.map((a) => ({
                  beat_label: labelOf.get(a.beat_id) ?? "—",
                  lede: a.title,
                  source: a.source,
                  url: a.url,
                  published_at: a.published_at,
                }))}
              />
            </div>

            <div className="mock" style={{ marginTop: 24 }}>
              <div className="mock-bar">
                <span className="mock-dots"><span /><span /><span /></span>
                <span className="mock-title">latest items · {activeTopic?.ticker ?? "—"}<span className="tz">all times UTC</span></span>
                <span className="mock-live">{activeTopic?.article_count ?? "…"} stored</span>
              </div>
              <div className="mock-feed">
                {articles.slice(0, 24).map((it) => (
                  <a key={it.id} className="mock-row" href={it.url} target="_blank" rel="noreferrer">
                    <span className="k">{labelOf.get(it.beat_id) ?? "—"}</span>
                    <span className="v">{it.title}</span>
                    <span className="s">
                      <span className="s-pub">{it.source}</span>
                      {it.published_at ? <span className="s-time">{hhmm(it.published_at)}</span> : null}
                    </span>
                  </a>
                ))}
                {articles.length === 0 && (
                  <div className="mock-row">
                    <span className="k">awaiting</span>
                    <span className="v">Ingestion paused while the topic catalog is rebuilt for 100 beats.</span>
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
              <span className="mock-title">article clusters · every article by title</span>
              <span className="mock-live">
                {clusters.length} of {topics.filter((t) => t.status !== "unavailable").length}
              </span>
            </div>
            {/* Sona UI's Accordion, already vendored and unused. Ten clusters were
                rendered fully expanded, which is why the view was capped at ten —
                collapsed, the list is scannable and the cap is about requests
                rather than about room. */}
            <AccordionRoot
              // Clusters load after this mounts, and `defaultValue` is read once —
              // without the key the first panel was always closed on a first visit.
              key={`${view}-${clusters.length}`}
              className="cluster-accordion"
              variant="animated"
              defaultValue={clusters[0] ? [clusters[0].topic.beat_id] : []}
            >
              {clusters.map(({ topic, articles: items }) => (
                <AccordionItem key={topic.beat_id} value={topic.beat_id}>
                  <AccordionItemTrigger className="cluster-trigger">
                    <span className="cluster-line">
                      <span className="c-tick">{topic.ticker}</span>
                      <span className="c-name">{topic.label}</span>
                      <span className="c-count">
                        {items.length} article{items.length === 1 ? "" : "s"}
                      </span>
                      <span className="c-status">{topic.status}</span>
                    </span>
                  </AccordionItemTrigger>
                  <AccordionItemContent>
                    <div className="cluster-body">
                      {items.map((it) => (
                        <a
                          key={it.id}
                          className="mock-row cluster-item"
                          href={it.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <span className="k" />
                          <span className="v">{it.title}</span>
                          <span className="s">
                            <span className="s-pub">{it.source}</span>
                            {it.published_at ? (
                              <span className="s-time">{hhmm(it.published_at)}</span>
                            ) : null}
                          </span>
                        </a>
                      ))}
                    </div>
                  </AccordionItemContent>
                </AccordionItem>
              ))}
            </AccordionRoot>
            {clusters.length === 0 && (
              <div className="mock-feed">
                <div className="mock-row">
                  <span className="k">awaiting</span>
                  <span className="v">No clusters yet — open this tab once ingestion has run.</span>
                  <span className="s">system</span>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="site">
        <div className="wrap">
          <div className="footer-row">
            <div className="footer-brand-line">
              <span className="footer-co">NEWSGRAPH</span>
              <span style={{ color: "var(--border-strong)" }}>/</span>
              <span className="footer-address">read-only · live graph</span>
            </div>
            <div className="footer-links">
              <a href="/">Home</a>
              <a href="/#contract">Contract</a>
              <a href="/#pricing">Pricing</a>
              <a href="/#faq">FAQ</a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
