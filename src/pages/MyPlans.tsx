import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api, type UserPlan } from "@/lib/api";

const fmtNGN = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n);

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  generating:     { label: "Generating…", color: "text-google-blue bg-google-blue/10" },
  plan_review:    { label: "Ready",       color: "text-google-green bg-google-green/10" },
  awaiting_group: { label: "Confirmed",   color: "text-primary bg-primary/10" },
  error:          { label: "Failed",      color: "text-destructive bg-destructive/10" },
};

export default function MyPlans() {
  const { user, loading, signOut, getIdToken } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<UserPlan[]>([]);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "My Plans · MySquadGo";
    if (!loading && !user) navigate("/start", { replace: true });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    setFetching(true);
    getIdToken()
      .then(token => token ? api.getMyPlans(token) : Promise.reject(new Error("No token")))
      .then(data => setPlans(data.plans))
      .catch(err => setError(err.message))
      .finally(() => setFetching(false));
  }, [user, getIdToken]);

  if (loading || !user) {
    return (
      <main className="min-h-screen bg-hero-mesh grid place-items-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-hero-mesh">
      <header className="pt-8 pb-6">
        <div className="mx-auto max-w-3xl px-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-display font-semibold">
            <span className="grid place-items-center w-8 h-8 rounded-xl bg-gradient-primary text-primary-foreground shadow-soft">
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2l3 7 7 .8-5.3 4.7L18.5 22 12 18l-6.5 4 1.8-7.5L2 9.8 9 9z" />
              </svg>
            </span>
            MySquadGo
          </Link>

          <div className="flex items-center gap-3">
            {user.photoURL && (
              <img src={user.photoURL} alt={user.displayName || "You"} className="w-8 h-8 rounded-full ring-hairline" referrerPolicy="no-referrer" />
            )}
            <button
              onClick={() => signOut().then(() => navigate("/"))}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 pb-24 space-y-6">
        {/* Header */}
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary mb-1">Your account</div>
          <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">My Plans</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {user.displayName ? `Welcome back, ${user.displayName.split(" ")[0]}.` : "Welcome back."} All your saved squad plans are here.
          </p>
        </div>

        {/* Plan a new trip CTA */}
        <Link
          to="/start"
          className="group flex items-center justify-between rounded-3xl bg-card ring-hairline shadow-card p-6 hover:shadow-md transition-shadow"
        >
          <div>
            <div className="font-display font-semibold">Plan a new trip</div>
            <div className="text-sm text-muted-foreground mt-0.5">AI builds the full itinerary in ~20 seconds</div>
          </div>
          <div className="w-10 h-10 rounded-full bg-gradient-primary grid place-items-center shadow-glow group-hover:scale-105 transition-transform shrink-0">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-primary-foreground" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </div>
        </Link>

        {/* Plans list */}
        {fetching && (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        )}

        {error && (
          <div className="rounded-2xl bg-destructive/10 ring-1 ring-destructive/20 px-5 py-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {!fetching && plans.length === 0 && !error && (
          <div className="rounded-3xl bg-card ring-hairline shadow-card p-10 text-center">
            <div className="text-4xl mb-3">🗺️</div>
            <div className="font-display font-semibold">No saved plans yet</div>
            <p className="text-sm text-muted-foreground mt-1">Generate a plan and lock it in to save it here.</p>
          </div>
        )}

        {!fetching && plans.length > 0 && (
          <ol className="space-y-3">
            {plans.map((p) => {
              const s = STATUS_LABEL[p.status] ?? { label: p.status, color: "text-muted-foreground bg-secondary" };
              const perPerson = p.plan?.cost_breakdown?.per_person;
              const total     = p.plan?.cost_breakdown?.total;
              const date = new Date(p.createdAt * 1000).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
              return (
                <li key={p.tripId}>
                  {p.status === 'plan_review' ? (
                    <Link
                      to={`/start?job=${p.tripId}`}
                      className="block rounded-3xl bg-card ring-hairline shadow-card p-6 hover:shadow-md transition-shadow"
                    >
                      <PlanCard p={p} s={s} date={date} perPerson={perPerson} total={total} />
                    </Link>
                  ) : p.status === 'awaiting_group' ? (
                    <div className="rounded-3xl bg-card ring-hairline shadow-card p-6 space-y-4">
                      <PlanCard p={p} s={s} date={date} perPerson={perPerson} total={total} />
                      {/* Share link + participant count */}
                      <div className="border-t border-border pt-4 flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="text-base">🙌</span>
                          {(p.participantCount ?? 0) > 0
                            ? <span><span className="font-semibold text-foreground">{p.participantCount}</span> {p.participantCount === 1 ? "person" : "people"} in</span>
                            : <span>No-one has joined yet</span>
                          }
                        </div>
                        <Link
                          to={`/plan/${p.tripId}`}
                          className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-4 py-2 text-xs font-semibold hover:bg-primary/15 transition"
                        >
                          View squad page →
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-3xl bg-card ring-hairline shadow-card p-6">
                      <PlanCard p={p} s={s} date={date} perPerson={perPerson} total={total} />
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </main>
  );
}

function PlanCard({ p, s, date, perPerson, total }: {
  p: UserPlan;
  s: { label: string; color: string };
  date: string;
  perPerson?: number;
  total?: number;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${s.color}`}>
            {s.label}
          </span>
          <span className="text-[11px] text-muted-foreground">{date}</span>
        </div>
        <div className="font-display font-semibold truncate">
          {p.origin || "—"} → {p.destination || "—"}
        </div>
        <div className="text-sm text-muted-foreground mt-0.5">
          {p.days ? `${p.days} day${p.days === 1 ? "" : "s"}` : "—"}
          {p.squadSize ? ` · ${p.squadSize} people` : ""}
          {p.plan?.hotel ? ` · ${p.plan.hotel.name.split(" ").slice(0, 2).join(" ")}` : ""}
        </div>
      </div>
      {(perPerson || total) && (
        <div className="text-right shrink-0">
          {perPerson && (
            <div className="font-display font-semibold text-primary">{fmtNGN(perPerson)}<span className="text-[10px] font-normal text-muted-foreground">/p</span></div>
          )}
          {total && (
            <div className="text-[11px] text-muted-foreground">Squad: {fmtNGN(total)}</div>
          )}
        </div>
      )}
    </div>
  );
}
