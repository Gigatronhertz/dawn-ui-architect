import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

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
  /** Override when the logo sits on a surface that is not the ink ground. */
  className?: string;
}) => {
  const height = size === "sm" ? 32 : size === "lg" ? 72 : 46;
  return (
    <Link
      to="/"
      onClick={onClick}
      className={`inline-block shrink-0 hover:opacity-80 transition-opacity ${className}`}
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
  );
};

/** Section eyebrow from the template: the plane-A mark and a tracked label. */
export const Eyebrow = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`flex items-center gap-3 ${className}`}>
    <span className="text-signal"><KarijeMark size={22} /></span>
    <span className="kj-eyebrow">{children}</span>
  </div>
);

// ── Nav links ──────────────────────────────────────────────────────────────
const navLinks = [
  { label: "Trips",          href: "/start/explore" },
  { label: "Build your own", href: "/start/explore?tab=own" },
  { label: "Events",         href: "/start/explore?tab=events" },
  { label: "Pricing",        href: "/pricing" },
  { label: "For agencies",   href: "/pro" },
];

const linkCls = "text-[13px] font-semibold tracking-[0.14em] uppercase text-paper hover:text-signal transition-colors";

// ── Main Nav ───────────────────────────────────────────────────────────────
export const Nav = () => {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <>
      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <header className="fixed top-0 inset-x-0 z-50 bg-ink border-b-[3px] border-signal">
        <div className="mx-auto max-w-[1280px] px-5 md:px-8 py-3.5 flex items-center gap-8">
          <KarijeLogo onClick={close} />

          {/* Centre links — desktop */}
          <nav className="hidden lg:flex flex-1 items-center justify-center gap-7">
            {navLinks.map((l) => (
              <Link key={l.href} to={l.href} className={linkCls}>{l.label}</Link>
            ))}
          </nav>

          {/* Right actions */}
          <div className="ml-auto lg:ml-0 flex items-center gap-5">
            {user ? (
              <>
                <Link to="/my-plans" className={`hidden lg:inline ${linkCls} text-muted-foreground`}>My plans</Link>
                <button onClick={signOut} className={`hidden lg:inline ${linkCls} text-muted-foreground`}>Log out</button>
              </>
            ) : (
              <Link to="/login" className={`hidden lg:inline ${linkCls} text-muted-foreground`}>Log in</Link>
            )}

            <Link to="/start" onClick={close} className="kj-btn text-[15px] px-5 py-3 hidden sm:inline-flex">
              Plan a trip →
            </Link>

            {/* Hamburger — below lg */}
            <button
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Close menu" : "Open menu"}
              className="lg:hidden w-10 h-10 flex items-center justify-center text-signal border-2 border-signal"
            >
              {open ? (
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12h18M3 6h18M3 18h18" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile full-screen menu ──────────────────────────────────── */}
      <div
        className={`fixed inset-0 z-40 lg:hidden flex flex-col bg-ink pt-[77px] transition-opacity duration-300 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <nav className="flex-1 overflow-y-auto px-5 pt-4">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              to={l.href}
              onClick={close}
              className="flex items-center justify-between py-5 border-b-2 border-line font-display text-3xl text-paper hover:text-signal transition-colors"
            >
              {l.label}
              <span className="text-signal text-xl">→</span>
            </Link>
          ))}
          {user ? (
            <>
              <Link
                to="/my-plans"
                onClick={close}
                className="flex items-center justify-between py-5 border-b-2 border-line font-display text-3xl text-paper hover:text-signal transition-colors"
              >
                My plans
                <span className="text-signal text-xl">→</span>
              </Link>
              <button
                onClick={() => { signOut(); close(); }}
                className="w-full text-left py-5 kj-label text-muted-foreground hover:text-paper transition-colors"
              >
                Log out
              </button>
            </>
          ) : (
            <Link
              to="/login"
              onClick={close}
              className="flex items-center justify-between py-5 border-b-2 border-line font-display text-3xl text-paper hover:text-signal transition-colors"
            >
              Log in
              <span className="text-signal text-xl">→</span>
            </Link>
          )}
        </nav>

        <div className="px-5 pb-12 pt-6 shrink-0">
          <Link to="/start" onClick={close} className="kj-btn w-full text-lg py-4">
            Plan a trip →
          </Link>
          <p className="text-center kj-label text-[11px] text-signal mt-5">
            We connect · We travel · We make memories
          </p>
        </div>
      </div>
    </>
  );
};
