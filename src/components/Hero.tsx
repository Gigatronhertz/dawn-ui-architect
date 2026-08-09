import { Link } from "react-router-dom";

// Curated Unsplash photos — all free to use under the Unsplash License
// OxesnxkySD0: Aerial view of Enugu, Nigeria (shot in Nigeria)
// t_XeExafoSM: Group of friends on a sandy beach
// eTpb0CNJ91A: Friends hanging out in the city at night
const PHOTOS = {
  enugu:   "OxesnxkySD0",
  beach:   "t_XeExafoSM",
  friends: "eTpb0CNJ91A",
};

function img(id: string, w = 800, h = 600) {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;
}

export const Hero = () => {
  return (
    <section className="relative pt-28 pb-16 md:pt-36 md:pb-24 overflow-hidden bg-hero-mesh">
      {/* Soft background orbs */}
      <div className="pointer-events-none absolute -top-20 -left-20 w-80 h-80 rounded-full bg-primary/15 blur-3xl animate-float" />
      <div className="pointer-events-none absolute top-32 -right-20 w-80 h-80 rounded-full bg-accent/15 blur-3xl animate-float" style={{ animationDelay: "2s" }} />

      <div className="relative mx-auto max-w-6xl px-6">
        <div className="grid md:grid-cols-[1.1fr,1fr] gap-10 lg:gap-16 items-center">

          {/* ── Left: copy ── */}
          <div>
            {/* Beta badge */}
            <div className="animate-rise inline-flex items-center gap-2 rounded-full glass ring-hairline px-3 py-1.5 text-xs font-medium text-muted-foreground mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
              Now in private beta · Lagos · Accra · Dakar · Abidjan
            </div>

            {/* Headline */}
            <h1 className="animate-rise font-display text-5xl sm:text-6xl lg:text-7xl font-semibold leading-[1.02] tracking-tight">
              Group trips,
              <br />
              <span className="inline-block bg-gradient-primary px-4 py-1 rounded-2xl text-primary-foreground mt-1">
                planned in minutes.
              </span>
            </h1>

            {/* Subtitle */}
            <p
              className="animate-rise mt-7 text-lg text-muted-foreground leading-relaxed max-w-lg"
              style={{ animationDelay: "0.1s" }}
            >
              From the first idea to the last contribution paid — MySquadGo handles the
              itinerary, hotels, WhatsApp updates, and money.{" "}
              <span className="text-foreground font-medium">Your squad just shows up.</span>
            </p>

            {/* CTAs */}
            <div
              className="animate-rise mt-9 flex flex-col sm:flex-row gap-3"
              style={{ animationDelay: "0.2s" }}
            >
              <Link
                to="/start"
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-gradient-primary text-primary-foreground px-7 py-4 text-[15px] font-medium shadow-glow hover:scale-[1.02] active:scale-[0.98] transition-transform"
              >
                Plan a trip
                <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </Link>
              <a
                href="#agencies"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-card ring-hairline px-7 py-4 text-[15px] font-medium text-foreground hover:bg-secondary transition-colors"
              >
                For agencies →
              </a>
            </div>

            {/* Social proof */}
            <p
              className="animate-rise mt-6 text-xs text-muted-foreground"
              style={{ animationDelay: "0.3s" }}
            >
              47 squads in beta · ₦12M+ collected · No app download needed
            </p>
          </div>

          {/* ── Right: photo collage (desktop only) ── */}
          <div className="hidden md:grid grid-cols-2 gap-3" style={{ height: "440px" }}>
            {/* Tall left photo — Enugu aerial */}
            <div className="row-span-2 rounded-3xl overflow-hidden relative group" style={{ gridRow: "span 2" }}>
              <img
                src={img(PHOTOS.enugu, 600, 880)}
                alt="Aerial view of Enugu, Nigeria"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 text-white">
                <div className="text-xs font-semibold uppercase tracking-wider opacity-80">Nigeria</div>
                <div className="font-display font-semibold text-sm mt-0.5">Enugu, Coal City</div>
              </div>
            </div>

            {/* Top-right photo — beach squad */}
            <div className="rounded-3xl overflow-hidden relative group">
              <img
                src={img(PHOTOS.beach, 500, 300)}
                alt="Friends on a beach trip"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              <div className="absolute bottom-3 left-3 text-white">
                <div className="font-semibold text-xs">Beach Weekend</div>
              </div>
            </div>

            {/* Bottom-right photo — city friends */}
            <div className="rounded-3xl overflow-hidden relative group">
              <img
                src={img(PHOTOS.friends, 500, 300)}
                alt="Squad enjoying city nightlife"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              <div className="absolute bottom-3 left-3 text-white">
                <div className="font-semibold text-xs">City Nights</div>
              </div>
            </div>
          </div>

          {/* ── Mobile: single photo strip ── */}
          <div className="md:hidden -mx-6 overflow-x-auto flex gap-3 px-6 pb-1 snap-x snap-mandatory">
            {[
              { id: PHOTOS.enugu,   label: "Enugu, Nigeria" },
              { id: PHOTOS.beach,   label: "Beach Weekend"  },
              { id: PHOTOS.friends, label: "City Nights"    },
            ].map((p) => (
              <div
                key={p.id}
                className="flex-none w-64 h-44 rounded-2xl overflow-hidden relative snap-start"
              >
                <img
                  src={img(p.id, 400, 300)}
                  alt={p.label}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                <div className="absolute bottom-3 left-3 text-white text-xs font-semibold">{p.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
