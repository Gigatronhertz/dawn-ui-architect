import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import type { EventItem } from "@/lib/experienceTypes";
import { tripImageUrl } from "@/lib/tripImage";
import { BrandIcon } from "@/lib/brandIcons";

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
    <section id="events" className="kj-dark bg-ink mt-20 md:mt-28">
      <div className="max-w-[1280px] mx-auto px-6 md:px-8 py-16 md:py-24 flex flex-col gap-8 md:gap-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-3">
            <p className="kj-eyebrow">Events</p>
            <h2 className="kj-title text-white">Experiences <span className="kj-hl">beyond travel.</span></h2>
            <p className="text-base md:text-lg text-white/75 max-w-xl">From beach parties to cultural festivals — what's on, and who's going.</p>
          </div>
          <Link to="/start/explore?tab=events" className="text-sm font-semibold text-signal hover:underline underline-offset-4">See all events →</Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {events.map((ev, i) => {
            const free = (ev.priceMin ?? 0) === 0 && (ev.priceMax ?? 0) === 0;
            const d = dateParts(ev.eventDate);
            return (
              <Link key={ev.id} to={`/events/${ev.id}`} className={`group kj-card kj-card-hover overflow-hidden flex-col ${i === 2 ? "hidden lg:flex" : "flex"}`}>
                <div className="relative h-[170px] md:h-[200px]" style={{ backgroundColor: ev.colorFallback || "#1B1A17" }}>
                  {ev.imageId && (
                    <img
                      src={tripImageUrl(ev.imageId, 720, 520)}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy" onError={(e) => { e.currentTarget.style.display = "none"; }}
                    />
                  )}
                  <div className="absolute top-3 left-3 rounded-xl bg-signal text-ink w-14 py-1.5 flex flex-col items-center leading-none">
                    {d ? (
                      <>
                        <span className="text-[10px] font-bold tracking-[0.14em]">{d.dow}</span>
                        <span className="font-display text-[28px] leading-[1.05]">{d.day}</span>
                        <span className="text-[10px] font-bold tracking-[0.14em]">{d.mon}</span>
                      </>
                    ) : (
                      <span className="font-display text-lg py-2">TBA</span>
                    )}
                  </div>
                  {free && (
                    <div className="absolute top-3 right-3 rounded-full bg-white text-ink text-xs font-semibold px-3 py-1">Free</div>
                  )}
                </div>
                <div className="flex items-end gap-3 p-4 md:p-5 flex-1">
                  <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                    <h3 className="text-xl md:text-2xl leading-tight text-white">{ev.name}</h3>
                    {ev.tagline && (
                      <p className="text-sm text-white/70 flex items-start gap-2 line-clamp-2">
                        <BrandIcon d={CALENDAR} className="w-4 h-4 mt-0.5 text-signal shrink-0" />
                        {ev.tagline}
                      </p>
                    )}
                  </div>
                  <span className="kj-arrow" aria-hidden="true">→</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};
