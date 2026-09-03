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

// ── Sub-components ────────────────────────────────────────────────────────────

const Chip = ({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "warn" | "good" | "brand" }) => {
  const tones = {
    default: "bg-secondary text-muted-foreground",
    warn:    "bg-yellow-100 text-yellow-900 dark:bg-yellow-900/40 dark:text-yellow-300",
    good:    "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-300",
    brand:   "bg-primary/10 text-foreground",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
};

const KPI = ({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) => (
  <div className="rounded-xl bg-secondary/60 p-4">
    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    <div className="font-display text-2xl font-semibold mt-1 tabular-nums" style={color ? { color } : undefined}>{value}</div>
    {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
  </div>
);

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

  return (
    <div className="border-t border-border">
      <Link
        to={`/pro/trips/${trip.id}`}
        target="_blank"
        rel="noopener"
        className="group w-full grid grid-cols-12 gap-3 items-center px-4 py-3 text-xs text-left hover:bg-secondary/30 transition-colors"
      >
        <div className="col-span-4">
          <div className="font-semibold flex items-center gap-2 flex-wrap">
            {trip.title || trip.destination || "Unknown"}
            <Chip tone={statusInfo.tone}>{statusInfo.label}</Chip>
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            {trip.origin ? `${trip.origin} → ` : ""}{trip.destination}
            {trip.days ? ` · ${trip.days}d` : ""}
            {trip.total_collected > 0 ? ` · ${fmtNGN(trip.total_collected)}` : ""}
          </div>
        </div>
        <div className="col-span-2 tabular-nums text-muted-foreground">
          {joined > 0 ? (
            <>
              <span className="text-foreground font-medium">{joined}</span> joined
              {pending > 0 && <span className="block text-[10px]">{pending} unpaid</span>}
            </>
          ) : trip.squad_size ? (
            `${trip.squad_size} seats`
          ) : "—"}
        </div>
        <div className="col-span-3">
          {trip.squad_size ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                <div className="h-full bg-gradient-primary transition-all" style={{ width: `${pct}%` }} />
              </div>
              <span className="tabular-nums text-[10px] text-muted-foreground">{trip.paid_count}/{denom || "—"}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>
        <div className={`col-span-2 text-[11px] ${statusInfo.tone === "warn" ? "text-yellow-700 dark:text-yellow-400" : "text-muted-foreground"}`}>
          {actionText}
        </div>
        <div className="col-span-1 text-right text-[10px] font-medium text-muted-foreground group-hover:text-foreground transition-colors whitespace-nowrap">
          Manage →
        </div>
      </Link>
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────

const ProDashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut, getIdToken } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"trips" | "templates" | "settings">("trips");
  const [templates, setTemplates] = useState<TripTemplate[]>([]);

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

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg grid place-items-center text-white font-display font-bold text-xs shrink-0 overflow-hidden"
              style={agencyLogo ? undefined : { backgroundColor: agentColor }}
            >
              {agencyLogo
                ? <img src={agencyLogo} alt={agencyName} className="w-full h-full object-contain" />
                : initials}
            </div>
            <div>
              <div className="font-display font-semibold text-sm leading-tight">{agencyName || user.email}</div>
              <div className="text-[10px] text-muted-foreground">
                Karije Pro
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Three real tabs — a two-way toggle could not reach templates. */}
            <nav className="flex items-center gap-0.5 rounded-lg bg-secondary/60 p-0.5">
              {([
                { id: "trips",     label: "Trips" },
                { id: "templates", label: templates.length ? `Templates (${templates.length})` : "Templates" },
                { id: "settings",  label: "Settings" },
              ] as const).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
                    activeTab === t.id
                      ? "bg-background text-foreground font-medium shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </nav>
            <Link
              to="/pro/setup"
              className="text-xs rounded-lg bg-foreground text-background px-3 py-1.5 hover:opacity-90 transition-opacity"
            >
              Edit profile
            </Link>
            <button
              onClick={() => { signOut(); navigate("/"); }}
              className="hidden sm:inline-flex text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8">

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
            <div className="flex items-center justify-between px-6 py-4 border-b border-border gap-4">
              <div>
                <h2 className="font-display font-semibold">Trip templates</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  A shape you run again — the same stops at the same prices, with only the dates moving.
                </p>
              </div>
              <Link
                to="/pro/trips/new"
                className="shrink-0 text-xs rounded-lg bg-foreground text-background px-3 py-1.5 hover:opacity-90 transition-opacity"
              >
                New trip
              </Link>
            </div>

            {templates.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <div className="text-3xl mb-3">🗂️</div>
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
                  className="border-t border-border px-4 py-3 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold truncate">{t.name}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {t.city ? `${t.city} · ` : ""}
                      {t.dayCount} day{t.dayCount === 1 ? "" : "s"}
                      {" · "}{fmtNGN(t.perPerson)}/person
                      {" · "}{t.squadSize} {t.squadSize === 1 ? "seat" : "seats"}
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
            <h2 className="font-display text-2xl font-semibold mb-6">Agency settings</h2>
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                <KPI
                  label="Active trips"
                  value={String(summary.active_trips)}
                  sub="unlimited"
                />
                <KPI
                  label="Trips completed"
                  value={String(summary.trips_completed)}
                  sub="all time"
                />
                <KPI
                  label="Total collected"
                  value={summary.total_collected > 0 ? fmtNGN(summary.total_collected) : "₦0"}
                  sub="via Paystack"
                  color={summary.total_collected > 0 ? "var(--color-primary, #6366f1)" : undefined}
                />
                <KPI
                  label="Pending payments"
                  value={String(summary.pending_payments)}
                  sub={summary.pending_payments > 0 ? "follow up" : "all clear"}
                />
              </div>
            )}

            {/* Trips table */}
            <div className="rounded-3xl bg-card ring-hairline overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <h2 className="font-display font-semibold">Your trips</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={load}
                    disabled={fetching}
                    className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded transition-colors disabled:opacity-40"
                    title="Refresh"
                  >
                    ↺
                  </button>
                  <Link
                    to="/pro/trips/new"
                    className="inline-flex items-center gap-1.5 text-xs rounded-lg bg-foreground text-background px-3 py-1.5 hover:opacity-90 transition-opacity"
                  >
                    <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    New trip
                  </Link>
                </div>
              </div>

              {fetching ? (
                <div className="px-6 py-12 text-center">
                  <div className="w-6 h-6 rounded-full border-2 border-foreground border-t-transparent animate-spin mx-auto" />
                </div>
              ) : trips.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <div className="text-3xl mb-3">🚌</div>
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
                <>
                  <div className="grid grid-cols-12 px-4 py-2.5 text-[10px] uppercase tracking-wider text-muted-foreground bg-secondary/40">
                    <div className="col-span-4">Trip</div>
                    <div className="col-span-2">Squad</div>
                    <div className="col-span-3">Payments</div>
                    <div className="col-span-2">Next action</div>
                    <div className="col-span-1" />
                  </div>
                  {trips.map((t) => (
                    <TripRowItem key={t.id} trip={t} />
                  ))}
                  <div className="px-4 py-3 text-[10px] text-muted-foreground border-t border-border">
                    Karije Pro — ₦10,000/month, unlimited trips.
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
};

export default ProDashboard;
