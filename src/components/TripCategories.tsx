import { Link } from "react-router-dom";
import { TRIP_CATEGORIES } from "@/lib/categories";
import { LAGOS_EXPERIENCES } from "@/data/experiences";
import { tripImageUrl } from "@/lib/tripImage";
import { BrandIcon, CATEGORY_ICON_PATHS } from "@/lib/brandIcons";

// One photo per vibe — the first curated Lagos trip in that category, with a
// fallback for categories that don't have one yet.
const FALLBACK_PHOTO: Record<string, string> = {
  nightlife: "1566737236500-c8ac43014a67", // nightclub interior — same verified photo Explore uses
};
const photoFor = (category: string) =>
  LAGOS_EXPERIENCES.find((e) => e.category === category)?.imageId ?? FALLBACK_PHOTO[category] ?? null;

export const TripCategories = () => {
  const cards = TRIP_CATEGORIES.filter((c) => c.value !== "all");

  return (
    <section className="max-w-[1280px] mx-auto px-6 md:px-8 pt-20 md:pt-28 flex flex-col gap-8 md:gap-10">
      <div className="flex flex-col gap-3">
        <p className="kj-eyebrow">Pick your kind of trip</p>
        <h2 className="kj-title">Six vibes. <span className="kj-hl">One city.</span></h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-5">
        {cards.map((c) => {
          const photo = photoFor(c.value);
          return (
            <Link
              key={c.value}
              to={`/start/explore?category=${c.value}`}
              className="group relative h-[150px] sm:h-[190px] md:h-[240px] rounded-2xl overflow-hidden bg-ink"
            >
              {photo && (
                <img src={tripImageUrl(photo, 720, 600)} alt="" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" onError={(e) => { e.currentTarget.style.display = "none"; }} />
              )}
              <div className="absolute inset-0 kj-scrim" />
              <div className="absolute inset-x-3 bottom-3 md:inset-x-5 md:bottom-5 flex items-end justify-between gap-2">
                <span className="flex items-center gap-2 text-white font-display text-xl sm:text-2xl md:text-3xl leading-none">
                  <BrandIcon d={CATEGORY_ICON_PATHS[c.value]} className="w-4 h-4 md:w-6 md:h-6 text-signal shrink-0" strokeWidth={2.2} />
                  {c.label}
                </span>
                <span className="kj-arrow hidden sm:inline-grid" aria-hidden="true">→</span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
};
