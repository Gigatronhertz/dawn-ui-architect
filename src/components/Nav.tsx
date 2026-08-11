import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

// ── Karije logo mark — the arrow glyph from the brand doc ─────────────────
// Constructed exactly as designed: K · arrow · RI · terracotta dot · JE
// with "LET US GO" tagline available as a prop.
export const KarijeMark = ({
  size = 28,
  color = "currentColor",
  dotColor = "#B0682F",
}: {
  size?: number;
  color?: string;
  dotColor?: string;
}) => (
  <svg
    viewBox="8 14 34 48"
    style={{ height: size, width: "auto", display: "block" }}
    aria-hidden="true"
  >
    <g transform="translate(8 60) rotate(-90)">
      <path d="M0 0 L46 17 L0 34 L12 17 Z" fill={color} />
    </g>
  </svg>
);

export const KarijeLogo = ({
  size = "md",
  onClick,
}: {
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
}) => {
  const textSize   = size === "sm" ? "text-xl"  : size === "lg" ? "text-4xl" : "text-2xl";
  const arrowH     = size === "sm" ? 18          : size === "lg" ? 34         : 22;
  const dotSize    = size === "sm" ? "w-[5px] h-[5px]" : size === "lg" ? "w-[10px] h-[10px]" : "w-[6px] h-[6px]";

  return (
    <Link
      to="/"
      onClick={onClick}
      className={`inline-flex items-center gap-0 font-marcellus ${textSize} text-forest tracking-logo`}
      style={{ textIndent: "0.2em", textDecoration: "none" }}
      aria-label="Karije — home"
    >
      <span>K</span>
      <KarijeMark size={arrowH} color="currentColor" />
      <span>RI</span>
      <span
        className={`${dotSize} rounded-full bg-primary inline-block mx-[0.12em] flex-shrink-0`}
        aria-hidden="true"
      />
      <span>JE</span>
    </Link>
  );
};

// ── Nav links ──────────────────────────────────────────────────────────────
const navLinks = [
  { label: "Services",  href: "/#services" },
  { label: "Pricing",   href: "/pricing" },
  { label: "Pro Plan",  href: "/#agencies" },
];

// ── Main Nav ───────────────────────────────────────────────────────────────
export const Nav = () => {
  const { user, signOut } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <>
      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
          scrolled ? "py-2" : "py-4"
        }`}
      >
        <div className="mx-auto max-w-6xl px-5">
          <div
            className={`flex items-center justify-between px-4 py-2.5 transition-all duration-500 ${
              scrolled
                ? "glass ring-hairline shadow-soft rounded-lg"
                : ""
            }`}
          >
            {/* Logo */}
            <KarijeLogo onClick={close} />

            {/* Centre links — desktop */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((l) =>
                l.href.startsWith("/") ? (
                  <Link
                    key={l.href}
                    to={l.href}
                    className="px-4 py-1.5 text-sm font-jost font-light tracking-[0.06em] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {l.label}
                  </Link>
                ) : (
                  <a
                    key={l.href}
                    href={l.href}
                    className="px-4 py-1.5 text-sm font-jost font-light tracking-[0.06em] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {l.label}
                  </a>
                )
              )}
            </nav>

            {/* Right actions */}
            <div className="flex items-center gap-2">
              {/* Auth — desktop */}
              {user ? (
                <>
                  <Link
                    to="/my-plans"
                    className="hidden md:inline-flex items-center px-4 py-1.5 text-sm font-jost font-light tracking-[0.06em] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    My Plans
                  </Link>
                  <button
                    onClick={signOut}
                    className="hidden md:inline-flex items-center px-4 py-1.5 text-sm font-jost font-light tracking-[0.06em] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Log out
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className="hidden md:inline-flex items-center px-4 py-1.5 text-sm font-jost font-light tracking-[0.06em] text-muted-foreground hover:text-foreground transition-colors"
                >
                  Log in
                </Link>
              )}

              {/* Primary CTA */}
              <Link
                to="/start"
                onClick={close}
                className="inline-flex items-center gap-2 bg-forest text-parchment px-5 py-2 text-[13px] font-jost font-medium tracking-[0.06em] hover:bg-primary transition-colors rounded-sm"
              >
                Plan a trip
                <svg
                  viewBox="0 0 24 24"
                  className="w-3.5 h-3.5 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </Link>

              {/* Hamburger — mobile */}
              <button
                onClick={() => setOpen((v) => !v)}
                aria-label={open ? "Close menu" : "Open menu"}
                className="md:hidden ml-1 w-9 h-9 flex items-center justify-center text-foreground hover:text-primary transition-colors"
              >
                {open ? (
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12h18M3 6h18M3 18h18" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Mobile full-screen menu ──────────────────────────────────── */}
      <div
        className={`fixed inset-0 z-40 md:hidden flex flex-col bg-background transition-all duration-300 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Top strip */}
        <div className="h-16 shrink-0 flex items-center px-5 border-b border-border">
          <KarijeLogo onClick={close} />
        </div>

        {/* Tagline rule */}
        <div className="px-5 py-4 flex items-center gap-4">
          <span className="flex-1 h-px bg-primary" />
          <span className="text-[10px] font-jost font-light tracking-label text-muted-foreground">
            LET US GO
          </span>
          <span className="flex-1 h-px bg-primary" />
        </div>

        {/* Links */}
        <nav className="flex-1 overflow-y-auto px-5 pt-2">
          {navLinks.map((l) =>
            l.href.startsWith("/") ? (
              <Link
                key={l.href}
                to={l.href}
                onClick={close}
                className="flex items-center justify-between py-5 border-b border-border font-marcellus text-2xl text-foreground hover:text-primary transition-colors"
              >
                {l.label}
                <span className="text-primary text-base">↗</span>
              </Link>
            ) : (
              <a
                key={l.href}
                href={l.href}
                onClick={close}
                className="flex items-center justify-between py-5 border-b border-border font-marcellus text-2xl text-foreground hover:text-primary transition-colors"
              >
                {l.label}
                <span className="text-primary text-base">↗</span>
              </a>
            )
          )}

          {user ? (
            <>
              <Link
                to="/my-plans"
                onClick={close}
                className="flex items-center justify-between py-5 border-b border-border font-marcellus text-2xl text-foreground hover:text-primary transition-colors"
              >
                My Plans
                <span className="text-primary text-base">↗</span>
              </Link>
              <button
                onClick={() => { signOut(); close(); }}
                className="w-full text-left py-4 mt-2 text-sm font-jost font-light tracking-[0.06em] text-muted-foreground hover:text-foreground transition-colors"
              >
                Log out
              </button>
            </>
          ) : (
            <Link
              to="/login"
              onClick={close}
              className="flex items-center justify-between py-5 border-b border-border font-marcellus text-2xl text-foreground hover:text-primary transition-colors"
            >
              Log in
              <span className="text-primary text-base">↗</span>
            </Link>
          )}
        </nav>

        {/* Bottom CTA */}
        <div className="px-5 pb-12 pt-6 shrink-0">
          <Link
            to="/start"
            onClick={close}
            className="w-full flex items-center justify-center gap-3 bg-forest text-parchment px-6 py-4 font-jost font-medium tracking-[0.08em] hover:bg-primary transition-colors"
          >
            <KarijeMark size={16} color="currentColor" />
            PLAN A TRIP
          </Link>
          <p className="text-center text-xs font-jost font-light tracking-[0.06em] text-muted-foreground mt-3">
            No sign-up needed · Takes 2 minutes
          </p>
        </div>
      </div>
    </>
  );
};
