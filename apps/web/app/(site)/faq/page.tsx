import SiteNav from "@/components/site/site-nav";
import SiteFooter from "@/components/site/site-footer";
import { FAQ, ROADMAP } from "@/components/site/content";

export default function Page() {
  return (
    <>
      <SiteNav active="/faq" />
      <main>
        <div className="page-head">
          <div className="wrap">
            <span className="sec-eyebrow">FAQ & status</span>
            <h1 className="sec-title">Questions, and where the line is.</h1>
            <p className="sec-sub">What is live, what is not, and what we will not claim.</p>
          </div>
        </div>
        {/* FAQ */}
        <section className="scaffold" id="faq">
          <div className="wrap-tight">
            <div className="sec-head">
              <span className="sec-eyebrow">FAQ</span>
              <h2 className="sec-title">The questions we get first.</h2>
            </div>
            <div className="faq">
              {FAQ.map((f) => (
                <details key={f.q}>
                  <summary>{f.q}</summary>
                  <div className="a">{f.a}</div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* STATUS */}
        <section className="scaffold" id="status">
          <div className="wrap">
            <div className="sec-head">
              <span className="sec-eyebrow">Status</span>
              <h2 className="sec-title">What is shipped, and what is not.</h2>
              <p className="sec-sub">
                Early users deserve to know exactly where the line is. This is it.
              </p>
            </div>
            <div className="features grid-4">
              {ROADMAP.map((r) => (
                <div key={r.when} className="feature" style={{ minHeight: 160 }}>
                  <span className="feature-tag" style={{ marginTop: 0, paddingTop: 0 }}>{r.when}</span>
                  <p className="feature-desc" style={{ marginTop: 12 }}>{r.what}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
