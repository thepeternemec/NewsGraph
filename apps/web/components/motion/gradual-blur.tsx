"use client";

/**
 * Gradual Blur — ported from React Bits (reactbits.dev, Animations).
 *
 * Five stacked layers of `backdrop-filter`, each masked to a different depth,
 * so content scrolling under the top edge dissolves progressively instead of
 * hitting a hard line. Sits under the nav and above the page.
 */
const LAYERS = 5;

export default function GradualBlur() {
  return (
    <div className="gradual-blur" aria-hidden="true">
      {Array.from({ length: LAYERS }, (_, i) => (
        <span key={i} style={{ ["--layer" as string]: String(i + 1) }} />
      ))}
    </div>
  );
}
