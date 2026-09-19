"use client";

import { useState } from "react";
import { ArrowRight, Check, Copy } from "lucide-react";
import SiteNav from "@/components/site/site-nav";
import SiteFooter from "@/components/site/site-footer";

const API_BASE = "https://newsgraph.vercel.app/api";

const OPTIONS = [
  {
    id: "mcp",
    title: "MCP",
    blurb: "Point an assistant at one URL. Nothing to install.",
  },
  {
    id: "http",
    title: "HTTP",
    blurb: "Four GET routes. Works in any language.",
  },
  {
    id: "tools",
    title: "Tool calling",
    blurb: "Hand a model the schemas and let it decide when to look.",
  },
] as const;

type OptionId = (typeof OPTIONS)[number]["id"];

const SNIPPETS: Record<OptionId, string> = {
  mcp: `{
  "mcpServers": {
    "newsgraph": {
      "url": "${API_BASE}/mcp"
    }
  }
}`,
  http: `# 1. find the topic
curl -s "${API_BASE}/v2/topics?q=nvidia"

# 2. read it, and keep the cursor
curl -s "${API_BASE}/v2/news?beat_id=b_bb964843350e"

# 3. later: ask what is new since that cursor
curl -s "${API_BASE}/v2/changes?beat_id=b_bb964843350e&cursor=<cursor>"

# or go straight to headlines
curl -s "${API_BASE}/v2/brief?beat_id=b_bb964843350e"`,
  tools: `// The schemas are served, not vendored — they cannot drift from the API.
const { tools } = await fetch("${API_BASE}/v2/tools").then((r) => r.json());

// Pass them to your model, execute what it calls, send the results back.
// Four tools: newsgraph_topics, newsgraph_news, newsgraph_changes,
// newsgraph_brief.`,
};

export default function Connect() {
  const [selected, setSelected] = useState<OptionId>("mcp");
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState("");

  async function copy() {
    try {
      await navigator.clipboard.writeText(SNIPPETS[selected]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setResult("Copy is unavailable in this browser. Select the text below instead.");
    }
  }

  /** A real request, so "connected" means connected. */
  async function verify() {
    setChecking(true);
    setResult("");
    try {
      const response = await fetch(`${API_BASE}/mcp`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2025-06-18",
            capabilities: {},
            clientInfo: { name: "newsgraph-connect-check", version: "1.0.0" },
          },
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.result?.serverInfo) throw new Error();
      setResult(`Reached ${data.result.serverInfo.name}. Now ask it about a ticker.`);
    } catch {
      setResult("Could not reach the endpoint. Try again shortly.");
    } finally {
      setChecking(false);
    }
  }

  const active = OPTIONS.find((o) => o.id === selected) ?? OPTIONS[0];

  return (
    <>
      <SiteNav active="/connect" />
      <main>
        <div className="page-head">
          <div className="wrap">
            <span className="sec-eyebrow">Connect</span>
            <h1 className="sec-title">Start in one request.</h1>
            <p className="sec-sub">
              No key, no signup, no billing. Point your agent at the endpoint below and ask it about
              a ticker — +1000 topics covered, refreshed every fifteen minutes.
            </p>
            <div className="hero-cta">
              <a className="btn-primary" href="/docs/quickstart">
                Read the quickstart <ArrowRight size={14} />
              </a>
              <a className="btn-ghost" href="/api/v2/topics?limit=5" target="_blank" rel="noreferrer">
                See a live response
              </a>
            </div>
            <p className="hero-tiny">
              anonymous callers get 120 requests a minute · a key raises it to 1200
            </p>
          </div>
        </div>

        <section className="scaffold" id="ways">
          <div className="wrap">
            <div className="sec-head">
              <span className="sec-eyebrow">Three ways in</span>
              <h2 className="sec-title">Pick the one that fits.</h2>
              <p className="sec-sub">
                All three reach the same four calls. Nothing here is a client library —
                there is no SDK to install, and no version to keep in step.
              </p>
            </div>

            <div className="features grid-3">
              {OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`feature connect-option${option.id === selected ? " is-active" : ""}`}
                  onClick={() => {
                    setSelected(option.id);
                    setResult("");
                  }}
                  style={{ minHeight: 150, textAlign: "left" }}
                >
                  <span className="feature-tag" style={{ marginTop: 0, paddingTop: 0 }}>
                    {option.id === selected ? "selected" : " "}
                  </span>
                  <h3 className="feature-title">{option.title}</h3>
                  <p className="feature-desc">{option.blurb}</p>
                </button>
              ))}
            </div>

            <div className="code" style={{ marginTop: 28 }}>
              <div className="code-bar">
                {active.title}
                <button type="button" className="copy-btn" onClick={copy} aria-label="Copy">
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? "copied" : "copy"}
                </button>
              </div>
              <pre>{SNIPPETS[selected]}</pre>
            </div>

            <div className="oss-row">
              <button type="button" className="btn-primary" onClick={verify} disabled={checking}>
                {checking ? "Checking…" : "Check the connection"}
                {!checking && <ArrowRight size={14} />}
              </button>
            </div>
            {result && <p className="hero-tiny" style={{ textAlign: "left" }}>{result}</p>}
          </div>
        </section>

        <section className="cta-section">
          <div className="wrap">
            <h2 className="cta-title">Then ask it something.</h2>
            <p className="cta-sub">
              The first useful call is the smallest one: has this ticker moved since I last looked?
              An empty answer is a real answer, and it is the cheap one.
            </p>
            <div className="cta-row">
              <a className="btn-primary" href="/docs/quickstart">
                The four-call loop <ArrowRight size={14} />
              </a>
              <a className="btn-ghost" href="/docs">All the docs</a>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
