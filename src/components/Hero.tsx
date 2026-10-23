import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { HeroSearch } from "@/components/HeroSearch";
import { TRIP_CATEGORIES } from "@/lib/categories";
import { BrandIcon, CATEGORY_ICON_PATHS } from "@/lib/brandIcons";
import { HERO_PHOTO } from "@/lib/photos";

// ── Headline — "where are we going?" in four languages ─────────────────────
// Pidgin is the confirmed line. Yoruba, Igbo and Hausa are draft translations
// — UNVERIFIED by a native speaker. Confirm them before treating as final.
// Each splits into two lines: the first in white, the second in yellow.
const HEADLINES: { lang: string; l1: string; l2: string }[] = [
  { lang: "Pidgin", l1: "Where we",  l2: "dey go?" },
  { lang: "Yoruba", l1: "Nibo la",   l2: "n lo?" },        // UNVERIFIED
  { lang: "Igbo",   l1: "Ebee ka",   l2: "anyị na-aga?" }, // UNVERIFIED
  { lang: "Hausa",  l1: "Ina za",    l2: "mu je?" },       // UNVERIFIED
];
const ROTATE_MS = 3200;

export const Hero = () => {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setI((n) => (n + 1) % HEADLINES.length), ROTATE_MS);
    return () => clearInterval(id);
  }, []);

  const h = HEADLINES[i];

  return (
    <section className="kj-dark relative overflow-hidden bg-ink">
      <img
        src={HERO_PHOTO}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover object-[65%_center] select-none pointer-events-none"
      />
      <div aria-hidden="true" className="absolute inset-0 kj-scrim pointer-events-none" />
      <div aria-hidden="true" className="absolute inset-0 kj-scrim-left pointer-events-none" />

      <div className="relative w-full max-w-[1280px] mx-auto px-6 md:px-8 pt-28 md:pt-40 pb-8 md:pb-14 flex flex-col gap-6 md:gap-8">
        <div className="flex flex-col gap-4 md:gap-5 max-w-[640px]">
          <p className="kj-eyebrow">Group trips&ensp;/&ensp;Experiences&ensp;/&ensp;Community</p>

          {/* Rotating headline — keyed so each language replays the rise */}
          <h1
            aria-live="polite"
            className="text-[clamp(3rem,9vw,6.25rem)] leading-[0.98] min-h-[2em] flex flex-col"
          >
            <span key={`a${i}`} lang={h.lang.slice(0, 2).toLowerCase()} className="text-white animate-rise">{h.l1}</span>
            <span key={`b${i}`} className="text-signal animate-rise [animation-delay:90ms]">{h.l2}</span>
          </h1>

          <p className="text-base md:text-lg leading-relaxed text-white/85 max-w-[460px]">
            We handle the boring part — itinerary, hotels, chasing everyone for their share.{" "}
            <strong className="text-white font-semibold">Your squad just shows up.</strong>
          </p>
        </div>

        <HeroSearch />

        {/* Kinds of trip — straight into Explore, filtered */}
        <nav aria-label="Kinds of trip" className="flex gap-2.5 overflow-x-auto -mx-6 px-6 md:mx-0 md:px-0 pb-1 [scrollbar-width:none]">
          {TRIP_CATEGORIES.map((c) => (
            <Link
              key={c.value}
              to={c.value === "all" ? "/start/explore" : `/start/explore?category=${c.value}`}
              className={`shrink-0 w-[84px] md:w-[104px] h-[72px] md:h-[80px] rounded-[1.4rem] border flex flex-col items-center justify-center gap-1.5 text-[12px] md:text-[13px] font-medium transition-colors ${
                c.value === "all"
                  ? "border-signal text-white"
                  : "border-white/30 text-white/90 hover:border-signal"
              }`}
            >
              <BrandIcon d={CATEGORY_ICON_PATHS[c.value]} className="w-5 h-5 md:w-6 md:h-6 text-signal" strokeWidth={2} />
              {c.value === "all" ? "All" : c.label}
            </Link>
          ))}
        </nav>
      </div>
    </section>
  );
};
