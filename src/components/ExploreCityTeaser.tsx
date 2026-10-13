import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { LAGOS_EXPERIENCES } from "@/data/experiences";
import { TRIP_CATEGORIES } from "@/lib/categories";
import { tripImageUrl } from "@/lib/tripImage";
import { Eyebrow } from "@/components/Nav";
import { BrandIcon, CATEGORY_ICON_PATHS, CLOCK_PATH, PIN_PATH } from "@/lib/brandIcons";

type Trip = {
  id: string; name: string; category: string; location: string;
  pricePerPersonPerDay: number; maxDays: number; imageId: string; colorFallback: string;
};

// "Nightlife" isn't a trip filter here — it has its own section in Explore.
const FILTERS = TRIP_CATEGORIES.filter((c) => c.value !== "nightlife");
const label = (cat: string) => TRIP_CATEGORIES.find((c) => c.value === cat)?.label ?? cat;
const naira = (n: number) => `₦${Math.round(n).toLocaleString("en-NG")}`;

/** "Trips we run · Lagos" — Karije's own curated trips, live from the API,
 *  falling back to the bundled seed list if the API can't be reached. */
export const ExploreCityTeaser = () => {
  const [trips, setTrips] = useState<Trip[]>(LAGOS_EXPERIENCES);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    let live = true;
    api.getExperiences("Lagos")
      .then((d) => { if (live && d.experiences?.length) setTrips(d.experiences); })
      .catch(() => { /* keep the seed list */ });
    return () => { live = false; };
  }, []);

  const shown = trips.filter((t) => filter === "all" || t.category === filter).slice(0, 6);

  return (
    <section id="trips" className="max-w-[1280px] mx-auto px-5 md:px-8 pt-24 md:pt-28 pb-10 flex flex-col gap-10">
      <div className="flex flex-col gap-4">
        <Eyebrow>Trips we run · Lagos</Eyebrow>
        <h2 className="kj-title">Explore <span className="kj-hl px-4">Lagos</span> first.</h2>
        <p className="text-lg md:text-[19px] leading-relaxed text-muted-foreground max-w-[620px]">
          Trips we've picked, priced and will run for your squad. Pick one, choose your days and squad size, and we handle the rest.
        </p>
      </div>

      <div className="flex flex-wrap gap-2.5">
        {FILTERS.map((c) => {
          const active = filter === c.value;
          return (
            <button
              key={c.value}
              type="button"
              onClick={() => setFilter(c.value)}
              className={`kj-label text-[13px] md:text-sm px-4 py-2.5 border-2 flex items-center gap-2 transition-colors ${
                active ? "bg-signal text-ink border-signal" : "bg-transparent text-paper border-line-strong hover:border-signal"
              }`}
            >
              <BrandIcon d={CATEGORY_ICON_PATHS[c.value]} />
              {c.value === "all" ? "All" : c.label}
            </button>
          );
        })}
      </div>

      {shown.length === 0 ? (
        <p className="text-[17px] text-faint py-5">
          No {label(filter).toLowerCase()} trips running yet.{" "}
          <Link to="/start/explore?tab=own" className="text-signal underline underline-offset-4">Build your own below.</Link>
        </p>
      ) : (
        <div className="grid gap-7 [grid-template-columns:repeat(auto-fill,minmax(min(100%,340px),1fr))]">
          {shown.map((t) => (
            <Link key={t.id} to={`/start/explore?category=${t.category}`} className="kj-card kj-card-hover flex flex-col">
              <div className="relative h-[240px] md:h-[280px]" style={{ backgroundColor: t.colorFallback }}>
                {t.imageId && (
                  <img src={tripImageUrl(t.imageId, 720, 560)} alt="" className="w-full h-full object-cover" loading="lazy" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                )}
                <span className="absolute top-4 left-4 kj-label text-xs tracking-[0.2em] bg-ink text-signal px-3 py-1.5">
                  {label(t.category)}
                </span>
                <span className="absolute -right-1.5 -bottom-5 font-display text-2xl md:text-[30px] leading-none bg-signal text-ink px-4 pt-2.5 pb-3 -rotate-3 shadow-[4px_4px_0_hsl(var(--ink))]">
                  {naira(t.pricePerPersonPerDay)}
                  <span className="font-sans text-[13px] font-semibold normal-case"> /p·day</span>
                </span>
              </div>
              <div className="px-5 pt-9 pb-5 flex flex-col gap-2">
                <h3 className="font-display text-[26px] md:text-[30px] leading-[1.05]">{t.name}</h3>
                <div className="flex justify-between gap-3 text-[15px] text-muted-foreground">
                  <span className="flex items-center gap-1.5 min-w-0">
                    <span className="text-signal"><BrandIcon d={PIN_PATH} className="w-[17px] h-[17px]" /></span>
                    <span className="truncate">{t.location}</span>
                  </span>
                  <span className="flex items-center gap-1.5 font-semibold text-paper shrink-0">
                    <span className="text-signal"><BrandIcon d={CLOCK_PATH} className="w-[17px] h-[17px]" /></span>
                    {t.maxDays > 1 ? `Up to ${t.maxDays} days` : "1 day"}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <p className="text-base text-muted-foreground">
        Going further?{" "}
        <Link to="/start/trip" className="text-signal font-semibold underline underline-offset-4">
          Interstate trips to Abuja, Calabar &amp; more →
        </Link>
      </p>
    </section>
  );
};
