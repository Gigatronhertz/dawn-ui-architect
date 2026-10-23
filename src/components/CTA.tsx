import { Link } from "react-router-dom";
import { KarijeLogo } from "@/components/Nav";
import { TRIP_CATEGORIES } from "@/lib/categories";

export const Footer = () => (
  <footer className="kj-dark bg-ink max-md:-mb-[4.5rem] max-md:pb-[4.5rem]">
    <div className="mx-auto max-w-[1280px] px-5 md:px-8 py-14 flex flex-col gap-10">
      <div className="flex flex-wrap items-center justify-between gap-7">
        <KarijeLogo size="lg" className="text-logo [&_svg]:!h-24 md:[&_svg]:!h-[120px]" />
        <p className="font-display text-2xl md:text-3xl text-white md:text-right leading-tight">
          We connect. We travel.<br />We make <span className="kj-hl">memories.</span>
        </p>
      </div>

      {/* Category links — query-param deep links into Explore. Lagos-only
         for now: it's the one city with a full curated catalog. */}
      <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-8">
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
        <div className="flex gap-6 text-sm">
          <Link to="/privacy" className="hover:text-signal transition-colors">Privacy</Link>
          <Link to="/terms"   className="hover:text-signal transition-colors">Terms</Link>
          <a href="mailto:hello@karije.com" className="hover:text-signal transition-colors">Contact</a>
        </div>
      </div>
    </div>
  </footer>
);
