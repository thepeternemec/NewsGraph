import { ArrowRight } from "lucide-react";
import SiteNav from "@/components/site/site-nav";
import SiteFooter from "@/components/site/site-footer";

export const metadata = {
  title: "Pricing",
  description:
    "NewsGraph is free while in early access. Read-only, no credential, no billing, no key to obtain.",
};

const ROUTES: Array<[string, string]> = [
  ["GET /v2/topics", "The catalog, with a status for every topic"],
  ["GET /v2/news", "Articles for one topic, plus a cursor to check from"],
  ["GET /v2/changes", "Only what appeared since that cursor — usually nothing"],
  ["GET /v2/tools", "The same capabilities in OpenAI function-call shape"],
  ["POST /mcp", "The same tools over MCP"],
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
              There is no key to obtain, nothing to sign up for and nothing to pay. Every route is
              read-only and public, so the only cost of trying it is the request.
            </p>
            <div className="hero-cta">
              <a className="btn-primary" href="/docs/quickstart">
                Start with the quickstart <ArrowRight size={14} />
              </a>
              <a className="btn-ghost" href="https://github.com/thepeternemec/NewsGraph">
                Read the source
              </a>
            </div>
            <p className="hero-tiny">no key · no signup · no billing</p>
          </div>
        </div>

        <section className="scaffold" id="access">
          <div className="wrap">
            <div className="sec-head">
              <span className="sec-eyebrow">Access</span>
              <h2 className="sec-title">Every route, open.</h2>
              <p className="sec-sub">
                Nothing here is metered, so there is no price list to publish — and no key that can
                leak or expire.
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
              1034 topics — 934 US-listed equities and 100 crypto assets, each refreshed every fifteen minutes. A topic reports
              unavailable until it has been ingested once, and `status` says whether the check
              succeeded — read `article_count` and `recent_12h` to see what is actually there.
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
            <p className="cta-tiny">no key · no signup · no billing</p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
