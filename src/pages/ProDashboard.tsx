import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, type DashboardData, type TripRow } from "@/lib/api";

const LS_KEY = "msq_agent";

type LocalAgent = {
  phone: string;
  agencyName: string;
  waNumber: string;
  serviceFee: number;
  color: string;
  planType: string;
  tagline: string;
  initials: string;
};

const STATUS_MAP: Record<string, { label: string; tone: "default" | "warn" | "good" | "brand" }> = {
  intake:         { label: "Intake",          tone: "default" },
  generating:     { label: "AI Planning",     tone: "brand" },
  plan_review:    { label: "Review",          tone: "brand" },
  awaiting_group: { label: "Awaiting Group",  tone: "warn" },
  voting_dates:   { label: "Voting Dates",    tone: "brand" },
  voting_hotel:   { label: "Voting Hotel",    tone: "brand" },
  payment:        { label: "Collecting",      tone: "warn" },
  active:         { label: "Active",          tone: "good" },
  error:          { label: "Error",           tone: "default" },
};

const ACTION_MAP: Record<string, (t: TripRow) => string> = {
  intake:         () => "Collecting trip details",
  generating:     () => "AI building the plan…",
  plan_review:    () => "Review the plan in WhatsApp",
  awaiting_group: () => "Add the bot to your group",
  voting_dates:   () => "Squad is voting on dates",
  voting_hotel:   () => "Squad is voting on hotel",
  payment:        (t) => {
    const pending = Math.max(0, (t.squad_size || 0) - t.paid_count);
    return pending > 0 ? `${pending} member${pending > 1 ? "s" : ""} haven't paid` : "Finalising payment";
  },
  active:         () => "Trip confirmed — everyone paid",
  error:          () => "Something went wrong — check WhatsApp",
};

const fmtNGN = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n);

