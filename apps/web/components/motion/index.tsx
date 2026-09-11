"use client";

import { useEffect } from "react";

/**
 * Wires the React Bits motion set onto the landing page.
 *
 * Deliberately selector-driven rather than JSX-driven: the page markup stays
 * clean, and every effect is opt-in by selector. Nothing here runs on the
 * dashboard, because its figures re-render on a poll and the text effects
 * rewrite the DOM.
 *
 * Everything is skipped under `prefers-reduced-motion`, and every effect is
 * lazy-loaded so none of it lands in the initial bundle.
 */

/** Landing page only — the dashboard re-renders its numbers on a timer. */
const LANDING = "main .hero";

export default function MotionEnhance() {
  useEffect(() => {
    if (!document.querySelector(LANDING)) return;

    const reduceMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    let cancelled = false;
    let teardown: (() => void) | undefined;

    (async () => {
      let text: typeof import("./text-effects");
      let hover: typeof import("./hover-effects");
      try {
        [text, hover] = await Promise.all([
          import("./text-effects"),
          import("./hover-effects"),
        ]);
      } catch {
        return; // the page is complete without any of this
      }
      if (cancelled) return;

      const teardowns = [
        // ── Text ──────────────────────────────────────────────────────
        text.splitText("main .hero h1"),
        text.blurText("main .hero .lede, main .scaffold .sec-sub"),
        text.countUp("main .metrics .metric-num"),
        text.decryptedText("main .hero .mock-title"),
        text.trueFocus("main #category .sec-title"),
        text.scrambledText("main .nav-link, main .footer-links a, main .rail-item"),

        // ── Hover / pointer ───────────────────────────────────────────
        hover.magnet("main .nav-cta, main .hero-cta .btn-primary"),
        hover.spotlightCard("main .feature, main .mock", "main #segmentation"),
        hover.tiltedCard("main .hero .mock"),
        hover.pixelTransition("main #segmentation .features .feature"),
      ];

      teardown = () => teardowns.forEach((fn) => fn());
    })();

    return () => {
      cancelled = true;
      teardown?.();
    };
  }, []);

  return null;
}
