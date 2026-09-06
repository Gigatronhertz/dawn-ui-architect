import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api, session, imageUrl, type TripPlan, type IntakeData, type PlanDay, type ScrapedData, type GIGMTrip, type GTHotel, type Attraction } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { KarijeLogo } from "@/components/Nav";

/* ─── constants ────────────────────────────────────────────────────────────── */
const VIBES = ["Chill & scenic", "Nightlife", "Foodie tour", "Adventure", "Cultural"];

/** Venue-picker filter chips — `value` matches the tag from attractionCategory(). */
const VIBE_FILTERS = [
  { value: "All",       label: "🌍 All" },
  { value: "Cultural",  label: "🏛️ Cultural" },
  { value: "Adventure", label: "⛰️ Adventure" },
  { value: "Chill",     label: "🌿 Chill" },
  { value: "Foodie",    label: "🍲 Foodie" },
  { value: "Nightlife", label: "🌙 Nightlife" },
];
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

/**
 * GIGM has no per-trip photo of its own (it's one operator, not a catalog of
 * venues), so bus cards get a generic, verified-working coach photo instead
 * of a bare emoji — cycled by index for a little variety across the grid.
 */
const BUS_IMAGES = [
  "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=400&h=200&q=70",
  "https://images.unsplash.com/photo-1494515843206-f3117d3f51b7?auto=format&fit=crop&w=400&h=200&q=70",
  "https://images.unsplash.com/photo-1583396618422-597b2755de2c?auto=format&fit=crop&w=400&h=200&q=70",
];

/**
 * Flights come from Google Travel's text scrape only (Amadeus, the one
 * source that ever carried a real airline logo, was removed) — there is no
 * per-airline image to show. Same treatment as buses: a generic, verified
 * flight photo instead of a bare emoji.
 */
const FLIGHT_IMAGES = [
  "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=400&h=200&q=70",
  "https://images.unsplash.com/photo-1569154941061-e231b4725ef1?auto=format&fit=crop&w=400&h=200&q=70",
];

/**
 * Real hotel photos come from Google Places and depend on that API key
 * having billing enabled — when it doesn't (or a given hotel just has no
 * photo on Places), fall back to a generic, verified hotel photo rather
 * than leaving the card's header blank.
 */
const HOTEL_FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&h=200&q=70",
  "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=400&h=200&q=70",
  "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=400&h=200&q=70",
  "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=400&h=200&q=70",
];

// ── City coordinates for dynamic route map ───────────────────────────────────
const CITY_COORDS: Record<string, [number, number]> = {
  'Abeokuta':     [7.1475,  3.3619],
  'Abuja':        [9.0765,  7.3986],
  'Akure':        [7.2526,  5.1938],
  'Asaba':        [6.1814,  6.7463],
  'Benin City':   [6.3350,  5.6286],
  'Calabar':      [4.9517,  8.3220],
  'Enugu':        [6.4584,  7.5464],
  'Ibadan':       [7.3775,  3.9470],
  'Ilorin':       [8.5003,  4.5500],
  'Jos':          [9.8965,  8.8583],
  'Kaduna':       [10.5222, 7.4383],
  'Kano':         [11.9964, 8.5167],
  'Lagos':        [6.5244,  3.3792],
  'Maiduguri':    [11.8469, 13.1571],
  'Onitsha':      [6.1429,  6.7866],
  'Owerri':       [5.4836,  7.0333],
  'Port Harcourt':[4.8156,  7.0498],
  'Sokoto':       [13.0622, 5.2339],
  'Uyo':          [5.0167,  7.9333],
  'Warri':        [5.5167,  5.7500],
  'Yola':         [9.2370,  12.4680],
};

function buildRouteMapUrl(origin: string, destination: string): string {
  const o = CITY_COORDS[origin]      ?? [9.0765, 7.3986];  // fallback Abuja
  const d = CITY_COORDS[destination] ?? CITY_COORDS[origin] ?? [6.5244, 3.3792];
  const pad = 0.6;
  const west  = (Math.min(o[1], d[1]) - pad).toFixed(4);
  const east  = (Math.max(o[1], d[1]) + pad).toFixed(4);
  const south = (Math.min(o[0], d[0]) - pad).toFixed(4);
  const north = (Math.max(o[0], d[0]) + pad).toFixed(4);
  return `https://www.openstreetmap.org/export/embed.html?bbox=${west}%2C${south}%2C${east}%2C${north}&layer=mapnik&marker=${d[0]}%2C${d[1]}`;
}

const MAPS_PLACES = [
  { id: "p1", title: "Local cultural centre", tag: "Cultural", cost: 1500, emoji: "🏛️", blurb: "Heritage tours and local craft exhibitions." },
  { id: "p2", title: "Top-rated amala spot", tag: "Foodie", cost: 2500, emoji: "🍲", blurb: "Legendary street spot — locals queue out the door." },
  { id: "p3", title: "Waterfront park", tag: "Chill", cost: 1000, emoji: "🌊", blurb: "Great for morning walks or evening hangouts." },
  { id: "p4", title: "Night market", tag: "Nightlife", cost: 3000, emoji: "🌙", blurb: "Street food, music, and local crafts after dark." },
  { id: "p5", title: "Nature reserve trail", tag: "Adventure", cost: 4000, emoji: "🌳", blurb: "Guided walks through forested terrain." },
  { id: "p6", title: "Viewing tower", tag: "Chill", cost: 1500, emoji: "🗼", blurb: "360° city views — best at golden hour." },
];

const fmtNGN = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n);

function attractionEmoji(name: string): string {
  const n = name.toLowerCase();
  if (/waterfall|spring|lake|river|beach|bay|creek/.test(n)) return '🌊';
  if (/park|garden|reserve|forest|wildlife|nature/.test(n)) return '🌿';
  if (/hill|mountain|plateau|peak|rock|summit/.test(n)) return '⛰️';
  if (/museum|palace|castle|bunker|wall|tomb|heritage|moat|fort|monument/.test(n)) return '🏛️';
  if (/market|craft|village|cultural centre/.test(n)) return '🏪';
  if (/zoo|safari|ranch|game/.test(n)) return '🦁';
  if (/cave/.test(n)) return '🪨';
  if (/festival/.test(n)) return '🎉';
  if (/dam/.test(n)) return '💧';
  if (/beach club|nightlife|bar|strip/.test(n)) return '🌙';
  if (/stadium|arena/.test(n)) return '🏟️';
  if (/resort|spa/.test(n)) return '🏖️';
  return '📍';
}

function attractionCategory(name: string): string {
  const n = name.toLowerCase();
  if (/market|craft|palace|museum|fort|wall|heritage|tomb|cultural|monument|moat|emir|shrine/.test(n)) return 'Cultural';
  if (/waterfall|beach|lake|park|garden|reserve|nature|wildlife|hill|mountain|plateau|rock|cave|dam|spring|river/.test(n)) return 'Adventure';
  if (/bar|club|strip|night|entertainment|amusement|resort/.test(n)) return 'Nightlife';
  if (/food|restaurant|cuisine|bukka/.test(n)) return 'Foodie';
  return 'Chill';
}

