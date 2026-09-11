"use client";

import { useEffect } from "react";
import type LenisClass from "lenis";

/**
 * Lenis smooth scrolling — the same library reactbits.dev uses.
 *
 * Lenis drives the *real* scroll position rather than faking it with a
 * transform, so `window.scrollY`, IntersectionObserver and CSS
 * `animation-timeline: view()` all keep working exactly as before.
 * `anchors: true` makes the in-page nav links glide to their section.
 *
 * Skipped entirely under `prefers-reduced-motion` (Lenis also respects it).
 */
export default function SmoothScroll() {
  useEffect(() => {
    const reduceMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    let cancelled = false;
    let lenis: LenisClass | null = null;

    (async () => {
      let Lenis: typeof LenisClass;
      try {
        ({ default: Lenis } = await import("lenis"));
      } catch {
        return; // leave native scrolling in place
      }
      if (cancelled) return;

      lenis = new Lenis({
        autoRaf: true,
        duration: 1.05,
        // ease-out-expo: quick to respond, long and soft on the tail
        easing: (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        touchMultiplier: 1.6,
        anchors: true,
      });
    })();

    return () => {
      cancelled = true;
      lenis?.destroy();
    };
  }, []);

  return null;
}
