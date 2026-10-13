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
    <section id="events" className="max-w-[1280px] mx-auto px-5 md:px-8 pt-24 md:pt-28 pb-5 flex flex-col gap-11">
      <h2 className="kj-title">
        Something's <span className="kj-hl-r px-4">on.</span>
      </h2>

      <div className="grid gap-7 [grid-template-columns:repeat(auto-fill,minmax(min(100%,340px),1fr))]">
        {events.map((ev, i) => {
          const free = (ev.priceMin ?? 0) === 0 && (ev.priceMax ?? 0) === 0;
          const d = dateParts(ev.eventDate);
          return (
            <Link key={ev.id} to={`/events/${ev.id}`} className="group flex flex-col gap-4 kj-lift">
              <div className={`relative h-[260px] ${CUTS[(i * 2) % CUTS.length]}`} style={{ backgroundColor: ev.colorFallback || "#1A1A1A" }}>
                {ev.imageId && (
                  <img
                    src={tripImageUrl(ev.imageId, 720, 520)}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy" onError={(e) => { e.currentTarget.style.display = "none"; }}
                  />
                )}
                <div className="absolute top-0 left-0 bg-signal text-ink px-4 py-3 flex flex-col items-center">
                  {d ? (
                    <>
                      <span className="text-xs font-bold tracking-[0.2em]">{d.dow}</span>
                      <span className="font-display text-[38px] leading-none">{d.day}</span>
                      <span className="text-xs font-bold tracking-[0.2em]">{d.mon}</span>
                    </>
                  ) : (
                    <span className="font-display text-lg leading-none py-2">TBA</span>
                  )}
                </div>
                {free && (
                  <div className="absolute top-4 right-4 font-display text-lg bg-paper text-ink px-3 py-1.5 rotate-[4deg]">Free</div>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <h3 className="font-display text-[26px] md:text-[28px] leading-[1.05] group-hover:text-signal transition-colors">{ev.name}</h3>
                {ev.tagline && (
                  <p className="text-base text-muted-foreground flex items-start gap-2">
                    <span className="text-signal mt-1"><BrandIcon d={CALENDAR} className="w-[17px] h-[17px]" /></span>
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