/* ─── shared UI ─────────────────────────────────────────────────────────────── */
const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-3xl bg-card ring-hairline shadow-card p-6 md:p-8 animate-rise ${className}`}>{children}</div>
);

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground mb-1">{children}</div>
);

const chipCls = (active: boolean) =>
  `px-3 py-1.5 rounded-full text-xs font-medium ring-hairline transition-all ${
    active ? "bg-foreground text-background" : "bg-card text-foreground hover:bg-secondary"
  }`;

/* ─── step 1: intake ────────────────────────────────────────────────────────── */
function IntakeStep({ onSubmit }: { onSubmit: (data: IntakeData, email: string) => void }) {
  const [email, setEmail] = useState("");
  const [transportMode, setTransportMode] = useState<'bus' | 'flight'>('bus');
  const cities = transportMode === 'bus' ? GIGM_CITIES : FLIGHT_CITIES;

  const [form, setForm] = useState<IntakeData>({
    origin: "Lagos",
    destination: "Abuja",
    hotelBudgetPerNight: 35000,
    days: 2,
    squadSize: 8,
    accommodationType: "Hotel",
    dateFlexibility: "Flexible",
    dealbreakers: "",
    transport: "Charter bus",
    vibe: "Chill & scenic",
    specificDates: "",
    roundTrip: false,
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
        <div className="mt-3 flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground">
            {transportMode === 'bus'
              ? `GIGM live prices · ${GIGM_CITIES.length} cities covered`
              : `Google Travel live prices · ${FLIGHT_CITIES.length} airports covered`}
          </p>
          {/* Round trip toggle */}
          <button
            type="button"
            onClick={() => set("roundTrip", !form.roundTrip)}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold ring-hairline transition ${
              form.roundTrip
                ? "bg-primary text-primary-foreground shadow-glow"
                : "bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>↩</span>
            Round trip
          </button>
        </div>
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

        <Field n={4} label={`Hotel budget per night · ${fmtNGN(form.hotelBudgetPerNight)}`}>
          <input
            type="range" min={5000} max={150000} step={1000} value={form.hotelBudgetPerNight}
            onChange={(e) => set("hotelBudgetPerNight", +e.target.value)} className="w-full accent-primary"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>₦5k</span><span>₦150k</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
            Sets your room ceiling only. Transport, activities and food are priced at what they
            actually cost — swap the hotel or edit the itinerary on the next screen to move the total.
          </p>
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
          <div className="rounded-2xl bg-primary/8 ring-1 ring-primary/20 p-4">
            <Field n={10} label="Your email">
              <input
                type="email"
                className={inputCls}
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
              We'll email you the plan and your share link the moment you confirm.
              No spam — just the one message.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Takes ~20 seconds. AI builds your plan with live prices from GIGM and Google Travel.
        </p>
        <button
          onClick={() => onSubmit(form, email)}
          disabled={!email.includes("@")}
          className="group inline-flex items-center gap-2 rounded-lg bg-gradient-primary text-primary-foreground px-6 py-3 text-sm font-medium shadow-glow hover:scale-[1.02] active:scale-[0.98] transition-transform w-full sm:w-auto justify-center disabled:opacity-40 disabled:hover:scale-100"
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
// What actually happens now: we price the journey, the squad plans the days.
const PHASES = [
  { title: "Analyzing your route…",   sub: "Mapping distances and transport options" },
  { title: "Fetching live prices…",   sub: "Checking GIGM buses, flights & hotels" },
  { title: "Finding places to go…",   sub: `Pulling verified venues and entry fees` },
  { title: "Calculating squad costs…", sub: "Working out the per-person breakdown" },
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
  const [pushState, setPushState]   = useState<'idle' | 'subscribing' | 'granted' | 'blocked' | 'unavailable'>('idle');

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
      if (!vapidKey) { setPushState('unavailable'); return; }

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
          <div className="text-[11px] font-semibold uppercase tracking-wider text-foreground/60 mb-2">
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
                ) : pushState === 'unavailable' ? (
                  <span className="text-xs text-muted-foreground">Notifications not available</span>
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

/* ─── date option label → ISO date parser ──────────────────────────────────── */
function parseDateOptionLabel(label: string): string {
  // Handles AI labels like "Fri 9 – Sun 11 Aug" or "Fri 16 – Sun 18 Aug"
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const parts = label.trim().split(/\s+/);
  const lastWord = parts[parts.length - 1];
  const monthIdx = MONTHS.indexOf(lastWord);
  const dayMatch = label.match(/\d+/);
  if (monthIdx === -1 || !dayMatch) return "";
  const day = parseInt(dayMatch[0], 10);
  const today = new Date();
  const date = new Date(today.getFullYear(), monthIdx, day);
  if (date < today) date.setFullYear(today.getFullYear() + 1);
  return date.toISOString().split("T")[0];
}

/* ─── step 3: plan editor ───────────────────────────────────────────────────── */
/**
 * "Add to which day?" — a select rather than a button, because with the venue
 * library always on screen the day is no longer implied by where you clicked.
 * Collapses to a plain button on single-day trips, where there's no choice.
 */
function DayPicker({
  days, onPick, label = "+ Add", disabled = false,
}: {
  days: PlanDay[];
  onPick: (dayIdx: number) => void;
  label?: string;
  disabled?: boolean;
}) {
  if (days.length === 1) {
    return (
      <button
        onClick={() => onPick(0)}
        disabled={disabled}
        className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-primary/10 text-foreground hover:bg-primary hover:text-primary-foreground shrink-0 transition disabled:opacity-40"
      >
        {label}
      </button>
    );
  }
  return (
    <select
      value=""
      disabled={disabled}
      onChange={(e) => { if (e.target.value !== "") onPick(Number(e.target.value)); }}
      aria-label="Add to which day"
      className="text-[10px] font-semibold px-1.5 py-1 rounded-lg bg-primary/10 text-foreground shrink-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary/40 disabled:opacity-40"
    >
      <option value="">{label}</option>
      {days.map((d, i) => <option key={i} value={i}>Day {d.day}</option>)}
    </select>
  );
}

function PlanStep({
  tripId, plan: initialPlan, intake, scraped, busLoading,
  onConfirm,
}: {
  tripId: string;
  plan: TripPlan;
  intake: IntakeData;
  scraped?: ScrapedData | null;
  busLoading?: boolean;
  onConfirm: (finalPlan: TripPlan, selectedDate?: string) => void;
}) {
  const [days, setDays] = useState<PlanDay[]>(initialPlan.days);
  const [openDay, setOpenDay] = useState<number>(0);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [venueSearch, setVenueSearch] = useState("");
  const [vibeFilter, setVibeFilter] = useState<string>("All");
  const [custom, setCustom] = useState({ time: "", title: "", cost: "" });
  const [drafting, setDrafting] = useState(false);
  const [draftErr, setDraftErr] = useState("");
  const [ideas, setIdeas] = useState<{ id: string; title: string; emoji: string; cost: number; feeNote: string; reason: string | null }[]>([]);
  const [thinking, setThinking] = useState(false);
  // On a phone the library can't sit beside the plan, so it becomes a sheet.
  const [libOpen, setLibOpen] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [selectedBusIdx, setSelectedBusIdx] = useState<number | null>(null);
  const [selectedFlightIdx, setSelectedFlightIdx] = useState<number | null>(null);
  const [selectedHotelKey, setSelectedHotelKey] = useState<string>('ai');

  const busOffers: GIGMTrip[] = useMemo(() => scraped?.gigmTrips ?? [], [scraped]);
  const flightOffers = useMemo(() => scraped?.flights?.offers ?? [], [scraped]);
  const isBusMode = !/flight/i.test(intake.transport || '');

  type HotelOpt = { key: string; name: string; area: string; price: number | null; rating: number | null; source: string; badge?: string; perks: string[]; url?: string | null; imageUrl?: string | null };
  const allHotelOptions = useMemo<HotelOpt[]>(() => {
    const opts: HotelOpt[] = [];
    if (initialPlan?.hotel) {
      const aiUrl = `https://www.google.com/search?q=${encodeURIComponent(initialPlan.hotel.name + ' hotel ' + intake.destination)}`;
      opts.push({ key: 'ai', name: initialPlan.hotel.name, area: initialPlan.hotel.area, price: initialPlan.hotel.price_per_night, rating: initialPlan.hotel.rating, source: 'AI Pick', badge: 'AI Pick', perks: initialPlan.hotel.perks || [], url: aiUrl, imageUrl: initialPlan.hotel.imageUrl });
    }
    (scraped?.gtHotels ?? []).forEach((h: GTHotel, i: number) => {
      if (!opts.find(o => o.name.toLowerCase() === h.name.toLowerCase())) {
        const gtUrl = `https://www.google.com/travel/hotels?q=${encodeURIComponent(h.name + ' ' + intake.destination + ' Nigeria')}`;
        opts.push({ key: `gt-${i}`, name: h.name, area: h.location || '', price: h.pricePerNight, rating: h.rating, source: 'Google Travel', perks: h.amenities.slice(0, 3), url: gtUrl, imageUrl: h.imageUrl });
      }
    });
    (scraped?.gHotels ?? []).forEach((h, i) => {
      if (!opts.find(o => o.name.toLowerCase() === h.name.toLowerCase()))
        opts.push({ key: `gp-${i}`, name: h.name, area: h.address?.split(',')[0] || '', price: h.estimatedNightNGN, rating: h.rating, source: 'Google Places', perks: [], url: null, imageUrl: h.imageUrl });
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
        // category shown as the tag so the search input can filter by vibe
        tag: attractionCategory(a.name),
        // fee_note used as subtitle; cost is midpoint for addActivity
        feeNote: a.fee_note || (a.fee_max > 0 ? `₦${a.fee_min.toLocaleString()}–₦${a.fee_max.toLocaleString()}` : 'Free'),
        cost: a.fee_max > 0 ? Math.round((a.fee_min + a.fee_max) / 2) : 0,
      }));
    }
    return MAPS_PLACES.map(p => ({ ...p, feeNote: p.tag, tag: p.tag }));
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

  /**
   * Add a spot the squad already knows about. Our attractions DB only covers
   * seeded venues, so anything else has to be typed in by hand — it still
   * counts toward the per-person cost.
   */
  const addCustomActivity = (dayIdx: number) => {
    const title = custom.title.trim();
    if (!title) return;
    setDays((ds) =>
      ds.map((d, i) =>
        i === dayIdx
          ? {
              ...d,
              activities: [...d.activities, {
                time: custom.time.trim() || "—:—",
                title: `📍 ${title}`,
                cost_per_person: Math.max(0, Math.round(Number(custom.cost) || 0)),
              }],
            }
          : d
      )
    );
    setCustom({ time: "", title: "", cost: "" });
    setDirty(true);
  };

  /** True while every day is still empty — the squad hasn't planned anything yet. */
  const isEmptyPlan = days.every(d => d.activities.length === 0);
  const totalActivities = days.reduce((n, d) => n + d.activities.length, 0);

  /** A few places that fit what's already on the plan. Additive only. */
  const getIdeas = async () => {
    setThinking(true);
    try {
      const added = days.flatMap(d => d.activities.map(a => a.title.replace(/^\S+\s/, "")));
      const res = await api.suggestVenues({
        city: intake.destination!,
        added,
        vibe: vibeFilter === "All" ? null : vibeFilter,
      });
      setIdeas(res.suggestions.map(s => ({
        id:      `attr-${s.id}`,
        title:   s.name,
        emoji:   attractionEmoji(s.name),
        cost:    s.fee_max > 0 ? Math.round((s.fee_min + s.fee_max) / 2) : 0,
        feeNote: s.fee_note || (s.fee_max > 0 ? `₦${s.fee_min.toLocaleString()}–₦${s.fee_max.toLocaleString()}` : "Free"),
        reason:  s.reason,
      })));
    } catch {
      setIdeas([]);
    } finally {
      setThinking(false);
    }
  };

  /**
   * Ask for a first draft of the days. Only touches the itinerary — whatever
   * bus, flight or hotel they already picked is left exactly as it was.
   */
  const handleDraft = async () => {
    if (!tripId) return;
    setDrafting(true);
    setDraftErr("");
    try {
      const res = await api.draftDays(tripId, {
        transport: intake.transport || undefined,
        vibe:      intake.vibe || undefined,
      });
      if (res.days?.length) {
        setDays(res.days);
        setDirty(true);
        setOpenDay(0);
      } else {
        setDraftErr("Couldn't come up with anything — try adding places yourself.");
      }
    } catch (e) {
      setDraftErr(e instanceof Error ? e.message : "Couldn't draft a plan right now.");
    } finally {
      setDrafting(false);
    }
  };

  /** Venue list filtered by the active vibe chip and search box. */
  const filteredPlaces = useMemo(() => {
    const q = venueSearch.trim().toLowerCase();
    return placesItems.filter((p) => {
      const matchesVibe = vibeFilter === "All" || p.tag === vibeFilter;
      const matchesSearch = !q || p.title.toLowerCase().includes(q) || p.tag.toLowerCase().includes(q);
      return matchesVibe && matchesSearch;
    });
  }, [placesItems, vibeFilter, venueSearch]);

  // ── Resolved transport & hotel — always reflect the latest user selection ─────
  const selBus    = selectedBusIdx    !== null ? busOffers[selectedBusIdx]       : null;
  const selFlight = selectedFlightIdx !== null ? flightOffers[selectedFlightIdx] : null;
  const selHotel  = allHotelOptions.find(o => o.key === selectedHotelKey);
  const transport = selFlight
    ? { ...initialPlan.transport, operator: selFlight.airline || 'Unknown', type: selFlight.stops === 0 ? 'Nonstop Flight' : 'Flight', price_per_person: selFlight.price, logo: selFlight.logo ?? null }
    : selBus
    ? { ...initialPlan.transport, operator: 'GIGM', type: `Bus · ${selBus.class}`, price_per_person: selBus.price, depart_time: selBus.departureTime?.slice(0, 5) || initialPlan.transport.depart_time, pickup: selBus.terminal || initialPlan.transport.pickup, logo: null }
    : initialPlan.transport;
  const hotel = (selHotel && selHotel.key !== 'ai' && selHotel.price)
    ? { ...initialPlan.hotel, name: selHotel.name, area: selHotel.area, price_per_night: selHotel.price, rating: selHotel.rating ?? initialPlan.hotel?.rating ?? null, perks: selHotel.perks, imageUrl: selHotel.imageUrl ?? null }
    : initialPlan.hotel;
  // Null whenever nothing was scraped and nothing has been picked. Everything
  // below has to survive that rather than assume a hotel exists.
  const hotelName = hotel?.name?.split(" ")[0] ?? "No hotel yet";

  // ── Accurate live cost breakdown — recomputed from selections ─────────────────
  // Round trip doubles the transport price (same route back, same operator/price).
  const tripMultiplier      = intake.roundTrip ? 2 : 1;
  const transportPerPerson  = (transport.price_per_person || 0) * tripMultiplier;

  const activitiesPerPerson = days.reduce(
    (sum, d) => sum + d.activities.reduce((s, a) => s + (a.cost_per_person || 0), 0), 0
  );
  const foodPerPerson   = Math.round((initialPlan.cost_breakdown.food_total   || 0) / Math.max(intake.squadSize, 1));
  const bufferPerPerson = Math.round((initialPlan.cost_breakdown.buffer       || 0) / Math.max(intake.squadSize, 1));
  const perPerson       = transportPerPerson
                        + (hotel?.price_per_night || 0) * (intake.days || 1)
                        + activitiesPerPerson
                        + foodPerPerson
                        + bufferPerPerson;
  const transportTotal  = transportPerPerson * (intake.squadSize || 1);
  const lodgingTotal    = (hotel?.price_per_night || 0) * (intake.days || 1) * (intake.squadSize || 1);
  const squadTotal      = perPerson * (intake.squadSize || 1);
  const isDirty         = dirty || selectedBusIdx !== null || selectedFlightIdx !== null || selectedHotelKey !== 'ai';

  const finalPlan: TripPlan = {
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
            {
              label: "Transport",
              val: fmtNGN(transportTotal),
              sub: `${transport.operator} · ${intake.squadSize}×`,
              badge: intake.roundTrip ? "↩ Return included" : null,
              color: "text-google-blue",
            },
            { label: "Lodging", val: fmtNGN(lodgingTotal), sub: `${hotelName} · ${intake.days} nights`, badge: null, color: "text-google-purple" },
            { label: "Per person", val: fmtNGN(perPerson), sub: isDirty ? "Updated · live" : "AI estimate", badge: null, color: "text-foreground" },
            { label: "Squad total", val: fmtNGN(squadTotal), sub: `${intake.squadSize} people · all-in`, badge: null, color: "text-google-green" },
          ].map((c) => (
            <div key={c.label} className="p-4 md:p-6 text-center">
              <div className={`text-[10px] font-semibold uppercase tracking-wider ${c.color} mb-1`}>{c.label}</div>
              <div className="font-display text-lg md:text-2xl font-semibold tabular-nums">{c.val}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{c.sub}</div>
              {c.badge && (
                <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-primary/10 text-foreground px-2 py-0.5 text-[10px] font-semibold">
                  {c.badge}
                </div>
              )}
            </div>
          ))}
        </div>
        <CostBreakdown
          total={perPerson}
          items={[
            { label: intake.roundTrip ? "Transport (× 2 return)" : "Transport", value: transportPerPerson, icon: "🚌", colorClass: "bg-google-blue" },
            { label: `Lodging · ${intake.days} night${intake.days === 1 ? "" : "s"}`, value: (hotel?.price_per_night || 0) * (intake.days || 1), icon: "🏨", colorClass: "bg-google-purple" },
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
                title={`Route map · ${intake.origin} → ${intake.destination}`}
                className="w-full h-64 md:h-80 block"
                loading="lazy"
                src={buildRouteMapUrl(intake.origin!, intake.destination!)}
              />
              <div className="absolute bottom-0 inset-x-0 flex flex-wrap items-center justify-between gap-2 bg-card/85 backdrop-blur px-4 py-2 text-xs">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-foreground" />{intake.origin}</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary animate-pulse" />{intake.destination}</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-google-purple" />{hotelName}</span>
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
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {busOffers.map((bus, i) => (
                <button key={i} type="button"
                  onClick={() => { setSelectedBusIdx(i === selectedBusIdx ? null : i); setSelectedFlightIdx(null); }}
                  className={`relative text-left rounded-lg overflow-hidden ring-hairline transition flex flex-col h-full ${selectedBusIdx === i ? 'bg-primary/10 ring-1 ring-primary/30' : 'bg-secondary/40 hover:bg-secondary'}`}>
                  {/* Selected checkmark */}
                  {selectedBusIdx === i && (
                    <span className="absolute top-1.5 right-1.5 z-10 w-4 h-4 rounded-full bg-primary text-primary-foreground grid place-items-center text-[9px]">✓</span>
                  )}
                  <img
                    src={BUS_IMAGES[i % BUS_IMAGES.length]}
                    alt=""
                    className="h-12 w-full object-cover shrink-0"
                    loading="lazy"
                  />
                  <div className="p-2 flex flex-col flex-1 min-h-0">
                    <div className="text-[9px] text-muted-foreground font-medium uppercase tracking-wide truncate">GIGM · {bus.class}</div>
                    <div className="font-display text-sm font-semibold mt-0.5 tabular-nums leading-none">
                      {bus.departureTime?.slice(0, 5) || '—'}
                    </div>
                    <div className="text-[9px] text-muted-foreground mt-0.5">{bus.seatsAvailable} seats left</div>
                    <div className="mt-auto pt-1 border-t border-border/50">
                      <div className="font-display text-xs font-semibold text-foreground tabular-nums">{fmtNGN(bus.price)}</div>
                    </div>
                  </div>
                </button>
              ))}
              {/* AI pick — spans full width */}
              <button type="button"
                onClick={() => { setSelectedBusIdx(null); setSelectedFlightIdx(null); }}
                className={`col-span-full text-left rounded-lg px-3 py-2 ring-hairline transition text-xs ${selectedBusIdx === null ? 'bg-primary/10 ring-1 ring-primary/30' : 'bg-secondary/40 hover:bg-secondary'}`}>
                <span className="font-medium">🤖 Use AI pick</span>
                <span className="text-muted-foreground ml-2 text-[11px]">{initialPlan.transport.operator} · {initialPlan.transport.type}</span>
                {selectedBusIdx === null && <span className="ml-2 text-[11px] text-foreground font-medium">✓ Active</span>}
              </button>
            </div>
          )}

          {!isBusMode && flightOffers.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {flightOffers.slice(0, 4).map((f, i) => {
                return (
                  <button key={i} type="button"
                    onClick={() => { setSelectedFlightIdx(i === selectedFlightIdx ? null : i); setSelectedBusIdx(null); }}
                    className={`relative text-left rounded-lg overflow-hidden ring-hairline transition flex flex-col h-full ${selectedFlightIdx === i ? 'bg-primary/10 ring-1 ring-primary/30' : 'bg-secondary/40 hover:bg-secondary'}`}>
                    {selectedFlightIdx === i && (
                      <span className="absolute top-1.5 right-1.5 z-10 w-4 h-4 rounded-full bg-primary text-primary-foreground grid place-items-center text-[9px]">✓</span>
                    )}
                    <img
                      src={FLIGHT_IMAGES[i % FLIGHT_IMAGES.length]}
                      alt=""
                      className="h-12 w-full object-cover shrink-0"
                      loading="lazy"
                    />
                    <div className="p-2 flex flex-col flex-1 min-h-0">
                      <div className="text-[9px] text-muted-foreground font-medium uppercase tracking-wide truncate">
                        {f.stops === 0 ? 'Nonstop' : f.stops ? `${f.stops} stop${f.stops > 1 ? 's' : ''}` : 'Stops unknown'}
                      </div>
                      <div className="font-display text-xs font-semibold mt-0.5 leading-snug truncate">
                        {f.airline || 'Unknown'}
                      </div>
                      <div className="mt-auto pt-1 border-t border-border/50">
                        <div className="font-display text-xs font-semibold text-foreground tabular-nums">{fmtNGN(f.price)}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
              {/* AI pick — spans full width */}
              <button type="button"
                onClick={() => { setSelectedFlightIdx(null); setSelectedBusIdx(null); }}
                className={`col-span-full text-left rounded-lg px-3 py-2 ring-hairline transition text-xs ${selectedFlightIdx === null ? 'bg-primary/10 ring-1 ring-primary/30' : 'bg-secondary/40 hover:bg-secondary'}`}>
                <span className="font-medium">🤖 Use AI pick</span>
                <span className="text-muted-foreground ml-2 text-[11px]">{initialPlan.transport.operator}</span>
                {selectedFlightIdx === null && <span className="ml-2 text-[11px] text-foreground font-medium">✓ Active</span>}
              </button>
            </div>
          )}
        </Card>
      )}

      {/* Itinerary + venue library, side by side. The library stays on screen
          so adding a place never means hunting through collapsed days. */}
      <div className="grid lg:grid-cols-[1fr,340px] gap-5 items-start">
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <SectionLabel>Itinerary</SectionLabel>
            <h2 className="font-display text-lg font-semibold">
              {isEmptyPlan ? "Build your days." : "Edit before sending to the squad."}
            </h2>
          </div>
          <span className="text-xs text-muted-foreground bg-google-blue/10 text-google-blue px-2.5 py-1 rounded-full font-medium">Editable</span>
        </div>

        {/* Nothing planned yet — offer a draft rather than leaving a blank page */}
        {isEmptyPlan && (
          <div className="rounded-2xl bg-secondary/60 ring-hairline p-5 mb-4 text-center space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
              Your days are empty — open one and add places from {intake.destination}'s venue list
              below. Or let us sketch a first draft you can rip apart.
            </p>
            <button
              onClick={handleDraft}
              disabled={drafting}
              className="text-sm font-medium px-5 py-2.5 rounded-lg bg-foreground text-background hover:opacity-90 disabled:opacity-50 transition"
            >
              {drafting ? "Sketching…" : "✨ Give me a starting point"}
            </button>
            {draftErr && <p className="text-xs text-destructive">{draftErr}</p>}
          </div>
        )}

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
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </Card>

        {/* Dimmer behind the mobile sheet */}
        {libOpen && (
          <button
            aria-label="Close places"
            onClick={() => setLibOpen(false)}
            className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
          />
        )}

        {/* ── Venue library ──────────────────────────────────────────────────
            Beside the plan on a wide screen; a bottom sheet on a phone, where
            stacking it under the itinerary would mean scrolling past every day
            to add a single place. One instance, two presentations. */}
        <div
          className={`rounded-3xl bg-card ring-hairline shadow-card p-4 space-y-3 lg:block lg:static lg:sticky lg:top-4 lg:max-h-none lg:overflow-visible lg:z-auto lg:rounded-3xl ${
            libOpen
              ? "fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-b-none rounded-t-3xl"
              : "hidden"
          }`}
        >
          {/* Sheet handle — mobile only */}
          <div className="lg:hidden flex items-center justify-between -mt-1 mb-1">
            <span className="text-sm font-semibold">Add a place</span>
            <button
              onClick={() => setLibOpen(false)}
              className="w-8 h-8 grid place-items-center rounded-full bg-secondary text-muted-foreground"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            📍 Places in {intake.destination}
            {placesItems.length > 0 && <span className="text-foreground"> · {placesItems.length}</span>}
          </div>

          <input
            type="text"
            value={venueSearch}
            onChange={(e) => setVenueSearch(e.target.value)}
            placeholder={`Search ${intake.destination}…`}
            className="w-full text-[12px] px-3 py-2 rounded-lg bg-secondary ring-hairline focus:outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground/60"
          />

          <div className="flex gap-1.5 flex-wrap">
            {VIBE_FILTERS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setVibeFilter(value)}
                className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg transition ${
                  vibeFilter === value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Ideas — additive only, never replaces what they picked */}
          <div className="border-t border-border pt-3">
            <button
              onClick={getIdeas}
              disabled={thinking}
              className="w-full text-[11px] font-semibold py-2 rounded-lg bg-secondary/70 hover:bg-secondary text-muted-foreground hover:text-foreground transition disabled:opacity-50"
            >
              {thinking ? "Thinking…" : totalActivities === 0 ? "✨ What should we do?" : "✨ What else goes with this?"}
            </button>

            {ideas.length > 0 && (
              <ul className="mt-2 space-y-1.5">
                {ideas.map((v) => (
                  <li key={v.id} className="flex items-center gap-2 bg-secondary/50 rounded-lg p-2">
                    <span className="text-base shrink-0 leading-none">{v.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-medium truncate">{v.title}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{v.reason || v.feeNote}</div>
                    </div>
                    <DayPicker
                      days={days}
                      onPick={(di) => {
                        addActivity(di, { id: v.id, title: v.title, cost: v.cost, emoji: v.emoji });
                        setIdeas((prev) => prev.filter((x) => x.id !== v.id));
                      }}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* The library itself */}
          <ul className="space-y-0.5 max-h-[24rem] overflow-y-auto -mx-1 px-1">
            {filteredPlaces.map((p) => (
              <li key={p.id} className="flex items-center gap-2 text-[12px] rounded-lg px-2 py-1.5 hover:bg-secondary/70 transition">
                <span className="text-base shrink-0 leading-none">{p.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate leading-tight">{p.title}</div>
                  <div className="text-[10px] text-muted-foreground leading-tight truncate">
                    <span className="text-foreground/60 font-medium">{p.tag}</span> · {p.feeNote}
                  </div>
                </div>
                <DayPicker
                  days={days}
                  onPick={(di) => addActivity(di, { id: p.id, title: p.title, cost: p.cost, emoji: p.emoji })}
                />
              </li>
            ))}
            {filteredPlaces.length === 0 && (
              <li className="text-[12px] text-muted-foreground px-2 py-6 text-center">
                Nothing matching that in {intake.destination}.
              </li>
            )}
          </ul>

          {/* Somewhere we don't have on file */}
          <div className="border-t border-border pt-3 space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              ✍️ Add your own
            </div>
            <input
              type="text"
              placeholder="Place or activity"
              value={custom.title}
              onChange={(e) => setCustom(c => ({ ...c, title: e.target.value }))}
              className="w-full text-[12px] px-3 py-1.5 rounded-lg bg-secondary ring-hairline focus:outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground/60"
            />
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                placeholder="14:00"
                value={custom.time}
                onChange={(e) => setCustom(c => ({ ...c, time: e.target.value }))}
                className="w-16 text-[12px] px-2 py-1.5 rounded-lg bg-secondary ring-hairline text-center tabular-nums focus:outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground/60"
              />
              <input
                type="number"
                min={0}
                placeholder="₦0"
                value={custom.cost}
                onChange={(e) => setCustom(c => ({ ...c, cost: e.target.value }))}
                className="flex-1 min-w-0 text-[12px] px-2 py-1.5 rounded-lg bg-secondary ring-hairline tabular-nums focus:outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground/60"
              />
              <DayPicker
                days={days}
                label="Add"
                disabled={!custom.title.trim()}
                onPick={(di) => addCustomActivity(di)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Phone-only bar — keeps the library one tap away instead of a long
          scroll below the itinerary. Sits above the safe area on iOS. */}
      {!libOpen && (
        <div className="lg:hidden fixed inset-x-0 bottom-0 z-30 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 bg-background/95 backdrop-blur border-t border-border">
          <div className="flex items-center gap-3">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Per person</div>
              <div className="font-display text-base font-semibold tabular-nums truncate">{fmtNGN(perPerson)}</div>
            </div>
            <button
              onClick={() => setLibOpen(true)}
              className="flex-1 py-3 rounded-lg bg-gradient-primary text-primary-foreground text-sm font-medium shadow-glow active:scale-[0.98] transition"
            >
              ＋ Add a place
            </button>
          </div>
        </div>
      )}

      {/* Hotel selection */}
      <Card>
        <SectionLabel>Accommodation</SectionLabel>
        <h2 className="font-display text-base font-semibold mb-4">Pick your hotel.</h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {allHotelOptions.map((opt, i) => (
            <button key={opt.key} type="button"
              onClick={() => setSelectedHotelKey(opt.key)}
              className={`relative text-left rounded-lg overflow-hidden ring-hairline transition flex flex-col h-full ${selectedHotelKey === opt.key ? 'bg-primary/10 ring-1 ring-primary/30' : 'bg-secondary/40 hover:bg-secondary'}`}>
              {/* Selected checkmark */}
              {selectedHotelKey === opt.key && (
                <span className="absolute top-1.5 right-1.5 z-10 w-4 h-4 rounded-full bg-primary text-primary-foreground grid place-items-center text-[9px]">✓</span>
              )}
              {opt.badge && (
                <span className="absolute top-1.5 left-1.5 z-10 text-[9px] font-semibold px-1 py-0.5 rounded-full bg-primary text-primary-foreground">{opt.badge}</span>
              )}

              {/* Real photo when we have one (Google Places); a generic,
                  verified hotel photo otherwise — every card gets a header,
                  none sit with a blank top half. */}
              <img
                src={(opt.imageUrl && (imageUrl(opt.imageUrl) || opt.imageUrl)) || HOTEL_FALLBACK_IMAGES[i % HOTEL_FALLBACK_IMAGES.length]}
                alt=""
                className="h-12 w-full object-cover shrink-0"
                loading="lazy"
                onError={(e) => { (e.target as HTMLImageElement).src = HOTEL_FALLBACK_IMAGES[i % HOTEL_FALLBACK_IMAGES.length]; }}
              />

              <div className="p-2 flex flex-col flex-1 min-h-0">
                {/* Hotel name */}
                <div className="font-display text-xs font-semibold leading-snug line-clamp-2">
                  {opt.name}
                </div>

                {/* Area + rating, one line */}
                <div className="text-[9px] text-muted-foreground mt-0.5 truncate">
                  {opt.area || '—'}{opt.rating ? ` · ⭐ ${opt.rating}` : ''}
                </div>

                {/* Price at bottom */}
                <div className="mt-auto pt-1 border-t border-border/50">
                  <div className="font-display text-xs font-semibold tabular-nums">{opt.price ? fmtNGN(opt.price) : '—'}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
        {allHotelOptions.length === 0 && (
          <p className="text-xs text-muted-foreground mt-3">
            No hotels came back for this destination. You can still confirm the trip —
            lodging just isn't priced in.
          </p>
        )}
        {allHotelOptions.length === 1 && (
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
            {/* AI-suggested date chips */}
            {initialPlan.date_options && initialPlan.date_options.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                <span className="self-center text-[10px] text-muted-foreground uppercase tracking-label shrink-0">AI picks:</span>
                {initialPlan.date_options.map(opt => {
                  const isoDate = parseDateOptionLabel(opt.label);
                  const isActive = isoDate && selectedDate === isoDate;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => { if (isoDate) setSelectedDate(isoDate); }}
                      className={`rounded-lg px-3 py-1.5 text-xs transition-all border ${
                        isActive
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-secondary/60 text-foreground hover:border-primary/50"
                      }`}
                    >
                      <span className="font-medium">{opt.label}</span>
                      <span className={`ml-1 text-[10px] ${isActive ? "opacity-75" : "opacity-50"}`}>· {opt.sub}</span>
                    </button>
                  );
                })}
              </div>
            )}
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
          className="group inline-flex items-center gap-2 rounded-lg bg-gradient-primary text-primary-foreground px-6 py-3.5 text-sm font-medium shadow-glow hover:scale-[1.02] active:scale-[0.98] transition-transform whitespace-nowrap w-full sm:w-auto justify-center"
        >
          Confirm & share with squad
          <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Clearance for the fixed add-a-place bar on phones */}
      <div className="lg:hidden h-24" aria-hidden="true" />
    </div>
  );
}


/* ─── step 4: confirm ────────────────────────────────────────────────────────── */
function ConfirmStep({ destination, tripId, squadSize, finalPlan, selectedDate, email, emailSent }: {
  destination: string; tripId: string; squadSize: number; finalPlan?: TripPlan | null; selectedDate?: string | null;
  email?: string; emailSent?: boolean;
}) {
  const [linkCopied, setLinkCopied] = useState(false);
  const planUrl = `${window.location.origin}/plan/${tripId}`;
  const tripDateLabel = selectedDate
    ? new Date(selectedDate + "T12:00:00").toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })
    : null;
  const waShareText = encodeURIComponent(
    `🛫 I've planned our squad trip to ${destination}! Check it out and say you're in:\n${planUrl}`
  );

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
          Share the plan with your {destination} squad and we will collect everyone's share.
        </p>
      </div>

      {/* Plan recap */}
      {finalPlan && (
        <div className="rounded-2xl bg-secondary/40 ring-hairline p-5 mb-6">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">What you confirmed</div>
          <div className="space-y-2 text-sm">
            {/* A trip can be confirmed without a hotel — day trips have none,
                and the scrape can come back empty. Don't crash the summary. */}
            {finalPlan.hotel && (
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Hotel</span>
                <span className="font-medium text-right truncate max-w-[60%]">{finalPlan.hotel.name}</span>
              </div>
            )}
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Transport</span>
              <span className="font-medium">{finalPlan.transport?.operator} · {finalPlan.transport?.type}</span>
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
              <span className="font-display font-semibold text-foreground">{fmtNGN(finalPlan.cost_breakdown.per_person * squadSize)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Share with squad — primary CTA */}
      <div className="rounded-2xl bg-primary/10 ring-1 ring-primary/20 p-5 mb-6">
        <div className="text-xs font-semibold uppercase tracking-wider text-foreground mb-1">Share with your squad</div>
        <p className="text-sm text-muted-foreground mb-4">
          Send this link to your group — they can view the full plan and say "I'm in!"
        </p>
        <div className="font-mono text-xs text-foreground/60 bg-secondary/60 rounded-xl px-3 py-2 mb-3 truncate select-all">
          {planUrl}
        </div>
        <div className="flex gap-2">
          <button
            onClick={copyLink}
            className={`flex-1 rounded-lg py-2.5 text-sm font-medium ring-hairline transition ${
              linkCopied ? "bg-google-green/10 text-google-green ring-google-green/20" : "bg-card text-foreground hover:bg-secondary"
            }`}
          >
            {linkCopied ? "✓ Copied!" : "Copy link"}
          </button>
          <a
            href={`https://wa.me/?text=${waShareText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 rounded-lg py-2.5 text-sm font-medium text-center bg-whatsapp text-white hover:opacity-90 transition"
          >
            Share on WhatsApp
          </a>
        </div>
      </div>

      {/* Step-by-step */}
      <div className="mb-6">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">How to share</div>
        <ol className="space-y-3">
          {[
            { step: "Share the plan link above with your squad — everyone taps it to view the itinerary and say they're in.", tag: "Works now" },
            { step: "Each person gets their own payment link for their share, so nobody has to front the money.", tag: "Works now" },
            { step: "We email whoever hasn't paid yet, on a schedule, until the trip is fully funded.", tag: null },
          ].map(({ step, tag }, i) => (
            <li key={i} className="flex items-start gap-3 text-sm">
              <span className="w-6 h-6 rounded-full bg-primary/15 text-foreground grid place-items-center text-xs font-semibold shrink-0 mt-0.5">{i + 1}</span>
              <span className="text-foreground/90 leading-relaxed">
                {step}
                {tag && <span className={`ml-2 text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${tag === "Works now" ? "bg-google-green/15 text-google-green" : "bg-secondary text-muted-foreground"}`}>{tag}</span>}
              </span>
            </li>
          ))}
        </ol>
      </div>

      {emailSent && email && (
        <div className="rounded-2xl bg-primary/10 ring-1 ring-primary/20 p-4 text-sm text-foreground/90 mb-6">
          <span className="font-semibold">Sent to {email}.</span>{" "}
          We've emailed you this link too, so you can always find your way back to it.
        </div>
      )}

      <Link to="/" className="inline-flex items-center justify-center gap-2 rounded-lg bg-card ring-hairline px-5 py-3 text-sm font-medium text-foreground hover:bg-secondary transition-colors w-full sm:w-auto">
        Back to home
      </Link>
    </Card>
  );
}

/* ─── lock-in banner ─────────────────────────────────────────────────────────── */
function LockBanner({ tripId }: { tripId: string }) {
  const { user, getIdToken } = useAuth();
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'linking' | 'linked' | 'error'>('idle');
  const [email, setEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Auto-link when user is already signed in (or just returned from magic link).
  useEffect(() => {
    if (!user || state !== 'idle') return;
    linkPlan();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function linkPlan() {
    setState('linking');
    try {
      const token = getIdToken();
      if (!token) throw new Error('No token');
      await api.linkPlan(tripId, token);
      setState('linked');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save plan.');
      setState('error');
    }
  }

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes('@')) return;
    setState('sending');
    try {
      const res = await api.sendMagicLink({
        email,
        tripId,
        redirect: window.location.href,
      });
      if (res.preview) setPreviewUrl(res.preview); // Resend not configured — show link directly
      setState('sent');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to send link.');
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
        <Link to="/my-plans" className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-foreground text-background hover:opacity-80 transition">
          View all →
        </Link>
      </Card>
    );
  }

  if (state === 'sent') {
    return (
      <Card className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-full bg-primary/10 text-foreground grid place-items-center text-xl shrink-0">📬</div>
        <div className="flex-1 min-w-0">
          <div className="font-display font-semibold text-sm">Check your email</div>
          <p className="text-xs text-muted-foreground mt-0.5">
            We sent a sign-in link to <span className="font-medium text-foreground">{email}</span>.
            Click it to save your plan. Link expires in 15 minutes.
          </p>
          {previewUrl && (
            <a href={previewUrl} className="mt-2 block text-xs text-foreground underline underline-offset-2 break-all">
              (Email not configured — click here to sign in directly)
            </a>
          )}
        </div>
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
        <button onClick={() => setState('idle')} className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-foreground text-background hover:opacity-80 transition">
          Retry
        </button>
      </Card>
    );
  }

  if (user || state === 'linking') {
    return (
      <Card className="flex items-center gap-4">
        <div className="w-6 h-6 rounded-full border-2 border-foreground border-t-transparent animate-spin shrink-0" />
        <div className="text-sm text-muted-foreground">Saving plan to your account…</div>
      </Card>
    );
  }

  // Default: not signed in → magic link email form
  return (
    <Card>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">🔐</span>
        <div className="font-display font-semibold">Save your plan</div>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Enter your email and we'll send you a sign-in link. No password, no Google — just click the link.
      </p>
      <form onSubmit={sendLink} className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          className="flex-1 min-w-0 rounded-lg px-4 py-2.5 text-sm bg-secondary ring-hairline focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <button
          type="submit"
          disabled={state === 'sending'}
          className="shrink-0 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium bg-foreground text-background hover:opacity-80 active:scale-95 transition disabled:opacity-60"
        >
          {state === 'sending'
            ? <><span className="w-3.5 h-3.5 rounded-full border-2 border-background/40 border-t-background animate-spin" />Sending…</>
            : 'Send link ✉️'}
        </button>
      </form>
    </Card>
  );
}

/* ─── page shell ─────────────────────────────────────────────────────────────── */
type Step = "intake" | "generating" | "plan" | "confirm";

export default function Start() {
  const { user, signOut } = useAuth();
  const [step, setStep] = useState<Step>("intake");
  const [intake, setIntake] = useState<IntakeData | null>(null);
  const [email, setEmail] = useState<string>("");
  const [tripId, setTripId] = useState<string | null>(null);
  const [plan, setPlan] = useState<TripPlan | null>(null);
  const [scraped, setScraped] = useState<ScrapedData | null>(null);
  const [busLoading, setBusLoading] = useState(false);
  const [confirmedPlan, setConfirmedPlan] = useState<TripPlan | null>(null);
  const [confirmData, setConfirmData] = useState<{ destination: string; squadSize: number; emailSent: boolean; selectedDate?: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Plan your trip · Karije";
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
  // First checks the trip's current status so we don't show the generating spinner
  // for trips that are already confirmed (e.g. returning from the magic-link email).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const jobId = params.get("job");
    if (!jobId) return;
    setTripId(jobId);

    api.pollPlan(jobId).then((result) => {
      if (result.status === "awaiting_group" && result.confirmed && result.plan) {
        // Already confirmed — restore confirm step directly, no spinner
        setConfirmedPlan(result.plan);
        setConfirmData({
          destination:  result.destination  ?? "",
          squadSize:    result.squadSize    ?? 1,
          emailSent:    false,
          selectedDate: result.selectedDate ?? null,
        });
        setStep("confirm");
      } else if (result.status === "plan_review" && result.plan) {
        // Plan ready but not yet confirmed
        if (result.intake) setIntake(result.intake);
        setPlan(result.plan);
        setScraped(result.scraped ?? null);
        setStep("plan");
      } else if (result.status === "generating") {
        // Still generating — start the polling loop
        setStep("generating");
        schedulePoll(jobId, null);
      } else if (result.status === "error") {
        setError(result.error ?? "Plan generation failed. Please try again.");
        setStep("intake");
      }
    }).catch(() => {
      // Can't reach backend — fall back to polling loop
      setStep("generating");
      schedulePoll(jobId, null);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Plan creation ─────────────────────────────────────────────────────────────
  async function handleIntakeSubmit(data: IntakeData, organisersEmail: string) {
    setIntake(data);
    setEmail(organisersEmail);
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

  async function handleConfirm(finalPlan: TripPlan, selectedDate?: string) {
    if (!tripId) return;
    setError(null);
    try {
      const result = await api.confirmPlan(tripId, finalPlan, email || undefined, selectedDate);
      setConfirmedPlan(finalPlan);
      setConfirmData({
        destination: result.destination,
        squadSize: result.squadSize,
        emailSent: result.emailSent,
        selectedDate: result.selectedDate,
      });
      setStep("confirm");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong confirming the plan.");
    }
  }

  /**
   * How wide the page is allowed to get, by step.
   *
   * Only the plan step wants the room. It already lays the itinerary out beside
   * the venue library at lg, but a 48rem shell squeezed that into roughly 380px
   * of itinerary next to a 340px library — the responsive layout was there, the
   * width to use it wasn't. The other steps are a form, a progress screen and a
   * share screen; those read worse stretched across a monitor, so they stay put.
   */
  const shellWidth = step === "plan" ? "max-w-3xl lg:max-w-7xl" : "max-w-3xl";

  return (
    <main className="min-h-screen bg-hero-mesh">
      <div className="pointer-events-none fixed -top-32 -left-32 w-[28rem] h-[28rem] rounded-full bg-primary/15 blur-3xl animate-float" />
      <div className="pointer-events-none fixed top-40 -right-32 w-[28rem] h-[28rem] rounded-full bg-accent/15 blur-3xl animate-float" style={{ animationDelay: "2s" }} />

      {/* Header */}
      <header className="relative pt-8 pb-6">
        <div className={`mx-auto ${shellWidth} px-6 flex items-center justify-between`}>
          <KarijeLogo />
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
                  {user.picture ? (
                    <img src={user.picture} alt="" className="w-6 h-6 rounded-full ring-hairline" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="w-6 h-6 rounded-full bg-primary/15 grid place-items-center text-foreground text-[10px] font-semibold">
                      {(user.name || user.email || "U")[0].toUpperCase()}
                    </span>
                  )}
                  <span className="hidden sm:inline">My Plans</span>
                </Link>
                <button onClick={() => signOut()} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  Sign out
                </button>
              </div>
            ) : step === "intake" ? (
              <Link
                to="/my-plans"
                className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign in
              </Link>
            ) : null}
          </div>
        </div>
      </header>

      <div className={`relative mx-auto ${shellWidth} px-6 pb-24`}>
        {/* Progress pills */}
        {/* Signed-in banner — shown on intake step only when user has an account */}
        {step === "intake" && user && (
          <div className="mb-5 rounded-2xl bg-primary/8 ring-1 ring-primary/15 px-5 py-3 flex items-center justify-between gap-4">
            <p className="text-sm text-foreground/80">
              Signed in as <span className="font-medium text-foreground">{user.email}</span>
            </p>
            <Link
              to="/my-plans"
              className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-foreground text-background hover:opacity-80 transition whitespace-nowrap"
            >
              My Plans →
            </Link>
          </div>
        )}

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
                  handleIntakeSubmit(intake, email);
                }}
                className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-destructive text-white hover:opacity-80 active:scale-95 transition whitespace-nowrap"
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
          <ConfirmStep tripId={tripId!} destination={confirmData.destination} squadSize={confirmData.squadSize} emailSent={confirmData.emailSent} email={email} finalPlan={confirmedPlan} selectedDate={confirmData.selectedDate} />
        )}
      </div>
    </main>
  );
}
