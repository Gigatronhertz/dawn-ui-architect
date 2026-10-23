import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { api } from "@/lib/api";

const HERO_PHOTO =
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1800&h=1400&q=80";

/** Live counts for the strip under the hero. Real numbers only — a figure
 *  that hasn't loaded, or is zero, is simply left out. */
function useCounts() {
  const [counts, setCounts] = useState<{ trips: number; events: number; agencies: number } | null>(null);
  useEffect(() => {
    let live = true;
    Promise.allSettled([api.getListings(), api.getEvents("Lagos"), api.getAgencies()]).then(([l, e, a]) => {
      if (!live) return;
      setCounts({
        trips:    l.status === "fulfilled" ? l.value.experiences.length + l.value.agencyTrips.length : 0,
        events:   e.status === "fulfilled" ? (e.value.events ?? []).length : 0,
        agencies: a.status === "fulfilled" ? a.value.agencies.length : 0,
      });
    });
    return () => { live = false; };
  }, []);
  return counts;
}

export const Hero = () => {
  const counts = useCounts();
  const stats = counts
    ? [
        { n: counts.trips,    label: counts.trips === 1 ? "Trip to join" : "Trips to join" },
        { n: counts.events,   label: counts.events === 1 ? "Event on" : "Events on" },
        { n: counts.agencies, label: counts.agencies === 1 ? "Verified agency" : "Verified agencies" },
      ].filter((s) => s.n > 0)
    : [];

  return (
    <section className="kj-dark relative min-h-[calc(100svh-4.5rem)] md:min-h-[760px] flex flex-col overflow-hidden bg-ink">
      <img
        src={HERO_PHOTO}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
      />
      <div aria-hidden="true" className="absolute inset-0 kj-scrim pointer-events-none" />
      <div aria-hidden="true" className="absolute inset-0 kj-scrim-left pointer-events-none md:block hidden" />

      <div className="relative flex-1 w-full max-w-[1280px] mx-auto px-6 md:px-8 pt-28 md:pt-44 pb-8 md:pb-12 flex flex-col">
        <div className="flex flex-col gap-5 max-w-[620px] animate-rise">
          <p className="kj-eyebrow !text-white">Trips&ensp;/&ensp;Events&ensp;/&ensp;Group payments</p>
          <h1 className="text-[clamp(2.9rem,8vw,5.75rem)] leading-[0.98] text-white">
            Good people.<br />Great <span className="kj-hl">places.</span>
          </h1>
          <p className="text-base md:text-lg leading-relaxed text-white/85 max-w-[440px]">
            Curated trips, real experiences, and one link that gets the whole squad paid up and moving together.
          </p>
        </div>

        <div className="mt-auto pt-12 flex flex-col gap-10">
          <Link to="/start/explore" className="group inline-flex items-center gap-4 self-start">
            <span className="kj-arrow w-12 h-12"><ArrowRight className="w-5 h-5" strokeWidth={2.4} /></span>
            <span className="kj-label text-[13px] text-signal">Explore trips</span>
          </Link>

          {stats.length > 0 && (
            <dl className="grid grid-cols-3 max-w-[520px] border-t border-white/20 pt-5">
              {stats.map((s, i) => (
                <div key={s.label} className={`flex flex-col gap-1 ${i > 0 ? "pl-4 md:pl-6 border-l border-white/20" : ""}`}>
                  <dt className="sr-only">{s.label}</dt>
                  <dd className="font-display text-3xl md:text-4xl text-white leading-none">{s.n}</dd>
                  <dd className="text-xs md:text-sm text-white/75">{s.label}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
    </section>
  );
};
