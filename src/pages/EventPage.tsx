import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/CTA";
import { WaitlistForm } from "@/components/WaitlistForm";
import { api } from "@/lib/api";
import type { EventItem } from "@/lib/experienceTypes";
import { tripImageUrl } from "@/lib/tripImage";

function formatEventDate(iso: string | null): string {
  if (!iso) return "Date TBA";
  return new Date(iso).toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export default function EventPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!eventId) return;
    document.title = "Event · Karije";
    let live = true;
    setLoading(true);
    api.getEvent(eventId)
      .then((d) => { if (live) { setEvent(d.event); document.title = `${d.event.name} · Karije`; } })
      .catch(() => { if (live) setNotFound(true); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [eventId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <Nav />
        <div className="pt-40 pb-24 grid place-items-center">
          <div className="w-8 h-8 rounded-full border-2 border-foreground border-t-transparent animate-spin" />
        </div>
      </main>
    );
  }

  if (notFound || !event) {
    return (
      <main className="min-h-screen bg-background">
        <Nav />
        <div className="pt-40 pb-24 text-center px-6">
          <h1 className="font-marcellus text-3xl text-foreground mb-3">Event not found.</h1>
          <p className="font-jost text-muted-foreground mb-6">It may have wrapped up, or the link isn't quite right.</p>
          <Link to="/" className="font-jost font-bold text-foreground underline decoration-signal underline-offset-4">
            ← Back to Karije
          </Link>
        </div>
      </main>
    );
  }

  const free = (event.priceMin ?? 0) === 0 && (event.priceMax ?? 0) === 0;
  const hasLocation = event.location && event.location.trim().length > 0;

  return (
    <main className="min-h-screen bg-background">
      <Nav />

      <div className="pt-32 pb-24 px-6">
        <div className="mx-auto max-w-3xl">
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-jost text-muted-foreground hover:text-foreground transition-colors mb-6">
            ← Back home
          </Link>

          {/* Cover image */}
          <div className="rounded-3xl overflow-hidden border-[3px] border-foreground shadow-[6px_6px_0_0_hsl(var(--foreground))] h-64 md:h-80 relative mb-8" style={{ backgroundColor: event.colorFallback || "#1A1A1A" }}>
            {event.imageId && (
              <img
                src={tripImageUrl(event.imageId, 900, 500)}
                alt={event.name}
                className="w-full h-full object-cover"
              />
            )}
            {free && (
              <span className="absolute top-4 left-4 text-xs font-jost font-bold uppercase tracking-wide px-3 py-1.5 rounded-full bg-signal text-ink border-2 border-foreground">
                Free entry
              </span>
            )}
          </div>

          <div className="text-xs font-jost font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            {formatEventDate(event.eventDate)}
          </div>
          <h1 className="font-marcellus text-4xl md:text-5xl text-foreground leading-[1.05] mb-3">
            {event.name}
          </h1>
          {event.tagline && (
            <p className="font-jost text-lg text-muted-foreground mb-6">{event.tagline}</p>
          )}

          <div className="flex flex-wrap gap-3 mb-8">
            <span className="inline-flex items-center gap-1.5 text-xs font-jost font-semibold border-2 border-foreground rounded-full px-3.5 py-1.5">
              <MapPin className="w-3.5 h-3.5" /> {hasLocation ? event.location : "Location to be disclosed"}
            </span>
            {!free && (
              <span className="inline-flex items-center gap-1.5 text-xs font-jost font-semibold border-2 border-foreground rounded-full px-3.5 py-1.5">
                {event.priceNote || (event.priceMax > 0 ? `₦${event.priceMin.toLocaleString()}–₦${event.priceMax.toLocaleString()}` : "See details")}
              </span>
            )}
          </div>

          {event.description && (
            <p className="font-jost text-base text-foreground/80 leading-relaxed mb-10 whitespace-pre-line">
              {event.description}
            </p>
          )}

          {/* Registration */}
          <div className="rounded-3xl border-[3px] border-foreground shadow-[6px_6px_0_0_hsl(var(--signal))] p-6 md:p-8">
            <h2 className="font-marcellus text-2xl text-foreground mb-1">Register your interest</h2>
            <p className="font-jost text-sm text-muted-foreground mb-5">
              Drop your WhatsApp number and we'll reach out with the details{hasLocation ? "" : ", including the location,"} as the date gets closer. {free && "It's completely free."}
            </p>
            <WaitlistForm
              source={`event:${event.id}`}
              buttonLabel="Notify me"
              successMessage="You're registered! We'll message you on WhatsApp closer to the date."
            />
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
