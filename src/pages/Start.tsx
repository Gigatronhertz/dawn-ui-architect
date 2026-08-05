import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api, type GeminiPlan, type IntakeData, type PlanDay, type ScrapedData, type GIGMTrip, type GTHotel, type BHotel, type Attraction } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

/* ─── constants ────────────────────────────────────────────────────────────── */
const VIBES = ["Chill & scenic", "Nightlife", "Foodie tour", "Adventure", "Cultural"];
const ACCOMMODATION_TYPES = ["Hotel", "Shortlet", "Budget guesthouse", "Surprise me"];
const DATE_OPTIONS = ["Flexible", "I have specific dates"];

const GIGM_CITIES = [
  'Abeokuta','Abuja','Akure','Asaba','Benin City','Calabar','Enugu',
  'Ibadan','Ilorin','Jos','Kaduna','Kano','Lagos','Maiduguri','Onitsha',
  'Owerri','Port Harcourt','Warri',
];

const FLIGHT_CITIES = [
  'Abuja','Akure','Asaba','Benin City','Calabar','Enugu','Ibadan',
  'Ilorin','Jos','Kaduna','Kano','Lagos','Maiduguri','Owerri',
  'Port Harcourt','Sokoto','Uyo','Warri','Yola',
];

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

function attractionEmoji(name: string): string {
  const n = name.toLowerCase();
  if (/waterfall|spring|lake|river|beach|bay/.test(n)) return '🌊';
  if (/park|garden|reserve|forest|wildlife/.test(n)) return '🌿';
  if (/hill|mountain|plateau|peak|rock/.test(n)) return '⛰️';
  if (/museum|palace|castle|bunker|wall|tomb|heritage|moat/.test(n)) return '🏛️';
  if (/cave/.test(n)) return '🪨';
  if (/zoo/.test(n)) return '🦁';
  if (/festival/.test(n)) return '🎉';
  if (/dam/.test(n)) return '💧';
  return '📍';
}

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
  const [transportMode, setTransportMode] = useState<'bus' | 'flight'>('bus');
  const cities = transportMode === 'bus' ? GIGM_CITIES : FLIGHT_CITIES;

  const [form, setForm] = useState<IntakeData>({
    origin: "Lagos",
    destination: "Abuja",
    budget: 25000,
    days: 2,
    squadSize: 8,
    accommodationType: "Hotel",
    dateFlexibility: "Flexible",
    dealbreakers: "",
    transport: "Charter bus",
    vibe: "Chill & scenic",
    specificDates: "",
  });

  const set = <K extends keyof IntakeData>(k: K, v: IntakeData[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const switchMode = (mode: 'bus' | 'flight') => {
    setTransportMode(mode);
    const list = mode === 'bus' ? GIGM_CITIES : FLIGHT_CITIES;
    setForm(p => ({
      ...p,
      transport: mode === 'flight' ? 'Flights' : 'Charter bus',
      origin: list.includes(p.origin!) ? p.origin! : list[0],
      destination: list.includes(p.destination!) && p.destination !== p.origin
        ? p.destination!
        : (list.find(c => c !== p.origin) ?? list[1]),
    }));
  };

  const inputCls = "w-full rounded-xl bg-secondary/60 ring-hairline px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition";
  const selectCls = `${inputCls} cursor-pointer appearance-none`;

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
          10 quick questions. AI builds the full itinerary with live prices. You edit before it goes to the squad.
        </p>
      </div>

      {/* Transport mode toggle */}
      <div className="mb-6 p-4 rounded-2xl bg-secondary/40 ring-hairline">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-3">How are you getting there?</div>
        <div className="flex gap-3">
          <button type="button" onClick={() => switchMode('bus')}
            className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold ring-hairline transition ${transportMode === 'bus' ? 'bg-foreground text-background' : 'bg-card text-foreground hover:bg-secondary'}`}>
            🚌 Bus
          </button>
          <button type="button" onClick={() => switchMode('flight')}
            className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold ring-hairline transition ${transportMode === 'flight' ? 'bg-foreground text-background' : 'bg-card text-foreground hover:bg-secondary'}`}>
            ✈️ Flight
          </button>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          {transportMode === 'bus'
            ? `GIGM live prices · ${GIGM_CITIES.length} cities covered`
            : `Google Travel + Amadeus · ${FLIGHT_CITIES.length} airports covered`}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <Field n={1} label="Where from?">
          <select className={selectCls} value={form.origin}
            onChange={e => {
              const v = e.target.value;
              set("origin", v);
              if (v === form.destination) set("destination", cities.find(c => c !== v) ?? cities[1]);
            }}>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field n={2} label="Where to?">
          <select className={selectCls} value={form.destination}
            onChange={e => set("destination", e.target.value)}>
            {cities.filter(c => c !== form.origin).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>

        <div className="md:col-span-2">
          <Field n={3} label="Squad vibe">
            <div className="flex flex-wrap gap-2">
              {VIBES.map((v) => (
                <button key={v} type="button" onClick={() => set("vibe", v)} className={chipCls(form.vibe === v)}>
                  {v}
                </button>
              ))}
            </div>
          </Field>
        </div>

        <Field n={4} label={`Budget per person · ${fmtNGN(form.budget)}`}>
          <input
            type="range" min={5000} max={200000} step={1000} value={form.budget}
            onChange={(e) => set("budget", +e.target.value)} className="w-full accent-primary"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>₦5k</span><span>₦200k</span>
          </div>
        </Field>

        <Field n={5} label={`How many days? · ${form.days}`}>
          <input
            type="range" min={1} max={10} value={form.days}
            onChange={(e) => set("days", +e.target.value)} className="w-full accent-primary"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>1 day</span><span>10 days</span>
          </div>
        </Field>

        <Field n={6} label={`Squad size · ${form.squadSize} people`}>
          <input
            type="range" min={2} max={40} value={form.squadSize}
            onChange={(e) => set("squadSize", +e.target.value)} className="w-full accent-primary"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>2</span><span>40</span>
          </div>
        </Field>

        <Field n={7} label="Accommodation type">
          <div className="flex flex-wrap gap-2">
            {ACCOMMODATION_TYPES.map((t) => (
              <button key={t} type="button" onClick={() => set("accommodationType", t)} className={chipCls(form.accommodationType === t)}>
                {t}
              </button>
            ))}
          </div>
        </Field>

        <Field n={8} label="Specific dates or flexible?">
          <div className="flex flex-wrap gap-2">
            {DATE_OPTIONS.map((d) => (
              <button key={d} type="button" onClick={() => set("dateFlexibility", d)} className={chipCls(form.dateFlexibility === d)}>
                {d}
              </button>
            ))}
          </div>
          {form.dateFlexibility === "I have specific dates" && (
            <div className="mt-3">
              <input
                type="date"
                className={inputCls}
                value={form.specificDates || ""}
                onChange={(e) => set("specificDates", e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
              <p className="text-[11px] text-muted-foreground mt-1">Departure date — used to fetch live bus/flight prices</p>
            </div>
          )}
        </Field>

        <div className="md:col-span-2">
          <Field n={9} label="Any dealbreakers?">
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
            <Field n={10} label="Your WhatsApp number">
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
          Takes ~20 seconds. AI builds your plan with live prices from GIGM, Google Travel &amp; Booking.com.
        </p>
        <button
          onClick={() => onSubmit(form, phone)}
          className="group inline-flex items-center gap-2 rounded-full bg-gradient-primary text-primary-foreground px-6 py-3 text-sm font-medium shadow-glow hover:scale-[1.02] active:scale-[0.98] transition-transform w-full sm:w-auto justify-center"
        >
          Generate my squad plan
          <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </Card>
  );
}

/* ─── step 2: generating ────────────────────────────────────────────────────── */
const PHASES = [
  { title: "Analyzing your route…",        sub: "Mapping distances and transport options" },
  { title: "Fetching live prices…",         sub: "Checking GIGM buses, flights & hotels" },
  { title: "Building your itinerary…",      sub: "Creating a day-by-day plan for your squad" },
  { title: "Calculating squad costs…",      sub: "Working out the per-person breakdown" },
];

/** Converts a URL-safe base64 VAPID key to the Uint8Array the browser expects. */
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(b64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

function GeneratingStep({ tripId, userEmail }: { tripId: string | null; userEmail: string | null }) {
  const [idx, setIdx]               = useState(0);
  const [showNotify, setShowNotify] = useState(false);

  // Email state
  const [emailInput, setEmailInput] = useState(userEmail || '');
  const [emailState, setEmailState] = useState<'idle' | 'sending' | 'sent'>('idle');

  // Push state
  const [pushState, setPushState]   = useState<'idle' | 'subscribing' | 'granted' | 'blocked'>('idle');

  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % PHASES.length), 3000);
    return () => clearInterval(t);
  }, []);

  // Show the notification panel 7 s in — plan still generating, user is waiting
  useEffect(() => {
    const t = setTimeout(() => setShowNotify(true), 7000);
    return () => clearTimeout(t);
  }, []);

  // Sync email input if the user signs in while on this screen
  useEffect(() => {
    if (userEmail && !emailInput) setEmailInput(userEmail);
  }, [userEmail]); // eslint-disable-line

  async function handleEmailNotify() {
    if (!tripId || !emailInput.includes('@')) return;
    setEmailState('sending');
    try {
      await api.subscribeNotify(tripId, { email: emailInput });
      setEmailState('sent');
    } catch {
      setEmailState('idle');
    }
  }

  async function handlePushSubscribe() {
    if (!tripId || !('Notification' in window)) return;
    setPushState('subscribing');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') { setPushState('blocked'); return; }

      if (!('serviceWorker' in navigator)) { setPushState('blocked'); return; }

      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!vapidKey) { setPushState('blocked'); return; }

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      await api.subscribeNotify(tripId, { subscription: subscription.toJSON() as object });
      setPushState('granted');
    } catch (err) {
      console.warn('[push subscribe]', err);
      setPushState('blocked');
    }
  }

  const supportsNotifications = typeof window !== 'undefined' && 'Notification' in window;

  return (
    <Card className="min-h-[400px] flex items-center justify-center text-center">
      <div className="space-y-6 max-w-xs w-full mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-gradient-primary grid place-items-center shadow-glow animate-float mx-auto">
          <svg viewBox="0 0 24 24" className="w-8 h-8 text-primary-foreground" fill="currentColor">
            <path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4L12 2z" />
          </svg>
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-primary/60 mb-2">
            Step {idx + 1} of {PHASES.length}
          </div>
          <p className="font-display text-xl font-semibold">{PHASES[idx].title}</p>
          <p className="text-sm text-muted-foreground mt-2">{PHASES[idx].sub}</p>
        </div>
        {/* Step dots */}
        <div className="flex items-center justify-center gap-1.5">
          {PHASES.map((_, i) => (
            <div key={i} className={`rounded-full transition-all duration-500 ${
              i === idx ? "w-4 h-1.5 bg-primary" : i < idx ? "w-1.5 h-1.5 bg-primary/40" : "w-1.5 h-1.5 bg-border"
            }`} />
          ))}
        </div>
        <div className="mx-auto max-w-xs h-1.5 rounded-full bg-secondary overflow-hidden">
          <div className="h-full bg-gradient-primary animate-[typing_12s_linear_forwards]" />
        </div>
        <p className="text-xs text-muted-foreground">Usually ready in 15–25 seconds.</p>

        {/* ── Notification opt-in — appears after 7 s ──────────────────── */}
        {showNotify && tripId && (
          <div className="text-left border-t border-border pt-5 space-y-3 animate-rise">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-center">
              Going somewhere? Get notified when ready:
            </div>

            {/* Email row */}
            <div className="flex items-center gap-2">
              <span className="text-base shrink-0 w-5 text-center">📧</span>
              {emailState === 'sent' ? (
                <span className="text-xs text-google-green font-medium">✓ We'll email you</span>
              ) : (
                <>
                  <input
                    type="email"
                    value={emailInput}
                    onChange={e => setEmailInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleEmailNotify()}
                    placeholder="your@email.com"
                    className="flex-1 min-w-0 text-xs bg-secondary/60 rounded-lg px-3 py-1.5 ring-hairline outline-none focus:ring-1 focus:ring-primary/30"
                  />
                  <button
                    onClick={handleEmailNotify}
                    disabled={emailState === 'sending' || !emailInput.includes('@')}
                    className="shrink-0 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-foreground text-background hover:opacity-80 transition disabled:opacity-40"
                  >
                    {emailState === 'sending' ? '…' : 'Notify'}
                  </button>
                </>
              )}
            </div>

            {/* Push row */}
            {supportsNotifications && (
              <div className="flex items-center gap-2">
                <span className="text-base shrink-0 w-5 text-center">🔔</span>
                {pushState === 'granted' ? (
                  <span className="text-xs text-google-green font-medium">✓ Browser notification set</span>
                ) : pushState === 'blocked' ? (
                  <span className="text-xs text-muted-foreground">Blocked — enable in browser settings</span>
                ) : (
                  <>
                    <span className="flex-1 text-xs text-muted-foreground">Browser notification</span>
                    <button
                      onClick={handlePushSubscribe}
                      disabled={pushState === 'subscribing'}
                      className="shrink-0 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-foreground text-background hover:opacity-80 transition disabled:opacity-40"
                    >
                      {pushState === 'subscribing' ? '…' : 'Allow'}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

/* ─── cost breakdown accordion ──────────────────────────────────────────────── */
type BreakdownItem = { label: string; value: number; icon: string; colorClass: string };

function CostBreakdown({ items, total }: { items: BreakdownItem[]; total: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-border">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-5 py-2.5 text-left flex items-center justify-between text-[11px] text-muted-foreground hover:bg-secondary/30 transition"
      >
        <span className="flex items-center gap-1.5">
          <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" />
          </svg>
          Per-person breakdown
        </span>
        <svg viewBox="0 0 24 24" className={`w-3 h-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="px-5 pb-4 space-y-2.5 animate-rise">
          {items.map(item => {
            const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
            return (
              <div key={item.label} className="flex items-center gap-2 text-[12px]">
                <span className="text-sm shrink-0 w-5 text-center">{item.icon}</span>
                <span className="flex-1 text-muted-foreground truncate">{item.label}</span>
                <span className="tabular-nums font-medium text-foreground shrink-0">{fmtNGN(item.value)}</span>
                <div className="w-16 h-1 rounded-full bg-secondary overflow-hidden shrink-0">
                  <div
                    className={`h-full ${item.colorClass} transition-all duration-500`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground/60 w-7 text-right shrink-0">{pct}%</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── step 3: plan editor ───────────────────────────────────────────────────── */
function PlanStep({
  tripId, plan: initialPlan, intake, scraped, busLoading,
  onConfirm,
}: {
  tripId: string;
  plan: GeminiPlan;
  intake: IntakeData;
  scraped?: ScrapedData | null;
  busLoading?: boolean;
  onConfirm: (finalPlan: GeminiPlan, selectedDate?: string) => void;
}) {
  const [days, setDays] = useState<PlanDay[]>(initialPlan.days);
  const [openDay, setOpenDay] = useState<number>(0);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [mapsOpen, setMapsOpen] = useState<number | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [selectedBusIdx, setSelectedBusIdx] = useState<number | null>(null);
  const [selectedFlightIdx, setSelectedFlightIdx] = useState<number | null>(null);
  const [selectedHotelKey, setSelectedHotelKey] = useState<string>('ai');

  const busOffers: GIGMTrip[] = useMemo(() => scraped?.gigmTrips ?? [], [scraped]);
  const flightOffers = useMemo(() => scraped?.flights?.offers ?? [], [scraped]);
  const isBusMode = !/flight/i.test(intake.transport || '');

  type HotelOpt = { key: string; name: string; area: string; price: number | null; rating: number | null; source: string; badge?: string; perks: string[]; url?: string | null };
  const allHotelOptions = useMemo<HotelOpt[]>(() => {
    const opts: HotelOpt[] = [];
    if (initialPlan?.hotel) {
      const aiUrl = `https://www.google.com/search?q=${encodeURIComponent(initialPlan.hotel.name + ' hotel ' + intake.destination)}`;
      opts.push({ key: 'ai', name: initialPlan.hotel.name, area: initialPlan.hotel.area, price: initialPlan.hotel.price_per_night, rating: initialPlan.hotel.rating, source: 'AI Pick', badge: 'AI Pick', perks: initialPlan.hotel.perks || [], url: aiUrl });
    }
    (scraped?.gtHotels ?? []).forEach((h: GTHotel, i: number) => {
      if (!opts.find(o => o.name.toLowerCase() === h.name.toLowerCase())) {
        const gtUrl = `https://www.google.com/travel/hotels?q=${encodeURIComponent(h.name + ' ' + intake.destination + ' Nigeria')}`;
        opts.push({ key: `gt-${i}`, name: h.name, area: h.location || '', price: h.pricePerNight, rating: h.rating, source: 'Google Travel', perks: h.amenities.slice(0, 3), url: gtUrl });
      }
    });
    (scraped?.bHotels ?? []).forEach((h: BHotel, i: number) => {
      if (!opts.find(o => o.name.toLowerCase() === h.name.toLowerCase()))
        opts.push({ key: `bk-${i}`, name: h.name, area: h.address?.split(',')[0] || '', price: h.pricePerNight, rating: h.rating ? +(h.rating / 2).toFixed(1) : null, source: 'Booking.com', perks: [], url: h.url || null });
    });
    return opts;
  }, [initialPlan, scraped, intake.destination]);

  // ── Cost derivations live below, after transport/hotel are resolved ──────────

  const placesItems = useMemo(() => {
    const attrs: Attraction[] = scraped?.localAttractions ?? [];
    if (attrs.length > 0) {
      return attrs.map((a) => ({
        id: `attr-${a.id}`,
        emoji: attractionEmoji(a.name),
        title: a.name,
        tag: a.fee_note || (a.fee_max > 0 ? `₦${a.fee_min.toLocaleString()}–₦${a.fee_max.toLocaleString()}` : 'Free'),
        cost: a.fee_max > 0 ? Math.round((a.fee_min + a.fee_max) / 2) : 0,
      }));
    }
    return MAPS_PLACES;
  }, [scraped]);

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

  // ── Resolved transport & hotel — always reflect the latest user selection ─────
  const selBus    = selectedBusIdx    !== null ? busOffers[selectedBusIdx]       : null;
  const selFlight = selectedFlightIdx !== null ? flightOffers[selectedFlightIdx] : null;
  const selHotel  = allHotelOptions.find(o => o.key === selectedHotelKey);
  const transport = selFlight
    ? { ...initialPlan.transport, operator: selFlight.airline || 'Unknown', type: selFlight.stops === 0 ? 'Nonstop Flight' : 'Flight', price_per_person: selFlight.price }
    : selBus
    ? { ...initialPlan.transport, operator: 'GIGM', type: `Bus · ${selBus.class}`, price_per_person: selBus.price, depart_time: selBus.departureTime?.slice(0, 5) || initialPlan.transport.depart_time, pickup: selBus.terminal || initialPlan.transport.pickup }
    : initialPlan.transport;
  const hotel = (selHotel && selHotel.key !== 'ai' && selHotel.price)
    ? { ...initialPlan.hotel, name: selHotel.name, area: selHotel.area, price_per_night: selHotel.price, rating: selHotel.rating ?? initialPlan.hotel.rating, perks: selHotel.perks }
    : initialPlan.hotel;

  // ── Accurate live cost breakdown — recomputed from selections ─────────────────
  const activitiesPerPerson = days.reduce(
    (sum, d) => sum + d.activities.reduce((s, a) => s + (a.cost_per_person || 0), 0), 0
  );
  const foodPerPerson   = Math.round((initialPlan.cost_breakdown.food_total   || 0) / Math.max(intake.squadSize, 1));
  const bufferPerPerson = Math.round((initialPlan.cost_breakdown.buffer       || 0) / Math.max(intake.squadSize, 1));
  const perPerson       = (transport.price_per_person || 0)
                        + (hotel.price_per_night || 0) * (intake.days || 1)
                        + activitiesPerPerson
                        + foodPerPerson
                        + bufferPerPerson;
  const transportTotal  = (transport.price_per_person || 0) * (intake.squadSize || 1);
  const lodgingTotal    = (hotel.price_per_night || 0) * (intake.days || 1) * (intake.squadSize || 1);
  const squadTotal      = perPerson * (intake.squadSize || 1);
  const isDirty         = dirty || selectedBusIdx !== null || selectedFlightIdx !== null || selectedHotelKey !== 'ai';

  const finalPlan: GeminiPlan = {
    ...initialPlan, days, transport, hotel,
    cost_breakdown: {
      ...initialPlan.cost_breakdown,
      transport_total: transportTotal,
      lodging_total:   lodgingTotal,
      per_person:      perPerson,
      total:           squadTotal,
    },
  };

  return (
    <div className="space-y-5">
      {/* Cost summary strip */}
      <Card className="p-0 overflow-hidden">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-border">
          {[
            { label: "Transport", val: fmtNGN(transportTotal), sub: `${transport.operator} · ${intake.squadSize}×`, color: "text-google-blue" },
            { label: "Lodging", val: fmtNGN(lodgingTotal), sub: `${hotel.name.split(" ")[0]} · ${intake.days} nights`, color: "text-google-purple" },
            { label: "Per person", val: fmtNGN(perPerson), sub: isDirty ? "Updated · live" : "AI estimate", color: "text-primary" },
            { label: "Squad total", val: fmtNGN(squadTotal), sub: `${intake.squadSize} people · all-in`, color: "text-google-green" },
          ].map((c) => (
            <div key={c.label} className="p-4 md:p-6 text-center">
              <div className={`text-[10px] font-semibold uppercase tracking-wider ${c.color} mb-1`}>{c.label}</div>
              <div className="font-display text-lg md:text-2xl font-semibold tabular-nums">{c.val}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{c.sub}</div>
            </div>
          ))}
        </div>
        <CostBreakdown
          total={perPerson}
          items={[
            { label: "Transport", value: transport.price_per_person || 0, icon: "🚌", colorClass: "bg-google-blue" },
            { label: `Lodging · ${intake.days} night${intake.days === 1 ? "" : "s"}`, value: (hotel.price_per_night || 0) * (intake.days || 1), icon: "🏨", colorClass: "bg-google-purple" },
            { label: "Activities", value: activitiesPerPerson, icon: "🎯", colorClass: "bg-accent" },
            { label: "Food est.", value: foodPerPerson, icon: "🍽️", colorClass: "bg-google-green" },
            { label: "Buffer", value: bufferPerPerson, icon: "🔒", colorClass: "bg-muted-foreground" },
          ]}
        />
      </Card>

      {/* Map */}
      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <div className="font-display font-semibold text-sm">Route map · {intake.origin} → {intake.destination}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{transport.operator} · departs {transport.depart_time} from {transport.pickup}</div>
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
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-google-purple" />{hotel.name.split(" ")[0]}</span>
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

      {/* Transport selection — live bus or flight options */}
      {(isBusMode ? (busLoading || busOffers.length > 0) : flightOffers.length > 0) && (
        <Card>
          <SectionLabel>{isBusMode ? '🚌 GIGM Buses — live prices' : '✈️ Flights — live prices'}</SectionLabel>
          <h2 className="font-display text-base font-semibold mb-4">Pick your departure.</h2>

          {busLoading && isBusMode && (
            <div className="rounded-xl p-3 bg-secondary/40 ring-hairline text-sm text-muted-foreground flex items-center gap-2">
              <span className="animate-spin inline-block">⏳</span> Fetching live GIGM prices…
            </div>
          )}

          {isBusMode && busOffers.length > 0 && (
            <div className="space-y-2">
              {busOffers.map((bus, i) => (
                <button key={i} type="button"
                  onClick={() => { setSelectedBusIdx(i === selectedBusIdx ? null : i); setSelectedFlightIdx(null); }}
                  className={`w-full text-left rounded-xl p-4 ring-hairline transition ${selectedBusIdx === i ? 'bg-primary/10 ring-1 ring-primary/30' : 'bg-secondary/40 hover:bg-secondary'}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-display text-sm font-semibold">{bus.departureTime?.slice(0, 5) || '—'} · {bus.class}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {intake.specificDates ? new Date(intake.specificDates).toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short' }) : 'Flexible date'} · {bus.terminal || intake.origin} · {bus.seatsAvailable} seats
                      </div>
                    </div>
                    <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                      <div>
                        <div className="font-display text-base font-semibold text-primary">{fmtNGN(bus.price)}</div>
                        <div className="text-[10px] text-muted-foreground">per seat</div>
                      </div>
                      <a href="https://www.gigm.com/book-a-seat" target="_blank" rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-foreground text-background hover:opacity-80 transition">
                        Book →
                      </a>
                    </div>
                  </div>
                  {selectedBusIdx === i && (
                    <div className="mt-2 text-[11px] text-primary font-medium">✓ Selected — applied to your plan</div>
                  )}
                </button>
              ))}
              <button type="button"
                onClick={() => { setSelectedBusIdx(null); setSelectedFlightIdx(null); }}
                className={`w-full text-left rounded-xl p-3 ring-hairline transition text-sm ${selectedBusIdx === null ? 'bg-primary/10 ring-1 ring-primary/30' : 'bg-secondary/40 hover:bg-secondary'}`}>
                <span className="font-medium">🤖 Use AI pick</span>
                <span className="text-muted-foreground ml-2 text-[11px]">{initialPlan.transport.operator} · {initialPlan.transport.type}</span>
              </button>
            </div>
          )}

          {!isBusMode && flightOffers.length > 0 && (
            <div className="space-y-2">
              {flightOffers.slice(0, 5).map((f, i) => {
                const flightUrl = `https://www.google.com/travel/flights?hl=en&curr=NGN&q=${encodeURIComponent('flights from ' + intake.origin + ' to ' + intake.destination)}`;
                return (
                  <button key={i} type="button"
                    onClick={() => { setSelectedFlightIdx(i === selectedFlightIdx ? null : i); setSelectedBusIdx(null); }}
                    className={`w-full text-left rounded-xl p-4 ring-hairline transition ${selectedFlightIdx === i ? 'bg-primary/10 ring-1 ring-primary/30' : 'bg-secondary/40 hover:bg-secondary'}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-display text-sm font-semibold">{f.airline || 'Unknown airline'}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">{f.stops === 0 ? 'Nonstop' : `${f.stops} stop`} · {f.duration || '—'}</div>
                      </div>
                      <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                        <div>
                          <div className="font-display text-base font-semibold text-primary">{fmtNGN(f.price)}</div>
                          <div className="text-[10px] text-muted-foreground">per person</div>
                        </div>
                        <a href={flightUrl} target="_blank" rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-foreground text-background hover:opacity-80 transition">
                          Search →
                        </a>
                      </div>
                    </div>
                    {selectedFlightIdx === i && (
                      <div className="mt-2 text-[11px] text-primary font-medium">✓ Selected — applied to your plan</div>
                    )}
                  </button>
                );
              })}
              <button type="button"
                onClick={() => { setSelectedFlightIdx(null); setSelectedBusIdx(null); }}
                className={`w-full text-left rounded-xl p-3 ring-hairline transition text-sm ${selectedFlightIdx === null ? 'bg-primary/10 ring-1 ring-primary/30' : 'bg-secondary/40 hover:bg-secondary'}`}>
                <span className="font-medium">🤖 Use AI pick</span>
                <span className="text-muted-foreground ml-2 text-[11px]">{initialPlan.transport.operator}</span>
              </button>
            </div>
          )}
        </Card>
      )}

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
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-google-pink mb-2">✨ AI suggests</div>
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
                            {placesItems.map((p) => (
                              <li key={p.id} className="flex items-center gap-2 text-[12px] rounded-lg p-1.5 hover:bg-secondary/60 transition">
                                <span className="text-base shrink-0">{p.emoji}</span>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium truncate">{p.title}</div>
                                  <div className="text-[10px] text-muted-foreground">{p.tag}{p.cost > 0 ? ` · ${fmtNGN(p.cost)}/person` : ' · Free'}</div>
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

      {/* Hotel selection */}
      <Card>
        <SectionLabel>Accommodation</SectionLabel>
        <h2 className="font-display text-base font-semibold mb-4">Pick your hotel.</h2>
        <div className="space-y-2">
          {allHotelOptions.map(opt => (
            <button key={opt.key} type="button"
              onClick={() => setSelectedHotelKey(opt.key)}
              className={`w-full text-left rounded-xl p-4 ring-hairline transition ${selectedHotelKey === opt.key ? 'bg-primary/10 ring-1 ring-primary/30' : 'bg-secondary/40 hover:bg-secondary'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-display text-sm font-semibold flex items-center gap-1.5 flex-wrap">
                    <span className="truncate">{opt.name}</span>
                    {opt.badge && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground shrink-0">{opt.badge}</span>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                    <span>{opt.area || '—'}</span>
                    {opt.rating && <span>⭐ {opt.rating}</span>}
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary">{opt.source}</span>
                  </div>
                  {opt.perks.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {opt.perks.map(pk => <span key={pk} className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary/60 text-muted-foreground">{pk}</span>)}
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                  <div>
                    <div className="font-display text-base font-semibold">{opt.price ? fmtNGN(opt.price) : '—'}</div>
                    <div className="text-[10px] text-muted-foreground">per night</div>
                  </div>
                  {opt.url && (
                    <a href={opt.url} target="_blank" rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-foreground text-background hover:opacity-80 transition whitespace-nowrap">
                      {opt.source === 'Booking.com' ? 'Book →' : 'View →'}
                    </a>
                  )}
                </div>
              </div>
              {selectedHotelKey === opt.key && (
                <div className="mt-2 text-[11px] text-primary font-medium">✓ Selected — applied to your plan</div>
              )}
            </button>
          ))}
        </div>
        {allHotelOptions.length <= 1 && (
          <p className="text-xs text-muted-foreground mt-3">
            Live hotel data is loading — only the AI pick is available right now.
          </p>
        )}
      </Card>

      {/* Lock-in / account save */}
      <LockBanner tripId={tripId} />

      {/* Trip date picker */}
      <Card className="p-5">
        <div className="flex items-start gap-4">
          <div className="text-2xl shrink-0 mt-0.5">📅</div>
          <div className="flex-1 min-w-0">
            <div className="font-display font-semibold mb-1">When is the trip?</div>
            <p className="text-sm text-muted-foreground mb-3">
              Optional — sets a live countdown on the squad page your group will see.
            </p>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className="w-full rounded-xl bg-secondary/60 ring-hairline px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary/40 transition"
            />
          </div>
        </div>
      </Card>

      {/* Confirm */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-1">
        <div>
          <div className="font-display font-semibold">Happy with the plan?</div>
          <p className="text-sm text-muted-foreground">Confirm to get the share link for your squad.</p>
        </div>
        <button
          onClick={() => onConfirm(finalPlan, selectedDate || undefined)}
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
function ConfirmStep({ botNumber, destination, tripId, squadSize, finalPlan, selectedDate }: {
  botNumber: string; destination: string; instructions: string[]; tripId: string; squadSize: number; finalPlan?: GeminiPlan | null; selectedDate?: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const number = botNumber.startsWith("+") ? botNumber : `+${botNumber}`;
  const planUrl = `${window.location.origin}/plan/${tripId}`;
  const tripDateLabel = selectedDate
    ? new Date(selectedDate + "T12:00:00").toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })
    : null;
  const waShareText = encodeURIComponent(
    `🛫 I've planned our squad trip to ${destination}! Check it out and say you're in:\n${planUrl}`
  );

  const copy = () => {
    navigator.clipboard.writeText(number);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(planUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  return (
    <Card>
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-google-green/15 text-google-green grid place-items-center mx-auto mb-4 text-3xl">✅</div>
        <div className="font-display text-2xl md:text-3xl font-semibold tracking-tight">Plan confirmed.</div>
        <p className="text-muted-foreground mt-2">
          Add the bot to your {destination} squad's WhatsApp group to reveal the plan.
        </p>
      </div>

      {/* Plan recap */}
      {finalPlan && (
        <div className="rounded-2xl bg-secondary/40 ring-hairline p-5 mb-6">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">What you confirmed</div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Hotel</span>
              <span className="font-medium text-right truncate max-w-[60%]">{finalPlan.hotel.name}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Transport</span>
              <span className="font-medium">{finalPlan.transport.operator} · {finalPlan.transport.type}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Per person</span>
              <span className="font-display font-semibold">{fmtNGN(finalPlan.cost_breakdown.per_person)}</span>
            </div>
            {tripDateLabel && (
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Trip date</span>
                <span className="font-medium">📅 {tripDateLabel}</span>
              </div>
            )}
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-border">
              <span className="font-medium">Squad total ({squadSize} people)</span>
              <span className="font-display font-semibold text-primary">{fmtNGN(finalPlan.cost_breakdown.per_person * squadSize)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Share with squad — primary CTA */}
      <div className="rounded-2xl bg-primary/10 ring-1 ring-primary/20 p-5 mb-6">
        <div className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">Share with your squad</div>
        <p className="text-sm text-muted-foreground mb-4">
          Send this link to your group — they can view the full plan and say "I'm in!"
        </p>
        <div className="font-mono text-xs text-foreground/60 bg-secondary/60 rounded-xl px-3 py-2 mb-3 truncate select-all">
          {planUrl}
        </div>
        <div className="flex gap-2">
          <button
            onClick={copyLink}
            className={`flex-1 rounded-full py-2.5 text-sm font-medium ring-hairline transition ${
              linkCopied ? "bg-google-green/10 text-google-green ring-google-green/20" : "bg-card text-foreground hover:bg-secondary"
            }`}
          >
            {linkCopied ? "✓ Copied!" : "Copy link"}
          </button>
          <a
            href={`https://wa.me/?text=${waShareText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 rounded-full py-2.5 text-sm font-medium text-center bg-whatsapp text-white hover:opacity-90 transition"
          >
            Share on WhatsApp
          </a>
        </div>
      </div>

      {/* Bot number */}
      <div className="rounded-2xl bg-secondary/60 ring-hairline p-5 mb-6 flex items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Bot number — add this to your group</div>
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
      <ol className="space-y-3 mb-6">
        {[
          `Open your squad's WhatsApp group (or create one).`,
          `Tap Group Info → Add Participants.`,
          `Add: ${number}`,
          `The bot reveals the plan the moment it joins.`,
        ].map((s, i) => (
          <li key={i} className="flex items-start gap-3 text-sm">
            <span className="w-6 h-6 rounded-full bg-primary/15 text-primary grid place-items-center text-xs font-semibold shrink-0 mt-0.5">{i + 1}</span>
            <span className="text-foreground/90">{s}</span>
          </li>
        ))}
      </ol>

      <div className="rounded-2xl bg-whatsapp/10 ring-1 ring-whatsapp/20 p-4 text-sm text-foreground/90 mb-6">
        <span className="font-semibold text-whatsapp">The squad won't know you planned this.</span>{" "}
        The bot's first group message is the plan reveal — they'll just see{" "}
        <em>"Someone's been planning something... 👀"</em>
      </div>

      <Link to="/" className="inline-flex items-center justify-center gap-2 rounded-full bg-card ring-hairline px-5 py-3 text-sm font-medium text-foreground hover:bg-secondary transition-colors w-full sm:w-auto">
        Back to home
      </Link>
    </Card>
  );
}

/* ─── lock-in banner ─────────────────────────────────────────────────────────── */
function LockBanner({ tripId }: { tripId: string }) {
  const { user, signIn, getIdToken } = useAuth();
  const [state, setState] = useState<'idle' | 'signing-in' | 'linking' | 'linked' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  // If the user is already logged in when the plan arrives, link automatically
  useEffect(() => {
    if (!user || state !== 'idle') return;
    linkPlan();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function linkPlan() {
    setState('linking');
    try {
      const token = await getIdToken();
      if (!token) throw new Error('No token');
      await api.linkPlan(tripId, token);
      setState('linked');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save plan.');
      setState('error');
    }
  }

  async function handleSignIn() {
    setState('signing-in');
    try {
      await signIn();
      // useEffect above will detect user change and call linkPlan
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[sign-in]', msg);
      setErrorMsg(msg);
      setState('error');
    }
  }

  if (state === 'linked') {
    return (
      <Card className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-google-green/15 text-google-green grid place-items-center text-xl shrink-0">✅</div>
        <div className="flex-1 min-w-0">
          <div className="font-display font-semibold text-sm">Plan saved to your account</div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Come back anytime at{" "}
            <Link to="/my-plans" className="underline underline-offset-2 hover:text-foreground transition-colors">My Plans</Link>
          </p>
        </div>
        <Link
          to="/my-plans"
          className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full bg-foreground text-background hover:opacity-80 transition"
        >
          View all →
        </Link>
      </Card>
    );
  }

  if (state === 'error') {
    return (
      <Card className="flex items-center gap-4">
        <div className="text-destructive text-xl shrink-0">⚠️</div>
        <div className="flex-1 min-w-0">
          <div className="font-display font-semibold text-sm text-destructive">Couldn't save plan</div>
          <p className="text-xs text-muted-foreground mt-0.5">{errorMsg}</p>
        </div>
        <button onClick={linkPlan} className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full bg-foreground text-background hover:opacity-80 transition">
          Retry
        </button>
      </Card>
    );
  }

  if (user) {
    // Logged in but not yet linked (linking in progress)
    return (
      <Card className="flex items-center gap-4">
        <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin shrink-0" />
        <div className="text-sm text-muted-foreground">Saving plan to your account…</div>
      </Card>
    );
  }

  // Default: not logged in → show CTA
  return (
    <Card>
      <div className="flex flex-col sm:flex-row sm:items-center gap-5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">🔐</span>
            <div className="font-display font-semibold">Lock in your plan</div>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Sign in with Google to save this plan to your account. Close the tab, come back later — it'll be right here.
          </p>
        </div>
        <button
          onClick={handleSignIn}
          disabled={state === 'signing-in'}
          className="shrink-0 inline-flex items-center gap-2.5 rounded-full px-5 py-3 text-sm font-medium bg-card ring-hairline hover:bg-secondary active:scale-95 transition disabled:opacity-60 whitespace-nowrap"
        >
          {state === 'signing-in' ? (
            <><span className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />Signing in…</>
          ) : (
            <>
              {/* Google "G" logo */}
              <svg viewBox="0 0 24 24" className="w-4 h-4" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </>
          )}
        </button>
      </div>
    </Card>
  );
}

/* ─── page shell ─────────────────────────────────────────────────────────────── */
type Step = "intake" | "generating" | "plan" | "confirm";

export default function Start() {
  const { user, signIn, signOut } = useAuth();
  const [step, setStep] = useState<Step>("intake");
  const [intake, setIntake] = useState<IntakeData | null>(null);
  const [phone, setPhone] = useState<string>("");
  const [tripId, setTripId] = useState<string | null>(null);
  const [plan, setPlan] = useState<GeminiPlan | null>(null);
  const [scraped, setScraped] = useState<ScrapedData | null>(null);
  const [busLoading, setBusLoading] = useState(false);
  const [confirmedPlan, setConfirmedPlan] = useState<GeminiPlan | null>(null);
  const [confirmData, setConfirmData] = useState<{ botNumber: string; destination: string; squadSize: number; dmSent: boolean; instructions: string[]; selectedDate?: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Plan your trip · MySquadGo";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  // ── Poll timer ref — cleaned up on unmount ────────────────────────────────────
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (pollTimerRef.current) clearTimeout(pollTimerRef.current); }, []);

  // ── Polling engine ────────────────────────────────────────────────────────────
  // Recursive setTimeout — stops on plan_review, error, or timeout (120 s).
  function schedulePoll(id: string, knownIntake: IntakeData | null, attempts = 0) {
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    if (attempts > 40) {
      setError("Plan generation timed out. Please try again.");
      setStep("intake");
      return;
    }
    const delay = attempts === 0 ? 1500 : 3000; // first check sooner on resume
    pollTimerRef.current = setTimeout(async () => {
      try {
        const result = await api.pollPlan(id);

        if (result.status === "plan_review" && result.plan) {
          const eff = knownIntake ?? (result.intake as IntakeData | null);
          if (eff) setIntake(eff);
          setPlan(result.plan);
          setScraped(result.scraped ?? null);
          setStep("plan");

          // ── In-tab notification (tab is open but backgrounded) ──────────
          if (
            document.visibilityState !== "visible" &&
            typeof Notification !== "undefined" &&
            Notification.permission === "granted"
          ) {
            const dest = eff?.destination || result.plan.hotel?.area || "your destination";
            new Notification("Your squad plan is ready! 🎉", {
              body: `Trip to ${dest} is all mapped out. Tap to view.`,
              icon: "/favicon.ico",
              tag:  "plan-ready",
            });
          }

          // GIGM buses — fire separately after plan lands
          if (eff && !/flight/i.test(eff.transport || "")) {
            setBusLoading(true);
            api.getGigmBuses(eff.origin!, eff.destination!, eff.specificDates || undefined)
              .then(d => { if (d.trips?.length) setScraped(s => s ? { ...s, gigmTrips: d.trips } : s); })
              .catch(() => {})
              .finally(() => setBusLoading(false));
          }
          return;
        }

        if (result.status === "error") {
          setError(result.error || "Plan generation failed. Please try again.");
          setStep("intake");
          return;
        }

        // Still generating — schedule next poll
        schedulePoll(id, knownIntake, attempts + 1);
      } catch {
        // Network hiccup — retry
        schedulePoll(id, knownIntake, attempts + 1);
      }
    }, delay);
  }

  // ── Resume from URL (?job=<tripId>) on page load ──────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const jobId = params.get("job");
    if (!jobId) return;
    setTripId(jobId);
    setStep("generating");
    schedulePoll(jobId, null); // intake will be fetched from the server
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Plan creation ─────────────────────────────────────────────────────────────
  async function handleIntakeSubmit(data: IntakeData, organisersPhone: string) {
    setIntake(data);
    setPhone(organisersPhone);
    setScraped(null);
    setError(null);
    setStep("generating"); // show spinner immediately

    try {
      // POST /api/plan now returns in ~100 ms with just a tripId
      const { tripId: newTripId } = await api.createPlan(data);
      setTripId(newTripId);

      // Persist the job in the URL so refresh / close → reopen still works
      const url = new URL(window.location.href);
      url.searchParams.set("job", newTripId);
      window.history.replaceState({}, "", url.toString());

      // Start polling
      schedulePoll(newTripId, data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setStep("intake");
    }
  }

  async function handleConfirm(finalPlan: GeminiPlan, selectedDate?: string) {
    if (!tripId) return;
    setError(null);
    try {
      const result = await api.confirmPlan(tripId, finalPlan, phone || undefined, selectedDate);
      setConfirmedPlan(finalPlan);
      setConfirmData({
        botNumber: result.botNumber,
        destination: result.destination,
        squadSize: result.squadSize,
        dmSent: result.dmSent,
        instructions: result.instructions,
        selectedDate: result.selectedDate,
      });
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
          <div className="flex items-center gap-3">
            {/* Start over — shown on plan/confirm steps */}
            {step !== "intake" && step !== "generating" && (
              <button
                onClick={() => {
                  setStep("intake");
                  const url = new URL(window.location.href);
                  url.searchParams.delete("job");
                  window.history.replaceState({}, "", url.toString());
                }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Start over
              </button>
            )}

            {/* Auth */}
            {user ? (
              <div className="flex items-center gap-2">
                <Link to="/my-plans" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="" className="w-6 h-6 rounded-full ring-hairline" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="w-6 h-6 rounded-full bg-primary/15 grid place-items-center text-primary text-[10px] font-semibold">
                      {(user.displayName || user.email || "U")[0].toUpperCase()}
                    </span>
                  )}
                  <span className="hidden sm:inline">My Plans</span>
                </Link>
                <button onClick={() => signOut()} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  Sign out
                </button>
              </div>
            ) : step === "intake" ? (
              <button
                onClick={() => signIn().catch(() => {})}
                className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign in
              </button>
            ) : null}
          </div>
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
              {step === "intake" ? "1 — Tell us the details" : step === "generating" ? "2 — AI is building your plan…" : "3 — Review & edit"}
            </span>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="mb-5 rounded-2xl bg-destructive/10 ring-1 ring-destructive/20 px-5 py-4 flex items-start gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-destructive">Something went wrong</p>
              <p className="text-xs text-destructive/70 mt-0.5 break-words">{error}</p>
            </div>
            {intake && (
              <button
                onClick={() => {
                  setError(null);
                  const url = new URL(window.location.href);
                  url.searchParams.delete("job");
                  window.history.replaceState({}, "", url.toString());
                  handleIntakeSubmit(intake, phone);
                }}
                className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full bg-destructive text-white hover:opacity-80 active:scale-95 transition whitespace-nowrap"
              >
                Try again
              </button>
            )}
          </div>
        )}

        {step === "intake" && <IntakeStep onSubmit={handleIntakeSubmit} />}
        {step === "generating" && (
          <GeneratingStep tripId={tripId} userEmail={user?.email ?? null} />
        )}
        {step === "plan" && plan && intake && (
          <PlanStep tripId={tripId!} plan={plan} intake={intake} scraped={scraped} busLoading={busLoading} onConfirm={handleConfirm} />
        )}
        {step === "confirm" && confirmData && (
          <ConfirmStep tripId={tripId!} botNumber={confirmData.botNumber} destination={confirmData.destination} squadSize={confirmData.squadSize} instructions={confirmData.instructions} finalPlan={confirmedPlan} selectedDate={confirmData.selectedDate} />
        )}
      </div>
    </main>
  );
}
