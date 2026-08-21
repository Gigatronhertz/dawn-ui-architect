/**
 * /login — General traveller login page.
 * Mirrors the auth section that was buried inside MyPlans,
 * now a proper standalone page. Supports email+password,
 * account creation, and magic-link sign-in.
 *
 * After successful login, redirects to ?next= param (default /my-plans).
 */
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api, session } from "@/lib/api";
import { KarijeLogo } from "@/components/Nav";

type AuthMode    = "signin" | "signup" | "magic";
type SubmitState = "idle" | "busy" | "done" | "err";

export default function Login() {
  const { user, loading } = useAuth();
  const navigate          = useNavigate();
  const [searchParams]    = useSearchParams();
  /**
   * Where to land after signing in. `redirect` is accepted alongside `next`
   * because links around the app were written with it — and reading only
   * `next` meant those silently dropped people on /my-plans, losing whatever
   * they were in the middle of making.
   */
  const nextUrl           = searchParams.get("next") || searchParams.get("redirect") || "/my-plans";

  const verified  = searchParams.get("verified")   === "1";
  const authError = searchParams.get("auth_error");

  const [authMode,     setAuthMode]     = useState<AuthMode>("signin");
  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [confirm,      setConfirm]      = useState("");
  const [showPass,     setShowPass]     = useState(false);
  const [submitState,  setSubmitState]  = useState<SubmitState>("idle");
  const [submitErr,    setSubmitErr]    = useState("");
  const [sentTo,       setSentTo]       = useState("");

  // Already logged in — send to destination
  useEffect(() => {
    if (!loading && user) navigate(nextUrl, { replace: true });
  }, [user, loading, navigate, nextUrl]);

  useEffect(() => { document.title = "Sign in · Karije"; }, []);

  function resetForm(mode: AuthMode) {
    setAuthMode(mode);
    setPassword(""); setConfirm("");
    setSubmitState("idle"); setSubmitErr(""); setSentTo("");
  }

  // ── Sign-in ───────────────────────────────────────────────────────────────
  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setSubmitState("busy"); setSubmitErr("");
    try {
      const { token } = await api.login({ email: email.trim(), password });
      session.save(token);
      window.location.href = nextUrl;          // full reload so AuthContext picks up token
    } catch (err) {
      setSubmitErr(err instanceof Error ? err.message : "Sign in failed. Check your email and password.");
      setSubmitState("err");
    }
  }

  // ── Sign-up ───────────────────────────────────────────────────────────────
  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    if (password !== confirm) { setSubmitErr("Passwords don't match."); setSubmitState("err"); return; }
    setSubmitState("busy"); setSubmitErr("");
    try {
      const res = await api.signup({ email: email.trim(), password });
      setSentTo(email.trim());
      setSubmitState("done");
      if (res.preview) console.info("[signup] verify link:", res.preview);
    } catch (err) {
      setSubmitErr(err instanceof Error ? err.message : "Sign up failed.");
      setSubmitState("err");
    }
  }

  // ── Magic link ────────────────────────────────────────────────────────────
  async function handleMagic(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitState("busy"); setSubmitErr("");
    try {
      await api.sendMagicLink({ email: email.trim(), redirect: nextUrl });
      setSentTo(email.trim());
      setSubmitState("done");
    } catch (err) {
      setSubmitErr(err instanceof Error ? err.message : "Something went wrong. Try again.");
      setSubmitState("err");
    }
  }

  const isBusy = submitState === "busy";

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <main className="min-h-screen bg-background grid place-items-center">
      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </main>
  );

  // ── Already signed in (routing) ───────────────────────────────────────────
  if (user) return (
    <main className="min-h-screen bg-background grid place-items-center">
      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </main>
  );

  // ── "Check inbox" state ───────────────────────────────────────────────────
  if (submitState === "done") {
    const isSignup = authMode === "signup";
    return (
      <main className="min-h-screen bg-background flex flex-col">
        <header className="pt-8 pb-6">
          <div className="mx-auto max-w-3xl px-6 flex items-center justify-between">
            <KarijeLogo />
            <Link to="/" className="text-xs font-jost font-light text-muted-foreground hover:text-foreground transition-colors">← Home</Link>
          </div>
        </header>
        <div className="mx-auto max-w-sm w-full px-6 pb-24 mt-8 flex-1 lg:flex lg:flex-col lg:justify-center lg:mt-0">
          <div className="border border-border p-8 text-center">
            <div className="text-4xl mb-4">{isSignup ? "📬" : "✉️"}</div>
            <div className="font-marcellus text-xl text-foreground mb-3">
              {isSignup ? "Verify your email" : "Check your inbox"}
            </div>
            <p className="font-jost font-light text-sm text-muted-foreground leading-relaxed">
              {isSignup
                ? <><span>We sent a verification link to </span><strong className="text-foreground">{sentTo}</strong><span>. Click it to activate your account, then sign in.</span></>
                : <><span>We sent a sign-in link to </span><strong className="text-foreground">{sentTo}</strong><span>. Tap it to open your plans.</span></>
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

  // ── Main login page ───────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-background flex flex-col">
      <header className="pt-8 pb-6">
        <div className="mx-auto max-w-3xl px-6 flex items-center justify-between">
          <KarijeLogo />
          <Link to="/" className="text-xs font-jost font-light text-muted-foreground hover:text-foreground transition-colors">← Home</Link>
        </div>
      </header>

      <div className="mx-auto max-w-sm w-full px-6 pb-24 flex-1 lg:flex lg:flex-col lg:justify-center">
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

        {/* Heading */}
        <h1 className="font-marcellus text-3xl text-foreground mb-1">
          {authMode === "signin" ? "Sign in" : authMode === "signup" ? "Create account" : "Email link"}
        </h1>
        <p className="font-jost font-light text-sm text-muted-foreground mb-7 leading-relaxed">
          {authMode === "signin"
            ? "Access your trip plans and squad payments."
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
              type="email" value={email} required disabled={isBusy}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full border border-border px-4 py-3 text-sm font-jost font-light placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background disabled:opacity-50"
            />
            <div className="relative">
              <input
                type={showPass ? "text" : "password"} value={password} required disabled={isBusy}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full border border-border px-4 py-3 pr-12 text-sm font-jost font-light placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background disabled:opacity-50"
              />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs font-jost font-light">
                {showPass ? "Hide" : "Show"}
              </button>
            </div>

            {submitErr && <p className="text-xs text-destructive font-jost font-light">{submitErr}</p>}

            <button type="submit" disabled={isBusy || !email.trim() || !password}
              className="w-full bg-forest text-parchment py-3.5 text-sm font-jost font-medium tracking-[0.06em] hover:bg-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {isBusy ? "Signing in…" : "Sign in"}
            </button>

            <button type="button" onClick={() => resetForm("magic")}
              className="w-full py-2 text-xs font-jost font-light text-muted-foreground hover:text-foreground transition-colors text-center">
              Forgot password? Get a sign-in link instead →
            </button>
          </form>
        )}

        {/* ── Sign-up form ── */}
        {authMode === "signup" && (
          <form onSubmit={handleSignUp} className="space-y-3">
            <input
              type="email" value={email} required disabled={isBusy}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full border border-border px-4 py-3 text-sm font-jost font-light placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background disabled:opacity-50"
            />
            <div className="relative">
              <input
                type={showPass ? "text" : "password"} value={password} required minLength={8} disabled={isBusy}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (min. 8 characters)"
                className="w-full border border-border px-4 py-3 pr-12 text-sm font-jost font-light placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background disabled:opacity-50"
              />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs font-jost font-light">
                {showPass ? "Hide" : "Show"}
              </button>
            </div>
            <input
              type={showPass ? "text" : "password"} value={confirm} required disabled={isBusy}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirm password"
              className="w-full border border-border px-4 py-3 text-sm font-jost font-light placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background disabled:opacity-50"
            />

            {submitErr && <p className="text-xs text-destructive font-jost font-light">{submitErr}</p>}

            <button type="submit" disabled={isBusy || !email.trim() || !password || !confirm}
              className="w-full bg-forest text-parchment py-3.5 text-sm font-jost font-medium tracking-[0.06em] hover:bg-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {isBusy ? "Creating account…" : "Create account"}
            </button>
          </form>
        )}

        {/* ── Magic-link form ── */}
        {authMode === "magic" && (
          <form onSubmit={handleMagic} className="space-y-3">
            <input
              type="email" value={email} required disabled={isBusy}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full border border-border px-4 py-3 text-sm font-jost font-light placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background disabled:opacity-50"
            />

            {submitErr && <p className="text-xs text-destructive font-jost font-light">{submitErr}</p>}

            <button type="submit" disabled={isBusy || !email.trim()}
              className="w-full bg-forest text-parchment py-3.5 text-sm font-jost font-medium tracking-[0.06em] hover:bg-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {isBusy ? "Sending…" : "Send sign-in link"}
            </button>
            <p className="text-center text-xs font-jost font-light text-muted-foreground pt-0.5">
              No password needed — we'll email a secure link.
            </p>
            <button type="button" onClick={() => resetForm("signin")}
              className="w-full py-1.5 text-xs font-jost font-light text-muted-foreground hover:text-foreground transition-colors text-center">
              ← Back to sign in
            </button>
          </form>
        )}

        {/* Footer links */}
        <div className="mt-8 flex items-center justify-center gap-5">
          <Link to="/pro/login"
            className="text-xs font-jost font-light text-muted-foreground hover:text-foreground transition-colors">
            Agency / Pro login →
          </Link>
        </div>
      </div>
    </main>
  );
}
