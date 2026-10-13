import { useEffect, useState } from "react";
import { HeroSearch } from "@/components/HeroSearch";

// ── Headline — "where are we going?" in four languages ─────────────────────
// Pidgin is the confirmed line. Yoruba, Igbo and Hausa are draft translations
// — UNVERIFIED by a native speaker. Confirm them before treating as final.
// Each splits into two lines: the first in yellow, the second on a yellow slab.
const HEADLINES: { lang: string; l1: string; l2: string }[] = [
  { lang: "Pidgin", l1: "Where we",  l2: "dey go?" },
  { lang: "Yoruba", l1: "Nibo la",   l2: "n lo?" },        // UNVERIFIED
  { lang: "Igbo",   l1: "Ebee ka",   l2: "anyị na-aga?" }, // UNVERIFIED
  { lang: "Hausa",  l1: "Ina za",    l2: "mu je?" },       // UNVERIFIED
];
const ROTATE_MS = 3200;

const HERO_PHOTO =
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1800&h=1100&q=80";

export const Hero = () => {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setI((n) => (n + 1) % HEADLINES.length), ROTATE_MS);
    return () => clearInterval(id);
  }, []);

  const h = HEADLINES[i];
  const big = "font-display leading-[0.92] text-[clamp(3.6rem,10vw,9.25rem)] origin-left";

  return (
    <section className="relative min-h-[600px] md:min-h-[760px] flex items-center overflow-hidden">
      {/* Photo — a beach at dusk — under a left-heavy ink gradient */}
      <img
        src={HERO_PHOTO}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(90deg, rgba(11,11,11,0.94) 0%, rgba(11,11,11,0.75) 55%, rgba(11,11,11,0.35) 100%)" }}
      />

      <div className="relative w-full max-w-[1280px] mx-auto px-5 md:px-8 pt-28 pb-16 md:pt-40 md:pb-28 flex flex-col gap-8 md:gap-9">
        {/* Rotating headline — keyed so each language replays the drop-in */}
        <h1 aria-live="polite" className="min-h-[clamp(130px,19vw,290px)] flex flex-col items-start gap-1.5 normal-case">
          <span key={`a${i}`} lang={h.lang.slice(0, 2).toLowerCase()} className={`${big} text-signal -rotate-2 kj-in-1`}>
            {h.l1}
          </span>
          <span
            key={`b${i}`}
            className={`${big} text-ink bg-signal px-[0.15em] pt-1 pb-2.5 rotate-1 kj-in-2`}
            style={{ clipPath: "polygon(0 6%,2% 0,98% 3%,100% 92%,97% 100%,1% 96%)" }}
          >
            {h.l2}
          </span>
        </h1>

        <p className="text-lg md:text-[22px] leading-relaxed text-[#E6E6E6] max-w-[560px]">
          We handle the boring part — itinerary, hotels, chasing everyone for their share.{" "}
          <strong className="text-signal font-bold">Your squad just shows up.</strong>
        </p>

        <HeroSearch />
      </div>
    </section>
  );
};
