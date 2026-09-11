"use client";

import { useEffect } from "react";

/**
 * Scroll motion, applied without touching the DOM structure.
 *
 * Reveals are handled by native scroll-driven animations where the browser
 * supports them (no JS, no flash); everywhere else this component adds the
 * hidden state and reveals each element through an IntersectionObserver.
 * It also drives the slight parallax drift of the aurora layer.
 */

const REVEAL_SELECTORS = [
  "main .scaffold .sec-head",
  "main .scaffold .showcase > *",
  "main .metrics .metrics-grid > *",
  "main .scaffold .features > *",
  "main .scaffold .faq > details",
  "main .scaffold > .wrap > .mock",
  "main .rail",
  "main .cta-section > .wrap > *",
];

const STAGGER_GROUPS = ["main .metrics .metrics-grid", "main .scaffold .features"];

export default function ScrollReveal() {
  useEffect(() => {
    const reduceMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ── Aurora drift + fade: transform/opacity only, rAF-throttled ──
    const aurora = document.querySelector<HTMLElement>(".aurora-layer");
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (!aurora) return;
        const y = window.scrollY;
        // Drift the layer up slowly, and hand the deep page back to black.
        aurora.style.setProperty("--aurora-shift", `${Math.min(y * 0.12, 240)}px`);
        aurora.style.setProperty("--aurora-fade", Math.max(0.22, 1 - y / 1900).toFixed(3));
      });
    };
    const parallaxOn = Boolean(aurora) && !reduceMotion;
    if (parallaxOn) {
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
    }
    const stopParallax = () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };

    if (reduceMotion) return stopParallax;

    // Browsers with scroll-driven animations do the reveal in CSS.
    const nativeTimeline =
      typeof CSS !== "undefined" &&
      typeof CSS.supports === "function" &&
      CSS.supports("animation-timeline: view()");
    if (nativeTimeline) return stopParallax;

    const nodes = new Set<HTMLElement>();
    for (const selector of REVEAL_SELECTORS) {
      document.querySelectorAll<HTMLElement>(selector).forEach((el) => nodes.add(el));
    }

    for (const group of STAGGER_GROUPS) {
      document.querySelectorAll<HTMLElement>(group).forEach((parent) => {
        Array.from(parent.children).forEach((child, index) => {
          (child as HTMLElement).style.setProperty(
            "--reveal-delay",
            `${Math.min(index * 70, 420)}ms`,
          );
        });
      });
    }

    nodes.forEach((el) => el.classList.add("reveal-ready"));

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("reveal-in");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );

    nodes.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
      stopParallax();
    };
  }, []);

  return null;
}
