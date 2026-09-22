import { Link } from "react-router-dom";
import { TRIP_CATEGORIES } from "@/lib/categories";
import { useScrollReveal } from "@/hooks/useScrollReveal";

// The six real categories from src/lib/categories.ts (same list Explore's
// vibe chips use) — "all" is dropped here, a card grid doesn't need an
// "Everything" tile. Colors/icon per card, alternating paper/ink/signal/panel
// like Explore's own category badges (CAT_COLOR in Explore.tsx).
// Every card gets the bold 2px outline from the approved mock — that's the
// specific "cut-out sticker" quality being borrowed from Chowdeck's cards.
// `border-foreground` (not `border-ink`) so it stays black-on-light and
// flips to white-on-dark instead of vanishing on the dark theme.
const CARD_STYLE: Record<string, { bg: string; fg: string; icon: JSX.Element }> = {
  adventure: {
    bg: "bg-background", fg: "text-foreground",
    icon: <path d="M3 18h18M5 18l2-9h10l2 9M12 3v6M9 9l3-3 3 3" />,
  },
  culture: {
    bg: "bg-forest", fg: "text-parchment",
    icon: <path d="M9 4c0 3-3 3-3 6a3 3 0 0 0 6 0M15 4c0 3 3 3 3 6a3 3 0 0 1-6 0M9 10v3a3 3 0 0 0 6 0v-3" />,
  },
  nature: {
    bg: "bg-signal", fg: "text-ink",
    icon: <path d="M6 21c1-4-2-6-2-10a8 8 0 0 1 16 0c0 4-3 6-2 10M12 21V11" />,
  },
  leisure: {
    bg: "bg-background", fg: "text-foreground",
    icon: <path d="M2 17c1.5 1.5 3 1.5 4.5 0s3-1.5 4.5 0 3 1.5 4.5 0 3-1.5 4.5 0M2 12c1.5 1.5 3 1.5 4.5 0s3-1.5 4.5 0 3 1.5 4.5 0 3-1.5 4.5 0" />,
  },
  food: {
    bg: "bg-sage", fg: "text-parchment",
    icon: <path d="M7 3v18M7 3c0 4 3 4 3 8s-3 4-3 4M17 3v18M17 13h4M17 8h4" />,
  },
  nightlife: {
    bg: "bg-background", fg: "text-foreground",
    icon: <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />,
  },
};

export const TripCategories = () => {
  const reveal = useScrollReveal<HTMLDivElement>();
  const cards = TRIP_CATEGORIES.filter((c) => c.value !== "all");

  return (
    <section className="py-24 md:py-32 border-t border-border">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex items-center gap-4 mb-5">
          <span className="h-px w-8 bg-primary" />
          <span className="text-[10px] font-jost font-light tracking-label text-muted-foreground uppercase">
            Pick your kind of trip
          </span>
        </div>
        <h2 className="font-marcellus text-3xl md:text-4xl text-foreground leading-snug mb-12">
          Six vibes. Same city.
        </h2>

        <div ref={reveal.ref} className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {cards.map((c, i) => (
            <Link
              key={c.value}
              to={`/start/explore?category=${c.value}`}
              className={`${reveal.visible ? "animate-rise" : "opacity-0"} ${CARD_STYLE[c.value].bg} ${CARD_STYLE[c.value].fg} border-[3px] border-foreground rounded-2xl p-6 flex flex-col justify-between gap-8 min-h-[160px] shadow-[5px_5px_0_0_hsl(var(--foreground))] transition-transform hover:-translate-y-1 hover:shadow-[7px_7px_0_0_hsl(var(--foreground))]`}
              style={{ animationDelay: `${i * 0.06}s` }}
            >
              <svg viewBox="0 0 24 24" className="w-7 h-7 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                {CARD_STYLE[c.value].icon}
              </svg>
              <span className="font-marcellus text-lg">{c.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};
