const audiences = [
  {
    title: "Traders",
    body: "Machine-speed alerts and structured market signals — directly pluggable into algorithmic trading stacks or human workflows.",
  },
  {
    title: "Content creators",
    body: "Early narratives and emerging topics before they trend, with pre-written summaries and context for faster production.",
  },
  {
    title: "AI agents & applications",
    body: "A real-time intelligence layer: structured data feeds agents can consume, interpret, and act on autonomously.",
  },
  {
    title: "Media & journalists",
    body: "Streamlined discovery, curation, and publication — track developments, confirm stories, scale editorial intelligence.",
  },
];

const rails = [
  "REST API",
  "WebSocket",
  "Telegram",
  "Discord",
  "MCP",
  "Virtuals ACP",
  "Coinbase x402",
];

export default function Home() {
  return (
    <main className="page">
      <header className="nav">
        <span className="brand">
          <span className="stars" aria-hidden="true">⋆</span> PLEIADES
        </span>
        <span className="nav-note">pleiades.news · v0.2</span>
      </header>

      <section className="hero">
        <p className="kicker">REAL-TIME NEWS TERMINAL</p>
        <h1>
          The signal, before it reaches the mainstream.
        </h1>
        <p className="sub">
          Pleiades scans thousands of sources 24/7, filters the noise with AI, and delivers
          structured, actionable intelligence — to humans and agents alike.
        </p>
        <blockquote className="quote">
          “Markets move on news in seconds. Pleiades ensures you never miss the signal.”
        </blockquote>
      </section>

      <section className="grid" aria-label="Who it serves">
        {audiences.map((a) => (
          <article key={a.title} className="card">
            <h2>{a.title}</h2>
            <p>{a.body}</p>
          </article>
        ))}
      </section>

      <section className="rails">
        <h2>Delivered where you work</h2>
        <ul>
          {rails.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
        <p className="hint">
          Built for human and autonomous workflows — programmable delivery, agent-native
          payments, and one structured item format everywhere.
        </p>
      </section>

      <footer className="foot">
        <p>
          Early release:{" "}
          <a href="https://openbeat.vercel.app" target="_blank" rel="noreferrer">
            openbeat.vercel.app
          </a>{" "}
          · API docs in the repo ·{" "}
          <a href="https://newsapi.ai" target="_blank" rel="noreferrer">
            powered by newsapi.ai
          </a>
        </p>
        <p className="small">
          “Our goal is to build the world&apos;s most responsive, scalable, and adaptable news
          infrastructure.”
        </p>
      </footer>
    </main>
  );
}
