/**
 * Text motion effects — ported from React Bits (reactbits.dev, Text Animations)
 * and adapted for a monochrome palette and an existing page.
 *
 * Each effect is an *enhancer*: it takes a selector, rewrites the matched
 * element's text into per-word / per-character spans, and returns a cleanup
 * that restores the original markup. Nothing wraps the page in new components,
 * so the JSX stays untouched.
 *
 * Only point these at elements whose text React never re-renders.
 */

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&/\\|<>+-=*";

/** Run `cb` the first time `el` scrolls into view. */
function inView(el: Element, cb: () => void, threshold = 0.25): () => void {
  if (typeof IntersectionObserver === "undefined") {
    cb();
    return () => {};
  }
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.disconnect();
        cb();
      }
    },
    { threshold },
  );
  observer.observe(el);
  return () => observer.disconnect();
}

/** Rewrite an element's text into `<span>` word (and optionally char) wrappers. */
function wrapText(el: HTMLElement, mode: "word" | "char", cls: string): () => void {
  if (el.children.length > 0) return () => {};
  const original = el.textContent ?? "";
  if (!original.trim()) return () => {};

  const fragment = document.createDocumentFragment();
  let index = 0;

  for (const chunk of original.split(/(\s+)/)) {
    if (!chunk) continue;
    if (/^\s+$/.test(chunk)) {
      fragment.appendChild(document.createTextNode(" "));
      continue;
    }
    const word = document.createElement("span");
    word.className = `${cls}-word`;
    word.style.setProperty("--w", String(index));
    if (mode === "char") {
      for (const char of Array.from(chunk)) {
        const span = document.createElement("span");
        span.className = `${cls}-char`;
        span.style.setProperty("--i", String(index));
        span.textContent = char;
        word.appendChild(span);
        index += 1;
      }
    } else {
      word.style.setProperty("--i", String(index));
      word.textContent = chunk;
      index += 1;
    }
    fragment.appendChild(word);
    fragment.appendChild(document.createTextNode(" "));
  }

  el.textContent = "";
  el.appendChild(fragment);
  return () => {
    el.textContent = original;
  };
}

/** Split Text: characters rise into place, staggered, on first view. */
export function splitText(selector: string): () => void {
  const cleanups: Array<() => void> = [];
  document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
    const restore = wrapText(el, "char", "split");
    if (el.children.length === 0) return;
    el.classList.add("split-ready");
    const stop = inView(el, () => el.classList.add("split-in"), 0.15);
    cleanups.push(() => {
      stop();
      el.classList.remove("split-ready", "split-in");
      restore();
    });
  });
  return () => cleanups.forEach((fn) => fn());
}

/** Blur Text: words resolve out of a blur, staggered, on first view. */
export function blurText(selector: string): () => void {
  const cleanups: Array<() => void> = [];
  document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
    const restore = wrapText(el, "word", "blur");
    if (el.children.length === 0) return;
    el.classList.add("blur-ready");
    const stop = inView(el, () => el.classList.add("blur-in"), 0.2);
    cleanups.push(() => {
      stop();
      el.classList.remove("blur-ready", "blur-in");
      restore();
    });
  });
  return () => cleanups.forEach((fn) => fn());
}

/** Count Up: numeric labels tick from zero when they scroll into view. */
export function countUp(selector: string, duration = 1500): () => void {
  const cleanups: Array<() => void> = [];
  document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
    const raw = (el.textContent ?? "").trim();
    if (!/^\d[\d,]*$/.test(raw)) return;
    const target = Number(raw.replace(/,/g, ""));
    if (!Number.isFinite(target)) return;

    const format = (n: number) => Math.round(n).toLocaleString("en-US");
    let raf = 0;
    el.textContent = format(0);

    const stop = inView(
      el,
      () => {
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - t, 3);
          el.textContent = t < 1 ? format(target * eased) : format(target);
          if (t < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      0.4,
    );

    cleanups.push(() => {
      stop();
      if (raf) cancelAnimationFrame(raf);
      el.textContent = raw;
    });
  });
  return () => cleanups.forEach((fn) => fn());
}

