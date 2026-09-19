import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import "./motion.css";
import "./motion-components.css";
import "./theme.css";
import SoftAurora from "@/components/soft-aurora";
import ScrollReveal from "@/components/scroll-reveal";
import SmoothScroll from "@/components/smooth-scroll";
import MotionEnhance from "@/components/motion";
import Noise from "@/components/motion/noise";
import GridField from "@/components/site/grid-field";

export const metadata: Metadata = {
  title: "NewsGraph — The news layer for AI agents",
  description:
    "NewsGraph watches 150,000 publishers and answers one question on a schedule: has this moved? A short, cited brief when it has, and usage-based pricing of a fraction of a cent per answer.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <GridField />
        <div className="aurora-layer" aria-hidden="true">
          {/* Neutral: the aurora reads as soft light, not colour. */}
          <SoftAurora color1="#ffffff" color2="#6f6f6f" brightness={0.85} />
        </div>
        <Noise />
        <ScrollReveal />
        <SmoothScroll />
        <MotionEnhance />
        {children}
        {/* Page views. Mounted at the root so every route is counted, including
            the docs and the dashboard. */}
        <Analytics />
      </body>
    </html>
  );
}
