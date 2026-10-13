import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { LAGOS_EXPERIENCES } from "@/data/experiences";
import { TRIP_CATEGORIES } from "@/lib/categories";
import { tripImageUrl } from "@/lib/tripImage";
import { Eyebrow } from "@/components/Nav";

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
    <section id="trips" className="max-w-[1280px] mx-auto px-5 md:px-8 pt-16 md:pt-24 pb-6 flex flex-col gap-7 md:gap-10">
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-3">
          <Eyebrow>Curated by Karije · Lagos</Eyebrow>
          <h2 className="kj-title-sm">Trips we <span className="kj-hl px-2">run.</span></h2>
        </div>
        <Link to="/start/explore" className="kj-label text-xs md:text-sm text-signal whitespace-nowrap hover:underline underline-offset-4">
          See all trips →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 md:gap-6">
        {trips.slice(0, 2).map((t) => (
          <Link key={t.id} to={`/start/explore?category=${t.category}`} className="kj-card kj-card-hover flex flex-col">
            <div className="relative h-[130px] sm:h-[180px] md:h-[240px]" style={{ backgroundColor: t.colorFallback }}>
              {t.imageId && (
                <img
                  src={tripImageUrl(t.imageId, 720, 520)}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
              )}
              <span className="absolute top-2.5 left-2.5 md:top-4 md:left-4 kj-label text-[10px] md:text-xs tracking-[0.18em] bg-ink text-signal px-2 py-1 md:px-3 md:py-1.5">
                {label(t.category)}
              </span>
              <span className="absolute -right-1 -bottom-3.5 md:-bottom-4 font-display text-base md:text-2xl leading-none bg-signal text-ink px-2.5 py-1.5 md:px-3.5 md:py-2 -rotate-3 shadow-[3px_3px_0_hsl(var(--ink))]">
                {naira(t.pricePerPersonPerDay)}
                <span className="font-sans text-[10px] md:text-xs font-semibold normal-case"> /p·day</span>
              </span>
            </div>
            <div className="px-3 pt-6 pb-3 md:px-5 md:pt-8 md:pb-5 flex flex-col gap-1">
              <h3 className="font-display text-base sm:text-xl md:text-2xl leading-[1.1]">{t.name}</h3>
              <p className="text-xs md:text-sm text-muted-foreground truncate">{t.location}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};
