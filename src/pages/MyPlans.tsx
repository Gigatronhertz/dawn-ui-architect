import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api, type UserPlan, type SquadMember } from "@/lib/api";
import { KarijeLogo } from "@/components/Nav";

const fmtNGN = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n);

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  generating:     { label: "Generating…", color: "text-google-blue bg-google-blue/10" },
  plan_review:    { label: "Ready",       color: "text-google-green bg-google-green/10" },
  awaiting_group: { label: "Confirmed",   color: "text-primary bg-primary/10" },
  curated:        { label: "Ready to share", color: "text-primary bg-primary/10" },
  custom:         { label: "Ready to share", color: "text-primary bg-primary/10" },
  error:          { label: "Failed",      color: "text-destructive bg-destructive/10" },
};

/** Statuses whose plan has a public page a squad can open and pay on. */
const SHAREABLE_STATUS = ["curated", "custom", "awaiting_group"];

type AuthMode = "signin" | "signup" | "magic";
type SubmitState = "idle" | "busy" | "done" | "err";

export default function MyPlans() {
  const { user, loading, signOut, getIdToken } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [plans, setPlans]     = useState<UserPlan[]>([]);
  const [fetching, setFetching] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  // ── Auth form state ───────────────────────────────────────────────────────
  const [authMode, setAuthMode]       = useState<AuthMode>("signin");
  const [email, setEmail]             = useState("");
  const [password, setPassword]       = useState("");
  const [confirm, setConfirm]         = useState("");
  const [showPass, setShowPass]       = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [submitErr, setSubmitErr]     = useState("");
  const [sentTo, setSentTo]           = useState("");

  // URL params passed back from /auth/verify-email or on auth_error
  const verified  = searchParams.get("verified") === "1";
  const authError = searchParams.get("auth_error");

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

  function resetForm(mode: AuthMode) {
    setAuthMode(mode);
    setPassword("");
    setConfirm("");
    setSubmitState("idle");
    setSubmitErr("");
    setSentTo("");
  }

  // ── Sign-in handler ───────────────────────────────────────────────────────
  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setSubmitState("busy");
    setSubmitErr("");
    try {
      const { token } = await api.login({ email: email.trim(), password });
      // Hand the JWT to AuthContext via the URL param it already reads on mount
      navigate(`/my-plans?token=${encodeURIComponent(token)}`, { replace: true });
    } catch (err) {
      setSubmitErr(err instanceof Error ? err.message : "Sign in failed.");
      setSubmitState("err");
    }
  }

  // ── Sign-up handler ───────────────────────────────────────────────────────
  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    if (password !== confirm) {
      setSubmitErr("Passwords don't match.");
      setSubmitState("err");
      return;
    }
    setSubmitState("busy");
    setSubmitErr("");
    try {
      const res = await api.signup({ email: email.trim(), password });
      setSentTo(email.trim());
      setSubmitState("done");
      // Dev mode — show preview link in console for local testing
      if (res.preview) console.info("[signup] verify link:", res.preview);
    } catch (err) {
      setSubmitErr(err instanceof Error ? err.message : "Sign up failed.");
      setSubmitState("err");
    }
  }

  // ── Magic-link handler ────────────────────────────────────────────────────
  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitState("busy");
    setSubmitErr("");
    try {
      await api.sendMagicLink({ email: email.trim(), redirect: "/my-plans" });
      setSentTo(email.trim());
      setSubmitState("done");
    } catch (err) {
      setSubmitErr(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setSubmitState("err");
    }
  }

  // ── Loading spinner (auth check still running) ────────────────────────────
  if (loading) {
    return (
      <main className="min-h-screen bg-background grid place-items-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </main>
    );
  }

  // ── Not logged in — redirect to dedicated login page ─────────────────────
  if (!user) return <Navigate to="/login?next=/my-plans" replace />;

  // (dead code below — kept for safety until we confirm the redirect works)
  if (false) {
    const isBusy = submitState === "busy";

    // "Check your inbox" state — shown after successful signup or magic-link send
    if (submitState === "done") {
      const isSignup = authMode === "signup";
      return (
        <main className="min-h-screen bg-background">
          <header className="pt-8 pb-6">
            <div className="mx-auto max-w-3xl lg:max-w-5xl px-6 flex items-center justify-between">
              <KarijeLogo />
              <Link to="/" className="text-xs font-jost font-light text-muted-foreground hover:text-foreground transition-colors">← Home</Link>
            </div>
          </header>
          <div className="mx-auto max-w-sm px-6 pb-24">
            <div className="border border-border p-8 text-center mt-8">
              <div className="text-4xl mb-4">{isSignup ? "📬" : "✉️"}</div>
              <div className="font-marcellus text-xl text-foreground mb-3">
                {isSignup ? "Verify your email" : "Check your inbox"}
              </div>
              <p className="font-jost font-light text-sm text-muted-foreground leading-relaxed">
                {isSignup
                  ? <>We sent a verification link to <strong className="text-foreground">{sentTo}</strong>. Click it to activate your account, then sign in.</>
                  : <>We sent a sign-in link to <strong className="text-foreground">{sentTo}</strong>. Tap it to access your plans.</>
                }
              </p>
              <button
                onClick={() => { setSubmitState("idle"); setSentTo(""); }}
                className="mt-6 text-xs font-jost font-light text-muted-foreground hover:text-foreground transition-colors"
              >
                Use a different email
              </button>
            </div>
          </div>
        </main>
      );
    }

    return (
      <main className="min-h-screen bg-background">
        <header className="pt-8 pb-6">
          <div className="mx-auto max-w-3xl px-6 flex items-center justify-between">
            <KarijeLogo />
            <Link to="/" className="text-xs font-jost font-light text-muted-foreground hover:text-foreground transition-colors">← Home</Link>
          </div>
        </header>

        <div className="mx-auto max-w-sm px-6 pb-24">
          {/* Eyebrow */}
          <div className="flex items-center gap-4 mb-6">
            <span className="h-px w-8 bg-primary" />
            <span className="text-[10px] font-jost font-light tracking-label text-muted-foreground uppercase">Your account</span>
          </div>

          {/* Verified banner */}
          {verified && (
            <div className="mb-6 border border-primary/30 bg-primary/5 px-4 py-3 flex items-center gap-3">
              <span className="text-lg">✅</span>
              <p className="font-jost font-light text-sm text-foreground">Email verified! Sign in below to access your plans.</p>
            </div>
          )}

          {/* Auth error banner */}
          {authError && (
            <div className="mb-6 border border-destructive/30 bg-destructive/5 px-4 py-3">
              <p className="font-jost font-light text-sm text-destructive">
                {authError === "token_expired" ? "That link has expired. Request a new one below." :
                 authError === "token_used"    ? "That link has already been used. Request a fresh one." :
                                                 "Something went wrong with the sign-in link. Try again."}
              </p>
            </div>
          )}

          {/* Mode heading */}
          <h1 className="font-marcellus text-3xl text-foreground mb-1">
            {authMode === "signin" ? "Sign in" : authMode === "signup" ? "Create account" : "Email link"}
          </h1>
          <p className="font-jost font-light text-sm text-muted-foreground mb-7 leading-relaxed">
            {authMode === "signin"
              ? "Use your email and password to access your plans."
              : authMode === "signup"
              ? "Set up your Karije account. We'll send a verification email."
              : "We'll send a sign-in link — no password needed."}
          </p>

          {/* Tab switcher */}
          <div className="flex gap-1 mb-7 border-b border-border">
            {(["signin", "signup"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => resetForm(mode)}
                className={`pb-2.5 text-xs font-jost font-medium mr-4 border-b-2 transition-colors ${
                  authMode === mode
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {mode === "signin" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          {/* ── Sign-in form ── */}
          {authMode === "signin" && (
            <form onSubmit={handleSignIn} className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                disabled={isBusy}
                className="w-full border border-border px-4 py-3 text-sm font-jost font-light placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background disabled:opacity-50"
              />
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  disabled={isBusy}
                  className="w-full border border-border px-4 py-3 pr-12 text-sm font-jost font-light placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs font-jost font-light"
                >
                  {showPass ? "Hide" : "Show"}
                </button>
              </div>

              {submitErr && (
                <p className="text-xs text-destructive font-jost font-light">{submitErr}</p>
              )}

              <button
                type="submit"
                disabled={isBusy || !email.trim() || !password}
                className="w-full bg-forest text-parchment py-3.5 text-sm font-jost font-medium tracking-[0.06em] hover:bg-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isBusy ? "Signing in…" : "Sign in"}
              </button>

              <button
                type="button"
                onClick={() => resetForm("magic")}
                className="w-full py-2 text-xs font-jost font-light text-muted-foreground hover:text-foreground transition-colors text-center"
              >
                Forgot password? Use email link instead →
              </button>
            </form>
          )}

          {/* ── Sign-up form ── */}
          {authMode === "signup" && (
            <form onSubmit={handleSignUp} className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                disabled={isBusy}
                className="w-full border border-border px-4 py-3 text-sm font-jost font-light placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background disabled:opacity-50"
              />
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password (min. 8 characters)"
                  required
                  minLength={8}
                  disabled={isBusy}
                  className="w-full border border-border px-4 py-3 pr-12 text-sm font-jost font-light placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs font-jost font-light"
                >
                  {showPass ? "Hide" : "Show"}
                </button>
              </div>
              <input
                type={showPass ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Confirm password"
                required
                disabled={isBusy}
                className="w-full border border-border px-4 py-3 text-sm font-jost font-light placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background disabled:opacity-50"
              />

              {submitErr && (
                <p className="text-xs text-destructive font-jost font-light">{submitErr}</p>
              )}

              <button
                type="submit"
                disabled={isBusy || !email.trim() || password.length < 8 || !confirm}
                className="w-full bg-forest text-parchment py-3.5 text-sm font-jost font-medium tracking-[0.06em] hover:bg-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isBusy ? "Creating account…" : "Create account"}
              </button>
            </form>
          )}

          {/* ── Magic-link form ── */}
          {authMode === "magic" && (
            <form onSubmit={handleMagicLink} className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                disabled={isBusy}
                className="w-full border border-border px-4 py-3 text-sm font-jost font-light placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background disabled:opacity-50"
              />

              {submitErr && (
                <p className="text-xs text-destructive font-jost font-light">{submitErr}</p>
              )}

              <button
                type="submit"
                disabled={isBusy || !email.trim()}
                className="w-full bg-forest text-parchment py-3.5 text-sm font-jost font-medium tracking-[0.06em] hover:bg-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isBusy ? "Sending…" : "Send sign-in link"}
              </button>

              <button
                type="button"
                onClick={() => resetForm("signin")}
                className="w-full py-2 text-xs font-jost font-light text-muted-foreground hover:text-foreground transition-colors text-center"
              >
                ← Back to sign in
              </button>
            </form>
          )}

          <p className="mt-8 text-center text-xs font-jost font-light text-muted-foreground">
            Want to plan first?{" "}
            <Link to="/start" className="text-primary hover:underline">Plan a trip →</Link>
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

      <div className="mx-auto max-w-3xl lg:max-w-5xl px-6 pb-24 space-y-6">
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
          <ol className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {plans.map((p) => {
              const s = STATUS_LABEL[p.status] ?? { label: p.status, color: "text-muted-foreground bg-secondary" };
              const perPerson = p.plan?.cost_breakdown?.per_person;
              const date = new Date(p.createdAt * 1000).toLocaleDateString("en-NG", { day: "numeric", month: "short" });
              // Awaiting-group plans have more content (participants + payment bar) — they go full-width
              const isActive = p.status === 'awaiting_group';
              return (
                <li key={p.tripId} className={isActive ? "col-span-2 lg:col-span-3" : ""}>
                  {p.status === 'plan_review' ? (
                    <Link
                      to={`/start/trip?job=${p.tripId}`}
                      className="group flex flex-col aspect-[4/5] bg-card ring-hairline shadow-card p-4 hover:border-primary hover:shadow-md transition-all overflow-hidden"
                    >
                      <PlanCardSquare p={p} s={s} date={date} perPerson={perPerson} />
                    </Link>
                  ) : p.status === 'awaiting_group' ? (
                    <div className="bg-card ring-hairline shadow-card p-5 space-y-4">
                      {/* Compact trip header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${s.color}`}>{s.label}</span>
                            <span className="text-[11px] text-muted-foreground">{date}</span>
                          </div>
                          <div className="font-display font-semibold truncate">{p.origin || "—"} → {p.destination || "—"}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {p.days ? `${p.days}d` : "—"}{p.squadSize ? ` · ${p.squadSize} people` : ""}
                          </div>
                        </div>
                        {perPerson && (
                          <div className="text-right shrink-0">
                            <div className="font-display font-semibold text-primary">{fmtNGN(perPerson)}</div>
                            <div className="text-[10px] text-muted-foreground">/person</div>
                          </div>
                        )}
                      </div>
                      {/* Squad + payment */}
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
                            className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 text-primary px-4 py-2 text-xs font-semibold hover:bg-primary/15 transition"
                          >
                            View squad page →
                          </Link>
                        </div>
                        {(p.paidCount ?? 0) > 0 && (
                          <div>
                            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                              <span>{p.paidCount} / {p.squadSize || "?"} paid</span>
                              <span className="font-medium text-foreground">{fmtNGN(p.totalCollected ?? 0)} collected</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-secondary/60 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-primary transition-all"
                                style={{ width: `${p.squadSize && p.paidCount ? Math.min(100, (p.paidCount / p.squadSize) * 100) : 0}%` }}
                              />
                            </div>
                          </div>
                        )}

                        <SquadPanel tripId={p.tripId} count={p.participantCount ?? 0} />
                      </div>
                    </div>
                  ) : SHAREABLE_STATUS.includes(p.status) ? (
                    // Curated and self-built trips: the card opens the page the
                    // squad sees, which is where the shareable link lives.
                    <Link
                      to={`/plan/${p.tripId}`}
                      className="group flex flex-col aspect-[4/5] bg-card ring-hairline shadow-card p-4 hover:border-primary hover:shadow-md transition-all overflow-hidden"
                    >
                      <PlanCardSquare p={p} s={s} date={date} perPerson={perPerson} />
                    </Link>
                  ) : (
                    <div className="flex flex-col aspect-[4/5] bg-card ring-hairline shadow-card p-4 overflow-hidden">
                      <PlanCardSquare p={p} s={s} date={date} perPerson={perPerson} />
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

/**
 * Turn whatever someone typed into a wa.me-safe number.
 * Nigerian numbers arrive as 0803…, +234803… or 234803… — all the same person.
 */
function waLink(raw: string | null): string | null {
  if (!raw) return null;
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("0")) d = `234${d.slice(1)}`;
  return d.length >= 10 ? `https://wa.me/${d}` : null;
}

/**
 * The organiser's chase list. Collapsed by default — it's only opened when
 * someone is actually working out who still owes money. Unpaid come first,
 * each with a one-tap WhatsApp link, so chasing works today without any
 * messaging provider wired up.
 */
function SquadPanel({ tripId, count }: { tripId: string; count: number }) {
  const { getIdToken } = useAuth();
  const [open, setOpen]     = useState(false);
  const [squad, setSquad]   = useState<SquadMember[] | null>(null);
  const [busy, setBusy]     = useState(false);
  const [err, setErr]       = useState("");

  async function toggle() {
    if (open) { setOpen(false); return; }
    setOpen(true);
    if (squad) return;
    setBusy(true);
    setErr("");
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Please sign in again.");
      const res = await api.getSquad(tripId, token);
      setSquad(res.squad);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not load the squad.");
    } finally {
      setBusy(false);
    }
  }

  if (count === 0) return null;

  const unpaid = squad?.filter(m => !m.paid) ?? [];

  return (
    <div className="border-t border-border pt-3">
      <button
        onClick={toggle}
        aria-expanded={open}
        className="w-full flex items-center justify-between text-xs font-semibold text-muted-foreground hover:text-foreground transition"
      >
        <span>{open ? "Hide" : "See"} who's in and who still owes</span>
        <span aria-hidden="true">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="mt-3 space-y-1.5">
          {busy && <p className="text-xs text-muted-foreground">Loading…</p>}
          {err && <p className="text-xs text-destructive">{err}</p>}

          {squad?.map((m, i) => {
            const wa = waLink(m.waNumber);
            return (
              <div key={i} className="flex items-center gap-2 text-xs bg-secondary/40 rounded-lg px-3 py-2">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${m.paid ? "bg-google-green" : "bg-muted-foreground/40"}`} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{m.name || "Someone"}</div>
                  {m.email && <div className="text-[10px] text-muted-foreground truncate">{m.email}</div>}
                </div>
                {m.paid ? (
                  <span className="text-[10px] font-semibold text-google-green shrink-0">Paid</span>
                ) : (
                  <>
                    {m.remindersSent > 0 ? (
                      <span className="text-[10px] text-muted-foreground shrink-0 hidden sm:inline">
                        nudged {m.remindersSent}×
                      </span>
                    ) : m.wantsReminders && (
                      <span className="text-[10px] text-muted-foreground shrink-0 hidden sm:inline">wants a reminder</span>
                    )}
                    {wa ? (
                      <a
                        href={wa}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-semibold text-primary hover:underline shrink-0"
                      >
                        Chase →
                      </a>
                    ) : (
                      <span className="text-[10px] text-muted-foreground shrink-0">No number</span>
                    )}
                  </>
                )}
              </div>
            );
          })}

          {squad && unpaid.length > 0 && (
            <p className="text-[10px] text-muted-foreground pt-1">
              {unpaid.length} still to pay. Automated reminders are coming — for now, tap Chase to
              message them yourself.
            </p>
          )}
          {squad && unpaid.length === 0 && (
            <p className="text-[10px] text-google-green font-medium pt-1">Everyone has paid 🎉</p>
          )}
        </div>
      )}
    </div>
  );
}

/** Square card for the 2-col plans grid — fills parent which has aspect-[4/5] */
function PlanCardSquare({ p, s, date, perPerson }: {
  p: UserPlan;
  s: { label: string; color: string };
  date: string;
  perPerson?: number;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Status + date */}
      <div className="flex items-center gap-1.5 flex-wrap mb-2">
        <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${s.color}`}>
          {s.label}
        </span>
        <span className="text-[10px] text-muted-foreground">{date}</span>
      </div>

      {/* Title. A trip inside one city has no route to show — "Lagos → Lagos"
          tells you nothing — so name it instead. */}
      <div className="font-marcellus text-base leading-snug">
        {p.plan?.curated?.name ? (
          <span className="text-foreground line-clamp-2">{p.plan.curated.name}</span>
        ) : p.origin && p.destination && p.origin === p.destination ? (
          <span className="text-foreground">A day out in {p.destination}</span>
        ) : (
          <>
            <span className="text-foreground">{p.origin || "—"}</span>
            <span className="text-muted-foreground/60 mx-1 text-sm">→</span>
            <span className="text-foreground">{p.destination || "—"}</span>
          </>
        )}
      </div>

      {/* Meta */}
      <div className="text-[11px] text-muted-foreground mt-1.5">
        {p.days ? `${p.days}d` : "—"}{p.squadSize ? ` · ${p.squadSize} pax` : ""}
      </div>
      {p.plan?.hotel && (
        <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
          🏨 {p.plan.hotel.name.split(" ").slice(0, 2).join(" ")}
        </div>
      )}

      {/* Price at bottom */}
      {perPerson && (
        <div className="mt-auto pt-2.5 border-t border-border/60">
          <div className="font-marcellus text-lg text-primary tabular-nums leading-none">{fmtNGN(perPerson)}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">/person</div>
        </div>
      )}

      {/* Tap hint for plan_review */}
      {p.status === 'plan_review' && (
        <div className="mt-1 text-[10px] text-primary font-jost font-medium group-hover:underline">
          Review plan →
        </div>
      )}
    </div>
  );
}
