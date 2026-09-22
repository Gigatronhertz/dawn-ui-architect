import { useState } from "react";
import { Link } from "react-router-dom";
import { KarijeWordmark } from "@/components/Nav";
import { HeroSearch } from "@/components/HeroSearch";

// ── Headline locale switcher ───────────────────────────────────────────────
// Pidgin is the confirmed line. Igbo and Yoruba are draft translations of
// "where are we going next?" — UNVERIFIED by a native speaker. Confirm both
// before treating this copy as final.
type Locale = "pidgin" | "igbo" | "yoruba";
const HEADLINES: Record<Locale, { tab: string; text: string }> = {
  pidgin: { tab: "Pidgin",  text: "Abeg, where we dey go next?" },
  igbo:   { tab: "Igbo",    text: "Ebee ka anyị na-aga?" },   // UNVERIFIED
  yoruba: { tab: "Yoruba",  text: "Nibo la n lo?" },           // UNVERIFIED
};

function img(id: string, w: number, h: number) {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;
}

export const Hero = () => {
  const [locale, setLocale] = useState<Locale>("pidgin");

  return (
  <section className="relative pt-24 pb-16 md:pt-36 md:pb-24 bg-hero-mesh overflow-hidden">
    {/* Beachfront sunset overlay — visible backdrop */}
    <img
      src={img("1507525428034-b723cf961d3e", 1600, 900)}
      alt=""
      aria-hidden="true"
      className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none select-none"
    />
    <div className="relative mx-auto max-w-6xl px-6">

      {/* ── Eyebrow ─────────────────────────────────────────────────── */}
      <div className="animate-rise flex items-center gap-4 mb-10" style={{ animationDelay: "0.03s" }}>
        <span className="h-px w-10 bg-primary" />
        <span className="text-[11px] font-jost font-light tracking-label text-muted-foreground uppercase">
          Private beta · Lagos · Accra · Abuja · Dakar
        </span>
      </div>

      {/* ── Main column — no photo collage, search replaces it ───────── */}
      <div className="flex flex-col items-center text-center max-w-3xl mx-auto">

        <div>
          {/* Wordmark — the headline reads as its subtitle */}
          <span className="animate-rise inline-block mb-7">
            <KarijeWordmark className="h-28 md:h-40 lg:h-48 w-auto text-logo" offset />
          </span>

          {/* Headline locale tabs */}
          <div
            className="animate-rise flex justify-center gap-2 mb-4"
            style={{ animationDelay: "0.03s" }}
          >
            {(Object.keys(HEADLINES) as Locale[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setLocale(key)}
                className={`text-[11px] font-jost font-semibold tracking-[0.08em] uppercase rounded-full px-3.5 py-1.5 transition-colors ${
                  locale === key
                    ? "bg-ink text-paper"
                    : "border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {HEADLINES[key].tab}
              </button>
            ))}
          </div>

          {/* Headline */}
          <h1
            className="animate-rise font-marcellus text-4xl sm:text-5xl md:text-5xl lg:text-6xl leading-[1.08] text-foreground"
            style={{ animationDelay: "0.05s" }}
          >
            {HEADLINES[locale].text}
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
            className="animate-rise font-jost font-light text-base md:text-lg text-muted-foreground leading-relaxed max-w-md mx-auto"
            style={{ animationDelay: "0.12s" }}
          >
            From the first idea to the last contribution paid —
            Karije handles the itinerary, hotels, email follow-ups,
            and squad money.{" "}
            <span className="text-foreground font-medium">
              Your squad just shows up.
            </span>
          </p>
        </div>

        {/* Search — replaces the old CTA buttons + photo collage */}
        <div className="mt-8 w-full flex justify-center">
          <HeroSearch />
        </div>

        <p
          className="animate-rise mt-5 text-xs font-jost font-light text-muted-foreground"
          style={{ animationDelay: "0.24s" }}
        >
          <Link to="/pro/login" className="hover:text-foreground transition-colors">For agencies</Link>
          <span className="mx-2">·</span>
          47 squads in beta · ₦12M+ collected · No app download
        </p>

      </div>
    </div>
  </section>
  );
};
