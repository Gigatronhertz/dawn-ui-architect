import { Link } from "react-router-dom";
import { LAGOS_EXPERIENCES } from "@/data/experiences";
import { TRIP_CATEGORIES } from "@/lib/categories";
import { tripImageUrl } from "@/lib/tripImage";
import { useScrollReveal } from "@/hooks/useScrollReveal";

// Static teaser, no fetch: LAGOS_EXPERIENCES is the same offline-safe seed
// data Explore.tsx falls back to, so this needs no loading state and can
// never show a spinner on the marketing page. Lagos-only for now — the same
// scope Explore's own fallback has.
const FEATURED = LAGOS_EXPERIENCES.slice(0, 3);
const CHIPS = TRIP_CATEGORIES;

export const ExploreCityTeaser = () => {
  const reveal = useScrollReveal<HTMLDivElement>();

  return (
    <section className="py-24 md:py-32 border-t border-border">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex items-center gap-4 mb-5">
          <span className="h-px w-8 bg-primary" />
          <span className="text-[10px] font-jost font-light tracking-label text-muted-foreground uppercase">
            Start with what's near you
          </span>
        </div>
        <h2 className="font-marcellus text-3xl md:text-4xl text-foreground leading-snug mb-4">
          Explore Lagos first.
        </h2>
        <p className="font-jost font-light text-base text-muted-foreground max-w-xl mb-8">
          Curated trips, nightlife and events in your own city. Interstate is there when you're ready to go further.
        </p>

        <div className="flex flex-wrap gap-2 mb-10">
          {CHIPS.map((c) => (
            <Link
              key={c.value}
              to={`/start/explore?category=${c.value}`}
              className="inline-flex items-center gap-1.5 text-xs font-jost font-semibold border-[3px] border-foreground rounded-full px-3.5 py-1.5 text-foreground shadow-[3px_3px_0_0_hsl(var(--foreground))] hover:bg-foreground hover:text-background hover:shadow-none transition-all"
            >
              <span aria-hidden="true">{c.emoji}</span>
              {c.label}
            </Link>
          ))}
        </div>

        <div ref={reveal.ref} className="grid md:grid-cols-3 gap-6">
          {FEATURED.map((exp, i) => (
            <Link
              key={exp.id}
              to={`/start/explore?category=${exp.category}`}
              className={`${reveal.visible ? "animate-rise" : "opacity-0"} group block rounded-2xl overflow-hidden border-[3px] border-foreground shadow-[5px_5px_0_0_hsl(var(--foreground))] transition-transform hover:-translate-y-1 hover:shadow-[7px_7px_0_0_hsl(var(--foreground))]`}
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <div className="h-44 overflow-hidden" style={{ backgroundColor: exp.colorFallback }}>
                {exp.imageId && (
                  <img
                    src={tripImageUrl(exp.imageId, 460, 340)}
                    alt={exp.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                    loading="lazy"
                  />
                )}
              </div>
              <div className="p-5">
                <h3 className="font-marcellus text-lg text-foreground mb-1">{exp.name}</h3>
                <p className="font-jost font-light text-sm text-muted-foreground mb-2">{exp.tagline}</p>
                <p className="font-jost text-xs text-muted-foreground/70">{exp.location}</p>
              </div>
            </Link>
          ))}
        </div>

        <p className="mt-8 text-sm font-jost text-muted-foreground">
          Going further?{" "}
          <Link to="/start" className="text-foreground font-medium underline decoration-signal underline-offset-2">
            Interstate trips to Abuja, Calabar &amp; more →
          </Link>
        </p>
      </div>
    </section>
  );
};
