import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy, CreditCard, Landmark, ShieldCheck } from "lucide-react";
import { api, type Escrow } from "@/lib/api";
import { normalisePhone } from "@/lib/phone";

const fmtNGN = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n);

/** Pandascrow reports times as "YYYY-MM-DD HH:MM:SS" in Lagos time (UTC+1). */
function expiryMs(s: string | null): number | null {
  if (!s) return null;
  const t = Date.parse(s.replace(" ", "T") + "+01:00");
  return Number.isFinite(t) ? t : null;
}

function useCountdown(target: number | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);
  if (!target) return null;
  const left = Math.max(0, target - now);
  const h = Math.floor(left / 3600000);
  const m = Math.floor((left % 3600000) / 60000);
  const s = Math.floor((left % 60000) / 1000);
  return { left, label: h > 0 ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m ${String(s).padStart(2, "0")}s` };
}

function CopyRow({ label, value, big = false }: { label: string; value: string; big?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center justify-between gap-3 py-3 border-b border-line last:border-b-0">
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className={`${big ? "font-display text-[28px] leading-tight tracking-wide" : "font-semibold text-base"} tabular-nums truncate`}>{value}</div>
      </div>
      <button
        type="button"
        onClick={() => { navigator.clipboard?.writeText(value.replace(/[₦,\s]/g, "")).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); }); }}
        className="shrink-0 inline-flex items-center gap-1.5 !rounded-full border border-line-strong px-3 py-1.5 text-xs font-semibold hover:border-foreground/50 transition-colors"
        aria-label={`Copy ${label.toLowerCase()}`}
      >
        {copied ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
      </button>
    </div>
  );
}

/**
 * Paying for your place, through escrow. Each traveller gets their own escrow:
 * a bank account issued just for this payment (transfer the exact amount and
 * it lands in escrow), or a card checkout. Nothing here believes the browser
 * about a payment — "paid" only ever comes from asking the server, which asks
 * Pandascrow.
 */
export function EscrowPay({
  tripId, participantId, perPerson, autoStart = false,
}: {
  tripId: string; participantId: string; perPerson: number; autoStart?: boolean;
}) {
  const [escrow, setEscrow]   = useState<Escrow | null>(null);
  const [paid, setPaid]       = useState(false);
  const [loaded, setLoaded]   = useState(false);
  const [hasEmail, setHasEmail] = useState(true);
  const [email, setEmail]     = useState("");
  const [hasPhone, setHasPhone] = useState(true);
  const [phone, setPhone]     = useState("");
  const [busy, setBusy]       = useState<"" | "bank" | "card" | "fresh">("");
  const [checking, setChecking] = useState(false);
  const [notYet, setNotYet]   = useState(false);
  const [error, setError]     = useState("");
  const started = useRef(false);

  const refresh = useCallback(async () => {
    const s = await api.getEscrowStatus(tripId, participantId);
    setPaid(s.paid);
    setEscrow(s.escrow);
    return s;
  }, [tripId, participantId]);

  useEffect(() => {
    Promise.all([refresh(), api.getMyPaymentStatus(tripId, participantId).then((s) => { setHasEmail(s.hasEmail); setHasPhone(s.hasPhone !== false); }).catch(() => {})])
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [refresh, tripId, participantId]);

  async function open(gateway: "virtual_account" | "payment_link", fresh = false) {
    if (!hasEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Add your email first — it's where your receipt goes.");
      return;
    }
    const cleanPhone = hasPhone ? undefined : normalisePhone(phone);
    if (!hasPhone && !cleanPhone) {
      setError("Add your phone number — escrow needs one for everyone paying.");
      return;
    }
    setBusy(fresh ? "fresh" : gateway === "payment_link" ? "card" : "bank");
    setError("");
    setNotYet(false);
    try {
      const { escrow: e } = await api.openEscrow(tripId, { participantId, gateway, fresh, email: email.trim() || undefined, phone: cleanPhone || undefined });
      if (gateway === "payment_link" && e.paymentUrl) { window.location.href = e.paymentUrl; return; }
      setEscrow(e);
      setHasEmail(true);
      setHasPhone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't set up your payment.");
    } finally {
      setBusy("");
    }
  }

  // Arriving from a reminder's "Pay now": go straight to the account.
  useEffect(() => {
    if (!autoStart || !loaded || started.current || paid || !hasEmail || !hasPhone) return;
    if (escrow && escrow.status === "awaiting") return;
    started.current = true;
    open("virtual_account");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, loaded, paid, hasEmail, hasPhone, escrow]);

  // After "I've sent it", keep asking for two minutes; transfers usually land in seconds.
  async function confirmSent() {
    setChecking(true);
    setNotYet(false);
    for (let i = 0; i < 24; i++) {
      try {
        const s = await refresh();
        if (s.paid) { setChecking(false); return; }
      } catch { /* a blip isn't a failed payment */ }
      await new Promise((r) => setTimeout(r, 5000));
    }
    setChecking(false);
    setNotYet(true);
  }

  const countdown = useCountdown(escrow?.gateway === "virtual_account" ? expiryMs(escrow.expiresAt) : null);
  const expired = !!countdown && countdown.left === 0;

  if (!loaded) {
    return <div className="kj-card p-5 text-sm text-muted-foreground">Loading your payment…</div>;
  }

  if (paid) {
    return (
      <div className="kj-card p-5 flex items-start gap-3">
        <span className="w-9 h-9 rounded-full bg-emerald-600 text-white grid place-items-center shrink-0"><Check className="w-5 h-5" /></span>
        <div>
          <div className="font-semibold">You've paid — your place is confirmed</div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Your money is held in escrow and only released to the organiser for the trip. A receipt is on its way to your email.
          </p>
        </div>
      </div>
    );
  }

  const showAccount = escrow && escrow.status === "awaiting" && escrow.gateway === "virtual_account" && escrow.accountNumber && !expired;
  const fee = escrow ? Math.max(0, escrow.amountToPay - escrow.amount) : 0;

  return (
    <div className="kj-card p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pay for your place</div>
          <div className="font-display text-3xl leading-tight mt-1">{fmtNGN(showAccount ? escrow!.amountToPay : perPerson)}</div>
          {showAccount && fee > 0 && (
            <div className="text-xs text-muted-foreground">{fmtNGN(escrow!.amount)} + {fmtNGN(fee)} escrow fee</div>
          )}
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-semibold shrink-0">
          <ShieldCheck className="w-3.5 h-3.5" /> Held in escrow
        </span>
      </div>

      {showAccount ? (
        <>
          <p className="text-sm">
            Transfer <strong>exactly {fmtNGN(escrow!.amountToPay)}</strong> to this account from any bank app. It's yours alone,
            for this payment only.
          </p>
          <div className="rounded-xl bg-secondary/60 px-4">
            <CopyRow label="Account number" value={escrow!.accountNumber!} big />
            <CopyRow label="Bank" value={escrow!.bankName || "9PSB"} />
            {escrow!.accountName && <CopyRow label="Account name" value={escrow!.accountName} />}
            <CopyRow label="Amount" value={fmtNGN(escrow!.amountToPay)} />
          </div>
          {countdown && (
            <p className="text-xs text-muted-foreground">
              This account closes in <span className="font-semibold text-foreground tabular-nums">{countdown.label}</span>. A different
              amount can't be matched to you, so send the exact figure.
            </p>
          )}
          <button type="button" onClick={confirmSent} disabled={checking} className="kj-btn w-full py-3.5">
            {checking ? "Checking for your transfer…" : "I've sent it"}
          </button>
          {notYet && (
            <p className="text-sm text-muted-foreground">
              We haven't seen it yet. Bank transfers usually land within minutes — check again shortly, or tap the button once more.
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <button type="button" onClick={() => open("virtual_account", true)} disabled={!!busy} className="underline underline-offset-4 text-muted-foreground hover:text-foreground">
              {busy === "fresh" ? "Getting a new account…" : "Get a new account number"}
            </button>
            <button type="button" onClick={() => open("payment_link")} disabled={!!busy} className="inline-flex items-center gap-1.5 underline underline-offset-4 text-muted-foreground hover:text-foreground">
              <CreditCard className="w-4 h-4" /> {busy === "card" ? "Opening checkout…" : "Pay by card instead"}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {expired || escrow?.status === "expired"
              ? "Your last account number expired. Get a fresh one — it only takes a second."
              : "Your money goes into escrow — it's held there and only released to whoever is running the trip."}
          </p>
          {!hasEmail && (
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email, for the receipt"
              className="w-full bg-card border border-line-strong px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-signal"
            />
          )}
          {!hasPhone && (
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Your phone number — escrow needs one"
              className="w-full bg-card border border-line-strong px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-signal"
            />
          )}
          <button type="button" onClick={() => open("virtual_account", expired || escrow?.status === "expired")} disabled={!!busy} className="kj-btn w-full py-3.5">
            <Landmark className="w-4 h-4" /> {busy === "bank" || busy === "fresh" ? "Getting your account…" : "Pay by bank transfer"}
          </button>
          <button type="button" onClick={() => open("payment_link")} disabled={!!busy} className="w-full border border-line-strong py-3 text-sm font-semibold hover:border-foreground/50 transition-colors inline-flex items-center justify-center gap-2">
            <CreditCard className="w-4 h-4" /> {busy === "card" ? "Opening checkout…" : "Pay by card"}
          </button>
        </>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
