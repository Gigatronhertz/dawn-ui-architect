import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowRight, MessageCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api, type UserPlan, type SquadMember } from "@/lib/api";
import { Nav } from "@/components/Nav";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { tripImageUrl } from "@/lib/tripImage";
import { OBUDU_PHOTO } from "@/lib/photos";

const fmtNGN = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n);

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  generating:     { label: "Generating…", color: "text-google-blue bg-google-blue/10" },
  plan_review:    { label: "Ready",       color: "text-google-green bg-google-green/10" },
  awaiting_group: { label: "Confirmed",   color: "text-foreground bg-primary/10" },
  curated:        { label: "Ready to share", color: "text-foreground bg-primary/10" },
  custom:         { label: "Ready to share", color: "text-foreground bg-primary/10" },
  error:          { label: "Failed",      color: "text-destructive bg-destructive/10" },
};

/** Statuses whose plan has a public page a squad can open and pay on. */
const SHAREABLE_STATUS = ["curated", "custom", "awaiting_group"];

export default function MyPlans() {
  const { user, loading, getIdToken } = useAuth();

  const [plans, setPlans]     = useState<UserPlan[]>([]);
  const [fetching, setFetching] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const cardsReveal = useScrollReveal<HTMLOListElement>();

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
        <div className="w-8 h-8 rounded-full border-2 border-signal border-t-transparent animate-spin" />
      </main>
    );
  }

  // ── Not logged in — redirect to dedicated login page ─────────────────────
  if (!user) return <Navigate to="/login?next=/my-plans" replace />;

  return (
    <main className="min-h-screen bg-background">
      <Nav />

      {/* Hero */}
      <section className="kj-dark relative bg-ink overflow-hidden">
        <img src={OBUDU_PHOTO} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover" />
        <div aria-hidden="true" className="absolute inset-0 kj-scrim" />
        <div aria-hidden="true" className="absolute inset-0 kj-scrim-left" />
        <div className="relative mx-auto max-w-5xl px-6 pt-32 md:pt-40 pb-12 md:pb-16 flex flex-col gap-4">
          <p className="kj-eyebrow">My plans</p>
          <h1 className="text-[clamp(2.5rem,6.5vw,4.5rem)] leading-[1] text-white max-w-[14ch]">Your next adventure awaits.</h1>
          <p className="text-base md:text-lg text-white/85 max-w-md">
            {user.name ? `Welcome back, ${user.name.split(" ")[0]}. ` : ""}Keep track of your trips, see who's paid, and plan the next one.
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <a href="#trips" className="kj-btn rounded-full px-6">View my trips <ArrowRight className="w-4 h-4" /></a>
            <Link to="/start" className="kj-btn-outline !text-white !border-white/40 hover:!border-signal py-3 px-5">Plan a new trip</Link>
          </div>
        </div>
      </section>

      <div id="trips" className="mx-auto max-w-5xl px-6 pt-12 md:pt-16 pb-24 space-y-6 scroll-mt-20">
        <div className="flex items-end justify-between gap-4">
          <h2 className="kj-title-sm">Your trips</h2>
          {plans.length > 0 && <span className="text-sm text-muted-foreground">{plans.length} saved</span>}
        </div>

        {/* Plans list */}
        {fetching && (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 rounded-full border-2 border-signal border-t-transparent animate-spin" />
          </div>
        )}

        {error && (
          <div className="rounded-2xl bg-destructive/10 ring-1 ring-destructive/20 px-5 py-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {!fetching && plans.length === 0 && !error && (
          <div className="kj-card p-10 text-center flex flex-col items-center gap-3">
            <div className="font-display text-2xl">No saved plans yet</div>
            <p className="text-sm text-muted-foreground">Pick a trip on Explore or plan your own, and it'll be saved here.</p>
            <Link to="/start/explore" className="kj-btn rounded-full mt-2">Explore trips <ArrowRight className="w-4 h-4" /></Link>
          </div>
        )}

        {!fetching && plans.length > 0 && (
          <ol ref={cardsReveal.ref} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
            {plans.map((p, i) => {
              const s = STATUS_LABEL[p.status] ?? { label: p.status, color: "text-muted-foreground bg-secondary" };
              const perPerson = p.plan?.cost_breakdown?.per_person;
              const date = new Date(p.createdAt * 1000).toLocaleDateString("en-NG", { day: "numeric", month: "short" });
              // Awaiting-group plans have more content (participants + payment bar) — they go full-width
              const isActive = p.status === 'awaiting_group';
              const revealCls = cardsReveal.visible ? "animate-rise" : "opacity-0";
              const revealStyle = { animationDelay: `${i * 0.06}s` };
              return (
                <li key={p.tripId} className={isActive ? "col-span-2 md:col-span-3 lg:col-span-4" : ""}>
                  {p.status === 'plan_review' ? (
                    <Link
                      to={`/start/trip?job=${p.tripId}`}
                      style={revealStyle}
                      className={`${revealCls} group flex flex-col h-full kj-card kj-card-hover overflow-hidden`}
                    >
                      <PlanCardSquare p={p} s={s} date={date} perPerson={perPerson} />
                    </Link>
                  ) : p.status === 'awaiting_group' ? (
                    <div style={revealStyle} className={`${revealCls} kj-card p-5 space-y-4`}>
                      {/* Compact trip header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 ${s.color}`}>{s.label}</span>
                            <span className="text-[11px] text-muted-foreground">{date}</span>
                          </div>
                          <div className="font-marcellus truncate">{p.origin || "—"} → {p.destination || "—"}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {p.days ? `${p.days}d` : "—"}{p.squadSize ? ` · ${p.squadSize} people` : ""}
                          </div>
                        </div>
                        {perPerson && (
                          <div className="text-right shrink-0">
                            <div className="font-marcellus text-foreground">{fmtNGN(perPerson)}</div>
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
                            className="kj-btn rounded-full text-xs px-4 py-2"
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
                                className="h-full rounded-full bg-signal transition-all"
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
                      style={revealStyle}
                      className={`${revealCls} group flex flex-col h-full kj-card kj-card-hover overflow-hidden`}
                    >
                      <PlanCardSquare p={p} s={s} date={date} perPerson={perPerson} />
                    </Link>
                  ) : (
                    <div style={revealStyle} className={`${revealCls} flex flex-col h-full kj-card overflow-hidden`}>
                      <PlanCardSquare p={p} s={s} date={date} perPerson={perPerson} />
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}

        <a href="mailto:hello@karije.com?subject=Help%20with%20my%20trip" className="group kj-card kj-card-hover flex items-center gap-4 p-5 mt-4">
          <span className="w-12 h-12 shrink-0 rounded-full bg-signal text-ink grid place-items-center"><MessageCircle className="w-5 h-5" /></span>
          <span className="flex-1">
            <span className="block font-semibold">Need help?</span>
            <span className="block text-sm text-muted-foreground">Get in touch with our team.</span>
          </span>
          <span className="text-xl transition-transform group-hover:translate-x-1" aria-hidden="true">›</span>
        </a>
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
                        className="text-[10px] font-semibold text-foreground hover:underline shrink-0"
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
  const image = p.plan?.curated?.imageId ? tripImageUrl(p.plan.curated.imageId, 600, 400) : null;
  const [day, mon] = date.split(" ");
  return (
    <div className="flex flex-col h-full">
      <div className="relative h-[110px] md:h-[140px] bg-ink shrink-0 overflow-hidden">
        {image && <img src={image} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" onError={(e) => { e.currentTarget.style.display = "none"; }} />}
        <div className="absolute top-2.5 left-2.5 rounded-lg bg-signal text-ink w-11 py-1 flex flex-col items-center leading-none">
          <span className="font-display text-xl leading-[1.05]">{day}</span>
          <span className="text-[9px] font-bold tracking-[0.12em] uppercase">{mon}</span>
        </div>
        <span className={`absolute top-2.5 right-2.5 text-[10px] font-semibold rounded-full bg-white text-ink px-2 py-0.5 ${p.status === 'generating' ? 'animate-pulse' : ''}`}>
          {s.label}
        </span>
      </div>

      <div className="p-3 md:p-4 flex flex-col flex-1 gap-1">
        {/* Title. A trip inside one city has no route to show — "Lagos → Lagos"
            tells you nothing — so name it instead. */}
        <div className="font-display text-base md:text-lg leading-snug">
          {p.plan?.curated?.name ? (
            <span className="line-clamp-2">{p.plan.curated.name}</span>
          ) : p.origin && p.destination && p.origin === p.destination ? (
            <span>A day out in {p.destination}</span>
          ) : (
            <>
              <span>{p.origin || "—"}</span>
              <span className="text-muted-foreground mx-1 text-sm">→</span>
              <span>{p.destination || "—"}</span>
            </>
          )}
        </div>

        <div className="text-[11px] md:text-xs text-muted-foreground">
          {p.days ? `${p.days} ${p.days === 1 ? "day" : "days"}` : "—"}{p.squadSize ? ` · ${p.squadSize} going` : ""}
        </div>

        <div className="mt-auto pt-2 flex items-end justify-between gap-2">
          {perPerson ? (
            <div>
              <div className="font-semibold text-sm md:text-base tabular-nums leading-none">{fmtNGN(perPerson)}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">/person</div>
            </div>
          ) : <span />}
          {p.status !== 'generating' && p.status !== 'error' && (
            <span className="kj-arrow w-7 h-7 md:w-8 md:h-8 text-sm" aria-hidden="true">→</span>
          )}
        </div>
      </div>
    </div>
  );
}
