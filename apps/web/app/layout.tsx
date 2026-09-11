import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pleiades — The real-time news API for AI agents",
  description:
    "Pleiades watches 150,000 publishers and returns a short, cited brief whenever a topic your agent follows changes. English-language coverage, bounded packs, one API.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
