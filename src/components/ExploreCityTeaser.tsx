import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { LAGOS_EXPERIENCES } from "@/data/experiences";
import { TRIP_CATEGORIES } from "@/lib/categories";
import { tripImageUrl } from "@/lib/tripImage";

type Trip = {
  id: string; name: string; category: string; location: string; maxDays: number;
  pricePerPersonPerDay: number; imageId: string; colorFallback: string;
};

const label = (cat: string) => TRIP_CATEGORIES.find((c) => c.value === cat)?.label ?? cat;
const naira = (n: number) => `₦${Math.round(n).toLocaleString("en-NG")}`;

/** Featured trips — a swipeable row of the trips Karije runs, then off to
 *  Explore, which is where the full catalog and its filters live. */
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
    <section id="trips" className="pt-14 md:pt-24 flex flex-col gap-7 md:gap-10">
      <div className="max-w-[1280px] w-full mx-auto px-6 md:px-8 flex items-end justify-between gap-4">
        <div className="flex flex-col gap-3">
          <p className="kj-eyebrow">Featured trips</p>
          <h2 className="kj-title-sm max-w-[18ch] md:max-w-[26ch]">Handpicked experiences for your next adventure.</h2>
        </div>
        <Link to="/start/explore" className="shrink-0 text-sm font-semibold border-b-2 border-signal pb-1 hover:text-signal transition-colors">
          View all trips →
        </Link>
      </div>

      <div className="max-w-[1280px] w-full mx-auto">
        <div className="flex gap-4 md:gap-5 overflow-x-auto snap-x snap-mandatory scroll-px-6 md:scroll-px-8 px-6 md:px-8 pb-2 [scrollbar-width:none]">
          {trips.slice(0, 6).map((t) => (
            <Link
              key={t.id}
              to={`/start/explore?category=${t.category}`}
              className="group relative snap-start shrink-0 w-[78%] sm:w-[48%] lg:w-[calc((100%-2.5rem)/3)] h-[340px] md:h-[400px] rounded-2xl overflow-hidden bg-ink"
              style={{ backgroundColor: t.colorFallback }}
            >
              {t.imageId && (
                <img
                  src={tripImageUrl(t.imageId, 720, 900)}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  loading="lazy"
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
              )}
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-transparent" />
              <span className="absolute top-4 left-4 kj-label text-[10px] rounded-md bg-signal text-ink px-2.5 py-1">
                {t.maxDays > 1 ? `Up to ${t.maxDays} days` : "1 day"}
              </span>
              <span className="absolute top-4 right-4 kj-label text-[10px] rounded-full bg-white/90 text-ink px-2.5 py-1">
                {label(t.category)}
              </span>
              <div className="absolute inset-x-0 bottom-0 p-5 flex flex-col gap-2 text-white">
                <h3 className="text-2xl md:text-[28px] leading-[1.05]">{t.name}</h3>
                <p className="flex items-center gap-1.5 text-sm text-white/85">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 text-signal" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 21s-7-6-7-11a7 7 0 0114 0c0 5-7 11-7 11z" /><circle cx="12" cy="10" r="2.2" /></svg>
                  {t.location}
                </p>
                <div className="flex items-center justify-between gap-3 pt-2 mt-1 border-t border-white/20">
                  <p className="text-base font-semibold leading-tight">
                    {naira(t.pricePerPersonPerDay)}
                    <span className="block text-xs font-normal text-white/70">/person · day</span>
                  </p>
                  <span className="kj-arrow w-11 h-11" aria-hidden="true">→</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};
