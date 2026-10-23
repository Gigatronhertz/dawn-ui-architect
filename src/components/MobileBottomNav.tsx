import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Compass, Plus, ClipboardList, Tag } from "lucide-react";

/**
 * Persistent quick-link bar for mobile — the Chowdeck-style bottom tab bar
 * the top nav's full-screen hamburger doesn't cover (that's for the whole
 * site map; this is for the handful of places someone jumps to constantly).
 *
 * Hidden on /pro/* and /admin — both already have their own dedicated
 * mobile nav (ProShell's drawer, Admin's own header) and adding a second
 * fixed bar there would just fight it for space.
 */

const ITEMS = [
  { to: "/",               label: "Home",     icon: Home,          primary: false },
  { to: "/start/explore",  label: "Explore",  icon: Compass,       primary: false },
  { to: "/start",          label: "Plan",     icon: Plus,          primary: true  },
  { to: "/my-plans",       label: "My Plans", icon: ClipboardList, primary: false },
  { to: "/pricing",        label: "Pricing",  icon: Tag,           primary: false },
] as const;

const isActive = (pathname: string, to: string) =>
  to === "/" ? pathname === "/" : pathname.startsWith(to);

export const MobileBottomNav = () => {
  const { pathname } = useLocation();
  const hidden = pathname.startsWith("/pro") || pathname.startsWith("/admin");

  // Reserves scroll-space on the page beneath the fixed bar — toggled here
  // rather than per-page, since pages don't share one layout wrapper.
  useEffect(() => {
    document.body.classList.toggle("has-bottom-nav", !hidden);
    return () => { document.body.classList.remove("has-bottom-nav"); };
  }, [hidden]);

  if (hidden) return null;

  return (
    <nav
      aria-label="Quick links"
      className="kj-dark md:hidden fixed bottom-0 inset-x-0 z-40 bg-ink pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid grid-cols-5 items-center px-2 pt-2 pb-2">
        {ITEMS.map(({ to, label, icon: Icon, primary }) => {
          const active = isActive(pathname, to);
          if (primary) {
            return (
              <Link key={to} to={to} aria-label={label} className="flex flex-col items-center justify-center py-1">
                <span className="w-11 h-11 rounded-xl bg-signal text-ink grid place-items-center active:scale-95 transition-transform">
                  <Icon className="w-5 h-5" strokeWidth={2.5} />
                </span>
              </Link>
            );
          }
          return (
            <Link
              key={to}
              to={to}
              className={`flex flex-col items-center gap-1 py-1.5 transition-colors ${
                active ? "text-signal" : "text-muted-foreground hover:text-paper"
              }`}
            >
              <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
              <span className={`text-[11px] font-jost ${active ? "font-semibold" : "font-medium"}`}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
