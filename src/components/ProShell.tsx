import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api, imageUrl, session, type AgentProfile } from "@/lib/api";

/**
 * The shell every signed-in Karije Pro page sits inside — sidebar, top bar,
 * and the mobile drawer.
 *
 * It lives here rather than in ProDashboard because the builder and the trip
 * detail page are the same product: an agency that clicks "New trip" should
 * not land somewhere that looks like a different app with a "← Dashboard"
 * link as its only way back. One shell, three pages, one set of navigation.
 */

// ── Icons ─────────────────────────────────────────────────────────────────────
// Small stroke icons, matching the "+" glyph style already used across this
// codebase — no icon library, just inline paths.

export const IconOverview = (p: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="9" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" />
    <rect x="3" y="16" width="7" height="5" rx="1.5" />
  </svg>
);
export const IconTrips = (p: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 21s7-6.2 7-11.2A7 7 0 0 0 5 9.8C5 14.8 12 21 12 21z" />
    <circle cx="12" cy="9.8" r="2.4" />
  </svg>
);
export const IconCompleted = (p: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="m8.5 12.5 2.4 2.4 4.6-5.4" />
  </svg>
);
export const IconTemplates = (p: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
    <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
    <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
    <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
  </svg>
);
export const IconSettings = (p: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 5 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.14.36.38.68.7.92.3.24.68.38 1.08.38H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);
const IconMenu = (p: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);
const IconLogout = (p: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
  </svg>
);
const IconBack = (p: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
);

export type ProNav = "overview" | "trips" | "completed" | "templates" | "settings";

/** The agent shape both /api/pro/me and /api/pro/dashboard return. */
export type ProAgent = AgentProfile & {
  agency_name: string;
  plan_type: string;
  service_fee: number;
  wa_number?: string;
};

const NAV: { id: ProNav; label: string; icon: (p: { className?: string }) => JSX.Element }[] = [
  { id: "overview",  label: "Overview",  icon: IconOverview  },
  { id: "trips",     label: "Trips",     icon: IconTrips     },
  { id: "completed", label: "Completed", icon: IconCompleted },
  { id: "templates", label: "Templates", icon: IconTemplates },
  { id: "settings",  label: "Settings",  icon: IconSettings  },
];

