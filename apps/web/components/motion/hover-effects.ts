/**
 * Pointer / hover motion — ported from React Bits (reactbits.dev, Animations
 * and Components) and adapted for a monochrome palette.
 *
 * All effects are enhancers over existing elements: they add a class, listen
 * for pointer events and return a cleanup. No JSX changes required.
 */

/** Magnet: the element leans toward the cursor, then springs back. */
export function magnet(selector: string, strength = 0.3, reach = 110): () => void {
  const nodes = Array.from(document.querySelectorAll<HTMLElement>(selector));
  if (nodes.length === 0) return () => {};

  let raf = 0;
  let px = 0;
  let py = 0;

  const apply = () => {
    raf = 0;
    for (const el of nodes) {
      const rect = el.getBoundingClientRect();
      if (!rect.width) continue;
      const dx = px - (rect.left + rect.width / 2);
      const dy = py - (rect.top + rect.height / 2);
      const distance = Math.hypot(dx, dy);
      const limit = Math.max(rect.width, rect.height) / 2 + reach;
      if (distance < limit) {
        const pull = 1 - distance / limit;
        el.style.transform = `translate3d(${(dx * strength * pull).toFixed(2)}px, ${(
          dy *
          strength *
          pull
        ).toFixed(2)}px, 0)`;
      } else if (el.style.transform) {
        el.style.transform = "";
      }
    }
  };

  const onMove = (event: PointerEvent) => {
    px = event.clientX;
    py = event.clientY;
    if (!raf) raf = requestAnimationFrame(apply);
  };
  const reset = () => {
    for (const el of nodes) el.style.transform = "";
  };

  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("blur", reset);
  document.addEventListener("pointerleave", reset);

  return () => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("blur", reset);
    document.removeEventListener("pointerleave", reset);
    if (raf) cancelAnimationFrame(raf);
    reset();
  };
}

/** Spotlight Card: a soft light follows the cursor across the surface. */
export function spotlightCard(selector: string, exclude?: string): () => void {
  const nodes = Array.from(document.querySelectorAll<HTMLElement>(selector)).filter(
    (el) => !exclude || !el.closest(exclude),
  );
  const bound: Array<[HTMLElement, (event: PointerEvent) => void]> = [];

  for (const el of nodes) {
    el.classList.add("spotlight");
    const onMove = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${(event.clientX - rect.left).toFixed(0)}px`);
      el.style.setProperty("--my", `${(event.clientY - rect.top).toFixed(0)}px`);
    };
    el.addEventListener("pointermove", onMove, { passive: true });
    bound.push([el, onMove]);
  }

  return () => {
    for (const [el, handler] of bound) {
      el.removeEventListener("pointermove", handler);
      el.classList.remove("spotlight");
      el.style.removeProperty("--mx");
      el.style.removeProperty("--my");
    }
  };
}

/** Tilted Card: the surface tilts toward the pointer in 3D. */
export function tiltedCard(selector: string, max = 4): () => void {
  const bound: Array<[HTMLElement, (event: PointerEvent) => void, () => void]> = [];

  document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
    el.classList.add("tilt");
    const onMove = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const nx = (event.clientX - rect.left) / rect.width - 0.5;
      const ny = (event.clientY - rect.top) / rect.height - 0.5;
      el.style.setProperty("--tilt-x", `${(-ny * max).toFixed(2)}deg`);
      el.style.setProperty("--tilt-y", `${(nx * max).toFixed(2)}deg`);
    };
    const onLeave = () => {
      el.style.setProperty("--tilt-x", "0deg");
      el.style.setProperty("--tilt-y", "0deg");
    };
    el.addEventListener("pointermove", onMove, { passive: true });
    el.addEventListener("pointerleave", onLeave);
    bound.push([el, onMove, onLeave]);
  });

  return () => {
    for (const [el, onMove, onLeave] of bound) {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      el.classList.remove("tilt");
      el.style.removeProperty("--tilt-x");
      el.style.removeProperty("--tilt-y");
    }
  };
}

/** Pixel Transition: a grid of cells washes across the surface on hover. */
export function pixelTransition(selector: string, cols = 8, rows = 5): () => void {
  const bound: Array<[HTMLElement, () => void, () => void, HTMLElement]> = [];

  document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
    const overlay = document.createElement("div");
    overlay.className = "pixel-overlay";
    overlay.setAttribute("aria-hidden", "true");
    overlay.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    overlay.style.gridTemplateRows = `repeat(${rows}, 1fr)`;

    const total = cols * rows;
    for (let i = 0; i < total; i += 1) {
      const cell = document.createElement("span");
      cell.style.setProperty("--d", `${Math.round((i / total) * 260)}ms`);
      overlay.appendChild(cell);
    }

    el.appendChild(overlay);
    el.classList.add("pixel-host");

    const enter = () => el.classList.add("pixel-on");
    const leave = () => el.classList.remove("pixel-on");
    el.addEventListener("pointerenter", enter);
    el.addEventListener("pointerleave", leave);

    bound.push([el, enter, leave, overlay]);
  });

  return () => {
    for (const [el, enter, leave, overlay] of bound) {
      el.removeEventListener("pointerenter", enter);
      el.removeEventListener("pointerleave", leave);
      overlay.remove();
      el.classList.remove("pixel-host", "pixel-on");
    }
  };
}
