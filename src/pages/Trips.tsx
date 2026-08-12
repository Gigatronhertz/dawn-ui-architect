import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { KarijeLogo } from "@/components/Nav";
import { Footer } from "@/components/CTA";
import { api } from "@/lib/api";
import type { CuratedTrip } from "@/lib/tripTypes";

const fmtNGN = (n: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(n);

/** Unsplash thumbnail for a trip, or null when the admin left the image blank. */
function tripImage(imageId: string, w = 640, h = 360): string | null {
  return imageId
    ? `https://images.unsplash.com/photo-${imageId}?auto=format&fit=crop&w=${w}&h=${h}&q=70`
    : null;
}

// ── Detail modal ─────────────────────────────────────────────────────────────

function TripDetail({ trip, onClose }: { trip: CuratedTrip; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const img = tripImage(trip.imageId, 1200, 500);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start sm:items-center justify-center p-0 sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={trip.name}
        className="bg-background w-full max-w-2xl border border-border my-0 sm:my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Banner */}
        <div className="relative h-40 sm:h-52" style={{ backgroundColor: trip.colorFallback }}>
          {img && (
            <img
              src={img}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          )}
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-4 right-4 w-9 h-9 grid place-items-center bg-background/90 text-foreground hover:bg-background transition-colors text-lg leading-none"
          >
            ×
          </button>
          <div className="absolute bottom-4 left-6 text-4xl">{trip.emoji}</div>
        </div>

        <div className="p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4 mb-1">
            <h2 className="font-marcellus text-2xl text-foreground leading-snug">{trip.name}</h2>
            {trip.tag && (
              <span className="shrink-0 text-[10px] font-jost font-light tracking-label text-muted-foreground uppercase border border-border px-2 py-1 rounded-full">
                {trip.tag}
              </span>
            )}
          </div>
          <p className="text-[11px] font-jost font-light text-muted-foreground mb-4">
            {trip.location} · {trip.days} day{trip.days === 1 ? "" : "s"} · from {trip.origin}
          </p>

          {trip.tagline && (
            <p className="font-jost text-sm text-foreground/90 mb-4 leading-relaxed">{trip.tagline}</p>
          )}
          {trip.description && (
            <p className="font-jost font-light text-sm text-muted-foreground mb-6 leading-relaxed">
              {trip.description}
            </p>
          )}

          {/* Price + group size */}
          <div className="flex flex-wrap items-end gap-x-8 gap-y-3 border-y border-border py-4 mb-6">
            <div>
              <div className="text-[10px] font-jost font-light text-muted-foreground uppercase tracking-wide mb-0.5">
                From
              </div>
              <div className="font-marcellus text-2xl text-foreground">{fmtNGN(trip.priceFrom)}</div>
              <div className="text-[10px] font-jost font-light text-muted-foreground">per person</div>
            </div>
            <div>
              <div className="text-[10px] font-jost font-light text-muted-foreground uppercase tracking-wide mb-0.5">
                Squad size
              </div>
              <div className="font-jost text-sm text-foreground">
                {trip.groupMin}–{trip.groupMax} people
              </div>
            </div>
          </div>

          {trip.highlights.length > 0 && (
            <section className="mb-6">
              <h3 className="text-[10px] font-jost font-light tracking-label text-muted-foreground uppercase mb-3">
                Highlights
              </h3>
              <ul className="space-y-1.5">
                {trip.highlights.map((h, i) => (
                  <li key={i} className="flex gap-2 font-jost font-light text-sm text-foreground/90">
                    <span className="text-primary shrink-0">—</span>
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {trip.included.length > 0 && (
            <section className="mb-6">
              <h3 className="text-[10px] font-jost font-light tracking-label text-muted-foreground uppercase mb-3">
                What's included
              </h3>
              <ul className="grid sm:grid-cols-2 gap-1.5">
                {trip.included.map((item, i) => (
                  <li key={i} className="flex gap-2 font-jost font-light text-sm text-foreground/90">
                    <span className="text-primary shrink-0">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {trip.itinerary.length > 0 && (
            <section className="mb-6">
              <h3 className="text-[10px] font-jost font-light tracking-label text-muted-foreground uppercase mb-3">
                Day by day
              </h3>
              <ol className="space-y-4">
                {trip.itinerary.map((d) => (
                  <li key={d.day} className="border-l border-border pl-4">
                    <div className="font-jost text-sm font-medium text-foreground mb-1.5">
                      Day {d.day}
                      {d.title ? ` · ${d.title}` : ""}
                    </div>
                    <ul className="space-y-1">
                      {d.activities.map((a, i) => (
                        <li key={i} className="flex gap-3 text-[13px] font-jost font-light">
                          <span className="text-muted-foreground tabular-nums shrink-0 w-11">{a.time}</span>
                          <span className="text-foreground/90">
                            {a.activity}
                            {a.details && (
                              <span className="text-muted-foreground"> — {a.details}</span>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {trip.notes && (
            <p className="font-jost font-light text-xs text-muted-foreground border border-border p-3 mb-6">
              Note: {trip.notes}
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <span className="flex-1 text-center border border-border px-6 py-3.5 font-jost font-light text-sm text-muted-foreground">
              Booking opens soon
            </span>
            <Link
              to="/start/trip"
              className="flex-1 text-center bg-forest text-parchment px-6 py-3.5 font-jost font-medium text-sm tracking-[0.06em] hover:bg-primary transition-colors"
            >
              Build a custom AI trip →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function Trips() {
  const [trips,    setTrips]    = useState<CuratedTrip[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [loadErr,  setLoadErr]  = useState("");
  const [selected, setSelected] = useState<CuratedTrip | null>(null);

  useEffect(() => {
    document.title = "Ready-made Trips · Karije";
  }, []);

  useEffect(() => {
    let live = true;
    api.getCuratedTrips()
      .then((d) => { if (live) setTrips(d.trips ?? []); })
      .catch((e) => { if (live) setLoadErr(e instanceof Error ? e.message : "Could not load trips."); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, []);

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="pt-8 pb-6 border-b border-border">
        <div className="mx-auto max-w-6xl px-6 flex items-center justify-between">
          <Link to="/">
            <KarijeLogo />
          </Link>
          <Link
            to="/login"
            className="text-xs font-jost font-light text-muted-foreground hover:text-foreground transition-colors"
          >
            Log in →
          </Link>
        </div>
      </header>

      {/* Hero */}
      <div className="mx-auto max-w-6xl px-6 pt-14 pb-10">
        <div className="flex items-center gap-4 mb-6">
          <span className="h-px w-8 bg-primary" />
          <span className="text-[10px] font-jost font-light tracking-label text-muted-foreground uppercase">
            Ready-made trips
          </span>
        </div>

        <div className="max-w-2xl">
          <h1 className="font-marcellus text-4xl md:text-5xl text-foreground leading-[1.1] mb-4">
            Curated trips.
            <br />
            <span className="text-primary">Zero planning.</span>
          </h1>
          <p className="font-jost font-light text-base text-muted-foreground leading-relaxed mb-6">
            Expertly built itineraries across Nigeria — hotel, transport, and activities already locked in.
            Pick your squad size, pick your dates, and go.
          </p>
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-4 py-2 text-sm font-jost font-medium">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            {trips.length > 0
              ? `${trips.length} trip${trips.length === 1 ? "" : "s"} live — booking opens soon`
              : "Launching soon — full catalog coming Q3 2026"}
          </div>
        </div>
      </div>

      {/* Trip grid */}
      <div className="mx-auto max-w-6xl px-6 pb-24">
        {loading && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="border border-border p-6 animate-pulse">
                <div className="h-8 w-8 bg-secondary mb-4" />
                <div className="h-5 bg-secondary mb-2" />
                <div className="h-3 w-2/3 bg-secondary mb-8" />
                <div className="h-6 w-1/2 bg-secondary" />
              </div>
            ))}
          </div>
        )}

        {!loading && loadErr && (
          <div className="border border-border p-10 text-center">
            <p className="font-jost font-light text-sm text-muted-foreground">
              Couldn't load trips right now. {loadErr}
            </p>
          </div>
        )}

        {!loading && !loadErr && trips.length === 0 && (
          <div className="border border-border p-14 text-center">
            <div className="text-3xl mb-4">🧳</div>
            <h2 className="font-marcellus text-xl text-foreground mb-2">
              No trips published yet
            </h2>
            <p className="font-jost font-light text-sm text-muted-foreground max-w-md mx-auto">
              We're curating the first batch now. In the meantime, the AI planner will build you a
              custom itinerary for any city in Nigeria.
            </p>
          </div>
        )}

        {!loading && trips.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {trips.map((trip) => {
              const img = tripImage(trip.imageId);
              return (
                <button
                  key={trip.id}
                  onClick={() => setSelected(trip)}
                  className="group text-left border border-border hover:border-primary/40 transition-colors relative overflow-hidden flex flex-col"
                >
                  {/* Colour accent bar */}
                  <div
                    className="absolute top-0 left-0 right-0 h-1 z-10"
                    style={{ backgroundColor: trip.colorFallback }}
                  />

                  {img && (
                    <div className="h-36 overflow-hidden" style={{ backgroundColor: trip.colorFallback }}>
                      <img
                        src={img}
                        alt=""
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    </div>
                  )}

                  <div className="p-6 flex flex-col flex-1">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="text-3xl">{trip.emoji}</div>
                      {trip.tag && (
                        <span className="text-[10px] font-jost font-light tracking-label text-muted-foreground uppercase border border-border px-2 py-1 rounded-full">
                          {trip.tag}
                        </span>
                      )}
                    </div>

                    <h2 className="font-marcellus text-xl text-foreground mb-1 leading-snug">
                      {trip.name}
                    </h2>
                    <p className="text-[11px] font-jost font-light text-muted-foreground mb-5">
                      {trip.location}
                    </p>

                    <div className="flex items-end justify-between border-t border-border/60 pt-4 mt-auto">
                      <div>
                        <div className="text-[10px] font-jost font-light text-muted-foreground uppercase tracking-wide mb-0.5">
                          From
                        </div>
                        <div className="font-marcellus text-xl text-foreground">
                          {fmtNGN(trip.priceFrom)}
                        </div>
                        <div className="text-[10px] font-jost font-light text-muted-foreground">
                          per person · {trip.days} day{trip.days === 1 ? "" : "s"}
                        </div>
                      </div>
                      <span className="text-xs font-jost font-medium text-muted-foreground border border-border px-3 py-2 group-hover:border-primary group-hover:text-primary transition-colors">
                        View trip
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Waitlist nudge */}
        <div className="mt-14 border border-border p-10 text-center">
          <div className="max-w-xl mx-auto">
            <div className="flex items-center justify-center gap-4 mb-5">
              <span className="h-px flex-1 bg-border" />
              <span className="text-[10px] font-jost font-light tracking-label text-muted-foreground uppercase">
                Meanwhile
              </span>
              <span className="h-px flex-1 bg-border" />
            </div>
            <h3 className="font-marcellus text-2xl text-foreground mb-2">
              Can't wait? Use AI instead.
            </h3>
            <p className="font-jost font-light text-sm text-muted-foreground mb-6 leading-relaxed">
              Our AI trip planner builds a custom itinerary for your squad in under 30 seconds —
              transport, hotel, and a full day-by-day plan for any city in Nigeria.
            </p>
            <Link
              to="/start/trip"
              className="inline-flex items-center gap-2 bg-forest text-parchment px-6 py-3.5 font-jost font-medium text-sm tracking-[0.06em] hover:bg-primary transition-colors"
            >
              Build a custom AI trip →
            </Link>
          </div>
        </div>
      </div>

      {selected && <TripDetail trip={selected} onClose={() => setSelected(null)} />}

      <Footer />
    </main>
  );
}