function SidebarContent({
  agent, active, tripCount, completedCount, templateCount, userEmail, onSignOut, onNavigate,
}: {
  agent: ProAgent | null;
  active: ProNav | null;
  tripCount?: number;
  completedCount?: number;
  templateCount?: number;
  userEmail: string;
  onSignOut: () => void;
  onNavigate: () => void;
}) {
  const agencyName = agent?.agency_name || "";
  const agencyLogo = imageUrl(agent?.logo_image_id ? `/api/trip-image/${agent.logo_image_id}` : null);
  const agentColor = agent?.color || "#6366f1";
  const planType   = agent?.plan_type || "starter";
  const initials   = agencyName.trim().split(/\s+/).filter(Boolean).map(w => w[0]).join("").slice(0, 2).toUpperCase() || "??";

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 h-16 flex items-center gap-3 border-b border-border shrink-0">
        <div
          className="w-9 h-9 rounded-xl grid place-items-center text-white font-display font-bold text-xs shrink-0 overflow-hidden"
          style={agencyLogo ? undefined : { backgroundColor: agentColor }}
        >
          {agencyLogo
            ? <img src={agencyLogo} alt={agencyName} className="w-full h-full object-contain" />
            : initials}
        </div>
        <div className="min-w-0">
          <div className="font-display font-semibold text-sm leading-tight truncate">{agencyName || "Your agency"}</div>
          <div className="text-[10px] text-muted-foreground capitalize">Karije Pro · {planType}</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV.map(({ id, label, icon: Icon }) => {
          const badge =
            id === "trips"     ? tripCount :
            id === "completed" ? completedCount :
            id === "templates" ? templateCount : undefined;
          return (
            <Link
              key={id}
              to={`/pro/dashboard?tab=${id}`}
              onClick={onNavigate}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                active === id
                  ? "bg-foreground text-background font-medium"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left">{label}</span>
              {badge ? (
                <span className={`text-[10px] font-semibold rounded-full px-1.5 py-0.5 ${
                  active === id ? "bg-background/20" : "bg-secondary"
                }`}>
                  {badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-border shrink-0 space-y-1">
        <Link
          to="/pro/setup"
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors truncate"
        >
          <span className="w-6 h-6 rounded-full bg-secondary grid place-items-center text-[10px] font-semibold shrink-0">
            {initials}
          </span>
          <span className="truncate">{userEmail}</span>
        </Link>
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
        >
          <IconLogout className="w-4 h-4 shrink-0" />
          Sign out
        </button>
      </div>
    </div>
  );
}

export default function ProShell({
  active, title, subtitle, actions, backTo, agent: agentProp,
  tripCount, completedCount, templateCount, children, contentClassName,
}: {
  /** Which sidebar item reads as current; null on pages that are not one of them. */
  active: ProNav | null;
  title: string;
  subtitle?: string;
  /** Buttons for the top-right of the bar. */
  actions?: ReactNode;
  /** Shows a back arrow beside the title when this page came from somewhere. */
  backTo?: string;
  /** Pages that already loaded the agency pass it in; others let the shell fetch it. */
  agent?: ProAgent | null;
  tripCount?: number;
  completedCount?: number;
  templateCount?: number;
  children: ReactNode;
  contentClassName?: string;
}) {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [fetched, setFetched] = useState<ProAgent | null>(null);

  // Only the pages that did not already load an agency pay for this call.
  useEffect(() => {
    if (agentProp || fetched) return;
    const token = session.get();
    if (!token) return;
    let live = true;
    api.getProMe(token)
      .then(d => { if (live) setFetched(d.agent); })
      .catch(() => { /* the shell still renders without branding */ });
    return () => { live = false; };
  }, [agentProp, fetched]);

  const agent = agentProp ?? fetched;

  const sidebar = (
    <SidebarContent
      agent={agent}
      active={active}
      tripCount={tripCount}
      completedCount={completedCount}
      templateCount={templateCount}
      userEmail={user?.email ?? ""}
      onSignOut={() => { signOut(); navigate("/"); }}
      onNavigate={() => setDrawerOpen(false)}
    />
  );

  return (
    <main className="min-h-screen bg-background flex">
      {/* Sidebar — persistent on desktop */}
      <aside className="hidden lg:block w-64 shrink-0 border-r border-border">
        <div className="sticky top-0 h-screen">{sidebar}</div>
      </aside>

      {/* Sidebar — slide-over drawer below lg */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <button aria-label="Close menu" onClick={() => setDrawerOpen(false)} className="absolute inset-0 bg-black/50" />
          <div className="relative w-64 bg-background border-r border-border">{sidebar}</div>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <header className="sticky top-0 z-30 bg-background/90 backdrop-blur border-b border-border">
          <div className="px-5 sm:px-8 h-16 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setDrawerOpen(true)}
                aria-label="Open menu"
                className="lg:hidden w-9 h-9 grid place-items-center rounded-lg hover:bg-secondary transition-colors shrink-0"
              >
                <IconMenu className="w-5 h-5" />
              </button>
              {backTo && (
                <Link
                  to={backTo}
                  aria-label="Back"
                  className="hidden lg:grid w-9 h-9 place-items-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors shrink-0"
                >
                  <IconBack className="w-4 h-4" />
                </Link>
              )}
              <div className="min-w-0">
                <h1 className="font-display text-lg sm:text-xl font-semibold truncate">{title}</h1>
                {subtitle && <p className="hidden sm:block text-xs text-muted-foreground truncate">{subtitle}</p>}
              </div>
            </div>
            {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
          </div>
        </header>

        <div className={contentClassName ?? "px-5 sm:px-8 py-6 sm:py-8 max-w-6xl"}>
          {children}
        </div>
      </div>
    </main>
  );
}
