import { useEffect } from "react";
import { Link } from "react-router-dom";
import { KarijeLogo } from "@/components/Nav";

export default function TripType() {
  useEffect(() => {
    document.title = "Plan a trip · Karije";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="relative pt-8 pb-6">
        <div className="mx-auto max-w-3xl px-6 flex items-center justify-between">
          <KarijeLogo />
          <Link
            to="/"
            className="text-xs font-jost font-light text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back home
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 pb-24">
        {/* Eyebrow */}
        <div className="flex items-center gap-4 mb-6">
          <span className="h-px w-8 bg-primary" />
          <span className="text-[10px] font-jost font-light tracking-label text-muted-foreground uppercase">
            New trip
          </span>
        </div>

        {/* Heading */}
        <h1 className="font-marcellus text-3xl md:text-4xl text-foreground mb-3 leading-snug">
          What kind of trip<br />are you planning?
        </h1>
        <p className="font-jost font-light text-base text-muted-foreground mb-12 max-w-md leading-relaxed">
          Karije handles both. Pick the type and we'll take it from there.
        </p>

        {/* Options — within-state first, interstate second (that's the lead pitch site-wide) */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* ── Intrastate ── */}
          <Link
            to="/start/explore"
            className="group bg-background border-[3px] border-foreground rounded-2xl p-8 flex flex-col gap-6 shadow-[5px_5px_0_0_hsl(var(--foreground))] hover:-translate-y-1 hover:shadow-[7px_7px_0_0_hsl(var(--foreground))] transition-transform"
          >
            {/* Icon */}
            <div className="w-12 h-12 rounded-lg bg-signal text-ink border-2 border-foreground grid place-items-center shrink-0">
              <svg
                viewBox="0 0 24 24"
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                <path d="M2 12h20" />
              </svg>
            </div>

            {/* Copy */}
            <div className="flex-1">
              <h2 className="font-marcellus text-xl text-foreground mb-2">
                Exploring within a state
              </h2>
              <p className="font-jost font-light text-sm text-muted-foreground leading-relaxed">
                Beach camping in Lagos. Canopy walks in Lekki. Day trips and
                local squad adventures — no flights, no hotels, just your people
                and a good time.
              </p>
            </div>

            {/* Example experiences */}
            <div className="flex flex-wrap gap-2">
              {["Beach camping", "Water park", "Canopy walk", "Street art tour"].map((eg) => (
                <span
                  key={eg}
                  className="text-[10px] font-jost font-semibold tracking-wide border-2 border-foreground rounded-full px-2.5 py-1 text-foreground"
                >
                  {eg}
                </span>
              ))}
            </div>

            {/* CTA hint */}
            <div className="flex items-center gap-2 text-sm font-jost font-medium text-foreground group-hover:gap-3 transition-all">
              Explore local experiences
              <svg
                viewBox="0 0 24 24"
                className="w-4 h-4 shrink-0"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          {/* ── Interstate ── */}
          <Link
            to="/start/trip"
            className="group bg-background border-[3px] border-foreground rounded-2xl p-8 flex flex-col gap-6 shadow-[5px_5px_0_0_hsl(var(--foreground))] hover:-translate-y-1 hover:shadow-[7px_7px_0_0_hsl(var(--foreground))] transition-transform"
          >
            {/* Icon */}
            <div className="w-12 h-12 rounded-lg bg-forest text-parchment border-2 border-foreground grid place-items-center shrink-0">
              <svg
                viewBox="0 0 24 24"
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 12h18M3 6h18M3 18h13" />
                <path d="M19 15l3 3-3 3" />
              </svg>
            </div>

            {/* Copy */}
            <div className="flex-1">
              <h2 className="font-marcellus text-xl text-foreground mb-2">
                Travelling between cities
              </h2>
              <p className="font-jost font-light text-sm text-muted-foreground leading-relaxed">
                Lagos to Calabar. Abuja to Enugu. Karije plans the transport,
                hotels, day activities, and squad payments — end to end.
              </p>
            </div>

            {/* Example routes */}
            <div className="flex flex-wrap gap-2">
              {["Lagos → Calabar", "Abuja → Enugu", "Ibadan → Port Harcourt"].map((eg) => (
                <span
                  key={eg}
                  className="text-[10px] font-jost font-semibold tracking-wide border-2 border-foreground rounded-full px-2.5 py-1 text-foreground"
                >
                  {eg}
                </span>
              ))}
            </div>

            {/* CTA hint */}
            <div className="flex items-center gap-2 text-sm font-jost font-medium text-foreground group-hover:gap-3 transition-all">
              Plan interstate trip
              <svg
                viewBox="0 0 24 24"
                className="w-4 h-4 shrink-0"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        </div>

        {/* Footer note */}
        <p className="mt-8 text-xs font-jost font-light text-muted-foreground text-center">
          No account needed · Free to plan
        </p>
      </div>
    </main>
  );
}
