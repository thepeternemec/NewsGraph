import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check, Layers, Link2, Radar, Sparkles } from "lucide-react";
import { Brand, Footer, Header } from "@/components/news/shell";
const topics = ["NVIDIA", "EU AI Act", "Federal Reserve", "Taiwan semiconductors"];
export default function Home() {
    return <>
<Header />
<main id="main">
    <section className="hero wrap">
<div className="eyebrow">
<span className="live-dot"/> THE WORLD MOVES. YOUR AGENT KEEPS UP.</div>
<h1>A world of news.<br />
<span>One connection.</span>
</h1>
<p className="hero-copy">Give your agent fresh news, clear context, and original sources. Follow what matters. Pick up where you left off.</p>
<div className="hero-actions">
<Link className="button" href="/connect">Connect your agent <ArrowUpRight size={18}/>
</Link>
<Link className="button button-light" href="/dashboard">Explore the news <ArrowRight size={18}/>
</Link>
</div>
<p className="hero-note">
<Check size={14}/> Free early access <span>·</span> English-language coverage <span>·</span> Source links included</p>
    <div className="hero-console">
<div className="console-heading">
<Brand />
<span>YOUR AGENT, CONNECTED</span>
<span className="example-label">Workflow example</span>
</div>
<div className="console-body">
<div className="prompt-line">
<span className="avatar">You</span>
<p>Keep me up to date on Nvidia and the chip industry.</p>
</div>
<div className="agent-line">
<div className="agent-symbol">
<Sparkles size={21}/>
</div>
<div>
<strong>I’ll start with the topics that match.</strong>
<p>Read the latest coverage, then check for new articles from the last saved point.</p>
<div className="topic-chips">{topics.filter(t => t === "NVIDIA" || t === "Taiwan semiconductors").map(t => <Link href={`/dashboard?q=${encodeURIComponent(t)}`} key={t}>
<span className="live-dot"/>{t}<ArrowUpRight size={13}/>
</Link>)}</div>
</div>
</div>
<div className="console-flow">
<span>
<Radar size={16}/> Find a topic</span>
<ArrowRight size={14}/>
<span>
<Layers size={16}/> Read the coverage</span>
<ArrowRight size={14}/>
<span>
<Link2 size={16}/> Follow the sources</span>
</div>
</div>
<div className="console-bottom">
<span>No invented headlines. Open the explorer for available coverage.</span>
<Link href="/dashboard">See the news <ArrowRight size={15}/>
</Link>
</div>
</div>
</section>
    <section className="ecosystem wrap">
<p>BUILT TO FIT THE WAY YOUR AGENT WORKS</p>
<div>
<span>↗ MCP</span>
<span>⌘ Agent tools</span>
<span>◈ TypeScript</span>
<span>↔ OpenRouter apps</span>
</div>
</section>
    <section className="section wrap" id="how-it-works">
<div className="section-intro">
<span className="eyebrow">A LITTLE CONTEXT GOES A LONG WAY</span>
<h2>The news your agent needs.<br />Ready when it asks.</h2>
<p>From a morning briefing to a company you follow closely, keep the reporting and its sources together.</p>
</div>
<div className="feature-grid">
<article>
<span className="feature-number">01 / DISCOVER</span>
<Radar />
<h3>Follow your corner of the world.</h3>
<p>Find coverage across companies, technology, policy, and world events. Choose topics from the available catalog.</p>
<Link href="/dashboard">Explore topics <ArrowUpRight size={16}/>
</Link>
</article>
<article>
<span className="feature-number">02 / CATCH UP</span>
<Layers />
<h3>Get the developments you missed.</h3>
<p>A saved cursor lets your agent request the next page of new articles, with duplicates removed by source URL.</p>
<Link href="/docs#changes">How updates work <ArrowUpRight size={16}/>
</Link>
</article>
<article>
<span className="feature-number">03 / GO TO THE SOURCE</span>
<Link2 />
<h3>Keep every answer grounded.</h3>
<p>Concise article excerpts come with publisher links and timestamps. Your agent can show you where the information came from.</p>
<Link href="/dashboard">Read the coverage <ArrowUpRight size={16}/>
</Link>
</article>
</div>
</section>
    <section className="connect-banner wrap">
<div>
<span className="eyebrow">BRING YOUR OWN AGENT</span>
<h2>Make news part<br />of its everyday toolkit.</h2>
<p>Connect through MCP, use the TypeScript client, or add news tools to your own application.</p>
<Link className="button" href="/connect">Find your connection <ArrowUpRight size={18}/>
</Link>
</div>
<div className="connection-map">
<div className="map-core">
<Brand />
</div>
<div className="map-branches">
<span>MCP clients</span>
<span>Your application</span>
<span>Agent workflows</span>
</div>
<p>One source of news. The tools you already use.</p>
</div>
</section>
    <section className="section wrap last-section">
<span className="eyebrow">START WITH WHAT MATTERS</span>
<h2>What is your agent following?</h2>
<div className="topic-chips large">{topics.map(t => <Link key={t} href={`/dashboard?q=${encodeURIComponent(t)}`}>{t}<ArrowUpRight size={16}/>
</Link>)}</div>
</section>
    </main>
<Footer />
</>;
}
