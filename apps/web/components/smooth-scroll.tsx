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
 * Tuning: this is Lenis's own recommendation — the `lerp` path, not
 * `duration` + `easing`. A duration-based curve animates every wheel tick
 * over its full length and reads as sluggish; `lerp` instead eases the
 * current position toward the target every frame, so the page starts moving
 * immediately and simply settles smoothly.
 *
 *   lerp 0.06 → floatier / longer glide
 *   lerp 0.10 → Lenis default (used here)
 *   lerp 0.16 → tighter, closer to native
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
        lerp: 0.1,
        smoothWheel: true,
        wheelMultiplier: 1,
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
