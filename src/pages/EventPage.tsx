import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { MapPin, ArrowLeft, ArrowRight } from "lucide-react";
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
          <div className="w-8 h-8 rounded-full border-2 border-signal border-t-transparent animate-spin" />
        </div>
      </main>
    );
  }

  if (notFound || !event) {
    return (
      <main className="min-h-screen bg-background">
        <Nav />
        <div className="pt-40 pb-24 text-center px-6">
          <h1 className="text-4xl text-foreground mb-3">Event not found.</h1>
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

      {/* Hero — the event's own photo, date first */}
      <section className="kj-dark relative bg-ink overflow-hidden" style={{ backgroundColor: event.colorFallback || undefined }}>
        {event.imageId && (
          <img
            src={tripImageUrl(event.imageId, 1600, 1000)}
            alt={event.name}
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
        )}
        <div aria-hidden="true" className="absolute inset-0 kj-scrim" />
        <div className="relative mx-auto max-w-3xl px-6 pt-28 md:pt-36 pb-10 md:pb-14 flex flex-col gap-4">
          <Link to="/" className="self-start inline-flex items-center gap-2 text-sm text-white/85 hover:text-signal transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back home
          </Link>
          <div className="flex flex-col gap-3 mt-12 md:mt-24">
            <div className="flex flex-wrap items-center gap-2">
              <span className="kj-label text-[10px] rounded-full bg-signal text-ink px-2.5 py-1">Event</span>
              {free && <span className="kj-label text-[10px] rounded-full bg-white text-ink px-2.5 py-1">Free entry</span>}
            </div>
            <p className="kj-eyebrow">{formatEventDate(event.eventDate)}</p>
            <h1 className="text-[clamp(2.4rem,6.5vw,4.25rem)] leading-[1] text-white">{event.name}</h1>
            {event.tagline && <p className="text-lg text-white/85">{event.tagline}</p>}
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <span className="kj-chip !text-white !border-white/30">
              <MapPin className="w-3.5 h-3.5 text-signal" /> {hasLocation ? event.location : "Location to be disclosed"}
            </span>
            {!free && (
              <span className="kj-chip !text-white !border-white/30">
                {event.priceNote || (event.priceMax > 0 ? `₦${event.priceMin.toLocaleString()}–₦${event.priceMax.toLocaleString()}` : "See details")}
              </span>
            )}
          </div>
          <a href="#register" className="kj-btn justify-between w-full sm:w-auto sm:self-start sm:min-w-[300px] text-base py-4 mt-2">
            I'm interested <ArrowRight className="w-5 h-5" />
          </a>
        </div>
      </section>

      <div className="pt-12 md:pt-16 pb-24 px-6">
        <div className="mx-auto max-w-3xl">
          {event.description && (
            <p className="text-base md:text-lg text-foreground leading-relaxed mb-10 whitespace-pre-line">
              {event.description}
            </p>
          )}

          {/* Registration */}
          <div id="register" className="kj-card shadow-soft p-6 md:p-8 scroll-mt-24">
            <h2 className="text-3xl text-foreground mb-1">Register your interest</h2>
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
