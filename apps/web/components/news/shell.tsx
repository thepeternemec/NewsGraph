import Link from "next/link";
import { ArrowUpRight, Radio } from "lucide-react";
export function Brand() { return <Link href="/" className="brand" aria-label="Pleiades home">
<span className="brand-mark">✳</span> pleiades<span className="brand-dot">.</span>
</Link>; }
export function Header({ active }: {
    active?: string;
}) { return <header className="header">
<Brand />
<nav aria-label="Main navigation">
<Link aria-current={active === "news" ? "page" : undefined} href="/dashboard">Explore news</Link>
<Link aria-current={active === "connect" ? "page" : undefined} href="/connect">Integrations</Link>
<Link aria-current={active === "docs" ? "page" : undefined} href="/docs">Docs</Link>
</nav>
<Link className="button button-small" href="/connect">Connect your agent <ArrowUpRight size={16}/>
</Link>
</header>; }
export function Footer() { return <footer className="footer">
<Brand />
<span>Stay connected to what happens next.</span>
<Link href="https://github.com/thepeternemec/pleiades">GitHub <ArrowUpRight size={14}/>
</Link>
</footer>; }
export function StatusPill({ children }: {
    children: React.ReactNode;
}) { return <span className="status-pill">
<Radio size={14}/>{children}</span>; }
