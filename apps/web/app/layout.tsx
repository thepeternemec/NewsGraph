import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pleiades — The Real-Time News Terminal",
  description:
    "Real-time news intelligence for traders, creators, agents and newsrooms. English coverage, article clusters per beat, bounded structured packs.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
