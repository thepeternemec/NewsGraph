import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pleiades — The Real-Time News Terminal",
  description:
    "AI-powered real-time news intelligence. Breaking insights for traders, creators, agents, and media — before stories reach the mainstream.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
