import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { LAGOS_EXPERIENCES } from "@/data/experiences";
import { TRIP_CATEGORIES } from "@/lib/categories";
import { tripImageUrl } from "@/lib/tripImage";

type Trip = {
  id: string; name: string; category: string; location: string;
  pricePerPersonPerDay: number; imageId: string; colorFallback: string;
};

const label = (cat: string) => TRIP_CATEGORIES.find((c) => c.value === cat)?.label ?? cat;
const naira = (n: number) => `₦${Math.round(n).toLocaleString("en-NG")}`;

/** A small taste of the trips Karije runs — two of them, then off to Explore,
 *  which is where the full catalog and its filters live. */
export const ExploreCityTeaser = () => {
  const [trips, setTrips] = useState<Trip[]>(LAGOS_EXPERIENCES);

  useEffect(() => {
    let live = true;
    api.getExperiences("Lagos")
      .then((d) => { if (live && d.experiences?.length) setTrips(d.experiences); })
      .catch(() => { /* keep the seed list */ });
    return () => { live = false; };
  }, []);

  return (
    <section id="trips" className="max-w-[1280px] mx-auto px-6 md:px-8 pt-20 md:pt-28 flex flex-col gap-8 md:gap-10">
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-3">
          <p className="kj-eyebrow">Curated by Karije · Lagos</p>
          <h2 className="kj-title-sm">Find your <span className="kj-hl">next adventure.</span></h2>
        </div>
        <Link to="/start/explore" className="text-sm font-semibold whitespace-nowrap hover:underline underline-offset-4">
          See all →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 md:gap-6">
        {trips.slice(0, 2).map((t) => (
          <Link key={t.id} to={`/start/explore?category=${t.category}`} className="group kj-card kj-card-hover overflow-hidden flex flex-col">
            <div className="relative h-[130px] sm:h-[190px] md:h-[260px] overflow-hidden" style={{ backgroundColor: t.colorFallback }}>
              {t.imageId && (
                <img
                  src={tripImageUrl(t.imageId, 720, 520)}
                  alt=""
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
              )}
              <span className="absolute top-2.5 left-2.5 md:top-4 md:left-4 kj-label text-[9px] md:text-[10px] rounded-full bg-signal text-ink px-2 py-0.5 md:px-2.5 md:py-1">
                {label(t.category)}
              </span>
            </div>
            <div className="p-3 md:p-5 flex flex-col gap-1 flex-1">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-1 md:gap-4">
                <h3 className="text-base sm:text-xl md:text-2xl leading-[1.15]">{t.name}</h3>
                <p className="text-sm md:text-lg font-semibold whitespace-nowrap md:text-right">
                  {naira(t.pricePerPersonPerDay)}
                  <span className="block text-[11px] md:text-xs font-normal text-muted-foreground">/person · day</span>
                </p>
              </div>
              <div className="mt-auto pt-2 flex items-center justify-between gap-2">
                <p className="text-xs md:text-sm text-muted-foreground truncate">{t.location}</p>
                <span className="kj-arrow w-7 h-7 md:w-9 md:h-9 text-sm" aria-hidden="true">→</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};
