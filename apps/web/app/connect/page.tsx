"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, Code2, Copy, Plug, Terminal } from "lucide-react";
import { Footer, Header } from "@/components/news/shell";
import { API_BASE } from "@/components/news/client";
const options = [{ id: "mcp", title: "MCP connection", description: "Connect a compatible assistant directly to Pleiades news tools.", icon: Plug, label: "For assistants and coding agents" }, { id: "sdk", title: "TypeScript client", description: "Bring news into your own app with a small, typed client.", icon: Code2, label: "For apps and custom agents" }, { id: "tools", title: "OpenRouter tools", description: "Let a model choose when to check news in your tool-calling loop.", icon: Terminal, label: "For OpenRouter-powered apps" }];
export default function Connect() {
    const [selected, setSelected] = useState("mcp"), [copied, setCopied] = useState(false), [checking, setChecking] = useState(false), [result, setResult] = useState("");
    const snippets: Record<string, string> = { mcp: JSON.stringify({ mcpServers: { pleiades: { url: `${API_BASE}/mcp` } } }, null, 2), sdk: `import { PleiadesClient } from "@pleiades/sdk";\n\nconst news = new PleiadesClient({\n  baseUrl: "${API_BASE}"\n});\nconst { topics } = await news.topics("NVIDIA");\nconst first = await news.news(topics[0].beat_id);\nconst next = await news.changes(topics[0].beat_id, first.cursor);`, tools: `// Get the tool schemas for your model request.\nconst { tools } = await fetch(\n  "${API_BASE}/v2/tools"\n).then(r => r.json());\n\n// Supply tools to your OpenRouter request.\n// Execute returned calls with the Pleiades adapter,\n// then send each result back to the model.\n// See the complete example in the setup guide.` };
    async function copy() { try {
        await navigator.clipboard.writeText(snippets[selected]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }
    catch {
        setResult("Copy is unavailable in this browser. Select and copy the configuration below.");
    } }
    async function verify() { setChecking(true); setResult(""); try {
        const response = await fetch(`${API_BASE}/mcp`, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "pleiades-setup-check", version: "1.0.0" } } }) });
        const data = await response.json();
        if (!response.ok || !data.result?.serverInfo)
            throw Error();
        setResult(`Connection reached ${data.result.serverInfo.name}. Finish setup in your agent and request a topic to verify its own connection.`);
    }
    catch {
        setResult("The connection could not be reached. Please try again shortly or check the endpoint in the setup guide.");
    }
    finally {
        setChecking(false);
    } }
    return <>
<Header active="connect"/>
<main id="main" className="wrap">
<div className="page-heading">
<div className="eyebrow">ONE CONNECTION. MORE CONTEXT.</div>
<h1>Bring news to your agent.</h1>
<p>Choose the way you work. Each connection uses the same topics, source links, and saved update positions. Public connections open after the release check.</p>
</div>
<div className="integration-grid">{options.map(option => <button className="integration-card" aria-pressed={selected === option.id} key={option.id} onClick={() => { setSelected(option.id); setCopied(false); setResult(""); }}>
<span className="integration-icon">
<option.icon size={22}/>
</span>
<h2>{option.title}</h2>
<p>{option.description}</p>
<span className="integration-label">{option.label} ↗</span>
</button>)}</div>
<section className="setup-box">
<h2>{selected === "mcp" ? "Connect once. Start asking." : selected === "sdk" ? "Add news to your application." : "Give your model a news tool."}</h2>
<p>{selected === "mcp" ? "Add this endpoint in your agent’s remote MCP settings. Configuration names differ by client; this is the common JSON shape." : selected === "sdk" ? "The client is included in the GitHub repository as a workspace package. It is not published to npm yet. Build the repository before running this example." : "Tool schemas describe what a model may call. Your application executes the requests and returns the results to the model."}</p>
<div className="code-header">
<span>{selected === "mcp" ? "Remote MCP configuration" : "Integration example"}</span>
<button onClick={() => void copy()}>{copied ? <Check size={14}/> : <Copy size={14}/>} {copied ? "Copied" : "Copy"}</button>
</div>
<pre>
<code>{snippets[selected]}</code>
</pre>
<div className="steps">
<div>
<strong>01 · Connect</strong>
<p>Use the configuration or repository example in your own environment.</p>
</div>
<div>
<strong>02 · Ask for a topic</strong>
<p>“Find news topics about Nvidia and read the latest available coverage.”</p>
</div>
<div>
<strong>03 · Keep your place</strong>
<p>Save the returned cursor. Ask for changes from that position on your next check.</p>
</div>
</div>
<div style={{ display: "flex", gap: 20, alignItems: "center", marginTop: 20, flexWrap: "wrap" }}>
<button className="button button-small" onClick={() => void verify()} disabled={checking}>{checking ? "Checking…" : "Check MCP endpoint"}</button>
<Link className="quiet-link" href="/docs">Read the full setup guide <ArrowUpRight size={14} style={{ display: "inline" }}/>
</Link>
</div>{result && <div className="result-box" role="status">{result}</div>}</section>
</main>
<Footer />
</>;
}
