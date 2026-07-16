import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, type GeminiPlan, type IntakeData, type PlanDay, type Activity } from "@/lib/api";

/* ─── constants ────────────────────────────────────────────────────────────── */
const VIBES = ["Chill & scenic", "Nightlife", "Foodie tour", "Adventure", "Cultural"];
const ACCOMMODATION_TYPES = ["Hotel", "Shortlet", "Budget guesthouse", "Surprise me"];
const DATE_OPTIONS = ["Flexible", "I have specific dates"];

const MAPS_PLACES = [
  { id: "p1", title: "Local cultural centre", tag: "Culture", cost: 1500, emoji: "🏛️", blurb: "Heritage tours and local craft exhibitions." },
  { id: "p2", title: "Top-rated amala spot", tag: "Foodie", cost: 2500, emoji: "🍲", blurb: "Legendary street spot — locals queue out the door." },
  { id: "p3", title: "Waterfront park", tag: "Chill", cost: 1000, emoji: "🌊", blurb: "Great for morning walks or evening hangouts." },
  { id: "p4", title: "Night market", tag: "Nightlife", cost: 3000, emoji: "🌙", blurb: "Street food, music, and local crafts after dark." },
  { id: "p5", title: "Nature reserve trail", tag: "Adventure", cost: 4000, emoji: "🌳", blurb: "Guided walks through forested terrain." },
  { id: "p6", title: "Viewing tower", tag: "Viewpoint", cost: 1500, emoji: "🗼", blurb: "360° city views — best at golden hour." },
];

const fmtNGN = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n);

