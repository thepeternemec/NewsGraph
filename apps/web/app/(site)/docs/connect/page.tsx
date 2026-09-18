export const metadata = { title: "Connecting" };

const API = "https://newsgraph.vercel.app/api";

export default function DocsConnect() {
  return (
    <>
      <div className="docs-head">
        <h1>Connecting</h1>
        <p className="docs-lead">
          One endpoint, four calls, and no credential. This page is the reference for getting
          pointed at it — the quickstart is the tour, and this is what you come back to.
        </p>
      </div>

      <h2>The endpoint</h2>
      <div className="code">
        <div className="code-bar">base</div>
        <pre>{API}</pre>
      </div>
      <p>
        Everything is a <code>GET</code>. There is nothing to install, no SDK to keep in step, and
        no key to obtain before your first request — an anonymous caller can read the whole public
        surface, at 120 requests a minute.
      </p>

      <h2>MCP</h2>
      <p>
        If your assistant speaks MCP, this is the shortest path. Add one server and it gains four
        tools; you do not write a client at all.
      </p>
      <div className="code">
        <div className="code-bar">your MCP client&rsquo;s config</div>
        <pre>{`{
  "mcpServers": {
    "newsgraph": {
      "url": "${API}/mcp"
    }
  }
}`}</pre>
      </div>
      <p>The four tools it gains:</p>
      <table>
        <thead>
          <tr>
            <th>Tool</th>
            <th>Use it to</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>newsgraph_topics</code></td>
            <td>Find a topic. Never invent a <code>beat_id</code> — search, then use what comes back</td>
          </tr>
          <tr>
            <td><code>newsgraph_news</code></td>
            <td>Read a topic and take a baseline cursor</td>
          </tr>
          <tr>
            <td><code>newsgraph_changes</code></td>
            <td>Ask what is new since that cursor</td>
          </tr>
          <tr>
            <td><code>newsgraph_brief</code></td>
            <td>Get the top three headlines with no synthesis</td>
          </tr>
        </tbody>
      </table>

      <h2>HTTP</h2>
      <p>Anything that can make a request can use this. Four routes, no ordering requirement.</p>
      <div className="code">
        <div className="code-bar">the whole loop</div>
        <pre>{`# 1. find the topic
curl -s "${API}/v2/topics?q=nvidia"

# 2. read it, and keep the cursor from the response
curl -s "${API}/v2/news?beat_id=b_bb964843350e"

# 3. later: only what appeared since that cursor
curl -s "${API}/v2/changes?beat_id=b_bb964843350e&cursor=<cursor>"

# or skip to headlines
curl -s "${API}/v2/brief?beat_id=b_bb964843350e"`}</pre>
      </div>
      <p>
        The cursor is the whole product. Send it back and the answer is either nothing — which is a
        successful answer, and the cheap one — or the handful of stories that appeared since.
      </p>

      <h2>Tool calling</h2>
      <p>
        If you would rather hand a model schemas than a URL, they are served rather than vendored,
        so they cannot drift from the API:
      </p>
      <div className="code">
        <div className="code-bar">GET /v2/tools</div>
        <pre>{`curl -s "${API}/v2/tools"`}</pre>
      </div>
      <p>
        The response is OpenAI function-call shape. Supply it to your model, execute what comes
        back, send the results into the next turn.
      </p>

      <h2>Keys and rate limits</h2>
      <p>
        <strong>A key is optional and does not unlock anything.</strong> It raises your ceiling.
        The API is read-only and public, and stays that way.
      </p>
      <table>
        <thead>
          <tr>
            <th>Caller</th>
            <th>Limit</th>
            <th>Identified by</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Anonymous</td>
            <td>120 requests / minute</td>
            <td>Calling address, hashed and never stored</td>
          </tr>
          <tr>
            <td>With a key</td>
            <td>1200 requests / minute</td>
            <td><code>Authorization: Bearer ng_…</code></td>
          </tr>
        </tbody>
      </table>
      <p>
        Keys are issued by hand while the catalog is still settling — there is no self-serve form
        yet. Ask, and you get a <code>ng_</code>-prefixed secret shown once. Only its hash is
        stored, so a lost key cannot be recovered; you are issued another.
      </p>
      <p>Every response carries the current state:</p>
      <div className="code">
        <div className="code-bar">response headers</div>
        <pre>{`X-RateLimit-Limit: 120
X-RateLimit-Remaining: 117
X-RateLimit-Reset: 43          # seconds until the window rolls over
X-RateLimit-Tier: anonymous`}</pre>
      </div>

      <h2>When something goes wrong</h2>
      <table>
        <thead>
          <tr>
            <th>Status</th>
            <th>Meaning</th>
            <th>What to do</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>200</code>, empty <code>items</code></td>
            <td>Not an error</td>
            <td>Report nothing new. Do not retry</td>
          </tr>
          <tr>
            <td><code>400</code></td>
            <td>The cursor is malformed or expired</td>
            <td>Re-baseline with <code>/v2/news</code> and take the new cursor</td>
          </tr>
          <tr>
            <td><code>404</code></td>
            <td>Unknown <code>beat_id</code></td>
            <td>Re-read <code>/v2/topics</code>. Never guess an id</td>
          </tr>
          <tr>
            <td><code>429</code></td>
            <td>Rate limited</td>
            <td>Wait for <code>Retry-After</code>. A key raises the ceiling</td>
          </tr>
          <tr>
            <td><code>503</code></td>
            <td>Storage unreachable</td>
            <td>Back off. Never retry a 4xx in a tight loop</td>
          </tr>
        </tbody>
      </table>
      <p>
        A cursor is signed and bound to one topic. It cannot be reused for another, and an old one
        will not return a wider window — it will return the same one, and you will have paid for
        nothing.
      </p>

      <h2>Check it works</h2>
      <div className="code">
        <div className="code-bar">two commands</div>
        <pre>{`# liveness
curl -s "${API}/health"

# a real answer, from a topic that has one
curl -s "${API}/v2/brief?beat_id=b_bb964843350e"`}</pre>
      </div>
      <p>
        A brief with headlines means you are connected. A brief reading{" "}
        <code>NVIDIA — nothing moved.</code> also means you are connected — it means the topic is
        quiet.
      </p>

      <div className="docs-nav-foot">
        <a href="/docs/quickstart">← Quickstart</a>
        <a href="/docs/data">Topics and articles →</a>
      </div>
    </>
  );
}
