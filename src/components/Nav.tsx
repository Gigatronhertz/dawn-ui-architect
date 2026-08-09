import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const navLinks = [
  { label: "Services", href: "#services" },
  { label: "Pro Plan", href: "#agencies" },
];

const Logo = ({ onClick }: { onClick?: () => void }) => (
  <Link to="/" onClick={onClick} className="flex items-center gap-2 font-display font-semibold text-base">
    <span className="grid place-items-center w-8 h-8 rounded-xl bg-gradient-primary text-primary-foreground shadow-soft shrink-0">
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l3 7 7 .8-5.3 4.7L18.5 22 12 18l-6.5 4 1.8-7.5L2 9.8 9 9z" />
      </svg>
    </span>
    <span>MySquadGo</span>
  </Link>
);

export const Nav = () => {
  const { user, signOut } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <>
      {/* ── Top bar ── */}
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${scrolled ? "py-2" : "py-4"}`}
      >
        <div className="mx-auto max-w-6xl px-4">
          <div
            className={`flex items-center justify-between rounded-full px-4 py-2.5 transition-all duration-500 ${
              scrolled ? "glass ring-hairline shadow-soft" : ""
            }`}
          >
            <Logo onClick={close} />

            {/* Centre links — desktop only */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground rounded-full transition-colors"
                >
                  {l.label}
                </a>
              ))}
            </nav>

            {/* Right actions */}
            <div className="flex items-center gap-1">
              {/* Desktop auth */}
              {user ? (
                <>
                  <Link
                    to="/my-plans"
                    className="hidden md:inline-flex px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground rounded-full transition-colors"
                  >
                    My Plans
                  </Link>
                  <button
                    onClick={signOut}
                    className="hidden md:inline-flex px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground rounded-full transition-colors"
                  >
                    Log out
                  </button>
                </>
              ) : (
                <Link
                  to="/my-plans"
                  className="hidden md:inline-flex px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground rounded-full transition-colors"
                >
                  Log in
                </Link>
              )}

              {/* Demo CTA — always visible */}
              <Link
                to="/start"
                onClick={close}
                className="inline-flex items-center gap-1.5 rounded-full bg-foreground text-background px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Demo
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </Link>

              {/* Hamburger — mobile only */}
              <button
                onClick={() => setOpen((v) => !v)}
                aria-label={open ? "Close menu" : "Open menu"}
                className="md:hidden ml-1 w-9 h-9 rounded-full flex items-center justify-center hover:bg-secondary transition-colors"
              >
                {open ? (
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12h18M3 6h18M3 18h18" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Mobile full-screen menu ── */}
      <div
        className={`fixed inset-0 z-40 md:hidden flex flex-col bg-background transition-all duration-300 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Top strip mirrors the header height */}
        <div className="h-16 shrink-0 flex items-center px-5">
          <Logo onClick={close} />
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto px-6 pt-4">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={close}
              className="flex items-center justify-between py-5 border-b border-border text-2xl font-display font-semibold hover:text-primary transition-colors"
            >
              {l.label}
              <span className="text-muted-foreground text-lg">↗</span>
            </a>
          ))}

          {user ? (
            <>
              <Link
                to="/my-plans"
                onClick={close}
                className="flex items-center justify-between py-5 border-b border-border text-2xl font-display font-semibold hover:text-primary transition-colors"
              >
                My Plans
                <span className="text-muted-foreground text-lg">↗</span>
              </Link>
              <button
                onClick={() => { signOut(); close(); }}
                className="w-full text-left py-4 mt-2 text-base text-muted-foreground hover:text-foreground transition-colors"
              >
                Log out
              </button>
            </>
          ) : (
            <Link
              to="/my-plans"
              onClick={close}
              className="flex items-center justify-between py-5 border-b border-border text-2xl font-display font-semibold hover:text-primary transition-colors"
            >
              Log in
              <span className="text-muted-foreground text-lg">↗</span>
            </Link>
          )}
        </nav>

        {/* Bottom CTA */}
        <div className="px-6 pb-12 pt-6 shrink-0">
          <Link
            to="/start"
            onClick={close}
            className="w-full flex items-center justify-center gap-2 rounded-full bg-gradient-primary text-primary-foreground px-6 py-4 text-base font-semibold shadow-glow hover:scale-[1.01] transition-transform"
          >
            Try the demo
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </Link>
          <p className="text-center text-xs text-muted-foreground mt-3">No sign-up needed · Takes 2 minutes</p>
        </div>
      </div>
    </>
  );
};
