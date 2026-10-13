/**
 * Line icons from the Karije brand template — 24×24, stroked, inheriting
 * currentColor. Keyed by trip category value (see lib/categories.ts).
 */
export const CATEGORY_ICON_PATHS: Record<string, string> = {
  all:       "M12 3a9 9 0 100 18 9 9 0 000-18z M3 12h18 M12 3c3 3 3 15 0 18 M12 3c-3 3-3 15 0 18",
  adventure: "M3 20l6-11 4 7 3-4 5 8z",
  culture:   "M6 4h12l-2 16H8z M7.5 8l9 8 M16.5 8l-9 8",
  nature:    "M5 19c0-8 6-14 15-14 0 9-6 15-14 15 M5 19l8-8",
  leisure:   "M2 9c3-3 5 3 8 0s5 3 8 0 4 0 4 0 M2 15c3-3 5 3 8 0s5 3 8 0 4 0 4 0",
  food:      "M7 3v18 M4 3v5a3 3 0 006 0V3 M17 21V3c-2 0-3 3-3 7h3",
  nightlife: "M20 14A8 8 0 1110 4a6 6 0 0010 10z",
};

export const PIN_PATH   = "M12 21s-7-6-7-11a7 7 0 0114 0c0 5-7 11-7 11z M12 8a2 2 0 100 4 2 2 0 000-4z";
export const CLOCK_PATH = "M12 3a9 9 0 100 18 9 9 0 000-18z M12 7v5l3 2";

export const BrandIcon = ({ d, className = "w-[18px] h-[18px]", strokeWidth = 2.2 }: { d: string; className?: string; strokeWidth?: number }) => (
  <svg viewBox="0 0 24 24" className={`shrink-0 ${className}`} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

/** The cut-edge shapes, cycled across a grid so neighbouring cards differ. */
export const CUTS = ["kj-cut", "kj-cut-2", "kj-cut-3", "kj-cut-4", "kj-cut-5", "kj-cut-6"];
