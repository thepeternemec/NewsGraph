import type { Metadata } from "next";
import "./globals.css";
import "./motion.css";
import "./motion-components.css";
import SoftAurora from "@/components/soft-aurora";
import ScrollReveal from "@/components/scroll-reveal";
import SmoothScroll from "@/components/smooth-scroll";
import MotionEnhance from "@/components/motion";
import GradualBlur from "@/components/motion/gradual-blur";
import Noise from "@/components/motion/noise";

export const metadata: Metadata = {
  title: "Pleiades — The real-time news API for AI agents",
  description:
    "Pleiades watches 150,000 publishers and returns a short, cited brief whenever a topic your agent follows changes. English-language coverage, bounded packs, one API.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="aurora-layer" aria-hidden="true">
          <SoftAurora />
        </div>
        <GradualBlur />
        <Noise />
        <ScrollReveal />
        <SmoothScroll />
        <MotionEnhance />
        {children}
      </body>
    </html>
  );
}