/* ─── shared UI ─────────────────────────────────────────────────────────────── */
const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-3xl bg-card ring-hairline shadow-card p-6 md:p-8 animate-rise ${className}`}>{children}</div>
);

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary mb-1">{children}</div>
);

const chipCls = (active: boolean) =>
  `px-3 py-1.5 rounded-full text-xs font-medium ring-hairline transition-all ${
    active ? "bg-foreground text-background" : "bg-card text-foreground hover:bg-secondary"
  }`;

/* ─── step 1: intake ────────────────────────────────────────────────────────── */
function IntakeStep({ onSubmit }: { onSubmit: (data: IntakeData, phone: string) => void }) {
  const [phone, setPhone] = useState("");
  const [form, setForm] = useState<IntakeData>({
    origin: "Lagos",
    destination: "Ibadan",
    budget: 25000,
    days: 2,
    squadSize: 8,
    accommodationType: "Hotel",
    dateFlexibility: "Flexible",
    dealbreakers: "",
  });

  const set = <K extends keyof IntakeData>(k: K, v: IntakeData[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const inputCls =
    "w-full rounded-xl bg-secondary/60 ring-hairline px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition";

  const Field = ({ n, label, children }: { n: number; label: string; children: React.ReactNode }) => (
    <label className="block">
      <div className="flex items-baseline gap-2 mb-2">
        <span className="font-display text-xs font-semibold tabular-nums text-muted-foreground">
          {String(n).padStart(2, "0")}
        </span>
        <span className="text-sm font-medium">{label}</span>
      </div>
      {children}
    </label>
  );

  return (
    <Card>
      <div className="mb-7">
        <SectionLabel>Plan your trip</SectionLabel>
        <h1 className="font-display text-2xl md:text-4xl font-semibold tracking-tight leading-tight text-gradient">
          Tell us about the trip.
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          8 quick questions. Gemini builds the full itinerary. You edit before it goes to the squad.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <Field n={1} label="Where from?">
          <input className={inputCls} value={form.origin} onChange={(e) => set("origin", e.target.value)} />
        </Field>
        <Field n={2} label="Where to?">
          <input className={inputCls} value={form.destination} onChange={(e) => set("destination", e.target.value)} />
        </Field>

        <Field n={3} label={`Budget per person · ${fmtNGN(form.budget)}`}>
          <input
            type="range" min={5000} max={200000} step={1000} value={form.budget}
            onChange={(e) => set("budget", +e.target.value)} className="w-full accent-primary"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>₦5k</span><span>₦200k</span>
          </div>
        </Field>

        <Field n={4} label={`How many days? · ${form.days}`}>
          <input
            type="range" min={1} max={10} value={form.days}
            onChange={(e) => set("days", +e.target.value)} className="w-full accent-primary"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>1 day</span><span>10 days</span>
          </div>
        </Field>

        <Field n={5} label={`Squad size · ${form.squadSize} people`}>
          <input
            type="range" min={2} max={40} value={form.squadSize}
            onChange={(e) => set("squadSize", +e.target.value)} className="w-full accent-primary"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>2</span><span>40</span>
          </div>
        </Field>

        <Field n={6} label="Accommodation type">
          <div className="flex flex-wrap gap-2">
            {ACCOMMODATION_TYPES.map((t) => (
              <button key={t} type="button" onClick={() => set("accommodationType", t)} className={chipCls(form.accommodationType === t)}>
                {t}
              </button>
            ))}
          </div>
        </Field>

        <Field n={7} label="Specific dates or flexible?">
          <div className="flex flex-wrap gap-2">
            {DATE_OPTIONS.map((d) => (
              <button key={d} type="button" onClick={() => set("dateFlexibility", d)} className={chipCls(form.dateFlexibility === d)}>
                {d}
              </button>
            ))}
          </div>
        </Field>

        <div className="md:col-span-2">
          <Field n={8} label="Any dealbreakers?">
            <input
              className={inputCls}
              placeholder="e.g. must have AC / halal food / no shared rooms"
              value={form.dealbreakers}
              onChange={(e) => set("dealbreakers", e.target.value)}
            />
          </Field>
        </div>

        <div className="md:col-span-2">
          <div className="rounded-2xl bg-whatsapp/8 ring-1 ring-whatsapp/20 p-4">
            <Field n={9} label="Your WhatsApp number">
              <input
                type="tel"
                className={inputCls}
                placeholder="+234 801 234 5678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </Field>
            <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
              The bot will DM you the plan and add-to-group instructions the moment you confirm.
              No spam — one message only until the group is live.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Takes ~15 seconds. Gemini prices hotels and transport in real time.
        </p>
        <button
          onClick={() => onSubmit(form, phone)}
          className="group inline-flex items-center gap-2 rounded-full bg-gradient-primary text-primary-foreground px-6 py-3 text-sm font-medium shadow-glow hover:scale-[1.02] active:scale-[0.98] transition-transform w-full sm:w-auto justify-center"
        >
          Generate plan with Gemini
          <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </Card>
  );
}

/* ─── step 2: generating ────────────────────────────────────────────────────── */
const PHASES = ["Analyzing route…", "Pricing hotels with Gemini…", "Building day-by-day itinerary…", "Calculating per-person cost…"];

function GeneratingStep() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % PHASES.length), 800);
    return () => clearInterval(t);
  }, []);

  return (
    <Card className="min-h-[400px] grid place-items-center text-center">
      <div className="space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-primary grid place-items-center shadow-glow animate-float mx-auto">
          <svg viewBox="0 0 24 24" className="w-8 h-8 text-primary-foreground" fill="currentColor">
            <path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4L12 2z" />
          </svg>
        </div>
        <div>
          <p className="font-display text-xl font-semibold">{PHASES[idx]}</p>
          <p className="text-sm text-muted-foreground mt-2">Your plan will be ready in about 15 seconds.</p>
        </div>
        <div className="mx-auto max-w-xs h-1.5 rounded-full bg-secondary overflow-hidden">
          <div className="h-full bg-gradient-primary animate-[typing_12s_linear_forwards]" />
        </div>
      </div>
    </Card>
  );
}

/* ─── step 3: plan editor ───────────────────────────────────────────────────── */
function PlanStep({
  tripId, plan: initialPlan, intake,
  onConfirm,
}: {
  tripId: string;
  plan: GeminiPlan;
  intake: IntakeData;
  onConfirm: (finalPlan: GeminiPlan) => void;
}) {
  const [days, setDays] = useState<PlanDay[]>(initialPlan.days);
  const [openDay, setOpenDay] = useState<number>(0);
  const [mapsOpen, setMapsOpen] = useState<number | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [dirty, setDirty] = useState(false);

  const extraCost = useMemo(
    () => days.reduce((sum, d) => sum + d.activities.reduce((s, a) => s + a.cost_per_person, 0), 0),
    [days]
  );
  const perPerson = initialPlan.cost_breakdown.per_person + Math.round(extraCost * 0.1);

  const addActivity = (dayIdx: number, a: { id: string; title: string; cost: number; emoji: string }) => {
    setDays((ds) =>
      ds.map((d, i) =>
        i === dayIdx
          ? { ...d, activities: [...d.activities, { time: "—:—", title: `${a.emoji} ${a.title}`, cost_per_person: a.cost }] }
          : d
      )
    );
    setDirty(true);
  };

  const removeActivity = (dayIdx: number, actIdx: number) => {
    setDays((ds) =>
      ds.map((d, i) => i === dayIdx ? { ...d, activities: d.activities.filter((_, j) => j !== actIdx) } : d)
    );
    setDirty(true);
  };

  const finalPlan: GeminiPlan = { ...initialPlan, days, cost_breakdown: { ...initialPlan.cost_breakdown, per_person: perPerson } };

  return (
    <div className="space-y-5">
      {/* Cost summary strip */}
      <Card className="p-0 overflow-hidden">
        <div className="grid grid-cols-3 divide-x divide-border">
          {[
            { label: "Transport", val: fmtNGN(initialPlan.cost_breakdown.transport_total), sub: `${initialPlan.transport.operator} · ${intake.squadSize}×`, color: "text-google-blue" },
            { label: "Lodging", val: fmtNGN(initialPlan.cost_breakdown.lodging_total), sub: `${initialPlan.hotel.name.split(" ")[0]} · ${intake.days} nights`, color: "text-google-purple" },
            { label: "Per person", val: fmtNGN(perPerson), sub: dirty ? "Updated · live" : "All-in estimate", color: "text-primary" },
          ].map((c) => (
            <div key={c.label} className="p-4 md:p-6 text-center">
              <div className={`text-[10px] font-semibold uppercase tracking-wider ${c.color} mb-1`}>{c.label}</div>
              <div className="font-display text-lg md:text-2xl font-semibold tabular-nums">{c.val}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{c.sub}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Map */}
      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <div className="font-display font-semibold text-sm">Route map · {intake.origin} → {intake.destination}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{initialPlan.transport.operator} · departs {initialPlan.transport.depart_time} from {initialPlan.transport.pickup}</div>
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-google-green/15 text-google-green flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-google-green animate-pulse" />Live
          </span>
        </div>
        <div className="relative">
          {mapLoaded ? (
            <>
              <iframe
                title="Route map"
                className="w-full h-64 md:h-80 block"
                loading="lazy"
                src="https://www.openstreetmap.org/export/embed.html?bbox=2.95%2C6.30%2C4.10%2C7.55&layer=mapnik&marker=7.3775%2C3.9470"
              />
              <div className="absolute bottom-0 inset-x-0 flex flex-wrap items-center justify-between gap-2 bg-card/85 backdrop-blur px-4 py-2 text-xs">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-foreground" />{intake.origin}</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary animate-pulse" />{intake.destination}</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-google-purple" />{initialPlan.hotel.name.split(" ")[0]}</span>
                </div>
                <span className="font-display font-semibold text-foreground">{initialPlan.offline_note?.split("·")[0] || "~128 km"}</span>
              </div>
            </>
          ) : (
            <button
              onClick={() => setMapLoaded(true)}
              className="w-full h-64 md:h-80 flex flex-col items-center justify-center gap-3 bg-secondary/60 hover:bg-secondary transition-colors"
            >
              <div className="grid place-items-center w-12 h-12 rounded-full bg-card ring-hairline text-muted-foreground">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="3 11 22 2 13 21 11 13 3 11" />
                </svg>
              </div>
              <span className="text-sm font-medium text-muted-foreground">Tap to load interactive map</span>
              <span className="text-xs text-muted-foreground/60">{intake.origin} → {intake.destination}</span>
            </button>
          )}
        </div>
      </Card>

      {/* Editable itinerary */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <SectionLabel>Itinerary</SectionLabel>
            <h2 className="font-display text-lg font-semibold">Edit before sending to the squad.</h2>
          </div>
          <span className="text-xs text-muted-foreground bg-google-blue/10 text-google-blue px-2.5 py-1 rounded-full font-medium">Editable</span>
        </div>

        <ol className="space-y-3">
          {days.map((d, di) => {
            const open = openDay === di;
            const dayCost = d.activities.reduce((s, a) => s + a.cost_per_person, 0);
            return (
              <li key={di} className="rounded-2xl bg-secondary/60 ring-hairline overflow-hidden">
                <button onClick={() => setOpenDay(open ? -1 : di)} className="w-full text-left p-4 hover:bg-secondary/80 transition flex items-center gap-3">
                  <span className="font-display text-xs font-semibold text-muted-foreground shrink-0">DAY {d.day}</span>
                  <span className="font-display text-base font-semibold flex-1 truncate">{d.title}</span>
                  <span className="text-[11px] tabular-nums text-muted-foreground shrink-0">{fmtNGN(dayCost)}/p</span>
                  <svg viewBox="0 0 24 24" className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 9l6 6 6-6" /></svg>
                </button>

                {open && (
                  <div className="border-t border-border p-4 space-y-4 animate-rise">
                    {/* Activities */}
                    <ul className="space-y-2">
                      {d.activities.map((act, ai) => (
                        <li key={ai} className="flex items-center gap-2 text-sm group">
                          <span className="font-display text-[11px] font-semibold tabular-nums text-muted-foreground w-12 shrink-0">{act.time}</span>
                          <span className="flex-1 truncate">{act.title}</span>
                          <span className="text-[11px] tabular-nums text-muted-foreground">{act.cost_per_person ? fmtNGN(act.cost_per_person) : "—"}</span>
                          <button onClick={() => removeActivity(di, ai)} className="opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:text-destructive transition" aria-label="Remove">
                            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 6l12 12M6 18L18 6" /></svg>
                          </button>
                        </li>
                      ))}
                    </ul>

                    {/* Add from Gemini suggestions */}
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-google-pink mb-2">✨ Gemini suggests</div>
                      <div className="grid grid-cols-2 gap-2">
                        {initialPlan.highlights.map((h, hi) => (
                          <button
                            key={hi}
                            onClick={() => addActivity(di, { id: `h${hi}`, title: h, cost: 2500, emoji: "✨" })}
                            className="text-left rounded-xl bg-card ring-hairline p-2.5 hover:bg-secondary transition text-xs"
                          >
                            <div className="font-medium truncate">{h}</div>
                            <div className="text-muted-foreground mt-0.5">{fmtNGN(2500)}/person · tap to add</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Add from Places */}
                    <div>
                      <button
                        onClick={() => setMapsOpen(mapsOpen === di ? null : di)}
                        className="text-[11px] font-medium px-3 py-1.5 rounded-full bg-google-blue/15 text-google-blue hover:bg-google-blue/25 transition inline-flex items-center gap-1.5"
                      >
                        🗺️ Add from Places
                      </button>
                      {mapsOpen === di && (
                        <div className="mt-3 rounded-xl ring-hairline bg-card p-3 animate-rise">
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">📍 Nearby — {intake.destination}</div>
                            <button onClick={() => setMapsOpen(null)} className="text-[10px] text-muted-foreground hover:text-foreground">close</button>
                          </div>
                          <ul className="space-y-1">
                            {MAPS_PLACES.map((p) => (
                              <li key={p.id} className="flex items-center gap-2 text-[12px] rounded-lg p-1.5 hover:bg-secondary/60 transition">
                                <span className="text-base shrink-0">{p.emoji}</span>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium truncate">{p.title}</div>
                                  <div className="text-[10px] text-muted-foreground">{p.tag} · {fmtNGN(p.cost)}/person</div>
                                </div>
                                <button
                                  onClick={() => { addActivity(di, { id: p.id, title: p.title, cost: p.cost, emoji: p.emoji }); setMapsOpen(null); }}
                                  className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-foreground text-background shrink-0 hover:opacity-80 transition"
                                >
                                  + Add
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </Card>

      {/* Hotel */}
      <Card>
        <SectionLabel>Accommodation · AI pick</SectionLabel>
        <div className="mt-3 rounded-2xl bg-primary-soft ring-hairline p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-display text-base font-semibold flex items-center gap-2">
                {initialPlan.hotel.name}
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary text-primary-foreground">Gemini pick</span>
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">{initialPlan.hotel.area} · ⭐ {initialPlan.hotel.rating}</div>
            </div>
            <div className="text-right shrink-0">
              <div className="font-display text-base font-semibold">{fmtNGN(initialPlan.hotel.price_per_night)}</div>
              <div className="text-[10px] text-muted-foreground">per night</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {initialPlan.hotel.perks.map((pk) => (
              <span key={pk} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{pk}</span>
            ))}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          The squad will vote on the hotel in the WhatsApp group — this is the AI's starting recommendation.
        </p>
      </Card>

      {/* Confirm */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-1">
        <div>
          <div className="font-display font-semibold">Happy with the plan?</div>
          <p className="text-sm text-muted-foreground">Confirm to get the link that adds the bot to your group.</p>
        </div>
        <button
          onClick={() => onConfirm(finalPlan)}
          className="group inline-flex items-center gap-2 rounded-full bg-gradient-primary text-primary-foreground px-6 py-3.5 text-sm font-medium shadow-glow hover:scale-[1.02] active:scale-[0.98] transition-transform whitespace-nowrap w-full sm:w-auto justify-center"
        >
          Confirm & share with squad
          <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/* ─── step 4: confirm ────────────────────────────────────────────────────────── */
function ConfirmStep({ botNumber, destination, squadSize, instructions, tripId }: {
  botNumber: string; destination: string; squadSize: number; instructions: string[]; tripId: string;
}) {
  const [copied, setCopied] = useState(false);
  const number = botNumber.startsWith("+") ? botNumber : `+${botNumber}`;

  const copy = () => {
    navigator.clipboard.writeText(number);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-google-green/15 text-google-green grid place-items-center mx-auto mb-4 text-3xl">✅</div>
        <div className="font-display text-2xl md:text-3xl font-semibold tracking-tight">Plan confirmed.</div>
        <p className="text-muted-foreground mt-2">
          Now add the bot to your {destination} squad's WhatsApp group.
        </p>
      </div>

      {/* Bot number */}
      <div className="rounded-2xl bg-secondary/60 ring-hairline p-5 mb-6 flex items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Add this number to your group</div>
          <div className="font-display text-2xl font-semibold tabular-nums tracking-tight">{number}</div>
        </div>
        <button
          onClick={copy}
          className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium transition-all shrink-0 ${
            copied ? "bg-google-green/15 text-google-green" : "bg-foreground text-background hover:opacity-80"
          }`}
        >
          {copied ? "✓ Copied" : "Copy"}
        </button>
      </div>

      {/* Step-by-step */}
      <ol className="space-y-3 mb-8">
        {instructions.map((step, i) => (
          <li key={i} className="flex items-start gap-3 text-sm">
            <span className="w-6 h-6 rounded-full bg-primary/15 text-primary grid place-items-center text-xs font-semibold shrink-0 mt-0.5">{i + 1}</span>
            <span className="text-foreground/90">{step}</span>
          </li>
        ))}
      </ol>

      <div className="rounded-2xl bg-whatsapp/10 ring-1 ring-whatsapp/20 p-4 text-sm text-foreground/90 mb-6">
        <span className="font-semibold text-whatsapp">The squad won't know you planned this.</span>{" "}
        Bot's first message is the plan reveal — not a form. They'll just see{" "}
        <em>"Tunde's been planning something... 👀"</em>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <a
          href={`https://wa.me/?text=I%20just%20planned%20our%20${encodeURIComponent(destination)}%20trip%20with%20MySquadGo%20%F0%9F%9A%80%20Add%20the%20bot%20to%20our%20group%3A%20${number}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-whatsapp text-white px-5 py-3 text-sm font-medium hover:scale-[1.02] transition-transform"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Share group link
        </a>
        <Link to="/" className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-card ring-hairline px-5 py-3 text-sm font-medium text-foreground hover:bg-secondary transition-colors">
          Back to home
        </Link>
      </div>
    </Card>
  );
}

/* ─── page shell ─────────────────────────────────────────────────────────────── */
type Step = "intake" | "generating" | "plan" | "confirm";

export default function Start() {
  const [step, setStep] = useState<Step>("intake");
  const [intake, setIntake] = useState<IntakeData | null>(null);
  const [phone, setPhone] = useState<string>("");
  const [tripId, setTripId] = useState<string | null>(null);
  const [plan, setPlan] = useState<GeminiPlan | null>(null);
  const [confirmData, setConfirmData] = useState<{ botNumber: string; destination: string; squadSize: number; dmSent: boolean; instructions: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Plan your trip · MySquadGo";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  async function handleIntakeSubmit(data: IntakeData, organisersPhone: string) {
    setIntake(data);
    setPhone(organisersPhone);
    setStep("generating");
    setError(null);
    try {
      const result = await api.generatePlan(data);
      setTripId(result.tripId);
      setPlan(result.plan);
      setStep("plan");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setStep("intake");
    }
  }

  async function handleConfirm(finalPlan: GeminiPlan) {
    if (!tripId) return;
    setError(null);
    try {
      const result = await api.confirmPlan(tripId, finalPlan, phone || undefined);
      setConfirmData({ botNumber: result.botNumber, destination: result.destination, squadSize: result.squadSize, dmSent: result.dmSent, instructions: result.instructions });
      setStep("confirm");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong confirming the plan.");
    }
  }

  return (
    <main className="min-h-screen bg-hero-mesh">
      <div className="pointer-events-none fixed -top-32 -left-32 w-[28rem] h-[28rem] rounded-full bg-primary/15 blur-3xl animate-float" />
      <div className="pointer-events-none fixed top-40 -right-32 w-[28rem] h-[28rem] rounded-full bg-accent/15 blur-3xl animate-float" style={{ animationDelay: "2s" }} />

      {/* Header */}
      <header className="relative pt-8 pb-6">
        <div className="mx-auto max-w-3xl px-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-display font-semibold">
            <span className="grid place-items-center w-8 h-8 rounded-xl bg-gradient-primary text-primary-foreground shadow-soft">
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2l3 7 7 .8-5.3 4.7L18.5 22 12 18l-6.5 4 1.8-7.5L2 9.8 9 9z" />
              </svg>
            </span>
            MySquadGo
          </Link>
          {step !== "intake" && step !== "generating" && (
            <button onClick={() => setStep("intake")} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              ← Start over
            </button>
          )}
        </div>
      </header>

      <div className="relative mx-auto max-w-3xl px-6 pb-24">
        {/* Progress pills */}
        {step !== "confirm" && (
          <div className="flex items-center gap-2 mb-8">
            {(["intake", "generating", "plan"] as const).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`h-1.5 rounded-full transition-all duration-500 ${
                  s === step ? "w-8 bg-primary" :
                  (["intake", "generating"].includes(step) && i > ["intake", "generating", "plan"].indexOf(step)) ? "w-4 bg-border" :
                  "w-4 bg-primary/30"
                }`} />
              </div>
            ))}
            <span className="ml-1 text-xs text-muted-foreground">
              {step === "intake" ? "1 — Tell us the details" : step === "generating" ? "2 — Gemini is building…" : "3 — Review & edit"}
            </span>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="mb-5 rounded-2xl bg-destructive/10 ring-1 ring-destructive/20 px-5 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {step === "intake" && <IntakeStep onSubmit={handleIntakeSubmit} />}
        {step === "generating" && <GeneratingStep />}
        {step === "plan" && plan && intake && (
          <PlanStep tripId={tripId!} plan={plan} intake={intake} onConfirm={handleConfirm} />
        )}
        {step === "confirm" && confirmData && (
          <ConfirmStep tripId={tripId!} {...confirmData} />
        )}
      </div>
    </main>
  );
}
