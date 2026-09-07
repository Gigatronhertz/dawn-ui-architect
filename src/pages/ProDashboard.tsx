import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api, imageUrl, type DashboardData, type TripRow, type TripTemplate } from "@/lib/api";

const fmtNGN = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n);

/**
 * How a trip's status reads on the dashboard.
 *
 * `custom` is the status every agency-authored trip carries, and it had no
 * entry here at all — so the trips this dashboard exists to show rendered a
 * raw "custom" chip and an empty next-action cell. The voting statuses below
 * it belong to the retired group flow; nothing sets them any more, and they
 * stay only so an old row does not render a bare string.
 */
const STATUS_MAP: Record<string, { label: string; tone: "default" | "warn" | "good" | "brand" }> = {
  custom:         { label: "Collecting",     tone: "warn"    },
  intake:         { label: "Intake",         tone: "default" },
  generating:     { label: "AI Planning",    tone: "brand"   },
  plan_review:    { label: "Review",         tone: "brand"   },
  payment:        { label: "Collecting",     tone: "warn"    },
  active:         { label: "Active",         tone: "good"    },
  error:          { label: "Error",          tone: "default" },
  // Legacy — the group flow that no longer runs.
  awaiting_group: { label: "Awaiting squad", tone: "warn"    },
  voting_dates:   { label: "Voting Dates",   tone: "brand"   },
  voting_hotel:   { label: "Voting Hotel",   tone: "brand"   },
};

/** Unpaid people who actually joined — seats nobody claimed are not a chase. */
const unpaidOf = (t: TripRow) =>
  Math.max(0, Number(t.total_members ?? 0) - Number(t.paid_count ?? 0));

const chaseText = (t: TripRow) => {
  const n = unpaidOf(t);
  if (n > 0) return `${n} ${n === 1 ? "person has" : "people have"}n't paid`;
  return Number(t.total_members ?? 0) > 0 ? "Everyone has paid" : "Waiting for the first join";
};

const ACTION_MAP: Record<string, (t: TripRow) => string> = {
  custom:         chaseText,
  intake:         () => "Collecting trip details",
  generating:     () => "AI building the plan…",
  plan_review:    () => "Review plan → /start",
  payment:        chaseText,
  active:         () => "Confirmed — everyone paid",
  error:          () => "Something went wrong",
  // Legacy — the group flow that no longer runs.
  awaiting_group: chaseText,
  voting_dates:   () => "Legacy trip — group voting",
  voting_hotel:   () => "Legacy trip — group voting",
};

// ── Icons ─────────────────────────────────────────────────────────────────────
// Small stroke icons, matching the "+" glyph style already used elsewhere in
// this codebase — no icon library, just inline paths.

