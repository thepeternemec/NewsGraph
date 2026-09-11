"use client";

/**
 * Noise — ported from React Bits (reactbits.dev, Animations).
 *
 * A fixed film-grain layer. The grain is an inline SVG fractal-noise tile that
 * is stepped a few times a second, so it reads as grain rather than as
 * animation. Kept at very low opacity so the black-and-white palette holds.
 */
export default function Noise() {
  return <div className="noise-overlay" aria-hidden="true" />;
}
