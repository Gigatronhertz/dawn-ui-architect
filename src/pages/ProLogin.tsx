import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api, session } from "@/lib/api";

type Mode        = "password" | "magic" | "signup";
type SubmitState = "idle" | "busy" | "sent" | "err";

/* ─── Karije Pro wordmark ────────────────────────────────────────────────── */
const ProMark = () => (
  <Link to="/pro" className="flex items-center gap-2.5 justify-center mb-10 group">
    <span className="grid place-items-center w-9 h-9 rounded-xl bg-gradient-primary text-primary-foreground shadow-soft">
      <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l3 7 7 .8-5.3 4.7L18.5 22 12 18l-6.5 4 1.8-7.5L2 9.8 9 9z" />
      </svg>
    </span>
    <span className="font-display text-xl font-semibold tracking-tight">
      Karije{" "}
      <span className="ml-1 text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-foreground text-background align-middle">
        Pro
      </span>
    </span>
  </Link>
);

/* ─── Main page ──────────────────────────────────────────────────────────── */
export default function ProLogin() {
  const { user, loading, getIdToken } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode]         = useState<Mode>("password");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [st, setSt]             = useState<SubmitState>("idle");
  const [err, setErr]           = useState("");
  const [sentTo, setSentTo]     = useState("");
  const [sentKind, setSentKind] = useState<"magic" | "verify">("magic");
  // Only set when the backend has no Resend key — lets local testing finish
  // the verify step without an inbox.
  const [preview, setPreview]   = useState("");

  /* Reset field error whenever user types */
  const resetErr = () => { if (st === "err") { setSt("idle"); setErr(""); } };

  /* ── Once signed in, route based on pro profile ─────────────────────────── */
  useEffect(() => {
    if (loading || !user) return;
    const token = getIdToken();
    if (!token) return;
    api.getProMe(token)
      .then(() => navigate("/pro/dashboard", { replace: true }))
      .catch(() => navigate("/pro/setup",    { replace: true }));
  }, [user, loading, getIdToken, navigate]);

  /* ── Email + password sign-in ────────────────────────────────────────────── */
  async function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setSt("busy"); setErr("");
    try {
      const { token } = await api.login({ email: email.trim(), password });
      session.save(token);
      // AuthContext will pick up the new token on next render, triggering the
      // useEffect above which routes to dashboard or setup.
      // Trigger a page reload so AuthContext re-reads localStorage.
      window.location.href = "/pro/login";
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Sign in failed. Check your email and password.");
      setSt("err");
    }
  }

  /* ── Magic-link sign-in ──────────────────────────────────────────────────── */
  async function handleMagic(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSt("busy"); setErr("");
    try {
      await api.sendMagicLink({ email: email.trim(), redirect: "/pro/login" });
      setSentTo(email.trim());
      setSentKind("magic");
      setSt("sent");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      setSt("err");
    }
  }

  /* ── Create an account ───────────────────────────────────────────────────── */
  // The account is created unverified: /auth/login answers 403 until the
  // emailed link is clicked, so this lands on the check-your-inbox state
  // rather than signing anyone straight in.
  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || password.length < 8) return;
    setSt("busy"); setErr("");
    try {
      const res = await api.signup({ email: email.trim(), password });
      setSentTo(email.trim());
      setSentKind("verify");
      setPreview(res?.preview ?? "");
      setSt("sent");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not create the account. Please try again.");
      setSt("err");
    }
  }

  /* ── Loading spinner while auth state resolves ───────────────────────────── */
  if (loading) {
    return (
      <main className="min-h-screen bg-background grid place-items-center">
        <div className="w-8 h-8 rounded-full border-2 border-foreground border-t-transparent animate-spin" />
      </main>
    );
  }

  /* ── Already signed in — routing in progress ─────────────────────────────── */
  if (user) {
    return (
      <main className="min-h-screen bg-background grid place-items-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground text-sm">
          <div className="w-8 h-8 rounded-full border-2 border-foreground border-t-transparent animate-spin" />
          <span>Loading your Pro dashboard…</span>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">

        <ProMark />

        {/* ── Card ──────────────────────────────────────────────────────────── */}
        <div className="rounded-3xl bg-card ring-hairline shadow-card p-8">
          <h1 className="font-display text-2xl font-semibold text-center">
            {mode === "signup" ? "Create an agency account" : "Agency login"}
          </h1>
          <p className="text-sm text-muted-foreground text-center mt-1 mb-6">
            {mode === "signup"
              ? "For travel agencies and events planners"
              : "Sign in as a travel agency or events planner"}
          </p>

          {/* Mode toggle — sign-in only; signup is its own view */}
          {mode !== "signup" && (
          <div className="flex rounded-xl bg-secondary/60 p-0.5 mb-6 gap-0.5">
            {(["password", "magic"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setSt("idle"); setErr(""); setSentTo(""); }}
                className={`flex-1 text-[12px] font-medium py-1.5 rounded-[10px] transition-all ${
                  mode === m
                    ? "bg-card shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "password" ? "🔑 Password" : "✉️ Email link"}
              </button>
            ))}
          </div>
          )}

          {/* ── Sent state ──────────────────────────────────────────────────── */}
          {st === "sent" ? (
            <div className="rounded-2xl bg-primary/[0.08] ring-1 ring-primary/20 px-5 py-5 text-center space-y-2">
              <div className="text-2xl">📬</div>
              <div className="font-semibold text-sm">Check your inbox</div>
              <p className="text-muted-foreground text-[13px] leading-relaxed">
                {sentKind === "verify" ? "We emailed a verification link to" : "We emailed a sign-in link to"}{" "}
                <strong className="text-foreground">{sentTo}</strong>.
                {sentKind === "verify"
                  ? " Click it to activate your account, then sign in."
                  : " Click it to access your Pro dashboard."}
              </p>
              {preview && (
                <a
                  href={preview}
                  className="block text-[11px] text-foreground underline break-all pt-1"
                >
                  Email is not configured on this server — verify directly →
                </a>
              )}
              <button
                type="button"
                onClick={() => { setSt("idle"); setSentTo(""); }}
                className="mt-1 text-[12px] text-foreground hover:underline"
              >
                Resend →
              </button>
            </div>

          /* ── Password form ──────────────────────────────────────────────── */
          ) : mode === "password" ? (
            <form onSubmit={handlePassword} className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); resetErr(); }}
                placeholder="your@email.com"
                required
                autoFocus
                autoComplete="email"
                className="w-full rounded-xl bg-secondary/60 ring-hairline px-4 py-3 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
              />
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); resetErr(); }}
                  placeholder="Password"
                  required
                  autoComplete="current-password"
                  className="w-full rounded-xl bg-secondary/60 ring-hairline px-4 py-3 pr-14 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-medium text-muted-foreground hover:text-foreground transition px-1"
                >
                  {showPass ? "Hide" : "Show"}
                </button>
              </div>

              {st === "err" && (
                <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2 leading-relaxed">
                  {err}
                </p>
              )}

              <button
                type="submit"
                disabled={st === "busy" || !email.trim() || !password}
                className="w-full rounded-lg bg-gradient-primary text-primary-foreground py-3 text-sm font-medium shadow-glow hover:scale-[1.01] active:scale-[0.99] transition-transform disabled:opacity-50 disabled:scale-100"
              >
                {st === "busy" ? "Signing in…" : "Sign in →"}
              </button>

              <button
                type="button"
                onClick={() => { setMode("magic"); setSt("idle"); setErr(""); }}
                className="w-full text-center text-[12px] text-muted-foreground hover:text-foreground transition pt-1"
              >
                Forgot password? Use email link instead →
              </button>
            </form>

          /* ── Sign-up form ───────────────────────────────────────────────── */
          ) : mode === "signup" ? (
            <form onSubmit={handleSignup} className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); resetErr(); }}
                placeholder="your@email.com"
                required
                autoFocus
                autoComplete="email"
                className="w-full rounded-xl bg-secondary/60 ring-hairline px-4 py-3 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
              />
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); resetErr(); }}
                  placeholder="Password — 8 characters or more"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="w-full rounded-xl bg-secondary/60 ring-hairline px-4 py-3 pr-14 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-medium text-muted-foreground hover:text-foreground transition px-1"
                >
                  {showPass ? "Hide" : "Show"}
                </button>
              </div>

              {st === "err" && (
                <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2 leading-relaxed">
                  {err}
                </p>
              )}

              <button
                type="submit"
                disabled={st === "busy" || !email.trim() || password.length < 8}
                className="w-full rounded-lg bg-gradient-primary text-primary-foreground py-3 text-sm font-medium shadow-glow hover:scale-[1.01] active:scale-[0.99] transition-transform disabled:opacity-50 disabled:scale-100"
              >
                {st === "busy" ? "Creating your account…" : "Create account →"}
              </button>

              <button
                type="button"
                onClick={() => { setMode("password"); setSt("idle"); setErr(""); }}
                className="w-full text-center text-[12px] text-muted-foreground hover:text-foreground transition pt-1"
              >
                Already have an account? Sign in →
              </button>
            </form>

          /* ── Magic link form ────────────────────────────────────────────── */
          ) : (
            <form onSubmit={handleMagic} className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); resetErr(); }}
                placeholder="your@email.com"
                required
                autoFocus
                autoComplete="email"
                className="w-full rounded-xl bg-secondary/60 ring-hairline px-4 py-3 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
              />

              {st === "err" && (
                <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2 leading-relaxed">
                  {err}
                </p>
              )}

              <button
                type="submit"
                disabled={st === "busy" || !email.trim()}
                className="w-full rounded-lg bg-gradient-primary text-primary-foreground py-3 text-sm font-medium shadow-glow hover:scale-[1.01] active:scale-[0.99] transition-transform disabled:opacity-50 disabled:scale-100"
              >
                {st === "busy" ? "Sending…" : "Send sign-in link →"}
              </button>

              <p className="text-center text-[12px] text-muted-foreground pt-0.5">
                No password needed — we'll email a secure link.
              </p>
            </form>
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div className="mt-6 text-center space-y-3">
          <p className="text-[13px] text-muted-foreground">
            {mode === "signup" ? "Already running trips with Karije?" : "New agency?"}{" "}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "signup" ? "password" : "signup");
                setSt("idle"); setErr(""); setSentTo(""); setPreview("");
              }}
              className="text-foreground hover:underline font-medium"
            >
              {mode === "signup" ? "Sign in →" : "Create an account →"}
            </button>
          </p>
          <p className="text-[12px] text-muted-foreground/70">
            <Link to="/pro" className="hover:text-foreground transition">
              See what Pro does →
            </Link>
          </p>
          <Link
            to="/"
            className="block text-[12px] text-muted-foreground/50 hover:text-muted-foreground transition"
          >
            ← Back to Karije
          </Link>
        </div>

      </div>
    </main>
  );
}