const IconTrips = (p: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 21s7-6.2 7-11.2A7 7 0 0 0 5 9.8C5 14.8 12 21 12 21z" />
    <circle cx="12" cy="9.8" r="2.4" />
  </svg>
);
const IconTemplates = (p: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={p.className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
    <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
    <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
    <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
  </svg>
);
const IconSettings = (p: { className?: string }) => (
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

// ── Sub-components ────────────────────────────────────────────────────────────

const Chip = ({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "warn" | "good" | "brand" }) => {
  const tones = {
    default: "bg-secondary text-muted-foreground",
    warn:    "bg-yellow-100 text-yellow-900 dark:bg-yellow-900/40 dark:text-yellow-300",
    good:    "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-300",
    brand:   "bg-primary/10 text-foreground",
  };
  const dots = {
    default: "bg-muted-foreground",
    warn:    "bg-yellow-500",
    good:    "bg-emerald-500",
    brand:   "bg-primary",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${tones[tone]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dots[tone]}`} />
      {children}
    </span>
  );
};

const KPI = ({ icon, label, value, sub, accent }: { icon: React.ReactNode; label: string; value: string; sub?: string; accent: string }) => (
  <div className="rounded-2xl bg-card ring-hairline p-5 flex items-start gap-4">
    <div className="w-10 h-10 rounded-xl grid place-items-center shrink-0" style={{ backgroundColor: `${accent}1a`, color: accent }}>
      {icon}
    </div>
    <div className="min-w-0">
      <div className="text-[11px] font-medium text-muted-foreground">{label}</div>
      <div className="font-display text-2xl font-semibold mt-0.5 tabular-nums truncate">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{sub}</div>}
    </div>
  </div>
);

/** A stable colour + initial for a trip's identity badge, derived from its id
 *  so the same trip always gets the same colour rather than one that shifts
 *  on every reload. */
const ROW_COLORS = ["#6366f1", "#ec4899", "#10b981", "#f59e0b", "#06b6d4", "#8b5cf6"];
function rowAccent(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return ROW_COLORS[h % ROW_COLORS.length];
}

/**
 * One trip, and the whole row opens its management page — who joined, who
 * paid, who still needs chasing. It used to open that page only for
 * agency-authored trips and drop everything else into an inline accordion
 * whose one action ("Send reminder via WhatsApp") was a div with no handler.
 * Every trip listed here now has a real page behind it.
 */
const TripRowItem = ({ trip }: { trip: TripRow }) => {
  const statusInfo = STATUS_MAP[trip.status] ?? { label: trip.status, tone: "default" as const };
  const actionText = ACTION_MAP[trip.status]?.(trip) ?? "";
  const denom = Number(trip.total_members ?? 0) || trip.squad_size || 0;
  const pct = denom ? Math.round((trip.paid_count / denom) * 100) : 0;
  const joined  = Number(trip.total_members ?? 0);
  const pending = unpaidOf(trip);
  const name = trip.title || trip.destination || "Unknown";
  const accent = rowAccent(trip.id);

  return (
    <Link
      to={`/pro/trips/${trip.id}`}
      target="_blank"
      rel="noopener"
      className="group grid grid-cols-12 gap-3 items-center px-5 py-3.5 text-left border-t border-border hover:bg-secondary/40 transition-colors"
    >
      <div className="col-span-4 flex items-center gap-3 min-w-0">
        <div
          className="w-8 h-8 rounded-lg grid place-items-center text-[11px] font-display font-bold text-white shrink-0"
          style={{ backgroundColor: accent }}
        >
          {name.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="text-xs font-semibold truncate">{name}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
            {trip.origin ? `${trip.origin} → ` : ""}{trip.destination}
            {trip.days ? ` · ${trip.days}d` : ""}
            {trip.total_collected > 0 ? ` · ${fmtNGN(trip.total_collected)}` : ""}
          </div>
        </div>
      </div>
      <div className="col-span-1">
        <Chip tone={statusInfo.tone}>{statusInfo.label}</Chip>
      </div>
      <div className="col-span-2 tabular-nums text-xs text-muted-foreground">
        {joined > 0 ? (
          <>
            <span className="text-foreground font-medium">{joined}</span> joined
            {pending > 0 && <span className="block text-[10px]">{pending} unpaid</span>}
          </>
        ) : trip.squad_size ? (
          `${trip.squad_size} seats`
        ) : "—"}
      </div>
      <div className="col-span-2">
        {trip.squad_size ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
              <div className="h-full bg-gradient-primary transition-all" style={{ width: `${pct}%` }} />
            </div>
            <span className="tabular-nums text-[10px] text-muted-foreground shrink-0">{trip.paid_count}/{denom || "—"}</span>
          </div>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        )}
      </div>
      <div className={`col-span-2 text-[11px] ${statusInfo.tone === "warn" ? "text-yellow-700 dark:text-yellow-400" : "text-muted-foreground"}`}>
        {actionText}
      </div>
      <div className="col-span-1 text-right text-[10px] font-medium text-muted-foreground group-hover:text-foreground transition-colors whitespace-nowrap">
        Manage →
      </div>
    </Link>
  );
};

// ── Sidebar shell ─────────────────────────────────────────────────────────────

type TabId = "trips" | "templates" | "settings";

function SidebarContent({
  agencyName, agencyLogo, agentColor, initials, planType, templateCount,
  activeTab, onSelectTab, userEmail, onSignOut,
}: {
  agencyName: string; agencyLogo: string | null; agentColor: string; initials: string; planType: string;
  templateCount: number; activeTab: TabId; onSelectTab: (t: TabId) => void; userEmail: string; onSignOut: () => void;
}) {
  const navItems: { id: TabId; label: string; icon: (p: { className?: string }) => JSX.Element; badge?: number }[] = [
    { id: "trips",     label: "Trips",     icon: IconTrips },
    { id: "templates", label: "Templates", icon: IconTemplates, badge: templateCount || undefined },
    { id: "settings",  label: "Settings",  icon: IconSettings },
  ];

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
        {navItems.map(({ id, label, icon: Icon, badge }) => (
          <button
            key={id}
            onClick={() => onSelectTab(id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
              activeTab === id
                ? "bg-foreground text-background font-medium"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="flex-1 text-left">{label}</span>
            {badge !== undefined && (
              <span className={`text-[10px] font-semibold rounded-full px-1.5 py-0.5 ${
                activeTab === id ? "bg-background/20" : "bg-secondary"
              }`}>
                {badge}
              </span>
            )}
          </button>
        ))}
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

const TAB_META: Record<TabId, { title: string; subtitle: string }> = {
  trips:     { title: "Trips",     subtitle: "Every trip you've built, and who still needs chasing." },
  templates: { title: "Templates", subtitle: "A shape you run again — the same stops, only the dates move." },
  settings:  { title: "Settings",  subtitle: "How your agency shows up to the squads you send this to." },
};

// ── Main page ─────────────────────────────────────────────────────────────────

const ProDashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut, getIdToken } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<TabId>("trips");
  const [templates, setTemplates] = useState<TripTemplate[]>([]);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const load = useCallback(async () => {
    const token = getIdToken();
    if (!token) return;
    setFetching(true);
    setError("");
    try {
      const d = await api.getProDashboard(token);
      setData(d);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not load dashboard.";
      // If no agency profile → redirect to setup
      if (msg.includes("No agency") || (err as { status?: number })?.status === 404) {
        navigate("/pro/setup");
        return;
      }
      setError(msg);
    } finally {
      setFetching(false);
    }
  }, [getIdToken, navigate]);

  // Templates load beside the dashboard rather than inside it: a failure here
  // is not a reason to show an error where the trips and the money are.
  const loadTemplates = useCallback(async () => {
    const token = getIdToken();
    if (!token) return;
    try {
      const d = await api.listTripTemplates(token);
      setTemplates(d.templates ?? []);
    } catch {
      setTemplates([]);
    }
  }, [getIdToken]);

  async function removeTemplate(t: TripTemplate) {
    const token = getIdToken();
    if (!token) return;
    const before = templates;
    setTemplates(prev => prev.filter(x => x.id !== t.id));
    try {
      await api.deleteTripTemplate(t.id, token);
    } catch {
      setTemplates(before); // put it back — the delete never landed
    }
  }

  useEffect(() => {
    document.title = "Pro Dashboard · Karije";
    if (!authLoading && !user) {
      navigate("/pro/setup");
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (user) { load(); loadTemplates(); }
  }, [user, load, loadTemplates]);

  // Close the mobile drawer whenever a tab is picked from inside it.
  const selectTab = (t: TabId) => { setActiveTab(t); setMobileNavOpen(false); };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (authLoading || (!data && !error && user)) {
    return (
      <main className="min-h-screen bg-background grid place-items-center">
        <div className="w-8 h-8 rounded-full border-2 border-foreground border-t-transparent animate-spin" />
      </main>
    );
  }

  if (!user) return null;

  const agent = data?.agent;
  const { summary, trips } = data ?? { summary: null, trips: [] };

  const agencyName  = agent?.agency_name || "";
  const agencyLogo  = imageUrl(agent?.logo_image_id ? `/api/trip-image/${agent.logo_image_id}` : null);
  const agentColor  = agent?.color || "#6366f1";
  const planType    = agent?.plan_type || "starter";
  const initials    = agencyName.trim().split(/\s+/).filter(Boolean).map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() || "??";

  const sidebarProps = {
    agencyName, agencyLogo, agentColor, initials, planType,
    templateCount: templates.length, activeTab, onSelectTab: selectTab,
    userEmail: user.email, onSignOut: () => { signOut(); navigate("/"); },
  };

  return (
    <main className="min-h-screen bg-background flex">
      {/* Sidebar — persistent on desktop */}
      <aside className="hidden lg:block w-64 shrink-0 border-r border-border">
        <div className="sticky top-0 h-screen">
          <SidebarContent {...sidebarProps} />
        </div>
      </aside>

      {/* Sidebar — slide-over drawer on mobile/tablet */}
      {mobileNavOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <button aria-label="Close menu" onClick={() => setMobileNavOpen(false)} className="absolute inset-0 bg-black/50" />
          <div className="relative w-64 bg-background border-r border-border">
            <SidebarContent {...sidebarProps} />
          </div>
        </div>
      )}

      {/* Main column */}
      <div className="flex-1 min-w-0">
        <header className="sticky top-0 z-30 bg-background/90 backdrop-blur border-b border-border">
          <div className="px-5 sm:px-8 h-16 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setMobileNavOpen(true)}
                aria-label="Open menu"
                className="lg:hidden w-9 h-9 grid place-items-center rounded-lg hover:bg-secondary transition-colors shrink-0"
              >
                <IconMenu className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <h1 className="font-display text-lg sm:text-xl font-semibold truncate">{TAB_META[activeTab].title}</h1>
                <p className="hidden sm:block text-xs text-muted-foreground truncate">{TAB_META[activeTab].subtitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {activeTab === "trips" && (
                <button
                  onClick={load}
                  disabled={fetching}
                  className="w-8 h-8 grid place-items-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-40"
                  title="Refresh"
                >
                  <svg viewBox="0 0 24 24" className={`w-4 h-4 ${fetching ? "animate-spin" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6" />
                  </svg>
                </button>
              )}
              <Link
                to="/pro/trips/new"
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm rounded-lg bg-foreground text-background px-3 sm:px-4 py-2 hover:opacity-90 transition-opacity font-medium"
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                <span className="hidden sm:inline">New trip</span>
              </Link>
            </div>
          </div>
        </header>

        <div className="px-5 sm:px-8 py-6 sm:py-8 max-w-6xl">

          {/* Error banner */}
          {error && (
            <div className="mb-6 rounded-2xl bg-destructive/10 ring-1 ring-destructive/20 px-5 py-4 flex items-center justify-between gap-4">
              <p className="text-sm text-destructive">{error}</p>
              <button onClick={load} className="text-xs underline text-muted-foreground shrink-0">Retry</button>
            </div>
          )}

          {/* Templates tab */}
          {activeTab === "templates" && (
            <div className="rounded-3xl bg-card ring-hairline overflow-hidden">
              {templates.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-secondary grid place-items-center mx-auto mb-4">
                    <IconTemplates className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <h3 className="font-display font-semibold text-lg mb-1">No templates yet</h3>
                  <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                    Build a trip and tick <span className="text-foreground font-medium">Save as a template</span> before
                    you create it. The next one starts from that shape instead of an empty day.
                  </p>
                  <Link
                    to="/pro/trips/new"
                    className="inline-flex items-center gap-2 rounded-lg bg-foreground text-background px-5 py-2.5 text-sm font-medium hover:opacity-90"
                  >
                    Build a trip →
                  </Link>
                </div>
              ) : (
                templates.map((t) => (
                  <div
                    key={t.id}
                    className="border-b border-border last:border-0 px-5 py-4 flex items-center justify-between gap-4 hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-secondary grid place-items-center shrink-0">
                        <IconTemplates className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">{t.name}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          {t.city ? `${t.city} · ` : ""}
                          {t.dayCount} day{t.dayCount === 1 ? "" : "s"}
                          {" · "}{fmtNGN(t.perPerson)}/person
                          {" · "}{t.squadSize} {t.squadSize === 1 ? "seat" : "seats"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {/* The builder hydrates from this id, so "run it again"
                          starts here rather than three clicks into the builder. */}
                      <Link
                        to={`/pro/trips/new?template=${t.id}`}
                        className="text-[11px] rounded-lg bg-foreground text-background px-3 py-1.5 font-medium hover:opacity-90 transition"
                      >
                        Start a trip from this →
                      </Link>
                      <button
                        onClick={() => removeTemplate(t)}
                        aria-label={`Delete the ${t.name} template`}
                        className="text-[11px] text-muted-foreground hover:text-destructive px-2 py-1.5 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Settings tab */}
          {activeTab === "settings" && agent && (
            <div className="max-w-xl">
              <div className="rounded-3xl bg-card ring-hairline p-6 space-y-4 text-sm">
                <div className="flex items-center gap-3 pb-4 border-b border-border">
                  <div
                    className="w-12 h-12 rounded-xl grid place-items-center text-white font-display font-bold text-base shrink-0 overflow-hidden"
                    style={agencyLogo ? undefined : { backgroundColor: agentColor }}
                  >
                    {agencyLogo
                      ? <img src={agencyLogo} alt={agencyName} className="w-full h-full object-contain" />
                      : initials}
                  </div>
                  <div>
                    <div className="font-semibold">{agencyName}</div>
                    {agent.tagline && <div className="text-xs text-muted-foreground">{agent.tagline}</div>}
                  </div>
                </div>
                {([
                  { label: "Email (login)",      value: user.email },
                  { label: "WhatsApp number",    value: agent.phone },
                  { label: "Client-facing WA",   value: agent.wa_number || agent.phone },
                  { label: "Service fee",         value: fmtNGN(agent.service_fee ?? 0) + " per trip" },
                  { label: "Plan",               value: "Karije Pro · ₦10,000/mo" },
                ] as { label: string; value: string }[]).map((r) => (
                  <div key={r.label} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{r.label}</span>
                    <span className="font-medium">{r.value}</span>
                  </div>
                ))}
                <div className="pt-4">
                  <Link
                    to="/pro/setup"
                    className="inline-flex rounded-lg bg-foreground text-background px-4 py-2 text-xs font-medium hover:opacity-90"
                  >
                    Edit settings →
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Trips tab */}
          {activeTab === "trips" && (
            <>
              {/* KPIs */}
              {summary && (
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                  <KPI
                    icon={<IconTrips className="w-5 h-5" />}
                    label="Active trips"
                    value={String(summary.active_trips)}
                    sub="unlimited on Pro"
                    accent="#6366f1"
                  />
                  <KPI
                    icon={
                      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    }
                    label="Trips completed"
                    value={String(summary.trips_completed)}
                    sub="all time"
                    accent="#10b981"
                  />
                  <KPI
                    icon={
                      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                      </svg>
                    }
                    label="Total collected"
                    value={summary.total_collected > 0 ? fmtNGN(summary.total_collected) : "₦0"}
                    sub={summary.revenue_mtd > 0 ? `${fmtNGN(summary.revenue_mtd)} this month` : "via Paystack"}
                    accent="#f59e0b"
                  />
                  <KPI
                    icon={
                      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" /><path d="M12 7v5l3 3" />
                      </svg>
                    }
                    label="Pending payments"
                    value={String(summary.pending_payments)}
                    sub={summary.pending_payments > 0 ? "needs a follow-up" : "all clear"}
                    accent={summary.pending_payments > 0 ? "#ef4444" : "#10b981"}
                  />
                </div>
              )}

              {/* Trips table */}
              <div className="rounded-3xl bg-card ring-hairline overflow-hidden">
                {fetching ? (
                  <div className="px-6 py-12 text-center">
                    <div className="w-6 h-6 rounded-full border-2 border-foreground border-t-transparent animate-spin mx-auto" />
                  </div>
                ) : trips.length === 0 ? (
                  <div className="px-6 py-16 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-secondary grid place-items-center mx-auto mb-4">
                      <IconTrips className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <h3 className="font-display font-semibold text-lg mb-1">No trips yet</h3>
                    <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                      Build a trip, share one link, and watch who joins and pays — all from here.
                    </p>
                    <Link
                      to="/pro/trips/new"
                      className="inline-flex items-center gap-2 rounded-lg bg-foreground text-background px-5 py-2.5 text-sm font-medium hover:opacity-90"
                    >
                      Build your first trip →
                    </Link>
                  </div>
                ) : (
                  // The 12-col grid below needs real room to breathe — on a
                  // narrow screen it would rather scroll sideways than
                  // squeeze every column into unreadable overlapping text.
                  <div className="overflow-x-auto">
                    <div className="min-w-[720px]">
                      <div className="grid grid-cols-12 gap-3 px-5 py-3 text-[10px] uppercase tracking-wider text-muted-foreground bg-secondary/40">
                        <div className="col-span-4">Trip</div>
                        <div className="col-span-1">Status</div>
                        <div className="col-span-2">Squad</div>
                        <div className="col-span-2">Payments</div>
                        <div className="col-span-2">Next action</div>
                        <div className="col-span-1" />
                      </div>
                      {trips.map((t) => (
                        <TripRowItem key={t.id} trip={t} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mt-4 text-center">
                Karije Pro — ₦10,000/month, unlimited trips.
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
};

export default ProDashboard;
