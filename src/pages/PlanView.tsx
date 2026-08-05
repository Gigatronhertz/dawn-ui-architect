/**
 * PlanView — public, auth-free squad plan page.
 * Opened from the share link the organiser sends: /plan/:tripId
 * Squad members can view the full confirmed plan and tap "I'm in!".
 */
import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, type PublicPlanResponse, type PlanDay } from "@/lib/api";

// ── helpers ───────────────────────────────────────────────────────────────────

const fmtNGN = (n: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(n);

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-3xl bg-card ring-hairline shadow-card p-5 ${className}`}>
      {children}
    </div>
  );
}

function StarRating({ rating }: { rating: number | null }) {
  if (!rating) return null;
  return (
    <span className="inline-flex items-center gap-0.5 text-[11px] text-amber-500 font-medium">
      ⭐ {rating.toFixed(1)}
    </span>
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
        className="w-full flex items-center justify-between gap-3 py-3 text-left"
      >
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
            Day {day.day}
          </span>
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
      {open && (
        <div className="pb-3 space-y-1.5">
          {day.activities.map((a, i) => (
            <div key={i} className="flex items-start justify-between gap-3 text-sm">
              <div className="flex gap-2">
                {a.time && (
                  <span className="text-[10px] text-muted-foreground tabular-nums shrink-0 mt-0.5 w-12">{a.time}</span>
                )}
                <span className="text-foreground/90">{a.title}</span>
              </div>
              {a.cost_per_person > 0 && (
                <span className="text-[11px] text-muted-foreground shrink-0 tabular-nums">
                  {fmtNGN(a.cost_per_person)}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Join section ──────────────────────────────────────────────────────────────

type JoinState = "idle" | "name-input" | "loading" | "joined" | "error";

function JoinSection({
  tripId,
  initialCount,
  initialNames,
}: {
  tripId: string;
  initialCount: number;
  initialNames: (string | null)[];
}) {
  const [count, setCount] = useState(initialCount);
  const [names, setNames] = useState<(string | null)[]>(initialNames);
  const [joinState, setJoinState] = useState<JoinState>("idle");
  const [nameInput, setNameInput] = useState("");
  const [error, setError] = useState("");
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Poll for new joiners every 20 s
  useEffect(() => {
    function poll() {
      pollRef.current = setTimeout(async () => {
        try {
          const data = await api.getParticipants(tripId);
          setCount(data.count);
          setNames(data.names);
        } catch { /* swallow poll errors */ }
        poll();
      }, 20_000);
    }
    poll();
    return () => { if (pollRef.current) clearTimeout(pollRef.current); };
  }, [tripId]);

  async function handleJoin() {
    setJoinState("loading");
    setError("");
    try {
      const { count: newCount } = await api.joinPlan(tripId, nameInput.trim() || undefined);
      setCount(newCount);
      if (nameInput.trim()) setNames(prev => [...prev, nameInput.trim()]);
      setJoinState("joined");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setJoinState("error");
    }
  }

  const displayNames = names.filter(Boolean) as string[];

  return (
    <Card className="text-center">
      {/* Count */}
      <div className="mb-4">
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
      </div>

      {/* CTA */}
      {joinState === "joined" ? (
        <div className="rounded-2xl bg-google-green/10 ring-1 ring-google-green/25 px-5 py-4">
          <div className="text-google-green font-display font-semibold text-lg">✓ You're in!</div>
          <p className="text-sm text-muted-foreground mt-1">
            {nameInput.trim() ? `Welcome, ${nameInput.trim()}!` : "Welcome to the squad."}
          </p>
        </div>
      ) : joinState === "name-input" ? (
        <div className="space-y-3">
          <input
            type="text"
            autoFocus
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleJoin(); }}
            placeholder="Your first name (optional)"
            maxLength={40}
            className="w-full rounded-xl bg-secondary/60 ring-hairline px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-primary/40 transition placeholder:text-muted-foreground/60"
          />
          <div className="flex gap-2">
            <button
              onClick={handleJoin}
              className="flex-1 rounded-full bg-gradient-primary text-primary-foreground py-3 text-sm font-medium shadow-glow hover:opacity-90 active:scale-[0.98] transition"
            >
              I'm in! 🎉
            </button>
            <button
              onClick={() => setJoinState("idle")}
              className="rounded-full bg-secondary text-foreground px-4 py-3 text-sm font-medium hover:bg-secondary/60 transition"
            >
              Cancel
            </button>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      ) : joinState === "loading" ? (
        <div className="flex justify-center py-4">
          <div className="w-7 h-7 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : (
        <button
          onClick={() => setJoinState("name-input")}
          className="w-full rounded-full bg-gradient-primary text-primary-foreground py-4 text-base font-medium shadow-glow hover:opacity-90 active:scale-[0.98] transition"
        >
          I'm in! 🎉
        </button>
      )}
    </Card>
  );
}

// ── Share section ─────────────────────────────────────────────────────────────

function ShareSection({ tripId, destination }: { tripId: string; destination: string | null }) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/plan/${tripId}`;
  const waText = encodeURIComponent(
    `🛫 Check out our squad trip to ${destination || "the destination"}! Say you're in:\n${url}`
  );

  function copyLink() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="flex gap-3">
      <button
        onClick={copyLink}
        className={`flex-1 rounded-full py-3 text-sm font-medium ring-hairline transition ${
          copied
            ? "bg-google-green/10 text-google-green ring-google-green/20"
            : "bg-card text-foreground hover:bg-secondary"
        }`}
      >
        {copied ? "✓ Link copied" : "Copy link"}
      </button>
      <a
        href={`https://wa.me/?text=${waText}`}
        target="_blank"
        rel="noopener noreferrer"
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
  const { tripId } = useParams<{ tripId: string }>();
  const [data, setData] = useState<PublicPlanResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tripId) { setError("Invalid plan link."); setLoading(false); return; }
    api.getPublicPlan(tripId)
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [tripId]);

  useEffect(() => {
    if (data?.destination) {
      document.title = `${data.destination} Squad Trip · MySquadGo`;
    } else {
      document.title = "Squad Trip · MySquadGo";
    }
  }, [data]);

  const cb = data?.cost_breakdown;

  return (
    <main className="min-h-screen bg-hero-mesh">
      {/* Header */}
      <header className="pt-6 pb-2">
        <div className="mx-auto max-w-lg px-4">
          <Link to="/" className="inline-flex items-center gap-2 font-display font-semibold text-sm">
            <span className="grid place-items-center w-7 h-7 rounded-xl bg-gradient-primary text-primary-foreground shadow-soft">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2l3 7 7 .8-5.3 4.7L18.5 22 12 18l-6.5 4 1.8-7.5L2 9.8 9 9z" />
              </svg>
            </span>
            MySquadGo
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 pb-24 space-y-4">
        {loading && <LoadingSkeleton />}

        {error && !loading && (
          <div className="py-16 text-center">
            <div className="text-4xl mb-4">🔒</div>
            <div className="font-display text-xl font-semibold mb-2">Plan not available</div>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">{error}</p>
            <Link
              to="/"
              className="inline-block mt-6 rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm font-medium hover:opacity-90 transition"
            >
              Plan your own trip
            </Link>
          </div>
        )}

        {data && !loading && (
          <>
            {/* Hero */}
            <div className="text-center py-8">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2">
                {data.origin || "Your city"} → {data.destination || "Destination"}
              </div>
              <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight mb-3">
                {data.destination || "Squad Trip"}
              </h1>
              <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground flex-wrap">
                {data.days && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/80 text-xs font-medium">
                    📅 {data.days} day{data.days === 1 ? "" : "s"}
                  </span>
                )}
                {data.squadSize && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/80 text-xs font-medium">
                    👥 {data.squadSize} people
                  </span>
                )}
              </div>
            </div>

            {/* Cost at a glance */}
            {cb && (
              <Card className="text-center">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Your share</div>
                <div className="font-display text-4xl font-semibold text-primary mb-1">
                  {fmtNGN(cb.per_person)}
                </div>
                <div className="text-sm text-muted-foreground">per person</div>
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
                  <div className="w-11 h-11 rounded-2xl bg-primary/10 grid place-items-center text-xl shrink-0">
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
                  <div className="w-11 h-11 rounded-2xl bg-primary/10 grid place-items-center text-xl shrink-0">🏨</div>
                  <div className="min-w-0 flex-1">
                    <div className="font-display font-semibold truncate">{data.hotel.name}</div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                      {data.hotel.area && <span>{data.hotel.area}</span>}
                      <StarRating rating={data.hotel.rating} />
                    </div>
                    {data.hotel.perks?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {data.hotel.perks.slice(0, 4).map(p => (
                          <span key={p} className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary/60 text-muted-foreground">{p}</span>
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

            {/* Squad participation */}
            {tripId && (
              <JoinSection
                tripId={tripId}
                initialCount={data.participantCount}
                initialNames={data.participants.map(p => p.name)}
              />
            )}

            {/* Share */}
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 text-center">
                Share with the squad
              </div>
              <ShareSection tripId={tripId!} destination={data.destination} />
            </div>

            {/* Plan your own */}
            <div className="pt-4 text-center">
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
