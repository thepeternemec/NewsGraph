export const metadata = { title: "Overview" };

export default function DocsOverview() {
  return (
    <>
      <div className="docs-head">
        <h1>NewsGraph documentation</h1>
        <p className="docs-lead">
          NewsGraph watches 150,000 publishers and answers one question on a schedule: has this
          topic moved since I last looked? This is how to call it, and how to pay for it.
        </p>
      </div>

      <h2>The shape of an integration</h2>
      <p>
        An agent picks a topic, keeps a cursor, and asks whether anything changed. It never reads a
        feed, and it never re-reads what it has already seen.
      </p>
      <ul>
        <li>
          <strong>Pick a beat.</strong> A beat is a saved topic with its own article cluster.
        </li>
        <li>
          <strong>Poll it.</strong> You get back <code>moved:false</code>, or a small pack of new
          articles.
        </li>
        <li>
          <strong>Keep the cursor.</strong> It is opaque, signed and beat-bound. Store it; it is how
          you avoid repeats.
        </li>
        <li>
          <strong>Cite the link.</strong> Items never contain article bodies — a headline, a link
          that resolves to the story, and the publisher's name.
        </li>
      </ul>

      <h2>Access</h2>
      <p>
        There is no key to obtain and nothing to sign up for. Every route is read-only and public,
        so you can build against it immediately. Anonymous callers get 120 requests a minute;
        an optional key raises that to 1200.
      </p>
      <table>
        <thead>
          <tr>
            <th>Route</th>
            <th>Returns</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <code>GET /v2/topics</code>
            </td>
            <td>The catalog: stable IDs, labels, and whether a topic currently has articles</td>
          </tr>
          <tr>
            <td>
              <code>GET /v2/news?beat_id=</code>
            </td>
            <td>
              Articles for a topic, plus a <code>cursor</code> to check from later
            </td>
          </tr>
          <tr>
            <td>
              <code>GET /v2/changes?beat_id=&amp;cursor=</code>
            </td>
            <td>Only what appeared since that cursor — usually nothing</td>
          </tr>
          <tr>
            <td>
              <code>GET /v2/brief?beat_id=</code>
            </td>
            <td>
              The top three headlines verbatim, each with its source and UTC time — a sentence&rsquo;s
              worth of news, not a summary
            </td>
          </tr>
          <tr>
            <td>
              <code>GET /v2/tools</code>
            </td>
            <td>The same capabilities in OpenAI function-call shape</td>
          </tr>
          <tr>
            <td>
              <code>POST /mcp</code>
            </td>
            <td>The same tools over MCP, for agent frameworks</td>
          </tr>
        </tbody>
      </table>
      <p>
        No article bodies exist at any price. An item carries a headline, a link that resolves to
        the article, the publisher&rsquo;s name and the time it was published — the story stays
        with them.
      </p>


      <div className="docs-nav-foot">
        <span />
        <a href="/docs/quickstart">Quickstart →</a>
      </div>
    </>
  );
}
