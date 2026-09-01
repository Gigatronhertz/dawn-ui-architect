import { Link } from "react-router-dom";
import { KarijeWordmark } from "@/components/Nav";

// Verified Unsplash CDN photo IDs (full internal IDs)
// 1577900190299-7316c32fe85f : Aerial Enugu, Nigeria
// 1773146916270-e811bff4e923 : Friends on a beach
// 1761986758241-77549539536a : Four women with teal van
const CDN = {
  enugu:    "1577900190299-7316c32fe85f",
  beach:    "1773146916270-e811bff4e923",
  roadtrip: "1761986758241-77549539536a",
};

function img(id: string, w: number, h: number) {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;
}

export const Hero = () => (
  <section className="relative pt-24 pb-16 md:pt-36 md:pb-24 bg-hero-mesh overflow-hidden">
    <div className="relative mx-auto max-w-6xl px-6">

      {/* ── Eyebrow ─────────────────────────────────────────────────── */}
      <div className="animate-rise flex items-center gap-4 mb-10" style={{ animationDelay: "0.03s" }}>
        <span className="h-px w-10 bg-primary" />
        <span className="text-[11px] font-jost font-light tracking-label text-muted-foreground uppercase">
          Private beta · Lagos · Accra · Abuja · Dakar
        </span>
      </div>

      {/* ── Main grid ───────────────────────────────────────────────── */}
      <div className="grid md:grid-cols-[1.1fr,1fr] gap-10 lg:gap-16 items-start">

        {/* Left — copy ─────────────────────────────────────────────── */}
        <div>
          {/* Wordmark — the headline reads as its subtitle */}
          <KarijeWordmark className="animate-rise h-28 md:h-40 lg:h-48 w-auto text-logo mb-7" />

          {/* Headline */}
          <h1
            className="animate-rise font-marcellus text-4xl sm:text-5xl md:text-5xl lg:text-6xl leading-[1.08] text-foreground"
            style={{ animationDelay: "0.05s" }}
          >
            Group trips,
            <br />
            <span className="text-foreground">planned in minutes.</span>
          </h1>

          {/* Tagline rule */}
          <div
            className="animate-rise flex items-center gap-5 mt-6 mb-6"
            style={{ animationDelay: "0.1s" }}
          >
            <span className="h-px flex-1 bg-border" />
            <span className="text-[10px] font-jost font-light tracking-[0.08em] text-muted-foreground lowercase">
              we connect · we travel · we make memories
            </span>
            <span className="h-px w-8 bg-primary" />
          </div>

          {/* Subtitle */}
          <p
            className="animate-rise font-jost font-light text-base md:text-lg text-muted-foreground leading-relaxed max-w-md"
            style={{ animationDelay: "0.12s" }}
          >
            From the first idea to the last contribution paid —
            Karije handles the itinerary, hotels, WhatsApp updates,
            and squad money.{" "}
            <span className="text-foreground font-medium">
              Your squad just shows up.
            </span>
          </p>

          {/* CTAs */}
          <div
            className="animate-rise mt-8 flex flex-col sm:flex-row gap-3"
            style={{ animationDelay: "0.18s" }}
          >
            <Link
              to="/start"
              className="inline-flex items-center justify-center gap-2.5 bg-signal text-ink px-7 py-3.5 text-sm font-jost font-medium tracking-[0.08em] shadow-glow hover:bg-ink hover:text-signal transition-colors"
            >
              Plan a trip
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
            </Link>
            <a
              href="#agencies"
              className="inline-flex items-center justify-center gap-2 border border-border text-foreground px-7 py-3.5 text-sm font-jost font-light tracking-[0.06em] hover:border-primary hover:text-foreground/60 transition-colors"
            >
              For agencies
            </a>
          </div>

          {/* Social proof */}
          <p
            className="animate-rise mt-6 text-[11px] font-jost font-light tracking-[0.06em] text-muted-foreground"
            style={{ animationDelay: "0.24s" }}
          >
            47 squads in beta · ₦12M+ collected · No app download
          </p>
        </div>

        {/* Right — photo collage (desktop only) ───────────────────── */}
        <div
          className="hidden md:grid grid-cols-2 gap-2"
          style={{ height: "420px" }}
        >
          {/* Tall left — Enugu aerial */}
          <div
            className="overflow-hidden relative group"
            style={{ gridRow: "span 2" }}
          >
            <img
              src={img(CDN.enugu, 500, 840)}
              alt="Aerial view of Enugu, Nigeria"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
              loading="eager"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-forest/60 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4 text-parchment">
              <div className="text-[9px] font-jost font-light tracking-label uppercase opacity-80 mb-0.5">
                Nigeria
              </div>
              <div className="font-marcellus text-sm">Enugu, Coal City</div>
            </div>
          </div>

          {/* Top right — beach */}
          <div className="overflow-hidden relative group">
            <img
              src={img(CDN.beach, 400, 270)}
              alt="Friends on a beach trip"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
              loading="eager"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-forest/50 via-transparent to-transparent" />
            <div className="absolute bottom-3 left-3 text-parchment font-marcellus text-xs">
              Beach Weekend
            </div>
          </div>

          {/* Bottom right — road trip */}
          <div className="overflow-hidden relative group">
            <img
              src={img(CDN.roadtrip, 400, 270)}
              alt="Friends on a road trip"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
              loading="eager"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-forest/50 via-transparent to-transparent" />
            <div className="absolute bottom-3 left-3 text-parchment font-marcellus text-xs">
              Road Trip
            </div>
          </div>
        </div>

        {/* Mobile — horizontal photo strip ────────────────────────── */}
        <div className="md:hidden -mx-6 overflow-x-auto flex gap-2.5 px-6 pb-2 snap-x snap-mandatory scrollbar-none">
          {[
            { id: CDN.enugu,    label: "Enugu, Nigeria" },
            { id: CDN.beach,    label: "Beach Weekend"  },
            { id: CDN.roadtrip, label: "Road Trip"      },
          ].map((p) => (
            <div
              key={p.id}
              className="flex-none w-52 h-36 overflow-hidden relative snap-start"
            >
              <img
                src={img(p.id, 350, 250)}
                alt={p.label}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-forest/55 via-transparent to-transparent" />
              <div className="absolute bottom-2.5 left-3 text-parchment font-marcellus text-xs">
                {p.label}
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  </section>
);
