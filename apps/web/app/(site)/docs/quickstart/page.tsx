export const metadata = { title: "Quickstart" };

const API = "/api";

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
        A topic is a saved subject with a stable ID. The catalog lists every one, and says which
        currently have articles — seventeen of the twenty do not yet.
      </p>
      <div className="code">
        <div className="code-bar">GET /v2/topics · no credential</div>
        <pre>{`curl ${API}/v2/topics`}</pre>
      </div>
      <div className="code">
        <div className="code-bar">200 OK</div>
        <pre>{`{
  "topics": [
    {
      "beat_id": "b_bb964843350e",
      "label": "NVIDIA",
      "status": "stale",
      "last_success_at": "2026-09-13T09:02:11Z",
      "last_checked_at": "2026-09-13T09:02:11Z"
    }
  ]
}`}</pre>
      </div>
      <p>
        Keep the <code>beat_id</code>. It is stable, and it is the only argument the other routes
        need.
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
      "id": "930",
      "beat_id": "b_bb964843350e",
      "title": "Blackwell vs Rubin: NVIDIA's AI GPU Battle Moves Into the Agentic AI Era",
      "url": "https://infotechlead.com/?p=98306",
      "source": "InfotechLead",
      "published_at": "2026-09-13T08:46:24+00:00",
      "first_indexed_at": "2026-09-13T08:49:43.062446+00:00"
    }
  ],
  "estimated_tokens": 1840,
  "has_more": false,
  "cursor": "c_eyJiIjoi…",
  "freshness": "stale"
}`}</pre>
      </div>
      <p>
        <code>first_indexed_at</code> sits beside <code>published_at</code> on purpose: lead time is a
        field you can measure, not a claim you have to trust.
      </p>

      <h2>3. Ask what changed</h2>
      <p>
        This is the product. Send the cursor back and you get only what appeared since — and
        &ldquo;nothing&rdquo; is a normal, successful answer.
      </p>
      <div className="code">
        <div className="code-bar">GET /v2/changes?beat_id=b_bb964843350e&amp;cursor=c_eyJiIjoi…</div>
        <pre>{`{
  "items": [],
  "has_more": false,
  "cursor": "c_eyJiIjoi…",
  "freshness": "stale"
}`}</pre>
      </div>
      <p>
        An empty <code>items</code> is not an error and should not be retried. Report it plainly and
        store the new cursor.
      </p>

      <h2>4. Use it from an agent</h2>
      <p>
        The same capabilities are published as tool definitions, so an agent framework can call them
        without you writing a client. <code>GET /v2/tools</code> returns OpenAI function-call shape;
        <code>POST /mcp</code> speaks MCP.
      </p>
      <div className="code">
        <div className="code-bar">GET /v2/tools</div>
        <pre>{`curl ${API}/v2/tools`}</pre>
      </div>
      <div className="code">
        <div className="code-bar">MCP client config</div>
        <pre>{`{
  "mcpServers": {
    "newsgraph": {
      "url": "${API}/mcp"
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
        <li>No article bodies, at any price</li>
        <li>No writes: every route is read-only</li>
        <li>
          No summary. A brief quotes the publisher&rsquo;s own headlines — nothing is rewritten,
          because a brief that paraphrases is a brief that can be wrong
        </li>
        <li>
          No freshness guarantee right now — nothing is scheduled, so topics go{" "}
          <code>stale</code>. Check the <code>freshness</code> field before claiming currency
        </li>
      </ul>

      <div className="docs-nav-foot">
        <a href="/docs">← Overview</a>
        <a href="/docs/data">Topics and articles →</a>
      </div>
    </>
  );
}
