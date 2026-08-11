import { useEffect } from "react";
import { Link } from "react-router-dom";
import { KarijeLogo } from "@/components/Nav";
import { Footer } from "@/components/CTA";

const TEASER_TRIPS = [
  {
    id: "lekki-escape",
    name: "Lekki Weekend Escape",
    location: "Lagos · Lekki / Elegushi",
    days: 2,
    from: 28000,
    tag: "Beach & chill",
    emoji: "🏖️",
    color: "#B0682F",
  },
  {
    id: "abuja-retreat",
    name: "Abuja City & Nature Retreat",
    location: "Abuja · Gwagwalada / Aso Rock",
    days: 3,
    from: 45000,
    tag: "Culture & outdoors",
    emoji: "🏞️",
    color: "#2F4A33",
  },
  {
    id: "calabar-carnival",
    name: "Calabar Cultural Weekend",
    location: "Cross River · Calabar",
    days: 2,
    from: 38000,
    tag: "Festival & food",
    emoji: "🎭",
    color: "#6B4C2A",
  },
  {
    id: "jos-highlands",
    name: "Jos Highlands Getaway",
    location: "Plateau · Jos",
    days: 3,
    from: 41000,
    tag: "Scenery & hiking",
    emoji: "⛰️",
    color: "#374B44",
  },
  {
    id: "port-harcourt-creeks",
    name: "Port Harcourt Creek Tour",
    location: "Rivers · Port Harcourt",
    days: 2,
    from: 33000,
    tag: "Boat & nightlife",
    emoji: "⛵",
    color: "#1C3A4A",
  },
  {
    id: "obudu-ranch",
    name: "Obudu Ranch Experience",
    location: "Cross River · Obudu",
    days: 3,
    from: 55000,
    tag: "Adventure & wildlife",
    emoji: "🦅",
    color: "#3D2B1F",
  },
];

const fmtNGN = (n: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(n);

export default function Trips() {
  useEffect(() => {
    document.title = "Ready-made Trips · Karije";
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
            Launching soon — full catalog coming Q3 2026
          </div>
        </div>
      </div>

      {/* Trip grid — teaser cards */}
      <div className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {TEASER_TRIPS.map((trip) => (
            <div
              key={trip.id}
              className="group border border-border p-6 hover:border-primary/40 transition-colors relative overflow-hidden"
            >
              {/* Color accent bar */}
              <div
                className="absolute top-0 left-0 right-0 h-1"
                style={{ backgroundColor: trip.color }}
              />

              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="text-3xl">{trip.emoji}</div>
                <span className="text-[10px] font-jost font-light tracking-label text-muted-foreground uppercase border border-border px-2 py-1 rounded-full">
                  {trip.tag}
                </span>
              </div>

              <h2 className="font-marcellus text-xl text-foreground mb-1 leading-snug">
                {trip.name}
              </h2>
              <p className="text-[11px] font-jost font-light text-muted-foreground mb-5">
                {trip.location}
              </p>

              <div className="flex items-end justify-between border-t border-border/60 pt-4">
                <div>
                  <div className="text-[10px] font-jost font-light text-muted-foreground uppercase tracking-wide mb-0.5">
                    From
                  </div>
                  <div className="font-marcellus text-xl text-foreground">
                    {fmtNGN(trip.from)}
                  </div>
                  <div className="text-[10px] font-jost font-light text-muted-foreground">
                    per person · {trip.days} days
                  </div>
                </div>
                <span className="text-xs font-jost font-medium text-muted-foreground border border-border px-3 py-2 group-hover:border-primary group-hover:text-primary transition-colors">
                  Coming soon
                </span>
              </div>
            </div>
          ))}
        </div>

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

      <Footer />
    </main>
  );
}