/** Decrypted Text: glyphs shuffle, then resolve left to right. */
export function decryptedText(selector: string, duration = 1200): () => void {
  const cleanups: Array<() => void> = [];
  document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
    const final = el.textContent ?? "";
    if (!final.trim()) return;
    const chars = Array.from(final);
    const total = chars.length;

    const scramble = (revealed: number) =>
      chars
        .map((char, i) => {
          if (char === " ") return " ";
          if (i < revealed) return char;
          return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        })
        .join("");

    let raf = 0;
    el.classList.add("decrypting");
    el.textContent = scramble(0);

    const stop = inView(
      el,
      () => {
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          el.textContent = scramble(Math.floor(t * total));
          if (t < 1) {
            raf = requestAnimationFrame(tick);
          } else {
            el.textContent = final;
            el.classList.remove("decrypting");
          }
        };
        raf = requestAnimationFrame(tick);
      },
      0.2,
    );

    cleanups.push(() => {
      stop();
      if (raf) cancelAnimationFrame(raf);
      el.classList.remove("decrypting");
      el.textContent = final;
    });
  });
  return () => cleanups.forEach((fn) => fn());
}

/** True Focus: one word is sharp, the rest sit back. Cycles, and follows hover. */
export function trueFocus(selector: string, interval = 1900): () => void {
  const cleanups: Array<() => void> = [];
  document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
    const restore = wrapText(el, "word", "tf");
    const words = Array.from(el.querySelectorAll<HTMLElement>(".tf-word"));
    if (words.length < 2) {
      restore();
      return;
    }

    let index = 0;
    let timer = 0;
    let stopped = false;

    const focus = (n: number) => {
      words.forEach((word, i) => word.classList.toggle("tf-focus", i === n));
    };
    const cycle = () => {
      if (stopped) return;
      index = (index + 1) % words.length;
      focus(index);
      timer = window.setTimeout(cycle, interval);
    };

    el.classList.add("tf-ready");
    focus(0);
    const stopIO = inView(
      el,
      () => {
        timer = window.setTimeout(cycle, interval);
      },
      0.4,
    );

    const handlers = words.map((word, i) => {
      const handler = () => {
        stopped = true;
        clearTimeout(timer);
        index = i;
        focus(i);
      };
      word.addEventListener("pointerenter", handler);
      return handler;
    });

    cleanups.push(() => {
      stopped = true;
      clearTimeout(timer);
      stopIO();
      words.forEach((word, i) => word.removeEventListener("pointerenter", handlers[i]));
      el.classList.remove("tf-ready");
      restore();
    });
  });
  return () => cleanups.forEach((fn) => fn());
}

/** Scrambled Text: the label scrambles and resolves on hover. */
export function scrambledText(selector: string, duration = 420): () => void {
  const cleanups: Array<() => void> = [];
  document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
    if (el.children.length > 0) return;
    const final = el.textContent ?? "";
    if (!final.trim()) return;
    const chars = Array.from(final);

    let raf = 0;
    const onEnter = () => {
      if (raf) return;
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const revealed = Math.floor(t * chars.length);
        el.textContent = chars
          .map((char, i) => {
            if (char === " ") return " ";
            if (i < revealed) return char;
            return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          })
          .join("");
        if (t < 1) {
          raf = requestAnimationFrame(tick);
        } else {
          el.textContent = final;
          raf = 0;
        }
      };
      raf = requestAnimationFrame(tick);
    };

    el.addEventListener("pointerenter", onEnter);
    cleanups.push(() => {
      el.removeEventListener("pointerenter", onEnter);
      if (raf) cancelAnimationFrame(raf);
      el.textContent = final;
    });
  });
  return () => cleanups.forEach((fn) => fn());
}
