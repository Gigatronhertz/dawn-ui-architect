import { Link } from "react-router-dom";

// Verified Unsplash CDN photo IDs (full internal IDs — free to use)
// 1577900190299-7316c32fe85f : Aerial view of Enugu, Nigeria
// 1773146916270-e811bff4e923 : Group of friends on a sandy beach
// 1761986758241-77549539536a : Four women in front of a teal adventure van
const CDN = {
  enugu:   "1577900190299-7316c32fe85f",
  beach:   "1773146916270-e811bff4e923",
  roadtrip:"1761986758241-77549539536a",
};

function img(id: string, w: number, h: number) {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;
}

export const Hero = () => {
  return (
    <section className="relative pt-24 pb-12 md:pt-32 md:pb-20 overflow-hidden bg-hero-mesh">
      {/* Soft background orbs */}
      <div className="pointer-events-none absolute -top-20 -left-20 w-72 h-72 rounded-full bg-primary/15 blur-3xl animate-float" />
      <div className="pointer-events-none absolute top-32 -right-20 w-72 h-72 rounded-full bg-accent/15 blur-3xl animate-float" style={{ animationDelay: "2s" }} />

      <div className="relative mx-auto max-w-6xl px-6">
        <div className="grid md:grid-cols-[1.1fr,1fr] gap-8 lg:gap-14 items-center">

          {/* ── Left: copy ── */}
          <div>
            {/* Beta badge */}
            <div className="animate-rise inline-flex items-center gap-2 rounded-full glass ring-hairline px-3 py-1.5 text-[11px] font-medium text-muted-foreground mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
              Private beta · Lagos · Accra · Dakar · Abidjan
            </div>

            {/* Headline — smaller on mobile */}
            <h1 className="animate-rise font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold leading-[1.05] tracking-tight">
              Group trips,
              <br />
              <span className="inline-block bg-gradient-primary px-3 py-0.5 rounded-xl text-primary-foreground mt-1">
                planned in minutes.
              </span>
            </h1>

            {/* Subtitle */}
            <p
              className="animate-rise mt-5 text-base md:text-lg text-muted-foreground leading-relaxed max-w-lg"
              style={{ animationDelay: "0.1s" }}
            >
              From the first idea to the last contribution paid — MySquadGo handles the
              itinerary, hotels, WhatsApp updates, and money.{" "}
              <span className="text-foreground font-medium">Your squad just shows up.</span>
            </p>

            {/* CTAs */}
            <div
              className="animate-rise mt-7 flex flex-col sm:flex-row gap-3"
              style={{ animationDelay: "0.2s" }}
            >
              <Link
                to="/start"
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-gradient-primary text-primary-foreground px-6 py-3.5 text-sm font-medium shadow-glow hover:scale-[1.02] active:scale-[0.98] transition-transform"
              >
                Plan a trip
                <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </Link>
              <a
                href="#agencies"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-card ring-hairline px-6 py-3.5 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
              >
                For agencies →
              </a>
            </div>

            {/* Stats */}
            <p
              className="animate-rise mt-5 text-xs text-muted-foreground"
              style={{ animationDelay: "0.3s" }}
            >
              47 squads in beta · ₦12M+ collected · No app download needed
            </p>
          </div>

          {/* ── Right: photo collage (desktop only) ── */}
          <div className="hidden md:grid grid-cols-2 gap-2.5" style={{ height: "400px" }}>
            {/* Left — tall Enugu aerial */}
            <div className="row-span-2 rounded-2xl overflow-hidden relative group" style={{ gridRow: "span 2" }}>
              <img
                src={img(CDN.enugu, 500, 800)}
                alt="Aerial view of Enugu, Nigeria"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
              <div className="absolute bottom-3 left-3 text-white">
                <div className="text-[10px] font-semibold uppercase tracking-wider opacity-80">Nigeria</div>
                <div className="font-display font-semibold text-sm mt-0.5">Enugu, Coal City</div>
              </div>
            </div>

            {/* Top-right — beach squad */}
            <div className="rounded-2xl overflow-hidden relative group">
              <img
                src={img(CDN.beach, 400, 260)}
                alt="Friends on a beach trip"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
              <div className="absolute bottom-2.5 left-3 text-white text-xs font-semibold">Beach Weekend</div>
            </div>

            {/* Bottom-right — road trip van */}
            <div className="rounded-2xl overflow-hidden relative group">
              <img
                src={img(CDN.roadtrip, 400, 260)}
                alt="Friends on a road trip adventure"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
              <div className="absolute bottom-2.5 left-3 text-white text-xs font-semibold">Road Trip</div>
            </div>
          </div>

          {/* ── Mobile: horizontal photo scroll ── */}
          <div className="md:hidden -mx-6 overflow-x-auto flex gap-3 px-6 pb-2 snap-x snap-mandatory scrollbar-none">
            {[
              { id: CDN.enugu,    label: "Enugu, Nigeria" },
              { id: CDN.beach,    label: "Beach Weekend"  },
              { id: CDN.roadtrip, label: "Road Trip"      },
            ].map((p) => (
              <div
                key={p.id}
                className="flex-none w-52 h-36 rounded-2xl overflow-hidden relative snap-start"
              >
                <img
                  src={img(p.id, 350, 250)}
                  alt={p.label}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                <div className="absolute bottom-2 left-3 text-white text-xs font-semibold">{p.label}</div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
};
