import { useEffect, useRef, useState } from "react";

/** Flips `visible` true the first time the ref'd element enters the
 *  viewport, then disconnects — for below-the-fold sections where Hero's
 *  mount-triggered `.animate-rise` would already have fired before the user
 *  scrolls there. Pair with `animate-rise` the same way Hero does: apply the
 *  class only once `visible` is true, `opacity-0` before that. */
export function useScrollReveal<T extends HTMLElement>(threshold = 0.15) {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
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
  }, [threshold]);

  return { ref, visible };
}
