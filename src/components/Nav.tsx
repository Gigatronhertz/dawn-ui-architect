import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";

// ── Karije identity — traced artwork from the brand guide ─────────────────
// The display lettering is vector artwork, not a typeface: never re-set in a
// font, never stretched. The A is a plane pointing up; the drum closes the
// word. Both marks inherit their colour from the parent via currentColor, so
// they invert correctly on ink panels without a second copy of the artwork.

/** The mark on its own — the plane-A. Clearspace = the height of the A. */
const MARK_VIEWBOX = "215 0 242 451";
const MARK_PATH =
  "M334.2 0.0L339.7 2.7L347.8 40.8L399.5 195.7L402.2 217.4L407.6 225.5L407.6 236.4L429.3 304.3L429.3 317.9L434.8 326.1L434.8 345.1L459.2 442.9L459.2 453.8L434.8 453.8L429.3 445.7L423.9 445.7L418.5 437.5L404.9 432.1L396.7 421.2L383.2 415.8L377.7 407.6L372.3 407.6L366.8 399.5L361.4 399.5L337.0 380.4L331.5 377.7L328.8 383.2L323.4 383.2L317.9 391.3L312.5 391.3L307.1 399.5L301.6 399.5L296.2 407.6L290.8 407.6L285.3 415.8L279.9 415.8L274.5 423.9L269.0 423.9L233.7 453.8L214.7 453.8L266.3 228.3L271.7 220.1L301.6 100.5Z";

/** The stacked wordmark: KARI over JE, drum as the dot. */
const WORDMARK_VIEWBOX = "0 0 908 995";
const WORDMARK_PATH =
  "M334.2 0.0L339.7 2.7L347.8 40.8L399.5 195.7L402.2 217.4L407.6 225.5L407.6 236.4L429.3 304.3L429.3 317.9L434.8 326.1L434.8 345.1L459.2 442.9L459.2 453.8L434.8 453.8L429.3 445.7L423.9 445.7L418.5 437.5L404.9 432.1L396.7 421.2L383.2 415.8L377.7 407.6L372.3 407.6L366.8 399.5L361.4 399.5L337.0 380.4L331.5 377.7L328.8 383.2L323.4 383.2L317.9 391.3L312.5 391.3L307.1 399.5L301.6 399.5L296.2 407.6L290.8 407.6L285.3 415.8L279.9 415.8L274.5 423.9L269.0 423.9L233.7 453.8L214.7 453.8L266.3 228.3L271.7 220.1L301.6 100.5Z M29.9 16.3L103.3 16.3L108.7 165.8L122.3 138.6L135.9 95.1L141.3 89.7L141.3 81.5L146.7 76.1L160.3 29.9L266.3 21.7L255.4 43.5L255.4 51.6L239.1 78.8L239.1 87.0L165.8 231.0L165.8 239.1L201.1 309.8L206.5 312.5L209.2 326.1L220.1 339.7L220.1 347.8L225.5 350.5L222.8 369.6L217.4 377.7L217.4 388.6L209.2 404.9L198.4 451.1L163.0 453.8L152.2 421.2L144.0 410.3L144.0 402.2L125.0 366.8L125.0 358.7L114.1 337.0L108.7 334.2L114.1 456.5L10.9 459.2L0.0 19.0Z M451.1 16.3L611.4 16.3L654.9 111.4L644.0 220.1L619.6 241.8L611.4 258.2L660.3 399.5L671.2 451.1L584.2 453.8L578.8 434.8L559.8 358.7L551.6 342.4L548.9 320.7L543.5 312.5L548.9 453.8L494.6 453.8L467.4 448.4L451.1 125.0Z M538.0 114.1L532.6 116.8L538.0 198.4L540.8 212.0L554.3 198.4L559.8 198.4L570.7 187.5L573.4 138.6L554.3 122.3L551.6 114.1Z M850.5 16.3L869.6 16.3L883.2 29.9L883.2 35.3L899.5 48.9L877.7 122.3L866.8 127.7L804.3 135.9L752.7 130.4L720.1 125.0L714.7 119.6L698.4 54.3L698.4 43.5L712.0 29.9L712.0 24.5L755.4 19.0Z M712.0 135.9L733.7 141.3L725.5 260.9L722.8 269.0L720.1 244.6Z M872.3 138.6L877.7 138.6L877.7 182.1L872.3 260.9L869.6 255.4L858.7 144.0Z M744.6 144.0L790.8 146.7L790.8 168.5L771.7 274.5L771.7 290.8L766.3 293.5Z M831.5 144.0L850.5 146.7L837.0 220.1L834.2 263.6L828.8 296.2L826.1 293.5L804.3 165.8L804.3 146.7Z M739.1 190.2L744.6 201.1L747.3 241.8L760.9 315.2L760.9 334.2L750.0 334.2L728.3 328.8Z M796.2 190.2L801.6 203.8L820.7 323.4L820.7 337.0L798.9 337.0L774.5 337.0Z M853.3 195.7L866.8 328.8L847.8 334.2L834.2 334.2L834.2 317.9Z M725.5 342.4L763.6 350.5L828.8 350.5L872.3 342.4L904.9 413.0L904.9 418.5L875.0 445.7L864.1 456.5L731.0 453.8L731.0 448.4L698.4 415.8Z M328.8 472.8L334.2 497.3L337.0 548.9L347.8 915.8L320.7 945.7L320.7 951.1L309.8 959.2L309.8 964.7L296.2 975.5L296.2 981.0L285.3 991.8L70.7 994.6L65.2 981.0L57.1 975.5L57.1 970.1L48.9 964.7L48.9 959.2L40.8 953.8L27.2 929.3L5.4 904.9L5.4 812.5L8.2 758.2L116.8 760.9L127.7 858.7L212.0 853.3L179.3 722.8L173.9 714.7L168.5 682.1L163.0 673.9L163.0 660.3L154.9 644.0L154.9 630.4L133.2 565.2L133.2 551.6L127.7 543.5L114.1 481.0Z M396.7 481.0L801.6 481.0L788.0 627.7L581.5 627.7L581.5 682.1L739.1 692.9L731.0 798.9L668.5 807.1L578.8 809.8L576.1 883.2L587.0 880.4L793.5 856.0L807.1 962.0L807.1 997.3L388.6 991.8L369.6 483.7Z";

