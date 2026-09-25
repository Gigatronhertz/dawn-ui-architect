import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import type { EventItem } from "@/lib/experienceTypes";
import { tripImageUrl } from "@/lib/tripImage";

function formatEventDate(iso: string | null): string {
  if (!iso) return "Date TBA";
  return new Date(iso).toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short" });
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
    <section className="py-24 md:py-32 border-t border-border">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex items-center gap-4 mb-5">
          <span className="h-px w-8 bg-primary" />
          <span className="text-[10px] font-jost font-light tracking-label text-muted-foreground uppercase">
            Upcoming events
          </span>
        </div>
        <h2 className="font-marcellus text-3xl md:text-4xl text-foreground leading-snug mb-8">
          Something's on.
        </h2>

        <div className="grid md:grid-cols-3 gap-6">
          {events.map((ev, i) => {
            const free = (ev.priceMin ?? 0) === 0 && (ev.priceMax ?? 0) === 0;
            return (
              <Link
                key={ev.id}
                to={`/events/${ev.id}`}
                className="animate-rise group block rounded-2xl overflow-hidden border-[3px] border-foreground shadow-[5px_5px_0_0_hsl(var(--foreground))] hover:-translate-y-1 hover:shadow-[7px_7px_0_0_hsl(var(--foreground))] transition-transform"
                style={{ animationDelay: `${i * 0.08}s` }}
              >
                <div className="h-40 relative" style={{ backgroundColor: ev.colorFallback || "#1A1A1A" }}>
                  {ev.imageId && (
                    <img
                      src={tripImageUrl(ev.imageId, 460, 300)}
                      alt={ev.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                      loading="lazy"
                    />
                  )}
                  {free && (
                    <span className="absolute top-3 left-3 text-[10px] font-jost font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-signal text-ink border-2 border-foreground">
                      Free
                    </span>
                  )}
                </div>
                <div className="p-5">
                  <div className="text-xs font-jost font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                    {formatEventDate(ev.eventDate)}
                  </div>
                  <h3 className="font-marcellus text-lg text-foreground mb-1">{ev.name}</h3>
                  <p className="font-jost font-light text-sm text-muted-foreground line-clamp-2">{ev.tagline}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};
