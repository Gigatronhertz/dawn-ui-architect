/**
 * PlanView — public, auth-free squad plan page.
 * Opened from the share link the organiser sends: /plan/:tripId
 * Squad members can view the full confirmed plan, say "I'm in!",
 * pay their per-person share via Paystack, and print the itinerary.
 */
import { useEffect, useRef, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Check } from "lucide-react";
import { api, imageUrl, type PublicPlanResponse, type PlanDay } from "@/lib/api";
import { tripImageUrl } from "@/lib/tripImage";
import { EscrowPay } from "@/components/EscrowPay";
import { normalisePhone } from "@/lib/phone";
import { TripCollectionPanel } from "@/components/TripCollectionPanel";
import { HERO_PHOTO as PLAN_HERO_PHOTO } from "@/lib/photos";
import { KarijeLogo } from "@/components/Nav";
import { useAuth } from "@/contexts/AuthContext";

// ── helpers ───────────────────────────────────────────────────────────────────

const fmtNGN = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n);

/** Parse "YYYY-MM-DD" as local noon to avoid UTC-offset date shifts. */
function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

function fmtDate(s: string): string {
  return parseLocalDate(s).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" });
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-3xl bg-card ring-hairline shadow-card p-5 ${className}`}>
      {children}
    </div>
  );
}

/** Generic, verified photos for transport/hotel cards when there's no real
 *  one to show (GIGM has no per-trip photo; Google Travel's flight scrape
 *  carries no logo since Amadeus was removed; Google Places hotel photos
 *  depend on that API key having billing enabled) — same fallback set
 *  Start.tsx uses, so the organiser's builder and this shared page match. */
const BUS_FALLBACK_IMAGE    = "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=400&h=200&q=70";
const FLIGHT_FALLBACK_IMAGE = "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=400&h=200&q=70";
const HOTEL_FALLBACK_IMAGE  = "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&h=200&q=70";

// ── Countdown ─────────────────────────────────────────────────────────────────

function Countdown({ selectedDate }: { selectedDate: string }) {
  const target = parseLocalDate(selectedDate);
  const now    = new Date();
  // Reset 'now' to local midnight for whole-day comparison
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((target.getTime() - todayMidnight.getTime()) / 86_400_000);

  if (diffDays > 1) {
    return (
      <Card className="text-center bg-gradient-to-br from-primary/10 via-accent/5 to-primary/5">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Days until the trip</div>
        <div className="font-display text-6xl font-semibold text-foreground tabular-nums mb-1">{diffDays}</div>
        <div className="text-sm text-muted-foreground">🚀 {fmtDate(selectedDate)}</div>
      </Card>
    );
  }
  if (diffDays === 1) {
    return (
      <Card className="text-center">
        <div className="text-4xl mb-2">🎒</div>
        <div className="font-display text-xl font-semibold">Tomorrow! Get packed.</div>
        <div className="text-sm text-muted-foreground mt-1">{fmtDate(selectedDate)}</div>
      </Card>
    );
  }
  if (diffDays === 0) {
    return (
      <Card className="text-center bg-gradient-to-br from-google-green/10 to-primary/10">
        <div className="text-4xl mb-2">🎉</div>
        <div className="font-display text-xl font-semibold text-google-green">Trip day is HERE!</div>
        <div className="text-sm text-muted-foreground mt-1">Have an amazing time.</div>
      </Card>
    );
  }
  return (
    <Card className="text-center">
      <div className="text-4xl mb-2">✨</div>
      <div className="font-display text-xl font-semibold">Memories were made.</div>
      <div className="text-sm text-muted-foreground mt-1">{Math.abs(diffDays)} days ago · {fmtDate(selectedDate)}</div>
    </Card>
  );
}

// ── DayAccordion ─────────────────────────────────────────────────────────────

function DayAccordion({ day }: { day: PlanDay }) {
  const [open, setOpen] = useState(day.day === 1);
  return (
    <div className="border-b border-border last:border-0">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 py-3 text-left print:hidden"
      >
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground">Day {day.day}</span>
          <div className="font-display text-sm font-semibold mt-0.5">{day.title}</div>
        </div>
        <svg
          viewBox="0 0 24 24"
          className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {/* Always in DOM for print; hidden with CSS on screen when closed */}
      <div className={`pb-3 space-y-1.5 ${open ? "" : "hidden print:block"}`}>
        {/* Day heading — shown only in print */}
        <div className="hidden print:block pt-2 pb-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground">Day {day.day}</span>
          <div className="font-semibold text-sm">{day.title}</div>
        </div>
        {day.activities.map((a, i) => (
          <div key={i} className="flex items-start justify-between gap-3 text-sm">
            <div className="flex gap-2">
              {a.time && (
                <span className="text-[10px] text-muted-foreground tabular-nums shrink-0 mt-0.5 w-12">{a.time}</span>
              )}
              <span className="text-foreground/90">{a.title}</span>
            </div>
            {a.cost_per_person > 0 && (
              <span className="text-[11px] text-muted-foreground shrink-0 tabular-nums">{fmtNGN(a.cost_per_person)}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── PaymentSection ────────────────────────────────────────────────────────────

/**
 * "redirecting" means we're handing off to Paystack — not that anything has
 * been paid. "verifying" is the wait after coming back while we ask the server
 * what actually happened. Only "paid" is a confirmed payment.
 */
type PayState = "idle" | "form" | "loading" | "redirecting" | "verifying" | "paid" | "installment_paid" | "unconfirmed";

function PaymentSection({
  tripId, participantId, perPerson, justPaid, paymentsEnabled, selectedDate,
  installmentsEnabled, installmentMinMonths, installmentMaxMonths, installmentMinAmount,
}: {
  tripId: string; participantId: string; perPerson: number; justPaid: boolean; paymentsEnabled: boolean;
  selectedDate: string | null;
  installmentsEnabled: boolean; installmentMinMonths: number; installmentMaxMonths: number;
  installmentMinAmount: number | null;
}) {
  const [payState, setPayState] = useState<PayState>(justPaid ? "verifying" : "idle");
  const [email, setEmail]       = useState("");
  const [error, setError]       = useState("");
  /**
   * Whether the server already holds an email for this person. They gave one
   * when they joined, so asking again at payment is asking twice for the same
   * thing. Assume not until the server says otherwise — the worst case is the
   * old behaviour, never a payment attempt with no address.
   */
  const [hasEmail, setHasEmail] = useState(false);

  // Installment plan state — null paymentPlan means "not asked yet".
  const [paymentPlan, setPaymentPlan]   = useState<"full" | "installment">("full");
  const [paidAmount, setPaidAmount]     = useState<number | null>(null);
  const [remaining, setRemaining]       = useState<number | null>(null);
  const [installmentMonths, setInstallmentMonths] = useState<number | null>(null);
  const [showChooser, setShowChooser]   = useState(false);
  const [chooseMonths, setChooseMonths] = useState(installmentMinMonths);
  const [subscribeErr, setSubscribeErr] = useState("");
  const [subscribing, setSubscribing]   = useState(false);
  const [payInFull, setPayInFull]       = useState(false); // which charge the next redirect/form submit sends

  const monthsUntilTrip = selectedDate
    ? Math.max(1, Math.ceil((parseLocalDate(selectedDate).getTime() - Date.now()) / (30 * 24 * 60 * 60 * 1000)))
    : null;
  // The agency's own min/max, further capped by how far out the trip is —
  // mirrors the server's own clamp in POST .../subscribe exactly, so the
  // picker never offers a number the server would then reject.
  const chooserMax = monthsUntilTrip !== null
    ? Math.min(installmentMaxMonths, monthsUntilTrip)
    : installmentMaxMonths;
  const installmentEligible = installmentsEnabled && chooserMax >= installmentMinMonths;

  // Ask once on mount who this is. Doubles as recovery: if a payment landed
  // while the page was closed, this is where it gets picked up.
  useEffect(() => {
    let live = true;
    api.getMyPaymentStatus(tripId, participantId)
      .then((s) => {
        if (!live) return;
        setHasEmail(s.hasEmail);
        setPaymentPlan(s.paymentPlan);
        setPaidAmount(s.paidAmount);
        setRemaining(s.remaining);
        setInstallmentMonths(s.installmentMonths);
        if (s.paid) setPayState("paid");
      })
      .catch(() => { /* leave it to the pay flow to surface problems */ });
    return () => { live = false; };
  }, [tripId, participantId]);

  /**
   * Coming back from Paystack, ask the server whether the money actually
   * arrived. The webhook that marks someone paid can land a moment after the
   * browser redirect, so poll briefly rather than judging on the first answer.
   */
  useEffect(() => {
    if (payState !== "verifying") return;
    let live = true;
    let tries = 0;

    const check = async () => {
      try {
        const s = await api.getMyPaymentStatus(tripId, participantId);
        if (!live) return;
        if (s.paid) { setPayState("paid"); return; }
        // An installment payer never flips `paid` mid-plan — recordPayment
        // pushes nextDueAt ~30 days out the moment a charge lands, so seeing
        // it that far ahead is the signal this specific payment landed.
        if (s.paymentPlan === "installment" && s.nextDueAt && s.nextDueAt > Date.now() / 1000 + 25 * 24 * 60 * 60) {
          setPaidAmount(s.paidAmount);
          setRemaining(s.remaining);
          setInstallmentMonths(s.installmentMonths);
          setPayState("installment_paid");
          return;
        }
      } catch { /* keep trying — a blip shouldn't read as a failed payment */ }
      if (!live) return;
      // ~20s of grace for the webhook, then say so honestly.
      if (++tries >= 10) { setPayState("unconfirmed"); return; }
      setTimeout(check, 2000);
    };

    check();
    return () => { live = false; };
  }, [payState, tripId, participantId]);

  if (payState === "paid") {
    return (
      <div className="rounded-2xl bg-google-green/10 ring-1 ring-google-green/20 p-5 flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-google-green/15 grid place-items-center shrink-0"><CheckCircle2 className="w-5 h-5 text-google-green" /></div>
        <div>
          <div className="font-display font-semibold text-google-green">Payment confirmed!</div>
          <p className="text-sm text-muted-foreground mt-0.5">You're all set. See you on the trip! 🎉</p>
        </div>
      </div>
    );
  }

  if (payState === "installment_paid") {
    return (
      <div className="rounded-2xl bg-google-green/10 ring-1 ring-google-green/20 p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-2xl bg-google-green/15 grid place-items-center shrink-0"><CheckCircle2 className="w-5 h-5 text-google-green" /></div>
          <div>
            <div className="font-display font-semibold text-google-green">This month's payment is in!</div>
            <p className="text-sm text-muted-foreground mt-0.5">We'll remind you again next month.</p>
          </div>
        </div>
        {paidAmount !== null && (
          <div className="rounded-xl bg-background/60 px-4 py-3 text-sm">
            <span className="font-medium">{fmtNGN(paidAmount)}</span>
            <span className="text-muted-foreground"> of {fmtNGN(perPerson)} paid</span>
            {remaining !== null && remaining > 0 && (
              <span className="text-muted-foreground"> · {fmtNGN(remaining)} left</span>
            )}
          </div>
        )}
      </div>
    );
  }

  if (payState === "verifying") {
    return (
      <div className="rounded-2xl bg-secondary/60 ring-hairline p-5 flex items-center gap-3">
        <div className="w-7 h-7 rounded-full border-2 border-signal border-t-transparent animate-spin shrink-0" />
        <div>
          <div className="font-display font-semibold">Checking your payment…</div>
          <p className="text-sm text-muted-foreground mt-0.5">One moment — confirming with Paystack.</p>
        </div>
      </div>
    );
  }

  if (payState === "redirecting") {
    return (
      <div className="rounded-2xl bg-secondary/60 ring-hairline p-5 flex items-center gap-3">
        <div className="w-7 h-7 rounded-full border-2 border-signal border-t-transparent animate-spin shrink-0" />
        <div>
          <div className="font-display font-semibold">Taking you to Paystack…</div>
          <p className="text-sm text-muted-foreground mt-0.5">Complete your payment on the next screen.</p>
        </div>
      </div>
    );
  }

  if (payState === "unconfirmed") {
    return (
      <div className="rounded-2xl bg-secondary/60 ring-hairline p-5 space-y-3">
        <div>
          <div className="font-display font-semibold">We haven't seen your payment yet</div>
          <p className="text-sm text-muted-foreground mt-0.5">
            If you completed it, this usually clears within a minute — refresh to check again.
            If something went wrong, you can try again.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPayState("verifying")}
            className="flex-1 rounded-lg bg-secondary text-foreground py-2.5 text-sm font-medium hover:bg-secondary/70 transition"
          >
            Check again
          </button>
          <button
            onClick={() => setPayState("form")}
            className="flex-1 rounded-lg bg-gradient-primary text-primary-foreground py-2.5 text-sm shadow-glow hover:opacity-90 transition font-semibold"
          >
            Try payment again
          </button>
        </div>
      </div>
    );
  }

  if (!paymentsEnabled) {
    return (
      <div className="rounded-2xl bg-secondary/60 ring-hairline p-4 text-sm text-muted-foreground text-center">
        Online payments coming soon — the organiser will send payment details directly.
      </div>
    );
  }

  /**
   * We already have their email from joining, so go straight to paying. Only
   * someone who skipped the email field on join still sees a form. `full`
   * only ever matters for an installment payer settling the rest in one go.
   */
  function handlePayNow(full = false) {
    setPayInFull(full);
    if (hasEmail) {
      setPayState("redirecting");
      window.location.href = api.payLink(participantId, { full });
      return;
    }
    setPayState("form");
  }

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) { setError("Enter a valid email address."); return; }
    setPayState("loading");
    setError("");
    try {
      const { authorization_url } = await api.initPayment(tripId, { participantId, email: email.trim(), payInFull });
      setPayState("redirecting");
      window.location.href = authorization_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed. Please try again.");
      setPayState("form");
    }
  }

  async function handleSubscribe() {
    setSubscribing(true);
    setSubscribeErr("");
    try {
      await api.subscribeInstallment(tripId, { participantId, months: chooseMonths });
      setPaymentPlan("installment");
      setInstallmentMonths(chooseMonths);
      setPaidAmount(0);
      setRemaining(perPerson);
      setShowChooser(false);
    } catch (err) {
      setSubscribeErr(err instanceof Error ? err.message : "Could not start the plan. Please try again.");
    } finally {
      setSubscribing(false);
    }
  }

  const installmentAmountPreview = Math.ceil(perPerson / chooseMonths);
  const belowMinAmount = installmentMinAmount != null && installmentAmountPreview < installmentMinAmount;
  const nextInstallmentAmount = remaining != null && installmentMonths
    ? Math.min(Math.ceil(perPerson / installmentMonths), remaining)
    : null;

  return (
    <div className="rounded-2xl bg-primary/10 ring-1 ring-primary/20 p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="font-display font-semibold">
            {paymentPlan === "installment" ? "Your monthly plan" : "Pay your share"}
          </div>
          <div className="text-sm text-muted-foreground">Secure payment via Paystack</div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-display text-2xl font-semibold text-foreground">
            {fmtNGN(paymentPlan === "installment" && nextInstallmentAmount != null ? nextInstallmentAmount : perPerson)}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {paymentPlan === "installment" ? "next payment" : "per person"}
          </div>
        </div>
      </div>

      {/* Already on a plan — progress + next-payment actions */}
      {payState === "idle" && paymentPlan === "installment" && (
        <div className="space-y-3">
          <div className="rounded-xl bg-background/60 px-4 py-3 text-sm">
            <span className="font-medium">{fmtNGN(paidAmount ?? 0)}</span>
            <span className="text-muted-foreground"> of {fmtNGN(perPerson)} paid</span>
            {installmentMonths && (
              <span className="text-muted-foreground"> · {installmentMonths} month plan</span>
            )}
          </div>
          <button
            onClick={() => handlePayNow(false)}
            className="w-full rounded-lg bg-gradient-primary text-primary-foreground py-3 text-sm shadow-glow hover:opacity-90 active:scale-[0.98] transition font-semibold"
          >
            Pay this month — {fmtNGN(nextInstallmentAmount ?? 0)} →
          </button>
          <button
            onClick={() => handlePayNow(true)}
            className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition"
          >
            Pay the rest in full instead — {fmtNGN(remaining ?? 0)}
          </button>
        </div>
      )}

      {/* Chooser — pick a plan instead of paying in full */}
      {payState === "idle" && paymentPlan === "full" && showChooser && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setChooseMonths(m => Math.max(installmentMinMonths, m - 1))}
              className="w-9 h-9 rounded-lg bg-secondary text-foreground grid place-items-center hover:bg-secondary/70 transition shrink-0"
            >−</button>
            <div className="text-center">
              <div className="font-display text-xl font-semibold tabular-nums">{chooseMonths} {chooseMonths === 1 ? "month" : "months"}</div>
              <div className="text-xs text-muted-foreground tabular-nums">{fmtNGN(installmentAmountPreview)}/month</div>
            </div>
            <button
              type="button"
              onClick={() => setChooseMonths(m => Math.min(chooserMax, m + 1))}
              className="w-9 h-9 rounded-lg bg-secondary text-foreground grid place-items-center hover:bg-secondary/70 transition shrink-0"
            >+</button>
          </div>
          {belowMinAmount && (
            <p className="text-xs text-destructive text-center">
              That's below the {fmtNGN(installmentMinAmount!)}/month minimum for this trip — choose fewer months.
            </p>
          )}
          {subscribeErr && <p className="text-xs text-destructive text-center">{subscribeErr}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleSubscribe}
              disabled={subscribing || belowMinAmount}
              className="flex-1 rounded-lg bg-gradient-primary text-primary-foreground py-3 text-sm shadow-glow hover:opacity-90 active:scale-[0.98] transition disabled:opacity-40 font-semibold"
            >
              {subscribing ? "Starting…" : "Start this plan →"}
            </button>
            <button type="button" onClick={() => setShowChooser(false)}
              className="rounded-lg bg-secondary text-foreground px-4 py-3 text-sm font-medium hover:bg-secondary/60 transition"
            >
              Back
            </button>
          </div>
        </div>
      )}

      {/* Plain idle — pay in full, or offer the monthly option */}
      {payState === "idle" && paymentPlan === "full" && !showChooser && (
        <div className="space-y-2">
          <button
            onClick={() => handlePayNow(false)}
            className="w-full rounded-lg bg-gradient-primary text-primary-foreground py-3 text-sm shadow-glow hover:opacity-90 active:scale-[0.98] transition font-semibold"
          >
            Pay in full — {fmtNGN(perPerson)} →
          </button>
          {installmentEligible && (
            <button
              onClick={() => setShowChooser(true)}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition py-1"
            >
              Or pay monthly instead
            </button>
          )}
        </div>
      )}

      {payState === "form" && (
        <form onSubmit={handlePay} className="space-y-2">
          <input
            type="email" autoFocus required
            value={email} onChange={e => setEmail(e.target.value)}
            placeholder="Your email (for payment receipt)"
            className="w-full rounded-xl bg-background ring-hairline px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-primary/40 transition placeholder:text-muted-foreground/60"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <button type="submit"
              className="flex-1 rounded-lg bg-gradient-primary text-primary-foreground py-3 text-sm shadow-glow hover:opacity-90 active:scale-[0.98] transition font-semibold"
            >
              Pay {fmtNGN(payInFull ? (remaining ?? perPerson) : (nextInstallmentAmount ?? perPerson))} →
            </button>
            <button type="button" onClick={() => { setPayState("idle"); setError(""); }}
              className="rounded-lg bg-secondary text-foreground px-4 py-3 text-sm font-medium hover:bg-secondary/60 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {payState === "loading" && (
        <div className="flex items-center justify-center py-3 gap-3 text-sm text-muted-foreground">
          <div className="w-5 h-5 rounded-full border-2 border-signal border-t-transparent animate-spin shrink-0" />
          Opening secure payment…
        </div>
      )}
    </div>
  );
}

// ── JoinSection ───────────────────────────────────────────────────────────────

type JoinState = "idle" | "name-input" | "loading" | "joined" | "reminding" | "error";

function JoinSection({
  tripId, initialCount, initialPaidCount, initialTotalCollected, initialNames,
  perPerson, squadSize, groupMin, paymentsEnabled, justPaid, selectedDate,
  installmentsEnabled, installmentMinMonths, installmentMaxMonths, installmentMinAmount,
  paymentProvider, payFor, autoPay, phoneRequired,
}: {
  paymentProvider: 'pandascrow' | 'paystack';
  /** Escrow trips need a phone number from everyone who joins. */
  phoneRequired: boolean;
  /** A participant id from a reminder's pay link, and whether to open paying straight away. */
  payFor: string | null; autoPay: boolean;
  tripId: string; initialCount: number; initialPaidCount: number; initialTotalCollected: number;
  initialNames: (string | null)[]; perPerson: number; squadSize: number | null;
  groupMin: number | null; paymentsEnabled: boolean; justPaid: boolean;
  selectedDate: string | null;
  installmentsEnabled: boolean; installmentMinMonths: number; installmentMaxMonths: number;
  installmentMinAmount: number | null;
}) {
  const storageKey = `msgo_pid_${tripId}`;
  const [count, setCount]             = useState(initialCount);
  const [paidCount, setPaidCount]     = useState(initialPaidCount);
  const [totalCollected, setTotal]    = useState(initialTotalCollected);
  const [names, setNames]             = useState<(string | null)[]>(initialNames);
  const [participantId, setPid]       = useState<string | null>(() => {
    // A reminder's link names the traveller, so it works on a new phone too.
    if (payFor) { try { localStorage.setItem(storageKey, payFor); } catch { /* private mode */ } return payFor; }
    return localStorage.getItem(storageKey);
  });
  const [joinState, setJoinState]     = useState<JoinState>(participantId ? "joined" : "idle");
  const [nameInput, setNameInput]     = useState("");
  const [emailInput, setEmailInput]   = useState("");
  const [phoneInput, setPhoneInput]   = useState("");
  const [error, setError]             = useState("");
  const pollRef                        = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function poll() {
      pollRef.current = setTimeout(async () => {
        try {
          const data = await api.getParticipants(tripId);
          setCount(data.count);
          setPaidCount(data.paidCount);
          setTotal(data.totalCollected);
          setNames(data.names);
        } catch { /* swallow */ }
        poll();
      }, 20_000);
    }
    poll();
    return () => { if (pollRef.current) clearTimeout(pollRef.current); };
  }, [tripId]);

  /**
   * Claim a spot. `remindMe` is the "I'm in, not paying yet" path — we keep the
   * contact details so they get chased rather than quietly lost.
   */
  async function handleJoin(remindMe = false) {
    const phone = phoneInput.trim() ? normalisePhone(phoneInput) : null;
    if (phoneInput.trim() && !phone) { setError("That phone number doesn't look right."); return; }
    if (phoneRequired && !phone) { setError("Add your phone number — it's needed to pay into escrow."); return; }
    setJoinState("loading");
    setError("");
    try {
      const { count: newCount, participantId: pid } = await api.joinPlan(tripId, {
        name:     nameInput.trim()  || undefined,
        email:    emailInput.trim() || undefined,
        waNumber: phone || undefined,
        remindMe,
      });
      setCount(newCount);
      if (nameInput.trim()) setNames(prev => [...prev, nameInput.trim()]);
      localStorage.setItem(storageKey, pid);
      setPid(pid);
      setJoinState(remindMe ? "reminding" : "joined");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setJoinState("error");
    }
  }

  const displayNames    = names.filter(Boolean) as string[];
  const target          = squadSize ? perPerson * squadSize : 0;
  const progressPct     = target > 0 ? Math.min(100, (totalCollected / target) * 100) : 0;
  const allPaid         = squadSize && squadSize > 0 && paidCount >= squadSize;

  return (
    <Card className="print:hidden">
      {/* All-paid celebration */}
      {allPaid && (
        <div className="rounded-2xl bg-gradient-to-br from-google-green/15 to-primary/10 ring-1 ring-google-green/25 p-5 text-center mb-5">
          <div className="text-4xl mb-2">🎉</div>
          <div className="font-display text-xl font-semibold text-google-green">The whole squad paid!</div>
          <p className="text-sm text-muted-foreground mt-1">Trip is officially on. Pack your bags 🚀</p>
        </div>
      )}

      {/* Payment progress bar */}
      {paidCount > 0 && !allPaid && (
        <div className="mb-5 pb-5 border-b border-border">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="font-medium">{fmtNGN(totalCollected)} collected</span>
            {target > 0 && (
              <span className="text-muted-foreground text-xs">{paidCount} / {squadSize || "?"} paid</span>
            )}
          </div>
          <div className="h-2 rounded-full bg-secondary/60 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-primary transition-all duration-500" style={{ width: `${progressPct}%` }} />
          </div>
          {target > 0 && (
            <div className="text-[11px] text-muted-foreground mt-1.5">Target: {fmtNGN(target)}</div>
          )}
        </div>
      )}

      {/* Squad count */}
      <div className="text-center mb-4">
        <div className="text-5xl mb-2">🙌</div>
        <div className="font-display text-2xl font-semibold">
          {count === 0 ? "Be the first in!" : `${count} ${count === 1 ? "person" : "people"} already in`}
        </div>
        {displayNames.length > 0 && (
          <p className="text-sm text-muted-foreground mt-1">
            {displayNames.slice(0, 6).join(", ")}
            {displayNames.length > 6 ? ` + ${displayNames.length - 6} more` : ""}
          </p>
        )}

        {/* Minimum headcount — tells the squad whether this is actually
            happening, and gives them a reason to chase each other. */}
        {groupMin !== null && groupMin > 0 && (
          <div className="mt-3">
            {count >= groupMin ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-google-green bg-google-green/10 ring-1 ring-google-green/20 px-3 py-1">
                <Check className="w-3.5 h-3.5" /> Minimum reached — this trip is running
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-secondary/60 ring-hairline px-3 py-1">
                {groupMin - count} more {groupMin - count === 1 ? "person" : "people"} needed for this trip to run
              </span>
            )}
          </div>
        )}
      </div>

      {/* Join + pay */}
      {(joinState === "joined" || participantId) ? (
        <div className="space-y-3">
          <div className="rounded-2xl bg-google-green/10 ring-1 ring-google-green/20 px-4 py-3 text-center">
            <div className="flex items-center justify-center gap-1.5 text-google-green font-semibold text-sm"><Check className="w-4 h-4" /> You're in the squad!</div>
          </div>
          {paymentProvider === "pandascrow" ? (
            paymentsEnabled ? (
              <EscrowPay tripId={tripId} participantId={participantId!} perPerson={perPerson} autoStart={autoPay} />
            ) : (
              <p className="text-sm text-muted-foreground text-center px-2">
                The organiser is collecting payments directly for this trip — they'll send you the details.
              </p>
            )
          ) : (
          <PaymentSection
            tripId={tripId} participantId={participantId!}
            perPerson={perPerson} justPaid={justPaid} paymentsEnabled={paymentsEnabled}
            selectedDate={selectedDate}
            installmentsEnabled={installmentsEnabled}
            installmentMinMonths={installmentMinMonths}
            installmentMaxMonths={installmentMaxMonths}
            installmentMinAmount={installmentMinAmount}
          />
          )}
        </div>
      ) : joinState === "reminding" ? (
        <div className="rounded-2xl bg-secondary/60 ring-hairline px-4 py-4 text-center space-y-1">
          <div className="text-2xl">👍</div>
          <div className="font-semibold text-sm">You're on the list</div>
          <p className="text-sm text-muted-foreground">
            We'll message you a reminder before the squad locks it in. Pay whenever you're ready.
          </p>
          <button
            onClick={() => setJoinState("joined")}
            className="text-xs text-foreground hover:underline pt-1"
          >
            Actually, let me pay now →
          </button>
        </div>
      ) : joinState === "name-input" ? (
        <div className="space-y-3">
          <input
            type="text" autoFocus value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            placeholder="Your first name" maxLength={40}
            className="w-full rounded-xl bg-secondary/60 ring-hairline px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-primary/40 transition placeholder:text-muted-foreground/60"
          />
          <input
            type="email" inputMode="email" value={emailInput}
            onChange={e => setEmailInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleJoin(false); }}
            placeholder="Email — for your receipt"
            className="w-full rounded-xl bg-secondary/60 ring-hairline px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-primary/40 transition placeholder:text-muted-foreground/60"
          />
          <input
            type="tel" inputMode="tel" autoComplete="tel" value={phoneInput}
            onChange={e => { setPhoneInput(e.target.value); setError(""); }}
            onKeyDown={e => { if (e.key === "Enter") handleJoin(false); }}
            placeholder={phoneRequired ? "Phone number (WhatsApp)" : "Phone number (WhatsApp) — optional"}
            required={phoneRequired}
            aria-required={phoneRequired}
            className="w-full rounded-xl bg-secondary/60 ring-hairline px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-primary/40 transition placeholder:text-muted-foreground/60"
          />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            We use this to send your receipt and let you know if anything about the trip changes.
            {phoneRequired && " Your money is held in escrow, which needs a phone number for everyone paying."}
          </p>

          <div className="flex gap-2">
            <button onClick={() => handleJoin(false)}
              className="flex-1 rounded-lg bg-gradient-primary text-primary-foreground py-3 text-sm shadow-glow hover:opacity-90 active:scale-[0.98] transition font-semibold"
            >
              I'm in! 🎉
            </button>
            <button onClick={() => setJoinState("idle")}
              className="rounded-lg bg-secondary text-foreground px-4 py-3 text-sm font-medium hover:bg-secondary/60 transition"
            >
              Cancel
            </button>
          </div>

          {/* The honest second option — most people won't pay the moment they
              open a link from a group chat. */}
          <button
            onClick={() => handleJoin(true)}
            className="w-full text-xs text-muted-foreground hover:text-foreground transition py-1"
          >
            Can't pay right now — remind me later
          </button>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      ) : joinState === "loading" ? (
        <div className="flex justify-center py-4">
          <div className="w-7 h-7 rounded-full border-2 border-signal border-t-transparent animate-spin" />
        </div>
      ) : (
        <button onClick={() => setJoinState("name-input")}
          className="w-full rounded-lg bg-gradient-primary text-primary-foreground py-4 text-base shadow-glow hover:opacity-90 active:scale-[0.98] transition font-semibold"
        >
          I'm in! 🎉
        </button>
      )}
    </Card>
  );
}

// ── ShareSection ──────────────────────────────────────────────────────────────

function ShareSection({ tripId, destination }: { tripId: string; destination: string | null }) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/plan/${tripId}`;
  const waText = encodeURIComponent(
    `🛫 Check out our squad trip to ${destination || "the destination"}! Say you're in:\n${url}`
  );

  return (
    <div className="flex gap-3 print:hidden">
      <button
        onClick={() => { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
        className={`flex-1 rounded-lg py-3 text-sm font-medium ring-hairline transition ${
          copied ? "bg-google-green/10 text-google-green ring-google-green/20" : "bg-card text-foreground hover:bg-secondary"
        }`}
      >
        {copied ? (<span className="inline-flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Link copied</span>) : "Copy link"}
      </button>
      <a
        href={`https://wa.me/?text=${waText}`}
        target="_blank" rel="noopener noreferrer"
        className="flex-1 rounded-lg py-3 text-sm font-medium text-center bg-whatsapp text-white hover:opacity-90 transition"
      >
        Share on WhatsApp
      </a>
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-secondary/60 ${className}`} />;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="text-center py-8 space-y-3">
        <Skeleton className="h-4 w-24 mx-auto" />
        <Skeleton className="h-10 w-48 mx-auto" />
        <Skeleton className="h-4 w-32 mx-auto" />
      </div>
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PlanView() {
  const { tripId }      = useParams<{ tripId: string }>();
  const [searchParams]  = useSearchParams();
  const justPaid        = searchParams.get("paid") === "1";
  const toClaim         = searchParams.get("claim") === "1";

  const [data, setData]     = useState<PublicPlanResponse | null>(null);
  const [loading, setLoad]  = useState(true);
  const [error, setError]   = useState<string | null>(null);
  const [claimed, setClaimed] = useState(false);

  /**
   * Landing here straight after signing up, on a trip made before there was an
   * account to put it in. Adopt it now, so planning first and registering
   * second doesn't cost someone the thing they just built.
   */
  const { user, getIdToken } = useAuth();
  useEffect(() => {
    if (!toClaim || !tripId || !user) return;
    let live = true;
    const token = getIdToken();
    if (!token) return;
    api.claimTrip(tripId, token)
      .then(() => { if (live) setClaimed(true); })
      .catch(() => { /* already someone else's, or offline — the plan still shows */ });
    return () => { live = false; };
  }, [toClaim, tripId, user, getIdToken]);

  useEffect(() => {
    if (!tripId) { setError("Invalid plan link."); setLoad(false); return; }
    api.getPublicPlan(tripId)
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoad(false));
  }, [tripId]);

  useEffect(() => {
    const name = data?.curated?.name || data?.destination;
    document.title = name ? `${name} Squad Trip · Karije` : "Squad Trip · Karije";
  }, [data]);

  const cb = data?.cost_breakdown;

  return (
    <main className="min-h-screen bg-background print:bg-white print:min-h-0">
      {/* Print-only header */}
      <div className="hidden print:flex items-center gap-3 px-8 pt-6 pb-4 border-b border-border mb-4">
        <div className="font-display font-bold text-lg">Karije</div>
        <span className="text-muted-foreground">·</span>
        <div className="font-semibold">
          {data?.origin} → {data?.destination} Trip Itinerary
        </div>
        {data?.selectedDate && (
          <span className="ml-auto text-sm text-muted-foreground">{fmtDate(data.selectedDate)}</span>
        )}
      </div>

      {/* Screen header — the trip's photo, its name, and who runs it */}
      <header className="kj-dark relative bg-ink overflow-hidden print:hidden">
        <img
          src={tripImageUrl(data?.curated?.imageId || PLAN_HERO_PHOTO, 1600, 1000)}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => { e.currentTarget.style.display = "none"; }}
        />
        <div aria-hidden="true" className="absolute inset-0 kj-scrim" />
        <div className="relative mx-auto max-w-lg lg:max-w-6xl px-5 lg:px-8 pt-5 pb-10 md:pb-14 flex flex-col gap-4">
          <KarijeLogo size="sm" />
          {data && (
            <div className="flex flex-col gap-3 mt-16 md:mt-28">
              {data.agency && (
                <div className="flex items-center gap-3 flex-wrap">
                  {imageUrl(data.agency.logoUrl) && (
                    <img
                      src={imageUrl(data.agency.logoUrl)!}
                      alt={data.agency.name}
                      className="h-9 w-auto max-w-[7rem] object-contain rounded-md bg-white p-1"
                    />
                  )}
                  <div className="text-left">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-white/70">Presented by</div>
                    <div className="font-semibold text-sm leading-tight text-white">{data.agency.name}</div>
                  </div>
                  {data.agency.waNumber && (
                      <a
                        href={`https://wa.me/${data.agency.waNumber.replace(/[^\d]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="print:hidden inline-flex items-center gap-1.5 text-xs font-medium bg-[#25D366] text-white px-3.5 py-2 hover:opacity-90 transition-opacity shrink-0"
                      >
                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor" aria-hidden="true">
                          <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.87 9.87 0 0 0 4.74 1.21h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.02h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.35c0-4.54 3.7-8.24 8.25-8.24a8.2 8.2 0 0 1 5.83 2.42 8.18 8.18 0 0 1 2.41 5.82c0 4.55-3.7 8.21-8.25 8.21zm4.52-6.16c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.13-.17.24-.64.81-.78.97-.14.17-.29.19-.53.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.39-1.72-.14-.24-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.15.16-.25.25-.41.08-.17.04-.31-.02-.44-.06-.12-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.42-.14-.01-.31-.01-.48-.01a.93.93 0 0 0-.67.31c-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.02 2.57.12.17 1.74 2.66 4.22 3.73.59.25 1.05.4 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.06-.1-.23-.16-.48-.28z"/>
                        </svg>
                        WhatsApp
                      </a>
                    )}
                </div>
              )}
              <span className="self-start kj-label text-[10px] rounded-full bg-signal text-ink px-2.5 py-1">
                {data.curated ? "Featured" : data.agency ? "Group trip" : "Squad trip"}
              </span>
              <h1 className="text-[clamp(2.4rem,7vw,4.5rem)] leading-[1] text-white">
                {data.curated?.name || (data.agency ? data.destination : null) || data.destination || "Squad Trip"}
              </h1>
              <p className="text-base text-white/85">
                {data.curated
                  ? data.curated.location
                  : data.origin && data.destination && data.origin !== data.destination
                    ? `${data.origin} → ${data.destination}`
                    : data.destination}
              </p>
              <div className="flex flex-wrap gap-2">
                {data.days && <span className="kj-chip !text-white !border-white/30">{data.days} day{data.days === 1 ? "" : "s"}</span>}
                {data.squadSize && <span className="kj-chip !text-white !border-white/30">{data.squadSize} people</span>}
                {data.selectedDate && <span className="kj-chip !text-white !border-white/30">{fmtDate(data.selectedDate)}</span>}
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-lg lg:max-w-6xl px-4 lg:px-8 pt-6 pb-24 space-y-4 print:max-w-full print:px-8 print:pb-8 print:space-y-3">
        {/* Adopted on arrival from sign-up — say so, or it looks like nothing happened */}
        {claimed && (
          <div className="rounded-lg bg-primary/10 ring-1 ring-primary/20 px-5 py-4 flex items-center gap-3 print:hidden">
            <span className="text-2xl">📌</span>
            <div>
              <div className="font-display font-semibold">Saved to your plans</div>
              <p className="text-sm text-muted-foreground">
                This trip is yours now — find it any time in{" "}
                <Link to="/my-plans" className="underline hover:text-foreground">My Plans</Link>.
              </p>
            </div>
          </div>
        )}

        {/* Payment success banner */}
        {justPaid && (
          <div className="rounded-2xl bg-google-green/10 ring-1 ring-google-green/20 px-5 py-4 flex items-center gap-3 print:hidden">
            <span className="text-2xl">🎉</span>
            <div>
              <div className="font-display font-semibold text-google-green">Payment confirmed!</div>
              <p className="text-sm text-muted-foreground">You're all set. See you on the trip!</p>
            </div>
          </div>
        )}

        {loading && <LoadingSkeleton />}

        {error && !loading && (
          <div className="py-16 text-center">
            <div className="text-4xl mb-4">🔒</div>
            <div className="font-display text-xl font-semibold mb-2">Plan not available</div>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">{error}</p>
            <Link to="/"
              className="inline-block mt-6 rounded-lg bg-primary text-primary-foreground px-6 py-3 text-sm font-medium hover:opacity-90 transition"
            >
              Plan your own trip
            </Link>
          </div>
        )}

        {data && !loading && (
          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_23rem] lg:gap-8 lg:items-start print:block">
            {/* The trip itself — what they're being invited to */}
            <div className="space-y-4 print:space-y-3">
            {/* Countdown — shown when organiser set a trip date */}
            {data.selectedDate && (
              <div className="print:hidden">
                <Countdown selectedDate={data.selectedDate} />
              </div>
            )}

            {/* Cost at a glance */}
            {cb && (
              <Card>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 print:hidden">Your share</div>
                <div className="font-display text-4xl font-semibold text-foreground mb-1 print:text-2xl print:text-center">{fmtNGN(cb.per_person)}</div>
                <div className="text-sm text-muted-foreground print:hidden">per person</div>
                {data.payBy && (
                  <div className="text-xs text-muted-foreground text-center mt-1">Pay by {fmtDate(data.payBy)}</div>
                )}
                {data.included?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">What's included</div>
                    <ul className="space-y-1 text-sm">
                      {data.included.map((item, i) => (
                        <li key={i} className="flex items-start gap-2"><span aria-hidden="true">✓</span><span>{item}</span></li>
                      ))}
                    </ul>
                  </div>
                )}
                {/* An agency sells the trip at one price — the AI plan's
                    transport/lodging split and squad total don't apply. */}
                {!data.agency && (cb.transport_total > 0 || cb.lodging_total > 0) && (<>
                <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-muted-foreground text-[11px] uppercase tracking-wider mb-0.5">Transport</div>
                    <div className="font-medium tabular-nums">{fmtNGN(cb.transport_total / Math.max(1, data.squadSize || 1))}/p</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-[11px] uppercase tracking-wider mb-0.5">Lodging</div>
                    <div className="font-medium tabular-nums">{fmtNGN(cb.lodging_total / Math.max(1, data.squadSize || 1))}/p</div>
                  </div>
                </div>
                {data.squadSize && (
                  <div className="mt-3 pt-3 border-t border-border text-sm text-muted-foreground">
                    Full squad total: <span className="font-display font-semibold text-foreground">{fmtNGN(cb.total)}</span>
                  </div>
                )}
                </>)}
              </Card>
            )}

            {/* Transport + hotel — same small photo-card shape, side by side */}
            <div className="grid grid-cols-2 gap-4">
            {data.transport && (
              <Card className="p-0 overflow-hidden flex flex-col">
                <img
                  src={data.transport.logo || (data.transport.type?.toLowerCase().includes("flight") ? FLIGHT_FALLBACK_IMAGE : BUS_FALLBACK_IMAGE)}
                  alt=""
                  className={`h-14 w-full shrink-0 print:hidden ${data.transport.logo ? "object-contain bg-white" : "object-cover"}`}
                  onError={(e) => { (e.target as HTMLImageElement).src = data.transport!.type?.toLowerCase().includes("flight") ? FLIGHT_FALLBACK_IMAGE : BUS_FALLBACK_IMAGE; }}
                />
                <div className="p-2.5 flex flex-col flex-1 min-h-0">
                  <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Transport</div>
                  <div className="font-display text-sm font-semibold truncate mt-0.5">{data.transport.operator}</div>
                  {(data.transport.depart_time || data.transport.arrive_time) && (
                    <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                      {data.transport.depart_time && `Departs ${data.transport.depart_time}`}
                      {data.transport.depart_time && data.transport.arrive_time && " · "}
                      {data.transport.arrive_time && `Arrives ${data.transport.arrive_time}`}
                    </div>
                  )}
                  <div className="mt-auto pt-1.5 border-t border-border/50">
                    <div className="font-display text-sm font-semibold tabular-nums">{fmtNGN(data.transport.price_per_person)}</div>
                  </div>
                </div>
              </Card>
            )}

            {data.hotel && (
              <Card className="p-0 overflow-hidden flex flex-col">
                <img
                  src={(data.hotel.imageUrl && (imageUrl(data.hotel.imageUrl) || data.hotel.imageUrl)) || HOTEL_FALLBACK_IMAGE}
                  alt=""
                  className="h-14 w-full object-cover shrink-0 print:hidden"
                  onError={(e) => { (e.target as HTMLImageElement).src = HOTEL_FALLBACK_IMAGE; }}
                />
                <div className="p-2.5 flex flex-col flex-1 min-h-0">
                  <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Accommodation</div>
                  <div className="font-display text-sm font-semibold truncate mt-0.5">{data.hotel.name}</div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    {data.hotel.area}{data.hotel.rating ? ` · ⭐ ${data.hotel.rating.toFixed(1)}` : ''}
                  </div>
                  <div className="mt-auto pt-1.5 border-t border-border/50">
                    <div className="font-display text-sm font-semibold tabular-nums">{fmtNGN(data.hotel.price_per_night)}</div>
                  </div>
                </div>
              </Card>
            )}
            </div>

            {/* Highlights */}
            {data.highlights?.length > 0 && (
              <Card>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Trip highlights</div>
                <ul className="space-y-1.5">
                  {data.highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-foreground shrink-0 mt-0.5">✦</span>
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {/* Day-by-day */}
            {data.days_plan?.length > 0 && (
              <Card>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">The plan</div>
                {data.days_plan.map(day => (
                  <DayAccordion key={day.day} day={day} />
                ))}
              </Card>
            )}

            </div>

            {/* Joining and paying. Sticky on desktop: on a long itinerary the
                thing a squad member came to do shouldn't scroll away. */}
            <aside className="space-y-4 mt-4 lg:mt-0 lg:sticky lg:top-6 print:mt-0">
            {/* The organiser's own controls — renders nothing for anyone else */}
            {tripId && user && <TripCollectionPanel tripId={tripId} />}

            {/* Squad participation + payment */}
            {tripId && cb && (
              <JoinSection
                tripId={tripId}
                initialCount={data.participantCount}
                initialPaidCount={data.paidCount}
                initialTotalCollected={data.totalCollected}
                initialNames={data.participants.map(p => p.name)}
                perPerson={cb.per_person}
                squadSize={data.squadSize}
                groupMin={data.groupMin}
                paymentsEnabled={data.paymentsEnabled}
                justPaid={justPaid}
                selectedDate={data.selectedDate}
                installmentsEnabled={data.installmentsEnabled}
                installmentMinMonths={data.installmentMinMonths}
                installmentMaxMonths={data.installmentMaxMonths}
                installmentMinAmount={data.installmentMinAmount}
                paymentProvider={data.paymentProvider === "pandascrow" ? "pandascrow" : "paystack"}
                payFor={searchParams.get("p")}
                autoPay={searchParams.get("pay") === "1"}
                phoneRequired={!!data.phoneRequired}
              />
            )}

            {/* Actions row — share + print */}
            <div className="space-y-3 print:hidden">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 text-center">
                  Share with the squad
                </div>
                <ShareSection tripId={tripId!} destination={data.destination} />
              </div>

              {/* Print button */}
              <button
                onClick={() => window.print()}
                className="w-full rounded-lg bg-secondary text-foreground py-3 text-sm font-medium ring-hairline hover:bg-secondary/70 transition flex items-center justify-center gap-2"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 6 2 18 2 18 9" />
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                  <rect x="6" y="14" width="12" height="8" />
                </svg>
                Print / Save as PDF
              </button>
            </div>

            {/* Plan your own */}
            <div className="pt-4 text-center print:hidden">
              <p className="text-sm text-muted-foreground mb-3">Want to plan your own squad trip?</p>
              <Link
                to="/start"
                className="inline-flex items-center gap-2 rounded-lg bg-card ring-hairline px-6 py-3 text-sm font-medium hover:bg-secondary transition"
              >
                Plan a trip with AI
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
