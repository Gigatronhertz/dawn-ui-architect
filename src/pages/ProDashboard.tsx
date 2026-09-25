import { useEffect, useState, useCallback, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Wallet, Clock, Eye, Users, CreditCard, Trophy, RefreshCw, Plus, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api, imageUrl, type DashboardData, type TripRow, type TripTemplate } from "@/lib/api";
import ProShell, { IconOverview, IconTrips, IconCompleted, IconTemplates, type ProNav } from "@/components/ProShell";

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

/** Fixed, sensible order for the status filter pills — not alphabetical, not
 *  discovery order, so the list doesn't reshuffle as trips change status. */
const STATUS_ORDER = [
  "generating", "plan_review", "intake", "custom", "payment",
  "awaiting_group", "voting_dates", "voting_hotel", "active", "error",
];

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

/** "3d ago" / "2mo ago" — coarse on purpose, this labels a trip that's
 *  already done, not something anyone needs to the minute. */
function timeAgo(unixSeconds: number): string {
  const days = Math.floor((Date.now() / 1000 - unixSeconds) / 86400);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

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
    <span className={`inline-flex items-center gap-1.5 rounded-full border border-foreground/70 px-2 py-0.5 text-[10px] font-semibold ${tones[tone]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dots[tone]}`} />
      {children}
    </span>
  );
};

/** `solid` fills the icon well with the accent instead of a 10% tint — used
 *  only for the signal-yellow headline tile, since signal reads as a fill,
 *  never as type or a stroke (see tailwind.config.ts's brand-color comment;
 *  a yellow glyph on a pale-yellow tint fails contrast the same way a
 *  yellow KPI value once did). */
const KPI = ({ icon, label, value, sub, accent, solid }: { icon: React.ReactNode; label: string; value: string; sub?: string; accent: string; solid?: boolean }) => (
  <div className="rounded-2xl border-[3px] border-foreground shadow-[3px_3px_0_0_hsl(var(--foreground))] bg-card p-5 flex items-start gap-4">
    <div
      className="w-10 h-10 rounded-xl grid place-items-center shrink-0"
      style={solid ? { backgroundColor: accent, color: "#0B0B0B" } : { backgroundColor: `${accent}1a`, color: accent }}
    >
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

// A fixed column template shared by the header and every row in both the
// Trips and Completed tables, so the two always line up. First track is the
// complete/reopen toggle; last is the fixed-width "Manage" label.
const ROW_GRID = "grid-cols-[40px,minmax(0,4fr),minmax(0,1fr),minmax(0,2fr),minmax(0,2fr),minmax(0,2fr),64px]";

/** Small round toggle — an empty ring on an active trip (click to mark it
 *  done), a filled check on a completed one (click to reopen it). Lives in
 *  its own column so it never fights the row's "click anywhere to manage"
 *  behaviour — stopPropagation keeps this button from also triggering that. */
const CompleteToggle = ({ done, busy, onClick }: { done: boolean; busy: boolean; onClick: () => void }) => (
  <button
    type="button"
    onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (!busy) onClick(); }}
    disabled={busy}
    title={done ? "Move back to Trips" : "Mark as completed"}
    aria-label={done ? "Move back to Trips" : "Mark as completed"}
    className={`w-6 h-6 rounded-full grid place-items-center transition-colors shrink-0 disabled:opacity-40 ${
      done
        ? "bg-emerald-500 text-white hover:bg-emerald-600"
        : "ring-1 ring-inset ring-border text-transparent hover:ring-primary hover:text-primary/60"
    }`}
  >
    {busy ? (
      <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
    ) : (
      <Check className="w-3.5 h-3.5" strokeWidth={3} />
    )}
  </button>
);

/**
 * One trip, and the whole row opens its management page — who joined, who
 * paid, who still needs chasing. It used to open that page only for
 * agency-authored trips and drop everything else into an inline accordion
 * whose one action ("Send reminder via WhatsApp") was a div with no handler.
 * Every trip listed here now has a real page behind it.
 */
