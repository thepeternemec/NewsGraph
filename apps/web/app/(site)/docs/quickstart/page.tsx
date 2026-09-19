export const metadata = { title: "Quickstart" };

export default function DocsQuickstart() {
  return (
    <>
      <div className="docs-head">
        <h1>Quickstart</h1>
        <p className="docs-lead">
          No key, no signup, no billing. Every route below is read-only and open, so you can go from
          this page to a working loop in a couple of minutes.
        </p>
      </div>

      <h2>1. Pick a topic</h2>
      <p>
        A topic is a saved subject with a stable ID. The catalog holds <strong>+1000 topics</strong>{" "}
        — US-listed equities and the largest crypto assets — and almost all of them carry articles.
        A topic reports <code>unavailable</code> only until its first successful check.
      </p>
      <div className="code">
        <div className="code-bar">GET /v2/topics · no credential</div>
        <pre>{`curl /api/v2/topics?limit=1
curl "/api/v2/topics?q=nvidia"     # search a ticker or a company name`}</pre>
      </div>
      <div className="code">
        <div className="code-bar">200 OK</div>
        <pre>{`{
  "topics": [
    {
      "beat_id": "b_bb964843350e",
      "label": "NVIDIA",
      "ticker": "NVDA",
      "asset": "equity",
      "article_count": 521,
      "recent_12h": 65,
      "status": "fresh",
      "last_success_at": "2026-09-19T10:15:31.920Z",
      "last_checked_at": "2026-09-19T10:15:31.920Z"
    }
  ],
  "total": 1034,
  "limit": 1,
  "offset": 0,
  "has_more": true,
  "next_offset": 1
}`}</pre>
      </div>
      <p>
        Keep the <code>beat_id</code>. It is stable, and it is the only argument the other routes
        need. The catalog is paginated — follow <code>next_offset</code> while <code>has_more</code>{" "}
        is true, or ask for <code>limit=1000</code> to take the lot in one request.
      </p>
      <p>
        <code>status</code> says whether the last <em>check</em> succeeded, which is not the same as
        whether there is news. <code>article_count</code> and <code>recent_12h</code> say what is
        actually behind a topic. A coin and a company can share a ticker — Sui and Sun Communities
        are both <code>SUI</code> — so read <code>asset</code> to tell them apart.
      </p>

      <h2>2. Read the baseline</h2>
      <p>
        Fetch the current articles for your topic and keep the <code>cursor</code> from the
        response. That cursor is your position — it is signed and bound to this topic.
      </p>
      <div className="code">
        <div className="code-bar">GET /v2/news?beat_id=b_bb964843350e</div>
        <pre>{`{
  "items": [
    {
      "id": "9942",
      "beat_id": "b_bb964843350e",
      "title": "China's Homegrown AI Chip Push Just Got Faster. Is This a Real Threat to Nvidia?",
      "url": "https://news.google.com/rss/articles/CBMi...",
      "source": "The Motley Fool",
      "published_at": "2026-09-17T22:42:49.000Z",
      "first_indexed_at": "2026-09-17T22:45:32.798Z",
      "excerpt": ""
    }
  ],
  "estimated_tokens": 1484,
  "has_more": true,
  "cursor": "eyJ2IjoyLCJiIjoiYl9iYjk2NDg0MzM1MGUi…",
  "history_cursor": "eyJ2IjoyLCJiIjoiYl9iYjk2NDg0MzM1MGUi…",
  "freshness": {
    "status": "fresh",
    "last_success_at": "2026-09-19T10:15:31.920Z"
  }
}`}</pre>
      </div>
      <p>
        A page is bounded — eight items, with <code>estimated_tokens</code> so you can budget before
        you spend. <code>first_indexed_at</code> sits beside <code>published_at</code> on purpose:
        lead time is a field you can measure, not a claim you have to trust.
      </p>
      <p>
        <strong>The link is a Google News link</strong>, not the publisher&rsquo;s own, and{" "}
        <code>excerpt</code> is empty — the current provider returns a headline and a publisher, not
        prose. Some older items, ingested before the provider changed, still carry a real publisher
        URL and an excerpt; do not depend on either being present.
      </p>

      <h2>3. Ask what changed</h2>
      <p>
        This is the product. Send the cursor back and you get only what appeared since — and
        &ldquo;nothing&rdquo; is a normal, successful answer.
      </p>
      <div className="code">
        <div className="code-bar">GET /v2/changes?beat_id=b_bb964843350e&cursor=eyJ2IjoyLCJiIjoi…</div>
        <pre>{`{
  "items": [],
  "estimated_tokens": 0,
  "has_more": false,
  "cursor": "eyJ2IjoyLCJiIjoiYl9iYjk2NDg0MzM1MGUi…",
  "freshness": {
    "status": "fresh",
    "last_success_at": "2026-09-19T10:15:31.920Z"
  }
}`}</pre>
      </div>
      <p>
        An empty <code>items</code> is not an error and should not be retried. Report it plainly and
        store the new cursor.
      </p>

      <h2>4. Or skip straight to headlines</h2>
      <p>
        <code>/v2/brief</code> returns the top three headlines <strong>verbatim</strong>, each with
        its source and UTC time, plus a <code>text</code> field that concatenates the same facts.
        Nothing is rewritten — a brief that paraphrases can be wrong while reading well.
      </p>
      <div className="code">
        <div className="code-bar">GET /v2/brief?beat_id=b_bb964843350e</div>
        <pre>{`{
  "ticker": "NVDA",
  "label": "NVIDIA",
  "count": 3,
  "items": [
    {
      "lede": "China's Homegrown AI Chip Push Just Got Faster. Is This a Real Threat to Nvidia?",
      "source": "The Motley Fool",
      "published_at": "2026-09-17T22:42:49.000Z",
      "first_indexed_at": "2026-09-17T22:45:32.798Z",
      "url": "https://news.google.com/rss/articles/CBMi..."
    }
  ],
  "text": "NVIDIA — 3 stories\\n1. China's Homegrown AI Chip Push… (The Motley Fool, 22:42Z)\\n…"
}`}</pre>
      </div>
      <p>
        It takes the same <code>cursor</code> argument, so a brief can be asked for on a schedule and
        return only what is new. An empty brief reads{" "}
        <code>NVIDIA — nothing moved.</code> rather than inventing a story about quiet.
      </p>

      <h2>5. Use it from an agent</h2>
      <p>
        The same capabilities are published as tool definitions, so an agent framework can call them
        without you writing a client. <code>GET /v2/tools</code> returns OpenAI function-call shape;{" "}
        <code>POST /mcp</code> speaks MCP.
      </p>
      <div className="code">
        <div className="code-bar">MCP client config</div>
        <pre>{`{
  "mcpServers": {
    "newsgraph": {
      "url": "https://newsgraph.vercel.app/api/mcp"
    }
  }
}`}</pre>
      </div>

      <h2>What there is not</h2>
      <ul>
        <li>
          No key to obtain. One is optional and only raises the rate limit, from 120 requests a
          minute to 1200
        </li>
        <li>
          No article bodies, at any price — and with the current provider, no excerpt or publisher
          URL either
        </li>
        <li>No writes: every route is read-only</li>
        <li>
          No summary. A brief quotes the publisher&rsquo;s own headlines — nothing is rewritten,
          because a brief that paraphrases is a brief that can be wrong
        </li>
        <li>
          No promise that every topic is current. Ingestion runs every fifteen minutes, but a check
          can fail — so read the <code>freshness</code> field rather than assuming, and report{" "}
          <code>stale</code> or <code>unavailable</code> as exactly that rather than as an outage
        </li>
      </ul>

      <div className="docs-nav-foot">
        <a href="/docs">← Overview</a>
        <a href="/docs/connect">Connecting →</a>
      </div>
    </>
  );
}
