import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import type { EventItem } from "@/lib/experienceTypes";
import { tripImageUrl } from "@/lib/tripImage";
import { BrandIcon, CUTS } from "@/lib/brandIcons";

const CALENDAR = "M4 6h16v14H4z M4 10h16 M8 3v4 M16 3v4";

function dateParts(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  return {
    dow: d.toLocaleDateString("en-NG", { weekday: "short" }).toUpperCase(),
    day: d.getDate(),
    mon: d.toLocaleDateString("en-NG", { month: "short" }).toUpperCase(),
  };
}

/** Renders nothing at all when there's nothing upcoming — no empty-state
 *  clutter on the landing page while the events list is still thin. */
export const UpcomingEvents = () => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    api.getEvents("Lagos")
      .then((d) => {
        if (!live) return;
        const now = Date.now();
        const upcoming = (d.events ?? [])
          .filter((e) => !e.eventDate || new Date(e.eventDate).getTime() >= now - 86400000)
          .sort((a, b) => (a.eventDate ?? "").localeCompare(b.eventDate ?? ""))
          .slice(0, 3);
        setEvents(upcoming);
      })
      .catch(() => setEvents([]))
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, []);

  if (!loading && events.length === 0) return null;

  return (
    <section id="events" className="max-w-[1280px] mx-auto px-5 md:px-8 pt-16 md:pt-24 pb-5 flex flex-col gap-7 md:gap-10">
      <h2 className="kj-title">
        Something's <span className="kj-hl-r px-4">on.</span>
      </h2>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-3 gap-y-6 md:gap-6">
        {events.map((ev, i) => {
          const free = (ev.priceMin ?? 0) === 0 && (ev.priceMax ?? 0) === 0;
          const d = dateParts(ev.eventDate);
          return (
            <Link key={ev.id} to={`/events/${ev.id}`} className={`group flex-col gap-3 md:gap-4 kj-lift ${i === 2 ? "hidden lg:flex" : "flex"}`}>
              <div className={`relative h-[150px] sm:h-[200px] md:h-[230px] ${CUTS[(i * 2) % CUTS.length]}`} style={{ backgroundColor: ev.colorFallback || "#1A1A1A" }}>
                {ev.imageId && (
                  <img
                    src={tripImageUrl(ev.imageId, 720, 520)}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy" onError={(e) => { e.currentTarget.style.display = "none"; }}
                  />
                )}
                <div className="absolute top-0 left-0 bg-signal text-ink px-2.5 py-1.5 md:px-3.5 md:py-2.5 flex flex-col items-center">
                  {d ? (
                    <>
                      <span className="text-[10px] md:text-xs font-bold tracking-[0.2em]">{d.dow}</span>
                      <span className="font-display text-2xl md:text-[32px] leading-none">{d.day}</span>
                      <span className="text-[10px] md:text-xs font-bold tracking-[0.2em]">{d.mon}</span>
                    </>
                  ) : (
                    <span className="font-display text-lg leading-none py-2">TBA</span>
                  )}
                </div>
                {free && (
                  <div className="absolute top-2.5 right-2.5 md:top-4 md:right-4 font-display text-sm md:text-base bg-paper text-ink px-2 py-1 md:px-3 rotate-[4deg]">Free</div>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <h3 className="font-display text-base sm:text-xl md:text-2xl leading-[1.1] group-hover:text-signal transition-colors">{ev.name}</h3>
                {ev.tagline && (
                  <p className="text-xs sm:text-sm md:text-base text-muted-foreground flex items-start gap-2 line-clamp-2">
                    <span className="text-signal mt-0.5 hidden sm:inline"><BrandIcon d={CALENDAR} className="w-4 h-4" /></span>
                    {ev.tagline}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
};