const TripRowItem = ({ trip, variant, pending, onToggleComplete }: {
  trip: TripRow;
  variant: "active" | "completed";
  pending: boolean;
  onToggleComplete: (trip: TripRow, completed: boolean) => void;
}) => {
  const statusInfo = STATUS_MAP[trip.status] ?? { label: trip.status, tone: "default" as const };
  const actionText = variant === "completed"
    ? `Completed ${timeAgo(trip.completed_at!)}`
    : (ACTION_MAP[trip.status]?.(trip) ?? "");
  const denom = Number(trip.total_members ?? 0) || trip.squad_size || 0;
  const pct = denom ? Math.round((trip.paid_count / denom) * 100) : 0;
  const joined  = Number(trip.total_members ?? 0);
  const pendingCount = unpaidOf(trip);
  const name = trip.title || trip.destination || "Unknown";
  const accent = rowAccent(trip.id);

  // The toggle has to be a sibling of the Link, never a descendant: a
  // <button> inside an <a> is invalid HTML, and Chrome silently restructures
  // that DOM rather than erroring, which made every click on it a no-op —
  // the button visually updated on :hover but never actually fired. Giving
  // the Link `display:contents` lets its children still lay out as direct
  // items of this grid, so the row still reads and clicks as one line.
  return (
    <div
      className={`grid ${ROW_GRID} gap-3 items-center py-3.5 border-t border-border hover:bg-secondary/40 transition-colors ${
        variant === "completed" ? "opacity-80 hover:opacity-100" : ""
      }`}
    >
      <div className="pl-5">
        <CompleteToggle
          done={variant === "completed"}
          busy={pending}
          onClick={() => onToggleComplete(trip, variant !== "completed")}
        />
      </div>
      <Link to={`/pro/trips/${trip.id}`} className="contents group">
        <div className="flex items-center gap-3 min-w-0">
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
        <div>
          <Chip tone={statusInfo.tone}>{statusInfo.label}</Chip>
        </div>
        <div className="tabular-nums text-xs text-muted-foreground">
          {joined > 0 ? (
            <>
              <span className="text-foreground font-medium">{joined}</span> joined
              {pendingCount > 0 && <span className="block text-[10px]">{pendingCount} unpaid</span>}
            </>
          ) : trip.squad_size ? (
            `${trip.squad_size} seats`
          ) : "—"}
        </div>
        <div>
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
        <div className={`text-[11px] ${variant !== "completed" && statusInfo.tone === "warn" ? "text-yellow-700 dark:text-yellow-400" : "text-muted-foreground"}`}>
          {actionText}
        </div>
        <div className="pr-5 text-right text-[10px] font-medium text-muted-foreground group-hover:text-foreground transition-colors whitespace-nowrap">
          Manage →
        </div>
      </Link>
    </div>
  );
};

const TAB_META: Record<ProNav, { title: string; subtitle: string }> = {
  overview:  { title: "Overview",  subtitle: "How the business is doing, at a glance." },
  trips:     { title: "Trips",     subtitle: "Every trip still in motion, and who still needs chasing." },
  completed: { title: "Completed", subtitle: "Trips you've marked done. Reopen any of them if that changes." },
  templates: { title: "Templates", subtitle: "A shape you run again — the same stops, only the dates move." },
  settings:  { title: "Settings",  subtitle: "How your agency shows up to the squads you send this to." },
};

const isTab = (v: string | null): v is ProNav =>
  v === "overview" || v === "trips" || v === "completed" || v === "templates" || v === "settings";

// ── Main page ─────────────────────────────────────────────────────────────────

const ProDashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, getIdToken } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState("");
  const [templates, setTemplates] = useState<TripTemplate[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  // The tab lives in the URL so the sidebar can link straight to it from the
  // builder and the trip page, and so a reload or a back press keeps its place.
  const [params] = useSearchParams();
  const raw = params.get("tab");
  const activeTab: ProNav = isTab(raw) ? raw : "overview";

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

  /** Optimistic complete/reopen — flips the row immediately (so it jumps
   *  tabs without waiting on the network) and puts it back if the save
   *  fails, the same pattern removeTemplate above already uses. */
  async function setCompleted(trip: TripRow, completed: boolean) {
    const token = getIdToken();
    if (!token) return;
    const previous = trip.completed_at ?? null;
    setPendingIds(prev => new Set(prev).add(trip.id));
    setData(prev => prev && {
      ...prev,
      trips: prev.trips.map(t => t.id === trip.id
        ? { ...t, completed_at: completed ? Math.floor(Date.now() / 1000) : null }
        : t),
    });
    try {
      await api.updateAgencyTrip(trip.id, { completed }, token);
    } catch {
      setData(prev => prev && {
        ...prev,
        trips: prev.trips.map(t => t.id === trip.id ? { ...t, completed_at: previous } : t),
      });
    } finally {
      setPendingIds(prev => { const next = new Set(prev); next.delete(trip.id); return next; });
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

  const trips = data?.trips ?? [];
  const openTrips      = useMemo(() => trips.filter(t => !t.completed_at), [trips]);
  const completedTrips = useMemo(
    () => [...trips.filter(t => t.completed_at)].sort((a, b) => (b.completed_at ?? 0) - (a.completed_at ?? 0)),
    [trips],
  );

  const presentStatuses = useMemo(() => {
    const seen = new Set(openTrips.map(t => t.status));
    const ordered = STATUS_ORDER.filter(s => seen.has(s));
    const extra = [...seen].filter(s => !STATUS_ORDER.includes(s));
    return [...ordered, ...extra];
  }, [openTrips]);

  const visibleTrips = useMemo(() => {
    const q = search.trim().toLowerCase();
    return openTrips.filter(t => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (!q) return true;
      const hay = `${t.title || ""} ${t.destination || ""} ${t.origin || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [openTrips, statusFilter, search]);

  const recentTrips = useMemo(() => [...trips].sort((a, b) => b.created_at - a.created_at).slice(0, 5), [trips]);

  // ── Loading state ──────────────────────────────────────────────────────────
  if (authLoading || (!data && !error && user)) {
    return (
      <main className="min-h-screen bg-background grid place-items-center">
        <div className="w-8 h-8 rounded-full border-2 border-foreground border-t-transparent animate-spin" />
      </main>
    );
  }

  if (!user) return null;

  const agent = data?.agent ?? null;
  const summary = data?.summary ?? null;

  const agencyName  = agent?.agency_name || "";
  const agencyLogo  = imageUrl(agent?.logo_image_id ? `/api/trip-image/${agent.logo_image_id}` : null);
  const agentColor  = agent?.color || "#0B0B0B";
  const initials    = agencyName.trim().split(/\s+/).filter(Boolean).map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() || "??";

  return (
    <ProShell
      active={activeTab}
      title={TAB_META[activeTab].title}
      subtitle={TAB_META[activeTab].subtitle}
      agent={agent}
      tripCount={openTrips.length}
      completedCount={completedTrips.length}
      templateCount={templates.length}
      actions={
        <>
          {activeTab !== "templates" && activeTab !== "settings" && (
            <button
              onClick={load}
              disabled={fetching}
              className="w-8 h-8 grid place-items-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-40"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${fetching ? "animate-spin" : ""}`} />
            </button>
          )}
          <Link
            to="/pro/trips/new"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm rounded-full bg-signal text-ink border-2 border-foreground px-3 sm:px-4 py-2 shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_hsl(var(--foreground))] transition-transform font-bold"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
            <span className="hidden sm:inline">New trip</span>
          </Link>
        </>
      }
    >
      {/* Error banner */}
      {error && (
        <div className="mb-6 rounded-2xl bg-destructive/10 ring-1 ring-destructive/20 px-5 py-4 flex items-center justify-between gap-4">
          <p className="text-sm text-destructive">{error}</p>
          <button onClick={load} className="text-xs underline text-muted-foreground shrink-0">Retry</button>
        </div>
      )}

      {/* ── Overview tab ──────────────────────────────────────────────────── */}
      {activeTab === "overview" && summary && (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
            <KPI
              icon={<IconTrips className="w-5 h-5" />}
              label="Active trips"
              value={String(summary.active_trips)}
              sub="unlimited on Pro"
              accent="#F5C518"
              solid
            />
            <KPI
              icon={<IconCompleted className="w-5 h-5" />}
              label="Trips completed"
              value={String(summary.trips_completed)}
              sub="all time"
              accent="#10b981"
            />
            <KPI
              icon={<Wallet className="w-5 h-5" />}
              label="Total collected"
              value={summary.total_collected > 0 ? fmtNGN(summary.total_collected) : "₦0"}
              sub={summary.revenue_mtd > 0 ? `${fmtNGN(summary.revenue_mtd)} this month` : "via Paystack"}
              accent="#0B0B0B"
            />
            <KPI
              icon={<Clock className="w-5 h-5" />}
              label="Pending payments"
              value={String(summary.pending_payments)}
              sub={summary.pending_payments > 0 ? "needs a follow-up" : "all clear"}
              accent={summary.pending_payments > 0 ? "#ef4444" : "#10b981"}
            />
          </div>

          {/* Insights — real numbers derived from the trips above, not
              estimates: link opens, and the two steps between "someone
              looked" and "someone paid". */}
          <div className="text-[11px] font-medium text-muted-foreground mb-2 mt-6">Insights</div>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            <KPI
              icon={<Eye className="w-5 h-5" />}
              label="Link views"
              value={String(summary.total_views)}
              sub="every open of a share link"
              accent="#06b6d4"
            />
            <KPI
              icon={<Users className="w-5 h-5" />}
              label="View → join rate"
              value={summary.join_rate_pct !== null ? `${summary.join_rate_pct}%` : "—"}
              sub={summary.join_rate_pct !== null ? "of link opens join" : "no traffic yet"}
              accent="#8b5cf6"
            />
            <KPI
              icon={<CreditCard className="w-5 h-5" />}
              label="Join → paid rate"
              value={summary.payment_rate_pct !== null ? `${summary.payment_rate_pct}%` : "—"}
              sub={summary.payment_rate_pct !== null ? "of joiners pay" : "no joins yet"}
              accent="#f59e0b"
            />
            <KPI
              icon={<Trophy className="w-5 h-5" />}
              label="Top performer"
              value={summary.top_trip ? summary.top_trip.title : "—"}
              sub={summary.top_trip ? `${fmtNGN(summary.top_trip.collected)} collected` : "no trips collecting yet"}
              accent="#ec4899"
            />
          </div>

          {/* Recent activity — a taste of what's moving, not the full list. */}
          <div className="rounded-3xl border-[3px] border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] bg-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-display font-semibold text-sm">Recent trips</h2>
              <Link to="/pro/dashboard?tab=trips" className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">
                View all →
              </Link>
            </div>
            {recentTrips.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-sm text-muted-foreground mb-4">Nothing built yet.</p>
                <Link
                  to="/pro/trips/new"
                  className="inline-flex items-center gap-2 rounded-full bg-signal text-ink border-2 border-foreground px-4 py-2 text-xs font-bold shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_hsl(var(--foreground))] transition-transform"
                >
                  Build your first trip →
                </Link>
              </div>
            ) : (
              recentTrips.map(t => {
                const statusInfo = STATUS_MAP[t.status] ?? { label: t.status, tone: "default" as const };
                const name = t.title || t.destination || "Unknown";
                return (
                  <Link
                    key={t.id}
                    to={`/pro/trips/${t.id}`}
                    className="flex items-center gap-3 px-5 py-3 border-t border-border last:border-b-0 hover:bg-secondary/40 transition-colors"
                  >
                    <div
                      className="w-7 h-7 rounded-lg grid place-items-center text-[10px] font-display font-bold text-white shrink-0"
                      style={{ backgroundColor: rowAccent(t.id) }}
                    >
                      {name.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold truncate">{name}</div>
                    </div>
                    {t.completed_at ? (
                      <span className="text-[10px] text-muted-foreground shrink-0">Completed {timeAgo(t.completed_at)}</span>
                    ) : (
                      <Chip tone={statusInfo.tone}>{statusInfo.label}</Chip>
                    )}
                    {t.total_collected > 0 && (
                      <span className="text-[11px] tabular-nums text-muted-foreground shrink-0 w-24 text-right">{fmtNGN(t.total_collected)}</span>
                    )}
                  </Link>
                );
              })
            )}
          </div>
        </>
      )}

      {/* ── Trips tab ─────────────────────────────────────────────────────── */}
      {activeTab === "trips" && (
        <>
          {/* Filters — the whole reason this exists: past a handful of trips,
              scrolling the raw list stops being usable. */}
          {openTrips.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <div className="flex items-center gap-1 overflow-x-auto">
                <button
                  onClick={() => setStatusFilter("all")}
                  className={`shrink-0 text-xs px-3 py-1.5 rounded-full transition-colors ${
                    statusFilter === "all" ? "bg-foreground text-background font-medium" : "bg-secondary/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  All <span className="tabular-nums opacity-70">{openTrips.length}</span>
                </button>
                {presentStatuses.map(s => {
                  const info = STATUS_MAP[s] ?? { label: s, tone: "default" as const };
                  const n = openTrips.filter(t => t.status === s).length;
                  return (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      className={`shrink-0 text-xs px-3 py-1.5 rounded-full transition-colors ${
                        statusFilter === s ? "bg-foreground text-background font-medium" : "bg-secondary/60 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {info.label} <span className="tabular-nums opacity-70">{n}</span>
                    </button>
                  );
                })}
              </div>
              <div className="flex-1" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search trips…"
                className="text-xs rounded-lg bg-secondary/60 ring-hairline px-3 py-1.5 w-full sm:w-48 placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
              />
            </div>
          )}

          <div className="rounded-3xl border-[3px] border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] bg-card overflow-hidden">
            {fetching ? (
              <div className="px-6 py-12 text-center">
                <div className="w-6 h-6 rounded-full border-2 border-foreground border-t-transparent animate-spin mx-auto" />
              </div>
            ) : openTrips.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <div className="w-12 h-12 rounded-2xl bg-secondary border-2 border-foreground grid place-items-center mx-auto mb-4">
                  <IconTrips className="w-5 h-5 text-muted-foreground" />
                </div>
                <h3 className="font-display font-semibold text-lg mb-1">No trips yet</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                  Build a trip, share one link, and watch who joins and pays — all from here.
                </p>
                <Link
                  to="/pro/trips/new"
                  className="inline-flex items-center gap-2 rounded-full bg-signal text-ink border-2 border-foreground px-5 py-2.5 text-sm font-bold shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_hsl(var(--foreground))] transition-transform"
                >
                  Build your first trip →
                </Link>
              </div>
            ) : visibleTrips.length === 0 ? (
              <p className="px-6 py-12 text-sm text-muted-foreground text-center">
                Nothing matches {search.trim() ? `"${search.trim()}"` : "that filter"}.
              </p>
            ) : (
              // The grid below needs real room to breathe — on a narrow
              // screen it would rather scroll sideways than squeeze every
              // column into unreadable overlapping text.
              <div className="overflow-x-auto">
                <div className="min-w-[760px]">
                  <div className={`grid ${ROW_GRID} gap-3 px-5 py-3 text-[10px] uppercase tracking-wider text-muted-foreground bg-secondary/40`}>
                    <div />
                    <div>Trip</div>
                    <div>Status</div>
                    <div>Squad</div>
                    <div>Payments</div>
                    <div>Next action</div>
                    <div />
                  </div>
                  {visibleTrips.map((t) => (
                    <TripRowItem
                      key={t.id}
                      trip={t}
                      variant="active"
                      pending={pendingIds.has(t.id)}
                      onToggleComplete={setCompleted}
                    />
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

      {/* ── Completed tab ─────────────────────────────────────────────────── */}
      {activeTab === "completed" && (
        <div className="rounded-3xl border-[3px] border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] bg-card overflow-hidden">
          {completedTrips.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-secondary border-2 border-foreground grid place-items-center mx-auto mb-4">
                <IconCompleted className="w-5 h-5 text-muted-foreground" />
              </div>
              <h3 className="font-display font-semibold text-lg mb-1">Nothing marked done yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Tick the circle on a trip in the Trips tab once it's run — it moves here and out of your working list.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[760px]">
                <div className={`grid ${ROW_GRID} gap-3 px-5 py-3 text-[10px] uppercase tracking-wider text-muted-foreground bg-secondary/40`}>
                  <div />
                  <div>Trip</div>
                  <div>Status</div>
                  <div>Squad</div>
                  <div>Payments</div>
                  <div>Completed</div>
                  <div />
                </div>
                {completedTrips.map((t) => (
                  <TripRowItem
                    key={t.id}
                    trip={t}
                    variant="completed"
                    pending={pendingIds.has(t.id)}
                    onToggleComplete={setCompleted}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Templates tab */}
      {activeTab === "templates" && (
        <div className="rounded-3xl border-[3px] border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] bg-card overflow-hidden">
          {templates.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-secondary border-2 border-foreground grid place-items-center mx-auto mb-4">
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
                    className="text-[11px] rounded-full bg-signal text-ink border-2 border-foreground px-3 py-1.5 font-bold shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_hsl(var(--foreground))] transition-transform"
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
          <div className="rounded-3xl border-[3px] border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] bg-card p-6 space-y-4 text-sm">
            <div className="flex items-center gap-3 pb-4 border-b border-border">
              <div
                className="w-12 h-12 rounded-xl border-2 border-foreground grid place-items-center text-white font-display font-bold text-base shrink-0 overflow-hidden"
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
                className="inline-flex rounded-full bg-foreground text-background border-2 border-foreground px-4 py-2 text-xs font-bold shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_hsl(var(--foreground))] transition-transform"
              >
                Edit settings →
              </Link>
            </div>
          </div>
        </div>
      )}
    </ProShell>
  );
};

export default ProDashboard;
