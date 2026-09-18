import { ArrowRight } from "lucide-react";
import SiteNav from "@/components/site/site-nav";
import SiteFooter from "@/components/site/site-footer";
import { PRICES } from "@/components/site/content";

export const metadata = {
  title: "Pricing",
  description:
    "Free while in early access. No signup, no credential required, and a published price list for when billing is switched on.",
};

const ROUTES: Array<[string, string]> = [
  ["GET /v2/topics", "The catalog, with a status and article counts for every topic"],
  ["GET /v2/news", "Articles for one topic, plus a cursor to check from"],
  ["GET /v2/changes", "Only what appeared since that cursor — usually nothing"],
  ["GET /v2/brief", "The top headlines verbatim, with source and UTC time"],
  ["GET /v2/tools", "The same capabilities in OpenAI function-call shape"],
  ["POST /mcp", "The same tools over MCP"],
];

const TIERS: Array<{ name: string; limit: string; how: string }> = [
  { name: "Anonymous", limit: "120 requests / minute", how: "Nothing to send. The default." },
  { name: "With a key", limit: "1200 requests / minute", how: "Authorization: Bearer ng_…" },
];

export default function Pricing() {
  return (
    <>
      <SiteNav active="/pricing" />
      <main>
        <div className="page-head">
          <div className="wrap">
            <span className="sec-eyebrow">Pricing</span>
            <h1 className="sec-title">Free while in early access.</h1>
            <p className="sec-sub">
              No signup, no credit card, and nothing to install. Every route is read-only and
              public — the only cost of trying it is the request.
            </p>
            <div className="hero-cta">
              <a className="btn-primary" href="/docs/quickstart">
                Start with the quickstart <ArrowRight size={14} />
              </a>
              <a className="btn-ghost" href="/connect">
                Connect
              </a>
            </div>
            <p className="hero-tiny">no signup · no billing · a key is optional and free</p>
          </div>
        </div>

        <section className="scaffold" id="today">
          <div className="wrap">
            <div className="sec-head">
              <span className="sec-eyebrow">Today</span>
              <h2 className="sec-title">What access costs right now: nothing.</h2>
              <p className="sec-sub">
                Nothing is metered and no invoice exists. The only thing a key changes is how fast
                you may ask — it unlocks no data that is otherwise closed.
              </p>
            </div>
            <table className="docs-body" style={{ maxWidth: "100%" }}>
              <thead>
                <tr>
                  <th>Caller</th>
                  <th>Limit</th>
                  <th>How</th>
                </tr>
              </thead>
              <tbody>
                {TIERS.map((tier) => (
                  <tr key={tier.name}>
                    <td style={{ color: "#fff" }}>{tier.name}</td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: 12.5 }}>{tier.limit}</td>
                    <td>{tier.how}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="hero-tiny" style={{ marginTop: 16 }}>
              Keys are issued by hand while the catalog is still settling, so ask rather than
              self-serve. Only the hash is stored, and a lost key cannot be recovered — you are
              issued another.
            </p>
          </div>
        </section>

        <section className="scaffold" id="later">
          <div className="wrap">
            <div className="sec-head">
              <span className="sec-eyebrow">Later · published, not yet charged</span>
              <h2 className="sec-title">Pay for answers, not for seats.</h2>
              <p className="sec-sub">
                When billing is switched on these are the prices. They are printed now so the shape
                of the product is not a surprise later — an empty answer is nearly free, so asking
                often stays rational.
              </p>
            </div>
            <div className="features" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
              {PRICES.map((p) => (
                <div key={p.label} className="feature" style={{ minHeight: 190 }}>
                  <span className="feature-tag" style={{ marginTop: 0, paddingTop: 0 }}>
                    {p.label}
                  </span>
                  <div className="metric-num" style={{ fontSize: 30, margin: "14px 0 10px" }}>
                    {p.price}
                  </div>
                  <p className="feature-desc">{p.desc}</p>
                </div>
              ))}
            </div>
            <p className="hero-tiny" style={{ marginTop: 16 }}>
              No seat licence, no minimum, no annual commitment. Nothing above is being charged
              today, and there is no mechanism in this codebase that could charge it.
            </p>
          </div>
        </section>

        <section className="scaffold" id="routes">
          <div className="wrap">
            <div className="sec-head">
              <span className="sec-eyebrow">The surface</span>
              <h2 className="sec-title">Six routes, all of them open.</h2>
              <p className="sec-sub">
                1034 topics — 934 US-listed equities and 100 crypto assets — refreshed every fifteen
                minutes.
              </p>
            </div>
            <table className="docs-body" style={{ maxWidth: "100%" }}>
              <thead>
                <tr>
                  <th>Route</th>
                  <th>Returns</th>
                </tr>
              </thead>
              <tbody>
                {ROUTES.map(([route, what]) => (
                  <tr key={route}>
                    <td style={{ color: "#fff", fontFamily: "var(--font-mono)", fontSize: 12.5 }}>
                      {route}
                    </td>
                    <td>{what}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="hero-tiny" style={{ marginTop: 16 }}>
              A topic reports <code>status</code> for whether the last check succeeded — which is not
              the same as whether there is news. Read <code>article_count</code> and{" "}
              <code>recent_12h</code> to see what is actually behind one.
            </p>
          </div>
        </section>

        <section className="cta-section">
          <div className="wrap">
            <h2 className="cta-title">Built to be extended.</h2>
            <p className="cta-sub">
              MIT licensed, one API and one worker, with the state of the project written down in
              STATUS.md. The cheapest contribution is proposing a topic.
            </p>
            <div className="cta-row">
              <a className="btn-primary" href="https://github.com/thepeternemec/NewsGraph">
                Open the repository <ArrowRight size={14} />
              </a>
              <a className="btn-ghost" href="/docs">Read the docs</a>
            </div>
            <p className="cta-tiny">no signup · no billing · no seat licence</p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