export const KarijeMark = ({
  size = 28,
  color = "currentColor",
}: {
  size?: number;
  color?: string;
}) => (
  <svg
    viewBox={MARK_VIEWBOX}
    style={{ height: size, width: "auto", display: "block" }}
    fill={color}
    aria-hidden="true"
  >
    <path fillRule="evenodd" d={MARK_PATH} />
  </svg>
);

/** The wordmark on its own — no link, for hero and editorial use.
 *  Size it with a height class, e.g. "h-20 md:h-28 w-auto".
 *  `offset`: the bold hard-shadow "sticker" treatment used on the Hero
 *  search bar and the trust-section phone — a signal-yellow duplicate of
 *  the mark offset behind the real one. SVGs don't take a box-shadow, so
 *  this is a second copy, not a filter. */
export const KarijeWordmark = ({
  className = "h-20 w-auto text-logo",
  offset = false,
}: {
  className?: string;
  offset?: boolean;
}) => {
  const mark = (
    <svg
      viewBox={WORDMARK_VIEWBOX}
      className={className}
      fill="currentColor"
      role="img"
      aria-label="Karije"
    >
      <path fillRule="evenodd" d={WORDMARK_PATH} />
    </svg>
  );

  if (!offset) return mark;

  return (
    <span className="relative inline-block">
      <svg
        viewBox={WORDMARK_VIEWBOX}
        className={`${className} absolute top-1.5 left-1.5 text-signal dark:text-ink -z-10`}
        fill="currentColor"
        aria-hidden="true"
      >
        <path fillRule="evenodd" d={WORDMARK_PATH} />
      </svg>
      {mark}
    </span>
  );
};

