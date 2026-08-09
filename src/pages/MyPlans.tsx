import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api, session, type UserPlan } from "@/lib/api";
import { KarijeLogo } from "@/components/Nav";

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

  // ── Magic-link login state ────────────────────────────────────────────────
  const [loginEmail, setLoginEmail]   = useState("");
  const [loginState, setLoginState]   = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [loginError, setLoginError]   = useState("");

  useEffect(() => {
    document.title = "My Plans · Karije";
  }, []);

  useEffect(() => {
    if (!user) return;
    const token = getIdToken();
    if (!token) { setError("Not signed in."); return; }
    setFetching(true);
    api.getMyPlans(token)
      .then(data => setPlans(data.plans))
      .catch(err => setError(err.message))
      .finally(() => setFetching(false));
  }, [user, getIdToken]);

  // ── Loading spinner (auth check still running) ────────────────────────────
  if (loading) {
    return (
      <main className="min-h-screen bg-background grid place-items-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </main>
    );
  }

  // ── Not logged in — show login form inline ────────────────────────────────
  if (!user) {
    async function sendLink(e: React.FormEvent) {
      e.preventDefault();
      if (!loginEmail.trim()) return;
      setLoginState("sending");
      setLoginError("");
      try {
        await api.sendMagicLink({ email: loginEmail.trim(), redirect: "/my-plans" });
        setLoginState("sent");
      } catch (err) {
        setLoginError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
        setLoginState("error");
      }
    }

    return (
      <main className="min-h-screen bg-background">
        <header className="relative pt-8 pb-6">
          <div className="mx-auto max-w-3xl px-6 flex items-center justify-between">
            <KarijeLogo />
            <Link to="/" className="text-xs font-jost font-light text-muted-foreground hover:text-foreground transition-colors">
              ← Home
            </Link>
          </div>
        </header>

        <div className="mx-auto max-w-sm px-6 pb-24">
          {/* Eyebrow */}
          <div className="flex items-center gap-4 mb-6">
            <span className="h-px w-8 bg-primary" />
            <span className="text-[10px] font-jost font-light tracking-label text-muted-foreground uppercase">
              Your account
            </span>
          </div>

          <h1 className="font-marcellus text-3xl text-foreground mb-2">Sign in</h1>
          <p className="font-jost font-light text-sm text-muted-foreground mb-8 leading-relaxed">
            We'll send a link to your email — tap it and you're in. No password.
          </p>

          {loginState === "sent" ? (
            <div className="border border-border p-6 text-center">
              <div className="text-3xl mb-3">📬</div>
              <div className="font-marcellus text-lg text-foreground mb-2">Check your inbox</div>
              <p className="font-jost font-light text-sm text-muted-foreground leading-relaxed">
                We sent a sign-in link to <strong className="text-foreground">{loginEmail}</strong>.
                Tap it to sign in and see your plans.
              </p>
              <button
                onClick={() => { setLoginState("idle"); setLoginEmail(""); }}
                className="mt-5 text-xs font-jost font-light text-muted-foreground hover:text-foreground transition-colors"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={sendLink} className="space-y-3">
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="your@email.com"
                required
                disabled={loginState === "sending"}
                className="w-full border border-border px-4 py-3 text-sm font-jost font-light placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background disabled:opacity-50"
              />

              {loginError && (
                <p className="text-xs text-destructive font-jost font-light">{loginError}</p>
              )}

              <button
                type="submit"
                disabled={loginState === "sending" || !loginEmail.trim()}
                className="w-full bg-forest text-parchment py-3.5 text-sm font-jost font-medium tracking-[0.06em] hover:bg-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loginState === "sending" ? "Sending…" : "Send sign-in link"}
              </button>
            </form>
          )}

          {/* Google OAuth option */}
          <div className="mt-5 flex items-center gap-4">
            <span className="flex-1 h-px bg-border" />
            <span className="text-[10px] font-jost font-light text-muted-foreground">or</span>
            <span className="flex-1 h-px bg-border" />
          </div>

          <a
            href={session.googleAuthUrl({ redirect: "/my-plans" })}
            className="mt-4 w-full flex items-center justify-center gap-3 border border-border py-3 text-sm font-jost font-light text-foreground hover:border-primary hover:text-primary transition-colors"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </a>

          <p className="mt-8 text-center text-xs font-jost font-light text-muted-foreground">
            Want to plan first?{" "}
            <Link to="/start" className="text-primary hover:underline">
              Plan a trip →
            </Link>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-hero-mesh">
      <header className="pt-8 pb-6">
        <div className="mx-auto max-w-3xl px-6 flex items-center justify-between">
          <KarijeLogo />

          <div className="flex items-center gap-3">
            {user.picture && (
              <img src={user.picture} alt={user.name || "You"} className="w-8 h-8 rounded-full ring-hairline" referrerPolicy="no-referrer" />
            )}
            <span className="hidden sm:block text-xs text-muted-foreground truncate max-w-[160px]">{user.email}</span>
            <button
              onClick={() => { signOut(); navigate("/"); }}
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
            {user.name ? `Welcome back, ${user.name.split(" ")[0]}.` : "Welcome back."} All your saved squad plans are here.
          </p>
        </div>

        {/* Plan a new trip CTA */}
        <Link
          to="/start"
          className="group flex items-center justify-between border border-border p-6 hover:border-forest hover:shadow-card transition-all"
        >
          <div>
            <div className="font-marcellus text-xl text-foreground">Plan a new trip</div>
            <div className="font-jost font-light text-sm text-muted-foreground mt-0.5">
              Interstate or local experience — you pick the type first
            </div>
          </div>
          <div className="w-10 h-10 bg-forest text-parchment grid place-items-center shrink-0 group-hover:bg-primary transition-colors">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
                      to={`/start/trip?job=${p.tripId}`}
                      className="block rounded-3xl bg-card ring-hairline shadow-card p-6 hover:shadow-md transition-shadow"
                    >
                      <PlanCard p={p} s={s} date={date} perPerson={perPerson} total={total} />
                    </Link>
                  ) : p.status === 'awaiting_group' ? (
                    <div className="rounded-3xl bg-card ring-hairline shadow-card p-6 space-y-4">
                      <PlanCard p={p} s={s} date={date} perPerson={perPerson} total={total} />
                      {/* Share link + participant count + payment progress */}
                      <div className="border-t border-border pt-4 space-y-3">
                        <div className="flex items-center justify-between gap-4 flex-wrap">
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
                        {/* Payment collection progress */}
                        {(p.paidCount ?? 0) > 0 && (
                          <div>
                            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                              <span>{p.paidCount} / {p.squadSize || "?"} paid</span>
                              <span className="font-medium text-foreground">{fmtNGN(p.totalCollected ?? 0)} collected</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-secondary/60 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-primary transition-all"
                                style={{
                                  width: `${p.squadSize && p.paidCount ? Math.min(100, (p.paidCount / p.squadSize) * 100) : 0}%`
                                }}
                              />
                            </div>
                          </div>
                        )}
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
