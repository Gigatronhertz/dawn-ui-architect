import { Link } from "react-router-dom";
import { WaitlistForm } from "@/components/WaitlistForm";
import { KarijeLogo } from "@/components/Nav";
import { TRIP_CATEGORIES } from "@/lib/categories";

export const CTA = () => (
  <section id="cta" className="py-28 md:py-36">
    <div className="mx-auto max-w-5xl px-6">
      <div className="relative overflow-hidden rounded-[2.5rem] bg-ink text-paper p-12 md:p-20 text-center">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/30 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-accent/30 blur-3xl" />

        <div className="relative">
          <h2 className="font-display text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05] text-signal">
            Your next squad trip
            <br />
            shouldn't take 3 weeks.
          </h2>
          <p className="mt-6 text-lg opacity-70 max-w-xl mx-auto">
            Plan it tonight. Send the WhatsApp link. Wake up to a confirmed trip.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm">
            <div className="flex items-center gap-2 opacity-70">
              <span className="w-1.5 h-1.5 rounded-full bg-whatsapp flex-shrink-0" />
              <span>47 squads in beta · ₦12M+ collected</span>
            </div>
            <p className="italic opacity-60 max-w-xs">"Sorted our Abuja trip in 4 minutes. Everyone paid before we boarded." — Tunde, Lagos</p>
          </div>

          <WaitlistForm source="cta_section" dark className="mt-8 max-w-md mx-auto" />
          <p className="mt-4 text-xs opacity-50">We only message once. Promise.</p>
        </div>
      </div>
    </div>
  </section>
);

export const Footer = () => (
  <footer className="border-t-[3px] border-signal">
    <div className="mx-auto max-w-[1280px] px-5 md:px-8 py-14 flex flex-col gap-10">
      <div className="flex flex-wrap items-center justify-between gap-7">
        <KarijeLogo size="lg" className="text-logo [&_svg]:!h-24 md:[&_svg]:!h-[120px]" />
        <div className="kj-label text-[15px] tracking-[0.24em] leading-loose text-signal md:text-right">
          We connect · We travel · We make memories
        </div>
      </div>

      {/* Category links — query-param deep links into Explore. Lagos-only
         for now: it's the one city with a full curated catalog. */}
      <div className="flex flex-wrap gap-x-6 gap-y-2 border-t-2 border-line pt-8">
        {TRIP_CATEGORIES.filter((c) => c.value !== "all").map((c) => (
          <Link
            key={c.value}
            to={`/start/explore?category=${c.value}`}
            className="text-sm text-muted-foreground hover:text-signal transition-colors"
          >
            {c.label} in Lagos
          </Link>
        ))}
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 text-sm text-faint">
        <p>© 2026 Karije. Made for West African squads.</p>
        <div className="flex gap-6 kj-label text-[12px]">
          <Link to="/privacy" className="hover:text-signal transition-colors">Privacy</Link>
          <Link to="/terms"   className="hover:text-signal transition-colors">Terms</Link>
          <a href="mailto:hello@karije.com" className="hover:text-signal transition-colors">Contact</a>
        </div>
      </div>
    </div>
  </footer>
);
