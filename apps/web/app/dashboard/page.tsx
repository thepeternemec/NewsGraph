"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight, BookOpen, Check, Compass, Link2, Plus, Radio, RefreshCw, Search, Star } from "lucide-react";
import { Header } from "@/components/news/shell";
import { api, dateLabel, type NewsItem, type NewsPage, type Topic } from "@/components/news/client";
export default function Dashboard() {
    const [topics, setTopics] = useState<Topic[]>([]), [topic, setTopic] = useState(""), [query, setQuery] = useState(""), [following, setFollowing] = useState<string[]>([]), [view, setView] = useState("all"), [items, setItems] = useState<NewsItem[]>([]), [page, setPage] = useState<NewsPage | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState(""), [localNote, setLocalNote] = useState("");
    const generation = useRef(0);
    useEffect(() => {
        const controller = new AbortController();
        const initialQuery = new URLSearchParams(window.location.search).get("q") ?? "";
        setQuery(initialQuery);
        try {
            const saved = JSON.parse(localStorage.getItem("pleiades.following") ?? "[]");
            if (Array.isArray(saved))
                setFollowing(saved.filter(x => typeof x === "string"));
        }
        catch {
            setLocalNote("Topic preferences could not be loaded on this device.");
        }
        api<{
            topics: Topic[];
        }>("/v2/topics", controller.signal).then(data => { setTopics(data.topics); const match = data.topics.find(t => t.label.toLowerCase() === initialQuery.toLowerCase()); setTopic(match?.beat_id ?? data.topics.find(t => t.label === "NVIDIA")?.beat_id ?? data.topics[0]?.beat_id ?? ""); if (!data.topics.length)
            setLoading(false); }).catch(e => { if (e.name !== "AbortError") {
            setError(e.message);
            setLoading(false);
        } });
        return () => controller.abort();
    }, []);
    const load = useCallback(async (beatId: string, before?: string) => { if (!beatId)
        return; const current = ++generation.current; setLoading(true); setError(""); try {
        const next = await api<NewsPage>(`/v2/news?beat_id=${beatId}${before ? `&before=${encodeURIComponent(before)}` : ""}`);
        if (current !== generation.current)
            return;
        setPage(next);
        setItems(previous => before ? [...previous, ...next.items.filter(i => !previous.some(p => p.id === i.id))] : next.items);
    }
    catch (e) {
        if (current === generation.current)
            setError(e instanceof Error ? e.message : "Unable to load news.");
    }
    finally {
        if (current === generation.current)
            setLoading(false);
    } }, []);
    useEffect(() => { setItems([]); setPage(null); void load(topic); return () => { generation.current++; }; }, [topic, load]);
    function toggle(id: string) { const next = following.includes(id) ? following.filter(x => x !== id) : [...following, id]; setFollowing(next); try {
        localStorage.setItem("pleiades.following", JSON.stringify(next));
    }
    catch {
        setLocalNote("Your browser could not save these topics. They will reset when you leave.");
    } }
    const filtered = topics.filter(t => (view !== "following" || following.includes(t.beat_id)) && t.label.toLowerCase().includes(query.toLowerCase()));
    useEffect(() => { if (filtered.length && !filtered.some(t => t.beat_id === topic))
        setTopic(filtered[0].beat_id); }, [query, view, following, topics, topic]);
    const selected = topics.find(t => t.beat_id === topic);
    return <>
<Header active="news"/>
<div className="workspace">
<aside className="sidebar" aria-label="News views">
<div className="sidebar-label">YOUR WORKSPACE</div>
<button className={view === "all" ? "active" : ""} onClick={() => setView("all")}>
<Compass size={17}/> Explore news</button>
<button className={view === "following" ? "active" : ""} onClick={() => setView("following")}>
<Star size={17}/> Following <span className="sidebar-count">{following.length}</span>
</button>
<div className="sidebar-label">BUILD WITH PLEIADES</div>
<Link href="/connect">
<Link2 size={17}/> Connect an agent</Link>
<Link href="/docs">
<BookOpen size={17}/> Setup guide</Link>
<small>Following topics is saved on this device. Connect an agent to run your own news checks.</small>
</aside>
 <main id="main" className="workspace-main">
<div className="workspace-title">
<div>
<div className="eyebrow">YOUR WINDOW ON THE WORLD</div>
<h1 style={{ marginTop: 12 }}>{view === "following" ? "Your topics" : "Explore the news"}</h1>
<p>Fresh perspectives. Original sources. A little more context.</p>
</div>
<button className="button button-light button-small" disabled={loading || !topic} onClick={() => void load(topic)}>
<RefreshCw size={15} className={loading ? "spin" : ""}/> Refresh</button>
</div>
 <div className="toolbar">
<label className="search-box">
<Search size={18}/>
<input aria-label="Find a topic" placeholder="Find a company, industry, or topic…" value={query} onChange={e => setQuery(e.target.value)}/>
</label>
<label>
<span className="sr-only">News topic</span>
<select className="filter-select" value={filtered.some(t => t.beat_id === topic) ? topic : ""} onChange={e => setTopic(e.target.value)}>
<option value="" disabled>{filtered.length ? "Choose a topic" : "No matching topics"}</option>{filtered.map(t => <option value={t.beat_id} key={t.beat_id}>{t.label}</option>)}</select>
</label>
</div>
 {localNote && <p className="notice" role="status">{localNote}</p>}{error && <div className="notice" role="alert">{error} <button onClick={() => window.location.reload()} className="quiet-link">Retry</button>
</div>}
 <div className="news-layout">
<div>
<div className="news-list">
<div className="list-heading">
<span>{selected?.label ?? "Available coverage"}</span>
<span>{loading ? "Checking coverage…" : `${items.length} articles loaded`}</span>
</div>{!filtered.length && !loading ? <div className="empty-state">
<Search size={28}/>
<h2>{view === "following" ? "Find your first topic" : "No matching topics"}</h2>
<p>{view === "following" ? "Use the plus button beside a topic to save it here." : "Try a company name or a broader subject."}</p>
</div> : items.length ? items.map(item => <article className="news-card" key={item.id}>
<div className="article-meta">
<span className="source-icon">{item.source.slice(0, 1)}</span>
<strong>{item.source}</strong>
<span>·</span>
<time dateTime={item.published_at}>{dateLabel(item.published_at)}</time>
</div>
<h2>
<a href={item.url} target="_blank" rel="noopener noreferrer">{item.title}</a>
</h2>{item.excerpt && <p>{item.excerpt}</p>}<div className="article-foot">
<span className="topic-tag">{selected?.label}</span>
<a href={item.url} target="_blank" rel="noopener noreferrer">Read original <ArrowUpRight size={14}/>
</a>
</div>
</article>) : <div className="empty-state">
<Radio size={30}/>
<h2>{loading ? "Checking the sources…" : "No recent coverage yet"}</h2>
<p>{loading ? "Loading available articles for this topic." : "There are no articles available for this topic in the last 30 days. Try another topic or check again later."}</p>
</div>}{filtered.length > 0 && page?.has_more && <div className="load-more">
<button className="button button-light button-small" disabled={loading} onClick={() => void load(topic, page?.history_cursor ?? page?.cursor)}>Load earlier articles</button>
</div>}</div>
</div>
 <aside className="news-aside">
<section className="side-panel">
<h2>Make it your news.</h2>
<p>Save topics you want to come back to.</p>{(query ? filtered : topics.filter(t => ["NVIDIA", "EU AI Act", "Federal Reserve", "Taiwan semiconductors"].includes(t.label))).slice(0, 8).map(t => <div className="topic-option" key={t.beat_id}>
<button onClick={() => { setTopic(t.beat_id); setQuery(""); setView("all"); }} style={{ width: "auto", border: 0, textAlign: "left", display: "block", color: "var(--ink)" }}>{t.label}</button>
<button onClick={() => toggle(t.beat_id)} aria-label={`${following.includes(t.beat_id) ? "Unfollow" : "Follow"} ${t.label}`} aria-pressed={following.includes(t.beat_id)}>{following.includes(t.beat_id) ? <Check size={15}/> : <Plus size={15}/>}</button>
</div>)}</section>
<section className="side-panel">
<span className="status-pill">
<Radio size={13}/> {page?.freshness.status === "fresh" ? "Recently checked" : "Freshness status"}</span>
<h2 style={{ marginTop: 16 }}>Know when we checked.</h2>
<p>{page?.freshness.last_success_at ? `Last successful source check: ${dateLabel(page.freshness.last_success_at)}.` : "A successful source check has not been recorded yet."}</p>{page?.freshness.status === "stale" && <p>Coverage may be delayed. An empty update does not mean nothing happened.</p>}<Link className="quiet-link" href="/docs#freshness">About freshness ↗</Link>
</section>
<section className="side-panel" style={{ background: "var(--blue-soft)" }}>
<h2>Give your agent a window.</h2>
<p>Get this coverage inside the tools you already use.</p>
<Link className="button button-small" href="/connect">Connect your agent <ArrowUpRight size={14}/>
</Link>
</section>
</aside>
</div>
</main>
</div>
</>;
}