export const KarijeLogo = ({
  size = "md",
  onClick,
  className = "text-logo",
}: {
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  /** Override when the logo sits on a surface that is not the page ground. */
  className?: string;
}) => {
  const height = size === "sm" ? 32 : size === "lg" ? 72 : 44;
  // Same hard-shadow "sticker" trick as KarijeWordmark's `offset`, scaled
  // down for nav-bar sizes — every KarijeLogo instance site-wide gets it,
  // not opt-in, since this is the one mark that appears everywhere.
  const shadowOffset = Math.max(2, Math.round(height * 0.045));

  return (
    <span className="relative inline-block">
      <svg
        viewBox={WORDMARK_VIEWBOX}
        style={{ height, width: "auto", display: "block", position: "absolute", top: shadowOffset, left: shadowOffset }}
        className="text-signal dark:text-ink -z-10"
        fill="currentColor"
        aria-hidden="true"
      >
        <path fillRule="evenodd" d={WORDMARK_PATH} />
      </svg>
      <Link
        to="/"
        onClick={onClick}
        className={`inline-block hover:opacity-80 transition-opacity ${className}`}
        style={{ textDecoration: "none" }}
        aria-label="Karije — home"
      >
        <svg
          viewBox={WORDMARK_VIEWBOX}
          style={{ height, width: "auto", display: "block" }}
          fill="currentColor"
          aria-hidden="true"
        >
          <path fillRule="evenodd" d={WORDMARK_PATH} />
        </svg>
      </Link>
    </span>
  );
};

// ── Nav links ──────────────────────────────────────────────────────────────
const navLinks = [
  { label: "Services",  href: "/#services" },
  { label: "Pricing",   href: "/pricing" },
  { label: "Pro Plan",  href: "/pro" },
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
                ? "glass border-[3px] border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] rounded-2xl"
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

              <ThemeToggle className="hidden md:grid" />

              {/* Primary CTA */}
              <Link
                to="/start"
                onClick={close}
                className="inline-flex items-center gap-2 bg-signal text-ink border-2 border-foreground px-5 py-2 text-[13px] font-jost font-bold tracking-[0.06em] shadow-[3px_3px_0_0_hsl(var(--foreground))] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_hsl(var(--foreground))] transition-transform rounded-full"
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
                className="md:hidden ml-1 w-9 h-9 flex items-center justify-center text-foreground hover:text-foreground/60 transition-colors"
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
        {/* Top strip — a spacer only. The fixed header sits above this panel
           at z-50 and already shows the logo and the close button; rendering a
           second KarijeLogo here stacked two offset copies on top of each
           other. Height matches the unscrolled header (16 + 10 + 44 + 10 + 16). */}
        <div className="h-24 shrink-0 border-b border-border" />

        {/* Tagline rule */}
        <div className="px-5 py-4 flex items-center gap-4">
          <span className="flex-1 h-px bg-primary" />
          <span className="text-[10px] font-jost font-light tracking-[0.08em] text-muted-foreground lowercase">
            we connect · we travel · we make memories
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
                className="flex items-center justify-between py-5 border-b border-border font-marcellus text-2xl text-foreground hover:text-foreground/60 transition-colors"
              >
                {l.label}
                <span className="text-foreground text-base">↗</span>
              </Link>
            ) : (
              <a
                key={l.href}
                href={l.href}
                onClick={close}
                className="flex items-center justify-between py-5 border-b border-border font-marcellus text-2xl text-foreground hover:text-foreground/60 transition-colors"
              >
                {l.label}
                <span className="text-foreground text-base">↗</span>
              </a>
            )
          )}

          {user ? (
            <>
              <Link
                to="/my-plans"
                onClick={close}
                className="flex items-center justify-between py-5 border-b border-border font-marcellus text-2xl text-foreground hover:text-foreground/60 transition-colors"
              >
                My Plans
                <span className="text-foreground text-base">↗</span>
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
              className="flex items-center justify-between py-5 border-b border-border font-marcellus text-2xl text-foreground hover:text-foreground/60 transition-colors"
            >
              Log in
              <span className="text-foreground text-base">↗</span>
            </Link>
          )}
        </nav>

        {/* Bottom CTA */}
        <div className="px-5 pb-12 pt-6 shrink-0">
          <div className="flex justify-end pb-3">
            <ThemeToggle />
          </div>
          <Link
            to="/start"
            onClick={close}
            className="w-full flex items-center justify-center gap-3 bg-signal text-ink px-6 py-4 font-jost font-medium tracking-[0.08em] hover:bg-ink hover:text-signal transition-colors"
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
