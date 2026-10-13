import { useCallback, useEffect, useState } from "react";

/** Flips `visible` true the first time the ref'd element enters the
 *  viewport, then disconnects — for below-the-fold sections where Hero's
 *  mount-triggered `.animate-rise` would already have fired before the user
 *  scrolls there. Pair with `animate-rise` the same way Hero does: apply the
 *  class only once `visible` is true, `opacity-0` before that.
 *
 *  `ref` is a callback ref, so it also works for an element that only
 *  appears after a fetch (My Plans' list): a plain useRef read once on mount
 *  would still be null then, the observer would never attach, and the
 *  element would stay invisible for good. */
export function useScrollReveal<T extends HTMLElement>(threshold = 0.15) {
  const [el, setEl] = useState<T | null>(null);
  const [visible, setVisible] = useState(false);
  const ref = useCallback((node: T | null) => setEl(node), []);

  useEffect(() => {
    if (!el || visible) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [el, threshold, visible]);

  return { ref, visible };
}
