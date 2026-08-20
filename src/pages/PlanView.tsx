/**
 * PlanView — public, auth-free squad plan page.
 * Opened from the share link the organiser sends: /plan/:tripId
 * Squad members can view the full confirmed plan, say "I'm in!",
 * pay their per-person share via Paystack, and print the itinerary.
 */
import { useEffect, useRef, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { api, type PublicPlanResponse, type PlanDay } from "@/lib/api";
import { KarijeLogo } from "@/components/Nav";

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
        <div className="font-display text-6xl font-semibold text-primary tabular-nums mb-1">{diffDays}</div>
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
          <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">Day {day.day}</span>
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
          <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">Day {day.day}</span>
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
type PayState = "idle" | "form" | "loading" | "redirecting" | "verifying" | "paid" | "unconfirmed";

function PaymentSection({
  tripId, participantId, perPerson, justPaid, paymentsEnabled,
}: {
  tripId: string; participantId: string; perPerson: number; justPaid: boolean; paymentsEnabled: boolean;
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

  // Ask once on mount who this is. Doubles as recovery: if a payment landed
  // while the page was closed, this is where it gets picked up.
  useEffect(() => {
    let live = true;
    api.getMyPaymentStatus(tripId, participantId)
      .then((s) => {
        if (!live) return;
        setHasEmail(s.hasEmail);
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
        const { paid } = await api.getMyPaymentStatus(tripId, participantId);
        if (!live) return;
        if (paid) { setPayState("paid"); return; }
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
        <div className="w-10 h-10 rounded-2xl bg-google-green/15 grid place-items-center text-xl shrink-0">✅</div>
        <div>
          <div className="font-display font-semibold text-google-green">Payment confirmed!</div>
          <p className="text-sm text-muted-foreground mt-0.5">You're all set. See you on the trip! 🎉</p>
        </div>
      </div>
    );
  }

  if (payState === "verifying") {
    return (
      <div className="rounded-2xl bg-secondary/60 ring-hairline p-5 flex items-center gap-3">
        <div className="w-7 h-7 rounded-full border-2 border-primary border-t-transparent animate-spin shrink-0" />
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
        <div className="w-7 h-7 rounded-full border-2 border-primary border-t-transparent animate-spin shrink-0" />
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
            className="flex-1 rounded-full bg-secondary text-foreground py-2.5 text-sm font-medium hover:bg-secondary/70 transition"
          >
            Check again
          </button>
          <button
            onClick={() => setPayState("form")}
            className="flex-1 rounded-full bg-gradient-primary text-primary-foreground py-2.5 text-sm font-medium shadow-glow hover:opacity-90 transition"
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
   * someone who joined without one — a WhatsApp-only signup — still sees a form.
   */
  function handlePayNow() {
    if (hasEmail) {
      setPayState("redirecting");
      window.location.href = api.payLink(participantId);
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
      const { authorization_url } = await api.initPayment(tripId, { participantId, email: email.trim() });
      setPayState("redirecting");
      window.location.href = authorization_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed. Please try again.");
      setPayState("form");
    }
  }

  return (
    <div className="rounded-2xl bg-primary/10 ring-1 ring-primary/20 p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="font-display font-semibold">Pay your share</div>
          <div className="text-sm text-muted-foreground">Secure payment via Paystack</div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-display text-2xl font-semibold text-primary">{fmtNGN(perPerson)}</div>
          <div className="text-[10px] text-muted-foreground">per person</div>
        </div>
      </div>

      {payState === "idle" && (
        <button
          onClick={handlePayNow}
          className="w-full rounded-full bg-gradient-primary text-primary-foreground py-3 text-sm font-medium shadow-glow hover:opacity-90 active:scale-[0.98] transition"
        >
          Pay now →
        </button>
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
              className="flex-1 rounded-full bg-gradient-primary text-primary-foreground py-3 text-sm font-medium shadow-glow hover:opacity-90 active:scale-[0.98] transition"
            >
              Pay {fmtNGN(perPerson)} →
            </button>
            <button type="button" onClick={() => { setPayState("idle"); setError(""); }}
              className="rounded-full bg-secondary text-foreground px-4 py-3 text-sm font-medium hover:bg-secondary/60 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {payState === "loading" && (
        <div className="flex items-center justify-center py-3 gap-3 text-sm text-muted-foreground">
          <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin shrink-0" />
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
  perPerson, squadSize, groupMin, paymentsEnabled, justPaid,
}: {
  tripId: string; initialCount: number; initialPaidCount: number; initialTotalCollected: number;
  initialNames: (string | null)[]; perPerson: number; squadSize: number | null;
  groupMin: number | null; paymentsEnabled: boolean; justPaid: boolean;
}) {
  const storageKey = `msgo_pid_${tripId}`;
  const [count, setCount]             = useState(initialCount);
  const [paidCount, setPaidCount]     = useState(initialPaidCount);
  const [totalCollected, setTotal]    = useState(initialTotalCollected);
  const [names, setNames]             = useState<(string | null)[]>(initialNames);
  const [participantId, setPid]       = useState<string | null>(() => localStorage.getItem(storageKey));
  const [joinState, setJoinState]     = useState<JoinState>(participantId ? "joined" : "idle");
  const [nameInput, setNameInput]     = useState("");
  const [emailInput, setEmailInput]   = useState("");
  const [waInput, setWaInput]         = useState("");
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
    setJoinState("loading");
    setError("");
    try {
      const { count: newCount, participantId: pid } = await api.joinPlan(tripId, {
        name:     nameInput.trim()  || undefined,
        email:    emailInput.trim() || undefined,
        waNumber: waInput.trim()    || undefined,
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
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-google-green bg-google-green/10 ring-1 ring-google-green/20 rounded-full px-3 py-1">
                ✓ Minimum reached — this trip is running
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-secondary/60 ring-hairline rounded-full px-3 py-1">
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
            <div className="text-google-green font-semibold text-sm">✓ You're in the squad!</div>
          </div>
          <PaymentSection
            tripId={tripId} participantId={participantId!}
            perPerson={perPerson} justPaid={justPaid} paymentsEnabled={paymentsEnabled}
          />
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
            className="text-xs text-primary hover:underline pt-1"
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
            type="tel" inputMode="tel" value={waInput}
            onChange={e => setWaInput(e.target.value)}
            placeholder="WhatsApp number"
            className="w-full rounded-xl bg-secondary/60 ring-hairline px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-primary/40 transition placeholder:text-muted-foreground/60"
          />
          <input
            type="email" inputMode="email" value={emailInput}
            onChange={e => setEmailInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleJoin(false); }}
            placeholder="Email — for your receipt"
            className="w-full rounded-xl bg-secondary/60 ring-hairline px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-primary/40 transition placeholder:text-muted-foreground/60"
          />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            We use these to send your receipt and let you know if anything about the trip changes.
          </p>

          <div className="flex gap-2">
            <button onClick={() => handleJoin(false)}
              className="flex-1 rounded-full bg-gradient-primary text-primary-foreground py-3 text-sm font-medium shadow-glow hover:opacity-90 active:scale-[0.98] transition"
            >
              I'm in! 🎉
            </button>
            <button onClick={() => setJoinState("idle")}
              className="rounded-full bg-secondary text-foreground px-4 py-3 text-sm font-medium hover:bg-secondary/60 transition"
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
          <div className="w-7 h-7 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : (
        <button onClick={() => setJoinState("name-input")}
          className="w-full rounded-full bg-gradient-primary text-primary-foreground py-4 text-base font-medium shadow-glow hover:opacity-90 active:scale-[0.98] transition"
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
        className={`flex-1 rounded-full py-3 text-sm font-medium ring-hairline transition ${
          copied ? "bg-google-green/10 text-google-green ring-google-green/20" : "bg-card text-foreground hover:bg-secondary"
        }`}
      >
        {copied ? "✓ Link copied" : "Copy link"}
      </button>
      <a
        href={`https://wa.me/?text=${waText}`}
        target="_blank" rel="noopener noreferrer"
        className="flex-1 rounded-full py-3 text-sm font-medium text-center bg-whatsapp text-white hover:opacity-90 transition"
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

  const [data, setData]     = useState<PublicPlanResponse | null>(null);
  const [loading, setLoad]  = useState(true);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!tripId) { setError("Invalid plan link."); setLoad(false); return; }
    api.getPublicPlan(tripId)
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoad(false));
  }, [tripId]);

  useEffect(() => {
    document.title = data?.destination
      ? `${data.destination} Squad Trip · Karije`
      : "Squad Trip · Karije";
  }, [data]);

  const cb = data?.cost_breakdown;

  return (
    <main className="min-h-screen bg-hero-mesh print:bg-white print:min-h-0">
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

      {/* Screen header */}
      <header className="pt-6 pb-2 print:hidden">
        <div className="mx-auto max-w-lg px-4">
          <KarijeLogo size="sm" />
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 pb-24 space-y-4 print:max-w-full print:px-8 print:pb-8 print:space-y-3">
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
              className="inline-block mt-6 rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm font-medium hover:opacity-90 transition"
            >
              Plan your own trip
            </Link>
          </div>
        )}

        {data && !loading && (
          <>
            {/* Countdown — shown when organiser set a trip date */}
            {data.selectedDate && (
              <div className="print:hidden">
                <Countdown selectedDate={data.selectedDate} />
              </div>
            )}

            {/* Hero */}
            <div className="text-center py-6 print:py-3 print:text-left">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2 print:hidden">
                {data.origin || "Your city"} → {data.destination || "Destination"}
              </div>
              <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight mb-3 print:text-2xl">
                {data.destination || "Squad Trip"}
              </h1>
              <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground flex-wrap print:justify-start">
                {data.days && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/80 text-xs font-medium print:bg-transparent print:px-0 print:text-foreground">
                    📅 {data.days} day{data.days === 1 ? "" : "s"}
                  </span>
                )}
                {data.squadSize && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/80 text-xs font-medium print:bg-transparent print:px-0 print:text-foreground">
                    👥 {data.squadSize} people
                  </span>
                )}
                {data.selectedDate && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/80 text-xs font-medium print:bg-transparent print:px-0 print:text-foreground">
                    🗓 {fmtDate(data.selectedDate)}
                  </span>
                )}
              </div>
            </div>

            {/* Cost at a glance */}
            {cb && (
              <Card>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 print:hidden">Your share</div>
                <div className="font-display text-4xl font-semibold text-primary mb-1 print:text-2xl print:text-center">{fmtNGN(cb.per_person)}</div>
                <div className="text-sm text-muted-foreground print:hidden text-center">per person</div>
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
              </Card>
            )}

            {/* Transport */}
            {data.transport && (
              <Card>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Transport</div>
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-primary/10 grid place-items-center text-xl shrink-0 print:hidden">
                    {data.transport.type?.toLowerCase().includes("flight") ? "✈️" : "🚌"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-display font-semibold truncate">{data.transport.operator}</div>
                    <div className="text-sm text-muted-foreground">{data.transport.type}</div>
                    {(data.transport.depart_time || data.transport.arrive_time) && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {data.transport.depart_time && `Departs ${data.transport.depart_time}`}
                        {data.transport.depart_time && data.transport.arrive_time && " · "}
                        {data.transport.arrive_time && `Arrives ${data.transport.arrive_time}`}
                      </div>
                    )}
                    {data.transport.pickup && (
                      <div className="text-xs text-muted-foreground">Pickup: {data.transport.pickup}</div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-display font-semibold">{fmtNGN(data.transport.price_per_person)}</div>
                    <div className="text-[10px] text-muted-foreground">/person</div>
                  </div>
                </div>
              </Card>
            )}

            {/* Hotel */}
            {data.hotel && (
              <Card>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Accommodation</div>
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-primary/10 grid place-items-center text-xl shrink-0 print:hidden">🏨</div>
                  <div className="min-w-0 flex-1">
                    <div className="font-display font-semibold truncate">{data.hotel.name}</div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                      {data.hotel.area && <span>{data.hotel.area}</span>}
                      {data.hotel.rating && <span>⭐ {data.hotel.rating.toFixed(1)}</span>}
                    </div>
                    {data.hotel.perks?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5 print:gap-0">
                        {data.hotel.perks.slice(0, 4).map(p => (
                          <span key={p} className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary/60 text-muted-foreground print:bg-transparent print:after:content-['·'] print:px-0 print:mr-2">{p}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-display font-semibold">{fmtNGN(data.hotel.price_per_night)}</div>
                    <div className="text-[10px] text-muted-foreground">/night</div>
                  </div>
                </div>
              </Card>
            )}

            {/* Highlights */}
            {data.highlights?.length > 0 && (
              <Card>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Trip highlights</div>
                <ul className="space-y-1.5">
                  {data.highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-primary shrink-0 mt-0.5">✦</span>
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
                className="w-full rounded-full bg-secondary text-foreground py-3 text-sm font-medium ring-hairline hover:bg-secondary/70 transition flex items-center justify-center gap-2"
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
                className="inline-flex items-center gap-2 rounded-full bg-card ring-hairline px-6 py-3 text-sm font-medium hover:bg-secondary transition"
              >
                Plan a trip with AI
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
