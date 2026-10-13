import { Link } from "react-router-dom";
import { TRIP_CATEGORIES } from "@/lib/categories";
import { LAGOS_EXPERIENCES } from "@/data/experiences";
import { tripImageUrl } from "@/lib/tripImage";
import { Eyebrow } from "@/components/Nav";
import { BrandIcon, CATEGORY_ICON_PATHS, CUTS } from "@/lib/brandIcons";

// One photo per vibe — the first curated Lagos trip in that category, with a
// fallback for categories that don't have one yet.
const FALLBACK_PHOTO: Record<string, string> = {
  nightlife: "1566737236500-c8ac43014a67", // nightclub interior — same verified photo Explore uses
};
const photoFor = (category: string) =>
  LAGOS_EXPERIENCES.find((e) => e.category === category)?.imageId ?? FALLBACK_PHOTO[category] ?? null;

const TILTS = ["-rotate-3", "rotate-2", "-rotate-[1.5deg]", "rotate-[2.5deg]", "-rotate-2", "rotate-[1.5deg]"];

export const TripCategories = () => {
  const cards = TRIP_CATEGORIES.filter((c) => c.value !== "all");

  return (
    <section className="max-w-[1280px] mx-auto px-5 md:px-8 pt-16 md:pt-24 pb-6 flex flex-col gap-7 md:gap-10">
      <div className="flex flex-col gap-4">
        <Eyebrow>Pick your kind of trip</Eyebrow>
        <h2 className="kj-title"><span className="text-signal">Six vibes.</span><br />Same city.</h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-5">
        {cards.map((c, i) => {
          const photo = photoFor(c.value);
          return (
            <Link
              key={c.value}
              to={`/start/explore?category=${c.value}`}
              className={`relative h-[130px] sm:h-[180px] md:h-[230px] bg-[#1A1A1A] ${CUTS[i % CUTS.length]} transition-transform duration-300 hover:-translate-y-1.5 hover:-rotate-[0.6deg]`}
            >
              {photo && (
                <img src={tripImageUrl(photo, 720, 600)} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" onError={(e) => { e.currentTarget.style.display = "none"; }} />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-ink/85 to-transparent to-60%" />
              <div className={`absolute left-3 bottom-3 md:left-5 md:bottom-5 flex items-center gap-2 md:gap-2.5 font-display text-base sm:text-xl md:text-[28px] leading-none text-ink bg-signal px-2.5 py-1.5 md:px-3.5 md:py-2 ${TILTS[i % TILTS.length]}`}>
                <BrandIcon d={CATEGORY_ICON_PATHS[c.value]} className="w-4 h-4 md:w-6 md:h-6" strokeWidth={2.4} />
                <span>{c.label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
};
