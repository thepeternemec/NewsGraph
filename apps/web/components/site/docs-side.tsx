"use client";

import { usePathname } from "next/navigation";

const GROUPS: Array<{ title: string; links: Array<{ href: string; label: string }> }> = [
  {
    title: "Get started",
    links: [
      { href: "/docs", label: "Overview" },
      { href: "/docs/quickstart", label: "Quickstart" },
      { href: "/docs/connect", label: "Connecting" },
    ],
  },
  {
    title: "Build",
    links: [
      { href: "/docs/data", label: "Topics and articles" },
    ],
  },
  {
    title: "Operate",
    links: [
      { href: "https://github.com/thepeternemec/NewsGraph", label: "GitHub ↗" },
    ],
  },
];

export default function DocsSide() {
  const pathname = usePathname();

  return (
    <aside className="docs-side">
      {GROUPS.map((group) => (
        <div key={group.title}>
          <div className="docs-side-group">{group.title}</div>
          {group.links.map((link) => {
            const external = link.href.startsWith("http");
            const active = !external && pathname === link.href;
            return (
              <a
                key={link.href}
                className={`docs-link${active ? " active" : ""}`}
                href={link.href}
                target={external ? "_blank" : undefined}
                rel={external ? "noreferrer" : undefined}
              >
                {link.label}
              </a>
            );
          })}
        </div>
      ))}
    </aside>
  );
}