const Chip = ({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "warn" | "good" | "brand" }) => {
  const tones = {
    default: "bg-secondary text-muted-foreground",
    warn:    "bg-yellow-100 text-yellow-900 dark:bg-yellow-900/40 dark:text-yellow-300",
    good:    "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-300",
    brand:   "bg-primary/10 text-primary",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
};

const TripRow = ({ trip, isOpen, onToggle }: { trip: TripRow; isOpen: boolean; onToggle: () => void }) => {
  const statusInfo = STATUS_MAP[trip.status] ?? { label: trip.status, tone: "default" as const };
  const actionText = ACTION_MAP[trip.status]?.(trip) ?? "";
  const pct = trip.squad_size ? Math.round((trip.paid_count / trip.squad_size) * 100) : 0;
  const pending = Math.max(0, (trip.squad_size || 0) - trip.paid_count);

  return (
    <div className="border-t border-border">
      <button
        onClick={onToggle}
        className="w-full grid grid-cols-12 items-center px-4 py-3 text-xs text-left hover:bg-secondary/30 transition-colors"
      >
        <div className="col-span-4">
          <div className="font-semibold flex items-center gap-2 flex-wrap">
            {trip.destination || "Unknown"}
            <Chip tone={statusInfo.tone}>{statusInfo.label}</Chip>
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            {trip.origin ? `${trip.origin} → ` : ""}{trip.destination}
            {trip.days ? ` · ${trip.days}d` : ""}
            {trip.total_collected > 0 ? ` · ${fmtNGN(trip.total_collected)}` : ""}
          </div>
        </div>
        <div className="col-span-2 tabular-nums text-muted-foreground">
          {trip.squad_size ? `${trip.squad_size} ppl` : "—"}
        </div>
        <div className="col-span-3">
          {trip.squad_size ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                <div className="h-full bg-gradient-primary transition-all" style={{ width: `${pct}%` }} />
              </div>
              <span className="tabular-nums text-[10px] text-muted-foreground">{trip.paid_count}/{trip.squad_size}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>
        <div className={`col-span-2 text-[11px] ${statusInfo.tone === "warn" ? "text-yellow-700 dark:text-yellow-400" : "text-muted-foreground"}`}>
          {actionText}
        </div>
        <div className="col-span-1 text-right text-muted-foreground text-[10px]">{isOpen ? "▲" : "▼"}</div>
      </button>

      {isOpen && (
        <div className="px-4 pb-4 bg-secondary/20">
          {trip.total_collected > 0 && (
            <div className="pt-3 pb-2 flex gap-4 text-xs text-muted-foreground border-b border-border mb-3">
              <span>Collected: <strong className="text-foreground">{fmtNGN(trip.total_collected)}</strong></span>
              {trip.squad_size && <span>Paid: <strong className="text-foreground">{trip.paid_count}/{trip.squad_size}</strong></span>}
            </div>
          )}
          {trip.status === "awaiting_group" && (
            <div className="pt-2 text-xs text-muted-foreground">
              Add the bot (+{process.env.WA_DISPLAY_NUMBER || "234XXXXXXXXXX"}) to your WhatsApp group to reveal the plan.
            </div>
          )}
          {pending > 0 && trip.status === "payment" && (
            <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-foreground text-background px-3 py-1.5 text-[11px] font-medium cursor-pointer hover:opacity-90">
              <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 11.5a8.4 8.4 0 01-1.3 4.5 8.5 8.5 0 01-7.3 4 8.4 8.4 0 01-4.4-1.2L3 20l1.4-4.9a8.4 8.4 0 01-1.3-4.5 8.5 8.5 0 014-7.3 8.4 8.4 0 014.5-1.3 8.5 8.5 0 018.5 8.5z" />
              </svg>
              Send reminder via WhatsApp
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const KPI = ({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) => (
  <div className="rounded-xl bg-secondary/60 p-4">
    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    <div className="font-display text-2xl font-semibold mt-1 tabular-nums" style={color ? { color } : undefined}>{value}</div>
    {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
  </div>
);

const ProDashboard = () => {
  const navigate = useNavigate();
  const [agent, setAgent] = useState<LocalAgent | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedTrip, setExpandedTrip] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"trips" | "settings">("trips");

  const load = useCallback(async (agentPhone: string) => {
    setLoading(true);
    setError("");
    try {
      const d = await api.getDashboard(agentPhone);
      setData(d);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not load dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(LS_KEY);
    if (!saved) {
      navigate("/pro/setup");
      return;
    }
    try {
      const a = JSON.parse(saved) as LocalAgent;
      setAgent(a);
      load(a.phone);
    } catch {
      navigate("/pro/setup");
    }
  }, [navigate, load]);

  if (!agent) return null;

  const initials = agent.initials || agent.agencyName.slice(0, 2).toUpperCase();
  const { summary, trips } = data ?? { summary: null, trips: [] };

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg grid place-items-center text-white font-display font-bold text-xs shrink-0"
              style={{ backgroundColor: agent.color }}
            >
              {initials}
            </div>
            <div>
              <div className="font-display font-semibold text-sm leading-tight">{agent.agencyName}</div>
              <div className="text-[10px] text-muted-foreground">
                Pro {agent.planType === "growth" ? "Growth" : "Starter"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab(activeTab === "settings" ? "trips" : "settings")}
              className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-full hover:bg-secondary transition-colors"
            >
              {activeTab === "settings" ? "← Dashboard" : "Settings"}
            </button>
            <Link
              to="/pro/setup"
              className="text-xs rounded-full bg-foreground text-background px-3 py-1.5 hover:opacity-90 transition-opacity"
            >
              Edit profile
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8">

        {/* Settings tab */}
        {activeTab === "settings" && (
          <div className="max-w-xl">
            <h2 className="font-display text-2xl font-semibold mb-6">Agency settings</h2>
            <div className="rounded-3xl bg-card ring-hairline p-6 space-y-4 text-sm">
              <div className="flex items-center gap-3 pb-4 border-b border-border">
                <div
                  className="w-12 h-12 rounded-xl grid place-items-center text-white font-display font-bold text-base shrink-0"
                  style={{ backgroundColor: agent.color }}
                >
                  {initials}
                </div>
                <div>
                  <div className="font-semibold">{agent.agencyName}</div>
                  {agent.tagline && <div className="text-xs text-muted-foreground">{agent.tagline}</div>}
                </div>
              </div>
              {[
                { label: "Phone (login)", value: agent.phone },
                { label: "Client WhatsApp", value: agent.waNumber || agent.phone },
                { label: "Service fee", value: fmtNGN(agent.serviceFee) + " per trip" },
                { label: "Plan", value: `Pro ${agent.planType === "growth" ? "Growth" : "Starter"}` },
              ].map((r) => (
                <div key={r.label} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{r.label}</span>
                  <span className="font-medium">{r.value}</span>
                </div>
              ))}
              <div className="pt-4">
                <Link
                  to="/pro/setup"
                  className="inline-flex rounded-full bg-foreground text-background px-4 py-2 text-xs font-medium hover:opacity-90"
                >
                  Edit settings →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard tab */}
        {activeTab === "trips" && (
          <>
            {/* KPIs */}
            {summary && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                <KPI
                  label="Active trips"
                  value={String(summary.active_trips)}
                  sub={agent.planType === "starter" ? "of 3 allowed" : "unlimited"}
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
                <Link
                  to="/demo"
                  className="inline-flex items-center gap-1.5 text-xs rounded-full bg-foreground text-background px-3 py-1.5 hover:opacity-90 transition-opacity"
                >
                  <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  New trip
                </Link>
              </div>

              {loading ? (
                <div className="px-6 py-12 text-center text-sm text-muted-foreground">Loading trips…</div>
              ) : error ? (
                <div className="px-6 py-12 text-center">
                  <p className="text-sm text-red-500 mb-3">{error}</p>
                  <button onClick={() => load(agent.phone)} className="text-xs underline text-muted-foreground">Retry</button>
                </div>
              ) : trips.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <div className="text-3xl mb-3">🚌</div>
                  <h3 className="font-display font-semibold text-lg mb-1">No trips yet</h3>
                  <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                    Start a trip via your WhatsApp bot. Once a trip is created under your registered number ({agent.phone}), it'll appear here.
                  </p>
                  <Link
                    to="/demo"
                    className="inline-flex items-center gap-2 rounded-full bg-foreground text-background px-5 py-2.5 text-sm font-medium hover:opacity-90"
                  >
                    See how it works
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
                    <TripRow
                      key={t.id}
                      trip={t}
                      isOpen={expandedTrip === t.id}
                      onToggle={() => setExpandedTrip(expandedTrip === t.id ? null : t.id)}
                    />
                  ))}
                  <div className="px-4 py-3 text-[10px] text-muted-foreground border-t border-border">
                    {agent.planType === "starter" ? "Pro Starter — up to 3 active trips." : "Pro Growth — unlimited trips."}
                  </div>
                </>
              )}
            </div>

            {/* How to create trips */}
            {trips.length === 0 && (
              <div className="mt-5 rounded-3xl bg-secondary/40 ring-hairline p-6">
                <div className="font-semibold text-sm mb-3">How trips appear here</div>
                <ol className="space-y-2 text-xs text-muted-foreground">
                  <li className="flex gap-3"><span className="font-display font-semibold text-foreground shrink-0">1</span>Send a message to the MySquadGo bot from your number ({agent.waNumber || agent.phone})</li>
                  <li className="flex gap-3"><span className="font-display font-semibold text-foreground shrink-0">2</span>Plan a trip — the bot guides you through 8 questions</li>
                  <li className="flex gap-3"><span className="font-display font-semibold text-foreground shrink-0">3</span>Once confirmed, the trip syncs to this dashboard in real time</li>
                </ol>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
};

export default ProDashboard;
