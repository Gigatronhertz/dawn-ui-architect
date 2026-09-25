import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LayoutGrid, Compass, CheckCircle2, LayoutTemplate, Settings, Menu, LogOut, ArrowLeft } from "lucide-react";
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
// One icon language sitewide — lucide-react, same package shadcn's own
// primitives already pull in. Re-exported under these names so every
// existing call site (ProDashboard's KPI icons, empty states) stays put.
export const IconOverview = LayoutGrid;
export const IconTrips = Compass;
export const IconCompleted = CheckCircle2;
export const IconTemplates = LayoutTemplate;
export const IconSettings = Settings;
const IconMenu = Menu;
const IconLogout = LogOut;
const IconBack = ArrowLeft;

export type ProNav = "overview" | "trips" | "completed" | "templates" | "settings";

/** The agent shape both /api/pro/me and /api/pro/dashboard return. */
export type ProAgent = AgentProfile & {
  agency_name: string;
  plan_type: string;
  service_fee: number;
  wa_number?: string;
};

const NAV: { id: ProNav; label: string; icon: ComponentType<{ className?: string }> }[] = [
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
  const agentColor = agent?.color || "#0B0B0B";
  const planType   = agent?.plan_type || "starter";
  const initials   = agencyName.trim().split(/\s+/).filter(Boolean).map(w => w[0]).join("").slice(0, 2).toUpperCase() || "??";

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 h-16 flex items-center gap-3 border-b border-border shrink-0">
        <div
          className="w-9 h-9 rounded-xl border-2 border-foreground grid place-items-center text-white font-display font-bold text-xs shrink-0 overflow-hidden"
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
