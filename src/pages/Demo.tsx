import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { WaitlistForm } from "@/components/WaitlistForm";
import { api, type GeminiPlan, type ScrapedData } from "@/lib/api";

/* ---------------- types ---------------- */
type Intake = {
  origin: string;
  destination: string;
  vibe: string;
  budget: number;
  days: number;
  squadSize: number;
  accommodationType: string;
  dateFlexibility: string;
  dealbreakers: string;
  transport: string;
  extras: string[];
  operatorId?: string;
  seats?: number;
};

type Hotel = { id: string; name: string; area: string; pricePerNight: number; rating: number; perks: string[] };
type DateOption = { id: string; label: string; sub: string };
type Member = { name: string; emoji: string; paid: boolean; share: number };
type Operator = { id: string; brand: string; logo: string; class: string; depart: string; arrive: string; duration: string; pricePerSeat: number; rating: number; note?: string };
type ItineraryItem = { id: string; time: string; title: string; cost: number };
type Suggestion = { id: string; title: string; tag: string; cost: number; emoji: string; blurb: string };

/* ---------------- mock generator ---------------- */
const VIBES = ["Chill & scenic", "Nightlife", "Foodie tour", "Adventure", "Cultural"];
const EXTRAS_ALL = ["City tour", "Beach day", "Live music", "Local food crawl", "Spa"];
const ACCOMMODATION_TYPES = ["Hotel", "Shortlet", "Budget guesthouse", "Surprise me"];
const DATE_FLEXIBILITY_OPTIONS = ["Flexible", "I have specific dates"];

const HOTELS: Hotel[] = [
  { id: "h1", name: "Kakanfo Inn & Conference Centre", area: "Joyce B Road", pricePerNight: 32000, rating: 4.4, perks: ["Free breakfast", "Pool", "Wi-Fi"] },
  { id: "h2", name: "Premier Hotel Ibadan", area: "Mokola Hill", pricePerNight: 48000, rating: 4.6, perks: ["Hilltop view", "Restaurant", "Gym"] },
  { id: "h3", name: "Golden Tulip Festac", area: "Ring Road", pricePerNight: 28000, rating: 4.2, perks: ["Walk to bars", "Wi-Fi", "Parking"] },
];

const DATE_OPTIONS: DateOption[] = [
  { id: "d1", label: "Aug 9 – 11", sub: "Fri → Sun" },
  { id: "d2", label: "Aug 16 – 18", sub: "Fri → Sun" },
  { id: "d3", label: "Aug 23 – 25", sub: "Fri → Sun" },
];

const SQUAD_NAMES = ["Tunde", "Ada", "Kemi", "Bisi", "Femi", "Zara", "Chinedu", "Yemi", "Tola", "Amaka", "Kunle", "Lola"];
const EMOJIS = ["🦁", "🌶️", "🎧", "🍍", "🚀", "🌊", "🎬", "⚡", "🎨", "🍓", "🪩", "🛹"];

const BUS_OPERATORS: Operator[] = [
  { id: "gigm", brand: "GIGM", logo: "🟧", class: "Executive · Jibowu → Iwo Rd", depart: "07:00", arrive: "09:30", duration: "2h 30m", pricePerSeat: 8500, rating: 4.6, note: "AC · USB ports · WiFi" },
  { id: "guo", brand: "GUO Transport", logo: "🟦", class: "Standard · Jibowu → Challenge", depart: "06:30", arrive: "09:15", duration: "2h 45m", pricePerSeat: 7000, rating: 4.3, note: "AC · Most frequent" },
  { id: "abc", brand: "ABC Transport", logo: "🟥", class: "Luxury Coach · Amuwo → Iwo Rd", depart: "08:00", arrive: "10:45", duration: "2h 45m", pricePerSeat: 9500, rating: 4.7, note: "Reclining seats · Snacks" },
  { id: "chisco", brand: "Chisco", logo: "🟨", class: "Standard · Jibowu", depart: "07:30", arrive: "10:30", duration: "3h", pricePerSeat: 6500, rating: 4.0 },
];

const FLIGHT_OPERATORS: Operator[] = [
  { id: "air-peace", brand: "Air Peace", logo: "✈️", class: "Economy · LOS → IBA", depart: "07:25", arrive: "08:10", duration: "45m", pricePerSeat: 78000, rating: 4.4, note: "1 carry-on · 15kg checked" },
  { id: "ibom", brand: "Ibom Air", logo: "🛫", class: "Economy · LOS → IBA", depart: "10:50", arrive: "11:35", duration: "45m", pricePerSeat: 92000, rating: 4.7, note: "On-time leader" },
  { id: "green-africa", brand: "Green Africa", logo: "🟢", class: "Saver · LOS → IBA", depart: "14:15", arrive: "15:05", duration: "50m", pricePerSeat: 64000, rating: 4.1, note: "Cheapest · No bag included" },
  { id: "emirates", brand: "Emirates (connect)", logo: "🔴", class: "Business connect · LOS → DXB → IBA", depart: "22:10", arrive: "+1d 18:30", duration: "20h", pricePerSeat: 480000, rating: 4.9, note: "For the lavish squad 💎" },
];

const PUBLIC_OPERATORS: Operator[] = [
  { id: "danfo", brand: "Danfo + Keke combo", logo: "🚐", class: "Jibowu → Iwo Rd park → Keke", depart: "Anytime", arrive: "~3h later", duration: "3h", pricePerSeat: 4500, rating: 3.6, note: "Cheapest · Less comfy" },
  { id: "shared-cab", brand: "Shared Sienna", logo: "🚙", class: "Park-to-park share (4-6 pax)", depart: "When full", arrive: "~2h 30m", duration: "2h 30m", pricePerSeat: 6000, rating: 4.0, note: "Faster than buses" },
];

const operatorsFor = (transport: string): Operator[] =>
  transport === "Flights" ? FLIGHT_OPERATORS : transport === "Public transport" ? PUBLIC_OPERATORS : BUS_OPERATORS;

const fmtNGN = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n);

function buildPlan(intake: Intake, extraItineraryCost = 0) {
  const ops = operatorsFor(intake.transport);
  const op = ops.find((o) => o.id === intake.operatorId) || ops[0];
  const seats = intake.seats ?? intake.squadSize;
  const transport = op.pricePerSeat;
  const transportTotal = transport * seats;
  const hotel = HOTELS[1]; // recommended
  const lodgingTotal = hotel.pricePerNight * intake.days * Math.ceil(intake.squadSize / 2);
  const food = 6500 * intake.days * intake.squadSize;
  const activities = 9000 * intake.squadSize + extraItineraryCost;
  const buffer = Math.round((transportTotal + lodgingTotal + food + activities) * 0.07);
  const total = transportTotal + lodgingTotal + food + activities + buffer;
  const perPerson = Math.round(total / intake.squadSize);
  return { transport, transportTotal, hotel, lodgingTotal, food, activities, buffer, total, perPerson, operator: op, seats };
}

/* ---------------- shared UI ---------------- */
const Section = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-3xl bg-card ring-hairline shadow-card p-4 md:p-7 animate-rise overflow-hidden">{children}</div>
);

const StepHeader = ({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) => (
  <div className="mb-5">
    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</span>
    <h2 className="font-display text-xl md:text-3xl font-semibold tracking-tight mt-1.5 leading-[1.1] text-gradient">{title}</h2>
    {sub && <p className="mt-1.5 text-xs md:text-sm text-muted-foreground max-w-xl">{sub}</p>}
  </div>
);

const PrimaryBtn = ({ children, onClick, disabled, fullWidth }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; fullWidth?: boolean }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`group inline-flex items-center gap-1.5 rounded-full bg-gradient-primary text-primary-foreground px-4 py-2 text-xs font-medium shadow-glow hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-50 disabled:hover:scale-100${fullWidth ? " w-full justify-center sm:w-auto" : ""}`}
  >
    {children}
    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7" /></svg>
  </button>
);

const GhostBtn = ({ children, onClick, fullWidth }: { children: React.ReactNode; onClick?: () => void; fullWidth?: boolean }) => (
  <button onClick={onClick} className={`inline-flex items-center gap-1.5 rounded-full bg-card ring-hairline px-3.5 py-2 text-xs font-medium text-foreground hover:bg-secondary transition-colors${fullWidth ? " w-full justify-center sm:w-auto" : ""}`}>
    {children}
  </button>
);

const BackBtn = ({ onClick }: { onClick: () => void }) => (
  <button onClick={onClick} type="button" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1 shrink-0">
    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
    Back
  </button>
);

/* ---------------- step 1: WhatsApp group + bot joins ---------------- */
type ChatMsg = {
  from: "user" | "bot" | "system";
  who?: string;
  text: string;
  time: string;
  highlight?: boolean;
};

const INITIAL_CHAT: ChatMsg[] = [
  { from: "user", who: "Ada 🌶️", text: "Squad, Ibadan trip in August — we still doing this or nah 😅", time: "10:38" },
  { from: "user", who: "Kemi 🎧", text: "I'm in! But who's organising? Last time was chaos 💀", time: "10:39" },
  { from: "user", who: "Femi 🚀", text: "Not me again abeg. Spreadsheet almost killed me last December 🥲", time: "10:40" },
  { from: "user", who: "Tunde 🦁", text: "I sorted it. Been setting it up quietly — let me add the bot, plan is already ready 👀", time: "10:41" },
];

const BOT_SEQUENCE: ChatMsg[] = [
  { from: "system", text: "Tunde 🦁 added MySquadGo Bot to the group", time: "10:41" },
  { from: "bot", text: "👋 Hey Ibadan Squad! MySquadGo here.\nTunde's been planning something... 👀", time: "10:41" },
  { from: "bot", text: "Your Ibadan trip is ready. Here's what we've got:\n📍 Lagos → Ibadan · 2 days · 8 squad\n🏨 Premier Hotel Ibadan · ₦48k/night\n💰 Est. ₦18,500/person all-in\n\nTwo quick questions for the squad before we lock it 👇", time: "10:42", highlight: true },
];

function WhatsAppView({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const [messages, setMessages] = useState<ChatMsg[]>(INITIAL_CHAT);
  const [typing, setTyping] = useState(false);
  const [step, setStep] = useState(0); // 0 = before add, 1..3 = bot sequence, 4 = ready

  useEffect(() => {
    if (step >= BOT_SEQUENCE.length) return;
    const isBot = BOT_SEQUENCE[step].from === "bot";
    const delay = step === 0 ? 1600 : isBot ? 1400 : 800;
    const typingDelay = isBot ? 700 : 0;

    const t1 = setTimeout(() => isBot && setTyping(true), 200);
    const t2 = setTimeout(() => {
      setTyping(false);
      setMessages((m) => [...m, BOT_SEQUENCE[step]]);
      setStep((s) => s + 1);
    }, delay + typingDelay);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [step]);

  return (
    <Section>
      <StepHeader
        eyebrow="Step 1 of 7 · WhatsApp"
        title="It starts where your squad already chats."
        sub="Watch what happens after Tunde sorts the trip privately and adds the bot to the group."
      />

      <div className="grid lg:grid-cols-[1fr,auto] gap-8 items-start">
        <div className="relative mx-auto w-full max-w-md">
          <div className="absolute -inset-6 bg-whatsapp/10 rounded-[2.5rem] blur-2xl" />
          <div className="relative rounded-[2rem] bg-card ring-hairline shadow-card overflow-hidden">
            {/* chat header */}
            <div className="flex items-center gap-3 p-4 border-b border-border bg-secondary/50">
              <div className="w-10 h-10 rounded-full bg-gradient-primary grid place-items-center text-primary-foreground font-display font-semibold">IB</div>
              <div className="flex-1">
                <div className="font-display font-semibold text-sm">Ibadan Squad 🚌</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-whatsapp" />
                  {step >= 1 ? "12 members · MySquadGo Bot" : "11 members"}
                </div>
              </div>
            </div>

            {/* messages */}
            <div className="p-4 space-y-2.5 max-h-[28rem] overflow-y-auto bg-[hsl(38_33%_99%)]">
              {messages.map((m, i) => {
                if (m.from === "system") {
                  return (
                    <div key={i} className="flex justify-center">
                      <div className="text-[11px] text-muted-foreground bg-secondary/80 rounded-full px-3 py-1">
                        {m.text}
                      </div>
                    </div>
                  );
                }
                const isUser = m.from === "user";
                return (
                  <div key={i} className={`flex ${isUser ? "justify-end" : "justify-start"} animate-rise`}>
                    <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-line leading-snug ${
                      isUser
                        ? "bg-whatsapp/15 text-foreground rounded-br-sm"
                        : m.highlight
                        ? "bg-gradient-primary text-primary-foreground rounded-bl-sm shadow-glow"
                        : "bg-secondary text-foreground rounded-bl-sm"
                    }`}>
                      {m.who && <div className="text-[11px] font-semibold text-google-blue mb-0.5">{m.who}</div>}
                      {!m.who && m.from === "bot" && <div className="text-[11px] font-semibold text-primary mb-0.5 flex items-center gap-1">🤖 MySquadGo Bot</div>}
                      {m.text}
                      <div className={`text-[10px] mt-1 ${isUser || m.highlight ? "opacity-70" : "text-muted-foreground"}`}>{m.time}</div>
                    </div>
                  </div>
                );
              })}

              {typing && (
                <div className="flex justify-start">
                  <div className="bg-secondary rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-pulse" />
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-pulse" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-pulse" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}
            </div>

            {/* input bar */}
            <div className="p-3 border-t border-border bg-card flex items-center gap-2">
              <div className="flex-1 rounded-full bg-secondary px-4 py-2 text-sm text-muted-foreground">Message</div>
              <div className="w-9 h-9 rounded-full bg-whatsapp grid place-items-center text-primary-foreground">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2z" /></svg>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:max-w-xs space-y-4">
          <div className="rounded-2xl bg-secondary/60 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary mb-2">What just happened</div>
            <ul className="space-y-2.5 text-sm text-foreground/90">
              <li className="flex gap-2"><span className="text-primary">①</span> Tunde planned the trip privately in 2 minutes</li>
              <li className="flex gap-2"><span className="text-primary">②</span> He added <strong>MySquadGo Bot</strong> to the squad group</li>
              <li className="flex gap-2"><span className="text-primary">③</span> Bot's first message is the plan reveal — not a form</li>
              <li className="flex gap-2"><span className="text-primary">④</span> Squad votes on dates + hotel, bot collects contributions</li>
            </ul>
          </div>
          <div className="rounded-2xl bg-card ring-hairline p-4 text-xs text-muted-foreground">
            <strong className="text-foreground">No app to download.</strong> No new logins. The bot lives in the group your squad already uses every day.
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <BackBtn onClick={onBack} />
        <PrimaryBtn fullWidth onClick={onNext} disabled={step < BOT_SEQUENCE.length}>
          {step < BOT_SEQUENCE.length ? "Bot is talking…" : "Fill in the trip details (you're Tunde)"}
        </PrimaryBtn>
      </div>
    </Section>
  );
}

/* ---------------- step 2: intake ---------------- */
const STEP1_QUESTIONS = 9;
function IntakeForm({ onSubmit, onBack }: { onSubmit: (i: Intake) => void; onBack: () => void }) {
  const [intake, setIntake] = useState<Intake>({
    origin: "Lagos",
    destination: "Ibadan",
    vibe: "Chill & scenic",
    budget: 25000,
    days: 2,
    squadSize: 8,
    accommodationType: "Hotel",
    dateFlexibility: "Flexible",
    dealbreakers: "",
    transport: "Charter bus",
    extras: ["City tour", "Local food crawl"],
    operatorId: "gigm",
  });

  const set = <K extends keyof Intake>(k: K, v: Intake[K]) => setIntake((p) => ({ ...p, [k]: v }));

  const Field = ({ label, children, n }: { label: string; children: React.ReactNode; n: number }) => (
    <label className="block">
      <div className="flex items-baseline gap-2 mb-2">
        <span className="font-display text-xs font-semibold tabular-nums text-muted-foreground">{String(n).padStart(2, "0")}</span>
        <span className="text-sm font-medium">{label}</span>
      </div>
      {children}
    </label>
  );

  const inputCls = "w-full rounded-xl bg-secondary/60 ring-hairline px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition";
  const chipCls = (active: boolean) =>
    `px-3 py-1.5 rounded-full text-xs font-medium ring-hairline transition ${active ? "bg-foreground text-background" : "bg-card text-foreground hover:bg-secondary"}`;

  return (
    <Section>
      <StepHeader eyebrow="Step 2 of 7 · Intake" title="Tell us about the trip." sub="Answer as Tunde — the organiser. These are the details he filled in privately before adding the bot to the group." />
      <div className="grid md:grid-cols-2 gap-5">
        <Field n={1} label="Where from?"><input className={inputCls} value={intake.origin} onChange={(e) => set("origin", e.target.value)} /></Field>
        <Field n={2} label="Where to?"><input className={inputCls} value={intake.destination} onChange={(e) => set("destination", e.target.value)} /></Field>
        <Field n={3} label="Squad vibe">
          <div className="flex flex-wrap gap-2">{VIBES.map((v) => <button key={v} type="button" onClick={() => set("vibe", v)} className={chipCls(intake.vibe === v)}>{v}</button>)}</div>
        </Field>
        <Field n={4} label={`Budget per person · ${fmtNGN(intake.budget)}`}>
          <input type="range" min={10000} max={150000} step={1000} value={intake.budget} onChange={(e) => set("budget", +e.target.value)} className="w-full accent-primary" />
        </Field>
        <Field n={5} label={`How many days? · ${intake.days}`}>
          <input type="range" min={1} max={7} value={intake.days} onChange={(e) => set("days", +e.target.value)} className="w-full accent-primary" />
        </Field>
        <Field n={6} label={`Squad size · ${intake.squadSize}`}>
          <input type="range" min={2} max={20} value={intake.squadSize} onChange={(e) => set("squadSize", +e.target.value)} className="w-full accent-primary" />
        </Field>
        <Field n={7} label="Accommodation type">
          <div className="flex flex-wrap gap-2">{ACCOMMODATION_TYPES.map((t) => <button key={t} type="button" onClick={() => set("accommodationType", t)} className={chipCls(intake.accommodationType === t)}>{t}</button>)}</div>
        </Field>
        <Field n={8} label="Specific dates or flexible?">
          <div className="flex flex-wrap gap-2">{DATE_FLEXIBILITY_OPTIONS.map((d) => <button key={d} type="button" onClick={() => set("dateFlexibility", d)} className={chipCls(intake.dateFlexibility === d)}>{d}</button>)}</div>
        </Field>
        <div className="md:col-span-2">
          <Field n={9} label="Any dealbreakers?">
            <input className={inputCls} placeholder="e.g. must have AC / halal food / no shared rooms" value={intake.dealbreakers} onChange={(e) => set("dealbreakers", e.target.value)} />
          </Field>
        </div>

      </div>
      <div className="mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <BackBtn onClick={onBack} />
        <PrimaryBtn fullWidth onClick={() => onSubmit({ ...intake, seats: intake.seats ?? intake.squadSize })}>Generate plan with AI</PrimaryBtn>
      </div>
    </Section>
  );
}

/* ---------------- step 3: AI plan ---------------- */
const SUGGESTIONS_BY_DAY: Record<number, Suggestion[]> = {
  0: [
    { id: "s-cocoa2", title: "Bower's Tower sunset", tag: "Viewpoint", cost: 1500, emoji: "🌇", blurb: "360° view of Ibadan rooftops, best at golden hour." },
    { id: "s-iya", title: "Iya Oyo amala detour", tag: "Foodie", cost: 2500, emoji: "🍲", blurb: "Legendary spot — locals queue out the door." },
    { id: "s-mall", title: "Ventura Mall hangout", tag: "Chill", cost: 3500, emoji: "🛍️", blurb: "Cinema, food court, AC reset before night out." },
  ],
  1: [
    { id: "s-iitm", title: "IITA Forest Reserve walk", tag: "Adventure", cost: 4000, emoji: "🌳", blurb: "Quiet trails, monkey sightings, perfect group photos." },
    { id: "s-trans", title: "Trans Wonderland park", tag: "Family fun", cost: 3500, emoji: "🎢", blurb: "Rides + go-karts, a chaotic squad favourite." },
    { id: "s-jazz", title: "Bay Lounge jazz night", tag: "Nightlife", cost: 5500, emoji: "🎷", blurb: "Live band Fridays, ₦5k cover includes one drink." },
  ],
  2: [
    { id: "s-mapo", title: "Mapo Hall heritage tour", tag: "Cultural", cost: 2000, emoji: "🏛️", blurb: "Colonial architecture + city history in 90 mins." },
    { id: "s-bodija", title: "Bodija market run", tag: "Souvenirs", cost: 4000, emoji: "🧺", blurb: "Adire fabric, palm oil, dried herbs — bargain hard." },
  ],
};
const fallbackSuggestions: Suggestion[] = SUGGESTIONS_BY_DAY[1];

const MAPS_PLACES: Suggestion[] = [
  { id: "m-zoo", title: "UI Zoological Garden", tag: "Family", cost: 1500, emoji: "🦒", blurb: "Iconic UI campus zoo — easy 1-hour stop." },
  { id: "m-trans", title: "Trans Amusement Park", tag: "Fun", cost: 3000, emoji: "🎡", blurb: "Rides + games, great for evening hangs." },
  { id: "m-dome", title: "Liberty Stadium dome", tag: "Sports", cost: 1000, emoji: "🏟️", blurb: "Walk the historic stadium grounds." },
  { id: "m-bower", title: "Bower's Memorial Tower", tag: "Viewpoint", cost: 1500, emoji: "🗼", blurb: "Climb for a 360° view of the 7 hills." },
  { id: "m-irefin", title: "Irefin Palace", tag: "Heritage", cost: 2000, emoji: "🏯", blurb: "Centuries-old royal compound, guided walk." },
  { id: "m-shrine", title: "Mapo Hill shrine", tag: "Cultural", cost: 1200, emoji: "🕯️", blurb: "Sacred site beside Mapo Hall — quick visit." },
];

function PlanView({ intake, onNext, onBack }: { intake: Intake; onNext: (plan: GeminiPlan) => void; onBack: () => void }) {
  const [phase, setPhase] = useState(0); // 0 = generating, 1 = done, 2 = error
  const phases = [
    "Checking live flight prices…",
    "Scraping hotel deals from Google Travel…",
    "Searching Booking.com for availability…",
    "Building your itinerary with Gemini AI…",
    "Calculating costs & squad split…",
  ];
  const [pIdx, setPIdx] = useState(0);
  const [realPlan, setRealPlan] = useState<GeminiPlan | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  // editable itinerary state — starts empty, populated when realPlan arrives
  const [days, setDays] = useState<{ day: number; title: string; items: ItineraryItem[] }[]>([]);
  const [openDay, setOpenDay] = useState<number | null>(0);
  const [seeMore, setSeeMore] = useState<Record<number, boolean>>({});
  const [mapsOpen, setMapsOpen] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const [recalcing, setRecalcing] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [scraped, setScraped] = useState<ScrapedData | null>(null);
  const [selectedHotelKey, setSelectedHotelKey] = useState<string>('ai');
  const [selectedFlightIdx, setSelectedFlightIdx] = useState<number | null>(null);

  const extraItineraryCost = useMemo(
    () => days.reduce((sum, d) => sum + d.items.reduce((s, it) => s + it.cost, 0), 0) * intake.squadSize,
    [days, intake.squadSize]
  );
  const fallbackPlan = useMemo(() => buildPlan(intake, extraItineraryCost), [intake, extraItineraryCost]);

  const allHotelOptions = useMemo(() => {
    type HotelOpt = { key: string; name: string; area: string; price: number | null; rating: number | null; source: string; badge?: string; perks: string[] };
    const opts: HotelOpt[] = [];
    if (realPlan?.hotel) {
      const h = realPlan.hotel;
      opts.push({ key: 'ai', name: h.name, area: h.area, price: h.price_per_night, rating: h.rating, source: 'Gemini AI', badge: 'AI Pick', perks: h.perks || [] });
    }
    (scraped?.gtHotels ?? []).forEach((h, i) => {
      if (!opts.find(o => o.name.toLowerCase() === h.name.toLowerCase()))
        opts.push({ key: `gt-${i}`, name: h.name, area: h.location || '', price: h.pricePerNight, rating: h.rating, source: 'Google Travel', perks: h.amenities.slice(0, 3) });
    });
    (scraped?.bHotels ?? []).forEach((h, i) => {
      if (!opts.find(o => o.name.toLowerCase() === h.name.toLowerCase()))
        opts.push({ key: `bk-${i}`, name: h.name, area: h.address?.split(',')[0] || '', price: h.pricePerNight, rating: h.rating ? +(h.rating / 2).toFixed(1) : null, source: 'Booking.com', perks: [] });
    });
    return opts;
  }, [realPlan, scraped]);

  const flightOffers = useMemo(() => scraped?.flights?.offers ?? [], [scraped]);

  const rentalOptions = useMemo(() => {
    if (!intake.accommodationType.toLowerCase().includes('shortlet')) return [];
    type RentalOpt = { key: string; name: string; details: string; price: number | null; source: string };
    const opts: RentalOpt[] = [];
    (scraped?.gtRentals ?? []).forEach((r, i) =>
      opts.push({ key: `gr-${i}`, name: r.name, details: [r.type, r.sleeps ? `sleeps ${r.sleeps}` : null, r.bedrooms ? `${r.bedrooms} bed` : null].filter(Boolean).join(' · '), price: r.pricePerNight, source: 'Google Travel' })
    );
    (scraped?.bApartments ?? []).forEach((r, i) =>
      opts.push({ key: `ba-${i}`, name: r.name, details: r.propertyType || 'Apartment', price: r.pricePerNight, source: 'Booking.com' })
    );
    return opts;
  }, [scraped, intake.accommodationType]);

  const buildFinalPlan = (): GeminiPlan => {
    const base = realPlan!;
    const selHotel = allHotelOptions.find(o => o.key === selectedHotelKey);
    const hotel = (selHotel && selHotel.key !== 'ai' && selHotel.price)
      ? { ...base.hotel, name: selHotel.name, area: selHotel.area, price_per_night: selHotel.price, rating: selHotel.rating ?? base.hotel.rating, perks: selHotel.perks }
      : base.hotel;
    const selFlight = selectedFlightIdx !== null ? flightOffers[selectedFlightIdx] : null;
    const transport = selFlight
      ? { ...base.transport, operator: selFlight.airline || 'Unknown', type: selFlight.stops === 0 ? 'Nonstop Flight' : 'Flight', price_per_person: selFlight.price }
      : base.transport;
    return { ...base, hotel, transport };
  };

  // Cycle through loading messages
  useEffect(() => {
    if (phase !== 0) return;
    const t = setInterval(() => setPIdx((i) => (i + 1) % phases.length), 900);
    return () => clearInterval(t);
  }, [phase]);

  // Fire the real API call (re-fires on retry)
  useEffect(() => {
    api.generatePlan({
      origin: intake.origin,
      destination: intake.destination,
      budget: intake.budget,
      days: intake.days,
      squadSize: intake.squadSize,
      accommodationType: intake.accommodationType,
      dateFlexibility: intake.dateFlexibility,
      dealbreakers: intake.dealbreakers,
    }).then((res) => {
      setRealPlan(res.plan);
      setScraped(res.scraped ?? null);
      setDays(
        res.plan.days.map((d, di) => ({
          day: d.day,
          title: d.title,
          items: d.activities.map((a, ai) => ({
            id: `real-d${di}-${ai}`,
            time: a.time,
            title: a.title,
            cost: a.cost_per_person,
          })),
        }))
      );
      setPhase(1);
    }).catch((err) => {
      console.error('[demo/plan]', err);
      setPlanError(err.message || 'Plan generation failed. Please try again.');
      setPhase(2);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryKey]);

  const addSuggestion = (dayIdx: number, s: Suggestion) => {
    setDays((ds) => ds.map((d, i) => i === dayIdx
      ? { ...d, items: [...d.items, { id: `${s.id}-${Date.now()}`, time: "—:—", title: s.title, cost: s.cost }] }
      : d));
    setDirty(true);
  };
  const removeItem = (dayIdx: number, itemId: string) => {
    setDays((ds) => ds.map((d, i) => i === dayIdx ? { ...d, items: d.items.filter(it => it.id !== itemId) } : d));
    setDirty(true);
  };
  const addCustom = (dayIdx: number) => {
    const title = window.prompt("What's the new stop?")?.trim();
    if (!title) return;
    const costStr = window.prompt("Estimated cost per person (₦)? Leave blank for 0.")?.trim();
    const cost = costStr ? Math.max(0, parseInt(costStr, 10) || 0) : 0;
    setDays((ds) => ds.map((d, i) => i === dayIdx
      ? { ...d, items: [...d.items, { id: `custom-${Date.now()}`, time: "—:—", title, cost }] }
      : d));
    setDirty(true);
  };
  const recalc = () => {
    setRecalcing(true);
    setTimeout(() => { setRecalcing(false); setDirty(false); }, 1100);
  };

  if (phase === 0) {
    return (
      <Section>
        <StepHeader eyebrow="Step 3 of 7 · AI Planning" title="Gemini is planning your trip…" sub="Pulling live hotel prices, flights, and venue data before generating your plan." />
        <div className="rounded-2xl bg-secondary/60 p-8 text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-primary grid place-items-center shadow-glow animate-float">
            <svg viewBox="0 0 24 24" className="w-7 h-7 text-primary-foreground" fill="currentColor"><path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4L12 2z" /></svg>
          </div>
          <div className="mt-5 font-display text-lg">{phases[pIdx]}</div>
          <div className="mt-1.5 text-xs text-muted-foreground">This takes ~15–30 seconds — we're fetching live data</div>
          <div className="mt-4 mx-auto max-w-md h-1.5 rounded-full bg-card overflow-hidden">
            <div className="h-full bg-gradient-primary animate-pulse" style={{ width: "100%" }} />
          </div>
        </div>
      </Section>
    );
  }

  if (phase === 2) {
    return (
      <Section>
        <StepHeader eyebrow="Step 3 of 7 · AI Planning" title="Something went wrong." sub={planError || "Could not generate plan. Check your backend is running and GEMINI_API_KEY is set."} />
        <div className="mt-6 flex gap-3">
          <BackBtn onClick={onBack} />
          <GhostBtn onClick={() => { setPhase(0); setPlanError(null); setRetryKey(k => k + 1); }}>Try again</GhostBtn>
        </div>
      </Section>
    );
  }

  return (
    <div className="space-y-4">
      <Section>
        <StepHeader eyebrow="Step 3 of 7 · AI Plan" title={`${intake.origin} → ${intake.destination}`} sub={`${intake.days} days · ${intake.squadSize} people · ${intake.vibe.toLowerCase()} vibe`} />

        <div className="grid grid-cols-3 gap-2 mb-6">
          {[
            { tag: "Transport", val: fmtNGN(realPlan?.cost_breakdown.transport_total ?? fallbackPlan.transportTotal), sub: `${realPlan?.transport.operator ?? fallbackPlan.operator.brand} · ${intake.squadSize}×`, color: "bg-google-blue/10 text-google-blue" },
            { tag: "Lodging", val: fmtNGN(realPlan?.cost_breakdown.lodging_total ?? fallbackPlan.lodgingTotal), sub: `${intake.days} nights`, color: "bg-google-purple/10 text-google-purple" },
            { tag: "Per person", val: fmtNGN(realPlan?.cost_breakdown.per_person ?? fallbackPlan.perPerson), sub: "All-in · live", color: "bg-primary-soft text-primary" },
          ].map((c) => (
            <div key={c.tag} className="rounded-xl bg-secondary/60 p-2.5 min-w-0">
              <span className={`inline-flex text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${c.color}`}>{c.tag}</span>
              <div className="mt-1.5 font-display text-sm md:text-lg font-semibold tabular-nums truncate">{c.val}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{c.sub}</div>
            </div>
          ))}
        </div>

        {/* Interactive route map */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Route map · {intake.origin} → {intake.destination}</div>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-google-green/15 text-google-green">Live</span>
          </div>
          <div className="relative rounded-2xl overflow-hidden ring-hairline shadow-card bg-card">
            {mapLoaded ? (
              <>
                <iframe
                  title="Trip route map"
                  className="w-full h-72 md:h-80 block"
                  loading="lazy"
                  src="https://www.openstreetmap.org/export/embed.html?bbox=2.95%2C6.30%2C4.10%2C7.55&layer=mapnik&marker=7.3775%2C3.9470"
                />
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute left-[18%] top-[68%] flex flex-col items-center">
                    <div className="px-2.5 py-1 rounded-full bg-foreground text-background text-[10px] font-semibold shadow-card whitespace-nowrap">🚌 {intake.origin}</div>
                    <div className="w-2 h-2 rounded-full bg-foreground mt-1 ring-4 ring-background" />
                  </div>
                  <div className="absolute left-[66%] top-[26%] flex flex-col items-center">
                    <div className="px-2.5 py-1 rounded-full bg-gradient-primary text-primary-foreground text-[10px] font-semibold shadow-glow whitespace-nowrap">📍 {intake.destination}</div>
                    <div className="w-2.5 h-2.5 rounded-full bg-primary mt-1 ring-4 ring-background animate-pulse" />
                  </div>
                  <div className="absolute left-[60%] top-[38%]">
                    <div className="px-2 py-0.5 rounded-full bg-card ring-hairline text-[10px] font-semibold text-foreground shadow-soft whitespace-nowrap">🏨 {(realPlan?.hotel.name ?? fallbackPlan.hotel.name).split(" ")[0]}</div>
                  </div>
                </div>
                <div className="absolute bottom-0 inset-x-0 flex flex-wrap items-center justify-between gap-2 bg-card/85 backdrop-blur px-4 py-2 text-xs">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-foreground" />Pickup</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary" />Destination</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-google-purple" />Hotel</span>
                  </div>
                  <div className="font-display font-semibold text-foreground">~128 km · 2h 10m drive</div>
                </div>
              </>
            ) : (
              <button
                onClick={() => setMapLoaded(true)}
                className="w-full h-72 md:h-80 flex flex-col items-center justify-center gap-3 bg-secondary/60 hover:bg-secondary transition-colors"
              >
                <div className="grid place-items-center w-12 h-12 rounded-full bg-card ring-hairline text-muted-foreground">
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="3 11 22 2 13 21 11 13 3 11" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-muted-foreground">Tap to load interactive map</span>
                <span className="text-xs text-muted-foreground/60">{intake.origin} → {intake.destination} · ~128 km</span>
              </button>
            )}
          </div>
          <div className="mt-2 text-[11px] text-muted-foreground">Drag the map to explore. Pins refresh as the squad votes on hotels.</div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <div className="flex items-baseline justify-between mb-3">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Itinerary <span className="text-google-blue normal-case tracking-normal ml-1">· editable</span></div>
              <div className="text-[11px] text-muted-foreground">Tap a day to expand</div>
            </div>
            <ol className="space-y-3">
              {days.map((d, di) => {
                const open = openDay === di;
                const dayCost = d.items.reduce((s, it) => s + it.cost, 0);
                const sugg = SUGGESTIONS_BY_DAY[di] ?? fallbackSuggestions;
                return (
                  <li key={d.day} className="rounded-2xl bg-card ring-hairline overflow-hidden">
                    <button onClick={() => setOpenDay(open ? null : di)} className="w-full text-left p-4 hover:bg-secondary/40 transition">
                      <div className="flex items-center gap-3">
                        <span className="font-display text-xs font-semibold text-muted-foreground">DAY {d.day}</span>
                        <span className="font-display text-base font-semibold flex-1 truncate">{d.title}</span>
                        <svg viewBox="0 0 24 24" className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 9l6 6 6-6" /></svg>
                      </div>
                    </button>

                    {open && (
                      <div className="border-t border-border p-4 space-y-4 animate-rise">
                        {/* editable items */}
                        <ul className="space-y-1.5">
                          {d.items.map((it) => (
                            <li key={it.id} className="flex items-center gap-2 text-sm group">
                              <span className="font-display text-[11px] font-semibold tabular-nums text-muted-foreground w-12 shrink-0">{it.time}</span>
                              <span className="flex-1 truncate">{it.title}</span>
                              <button onClick={() => removeItem(di, it.id)} className="opacity-40 hover:opacity-100 hover:text-destructive transition" aria-label="Remove">
                                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 6l12 12M6 18L18 6" /></svg>
                              </button>
                            </li>
                          ))}
                        </ul>
                        <button onClick={() => addCustom(di)} className="text-[11px] font-medium text-primary hover:underline">+ Add custom stop</button>

                        {/* AI suggestions w/ photo tiles — show 2 by default */}
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-google-pink mb-2 flex items-center gap-1.5">✨ Gemini suggests for Day {d.day}</div>
                          <div className="grid grid-cols-2 gap-2">
                            {(seeMore[di] ? sugg : sugg.slice(0, 2)).map((s) => (
                              <div key={s.id} className="rounded-xl bg-secondary/50 ring-hairline overflow-hidden flex flex-col min-w-0">
                                <div className="aspect-[16/9] grid place-items-center text-3xl bg-gradient-to-br from-google-pink/25 via-primary/20 to-google-blue/25">{s.emoji}</div>
                                <div className="p-2 flex flex-col gap-1 flex-1 min-w-0">
                                  <div className="flex items-baseline justify-between gap-1.5 min-w-0">
                                    <div className="font-display text-[11px] font-semibold truncate flex-1 min-w-0">{s.title}</div>
                                  </div>
                                  <div className="text-[10px] text-muted-foreground line-clamp-2">{s.blurb}</div>
                                  <button onClick={() => addSuggestion(di, s)} className="mt-1 self-start text-[10px] font-medium px-2 py-0.5 rounded-full bg-foreground text-background hover:opacity-90 transition">+ Add</button>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {sugg.length > 2 && (
                              <button onClick={() => setSeeMore((m) => ({ ...m, [di]: !m[di] }))} className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-secondary hover:bg-secondary/70 transition">
                                {seeMore[di] ? "Show less" : `See ${sugg.length - 2} more`}
                              </button>
                            )}
                            <button onClick={() => setMapsOpen(mapsOpen === di ? null : di)} className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-google-blue/15 text-google-blue hover:bg-google-blue/25 transition inline-flex items-center gap-1">
                              🗺️ Add from Maps
                            </button>
                          </div>

                          {mapsOpen === di && (
                            <div className="mt-3 rounded-xl ring-hairline bg-card p-2.5 animate-rise">
                              <div className="flex items-center justify-between mb-2">
                                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">📍 Nearby places · Google Maps</div>
                                <button onClick={() => setMapsOpen(null)} className="text-[10px] text-muted-foreground hover:text-foreground">close</button>
                              </div>
                              <div className="rounded-lg overflow-hidden ring-hairline mb-2">
                                <iframe title="maps" loading="lazy" className="w-full h-28 block" src="https://www.openstreetmap.org/export/embed.html?bbox=3.85%2C7.35%2C4.05%2C7.45&layer=mapnik&marker=7.40%2C3.94" />
                              </div>
                              <ul className="space-y-1 max-h-40 overflow-y-auto">
                                {MAPS_PLACES.map((p) => (
                                  <li key={p.id} className="flex items-center gap-2 text-[11px] rounded-lg p-1.5 hover:bg-secondary/60 transition">
                                    <span className="text-base shrink-0">{p.emoji}</span>
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium truncate">{p.title}</div>
                                      <div className="text-[10px] text-muted-foreground truncate">{p.tag}</div>
                                    </div>
                                    <button onClick={() => addSuggestion(di, p)} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-foreground text-background shrink-0">+ Add</button>
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
          </div>

          <div className="space-y-4">

            {/* Trip highlights */}
            {(realPlan?.highlights?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {realPlan!.highlights.map((hl: string) => (
                  <span key={hl} className="text-[10px] px-2 py-0.5 rounded-full bg-google-pink/10 text-google-pink">{hl}</span>
                ))}
              </div>
            )}

            {/* Flights — selectable */}
            {(flightOffers.length > 0 || scraped?.flights) && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2 flex items-center justify-between">
                  <span>Flights — {scraped?.flights?.source === 'google_travel' ? 'Google Travel' : 'Amadeus'}</span>
                  {scraped?.flights?.directAvailable && <span className="text-[10px] px-2 py-0.5 rounded-full bg-google-green/15 text-google-green">Direct available</span>}
                </div>
                <div className="space-y-1.5">
                  {flightOffers.map((fl, i) => (
                    <button key={i} onClick={() => setSelectedFlightIdx(i === selectedFlightIdx ? null : i)} className={`w-full text-left rounded-xl p-3 ring-hairline transition ${selectedFlightIdx === i ? 'bg-primary-soft ring-1 ring-primary/30' : 'bg-card hover:bg-secondary'}`}>
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="font-display text-sm font-semibold">{fl.airline || 'Unknown airline'}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {fl.stops === 0 ? 'Nonstop' : `${fl.stops} stop${(fl.stops ?? 0) > 1 ? 's' : ''}`}
                            {fl.duration ? ` · ${fl.duration}` : ''}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-display font-semibold text-sm">{fmtNGN(fl.price)}</div>
                          <div className="text-[10px] text-muted-foreground">per person</div>
                        </div>
                      </div>
                    </button>
                  ))}
                  <button onClick={() => setSelectedFlightIdx(null)} className={`w-full text-left rounded-xl p-3 ring-hairline transition text-sm ${selectedFlightIdx === null ? 'bg-primary-soft ring-1 ring-primary/30' : 'bg-card hover:bg-secondary'}`}>
                    <span className="font-display font-semibold">🚌 Road transport</span>
                    <span className="text-muted-foreground ml-2 text-[11px]">{realPlan?.transport?.operator || 'Bus'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Hotels — all options, selectable */}
            {allHotelOptions.length > 0 && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2">Hotels — tap to select</div>
                <div className="space-y-1.5">
                  {allHotelOptions.map((h) => (
                    <button key={h.key} onClick={() => setSelectedHotelKey(h.key)} className={`w-full text-left rounded-xl p-3 ring-hairline transition ${selectedHotelKey === h.key ? 'bg-primary-soft ring-1 ring-primary/30' : 'bg-card hover:bg-secondary'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="font-display text-sm font-semibold truncate flex items-center gap-1.5 flex-wrap">
                            {h.name}
                            {h.badge && <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground shrink-0">{h.badge}</span>}
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                            {h.area && <span>{h.area}</span>}
                            {h.rating && <span>⭐ {h.rating}</span>}
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground">{h.source}</span>
                          </div>
                          {h.perks.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {h.perks.map(p => <span key={p} className="text-[9px] px-1.5 py-0.5 rounded-full bg-secondary/70 text-muted-foreground">{p}</span>)}
                            </div>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          {h.price && <div className="font-display font-semibold text-sm">{fmtNGN(h.price)}</div>}
                          {h.price && <div className="text-[10px] text-muted-foreground">per night</div>}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Holiday rentals — only if shortlet selected */}
            {rentalOptions.length > 0 && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2">Shortlets & rentals — tap to select</div>
                <div className="space-y-1.5">
                  {rentalOptions.map((r) => (
                    <button key={r.key} onClick={() => setSelectedHotelKey(r.key)} className={`w-full text-left rounded-xl p-3 ring-hairline transition ${selectedHotelKey === r.key ? 'bg-primary-soft ring-1 ring-primary/30' : 'bg-card hover:bg-secondary'}`}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-display text-sm font-semibold truncate">{r.name}</div>
                          <div className="text-[11px] text-muted-foreground">{r.details} · <span className="text-[9px]">{r.source}</span></div>
                        </div>
                        {r.price && (
                          <div className="text-right shrink-0">
                            <div className="font-display font-semibold text-sm">{fmtNGN(r.price)}</div>
                            <div className="text-[10px] text-muted-foreground">avg/night</div>
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Cost breakdown */}
            {realPlan?.cost_breakdown && (
              <div className="rounded-2xl p-4 ring-hairline bg-card text-xs space-y-1.5">
                <div className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Estimated breakdown</div>
                {[
                  ["Transport", realPlan.cost_breakdown.transport_total],
                  ["Lodging", realPlan.cost_breakdown.lodging_total],
                  ["Food", realPlan.cost_breakdown.food_total],
                  ["Activities", realPlan.cost_breakdown.activities_total],
                  ["Buffer", realPlan.cost_breakdown.buffer],
                ].map(([label, val]) => (
                  <div key={String(label)} className="flex justify-between">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-display font-semibold tabular-nums">{fmtNGN(Number(val))}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-1.5 border-t border-border font-semibold">
                  <span>Total ({intake.squadSize} pax)</span>
                  <span className="font-display tabular-nums text-primary">{fmtNGN(realPlan.cost_breakdown.total)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-4">
            <BackBtn onClick={onBack} />
            <span className="hidden sm:block text-[11px] text-muted-foreground">
              {recalcing ? "🔄 Gemini recalculating…" : dirty ? "⚠️ Recalculate before sending." : "✓ Plan is up to date."}
            </span>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            {dirty && !recalcing && <GhostBtn fullWidth onClick={recalc}>🔄 Recalculate</GhostBtn>}
            <PrimaryBtn fullWidth onClick={() => onNext(buildFinalPlan())} disabled={dirty || recalcing || !realPlan}>Plan your trip →</PrimaryBtn>
          </div>
        </div>
      </Section>
    </div>
  );
}

/* ---------------- step 4: voting ---------------- */
function VoteView({ intake, plan, onNext, onBack }: { intake: Intake; plan: GeminiPlan | null; onNext: () => void; onBack: () => void }) {
  const dateOptions = plan?.date_options ?? DATE_OPTIONS;

  // pre-seed votes so the UI feels alive
  const [dateVotes, setDateVotes] = useState<Record<string, number>>(() => {
    const opts = plan?.date_options ?? DATE_OPTIONS;
    return Object.fromEntries(opts.map((o, i) => [o.id, i === 1 ? 5 : i === 0 ? 2 : 1]));
  });
  const hotelId = plan ? 'ai-hotel' : 'h2';
  const hotelLabel = plan ? plan.hotel.name : HOTELS[1].name;
  const hotelPrice = plan ? plan.hotel.price_per_night : HOTELS[1].pricePerNight;
  const hotelRating = plan ? plan.hotel.rating : HOTELS[1].rating;
  const [hotelVotes, setHotelVotes] = useState<Record<string, number>>({ [hotelId]: 8 });
  const [myDate, setMyDate] = useState<string | null>(null);
  const [myHotel, setMyHotel] = useState<string | null>(null);

  const totalDate = Object.values(dateVotes).reduce((a, b) => a + b, 0);
  const totalHotel = Object.values(hotelVotes).reduce((a, b) => a + b, 0);

  const voteDate = (id: string) => {
    if (myDate === id) return;
    setDateVotes((v) => ({ ...v, [id]: (v[id] || 0) + 1, ...(myDate ? { [myDate]: Math.max(0, (v[myDate] || 1) - 1) } : {}) }));
    setMyDate(id);
  };
  const voteHotel = (id: string) => {
    if (myHotel === id) return;
    setHotelVotes((v) => ({ ...v, [id]: (v[id] || 0) + 1, ...(myHotel ? { [myHotel]: Math.max(0, (v[myHotel] || 1) - 1) } : {}) }));
    setMyHotel(id);
  };

  const Bar = ({ pct, highlight }: { pct: number; highlight?: boolean }) => (
    <div className="h-2 rounded-full bg-secondary overflow-hidden">
      <div className={`h-full transition-all duration-700 ${highlight ? "bg-gradient-primary" : "bg-foreground/40"}`} style={{ width: `${pct}%` }} />
    </div>
  );

  return (
    <Section>
      <StepHeader eyebrow="Step 4 of 7 · Vote" title="Squad picks the details." sub={`${intake.squadSize} members are voting in real time. Tap to cast yours.`} />

      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-3">Pick the dates</div>
          <div className="space-y-3">
            {dateOptions.map((d) => {
              const v = dateVotes[d.id] || 0;
              const pct = totalDate ? Math.round((v / totalDate) * 100) : 0;
              const winning = v === Math.max(...Object.values(dateVotes));
              return (
                <button key={d.id} onClick={() => voteDate(d.id)} className={`w-full text-left rounded-2xl p-4 ring-hairline transition ${myDate === d.id ? "bg-primary-soft" : "bg-card hover:bg-secondary"}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-display font-semibold">{d.label}</div>
                      <div className="text-xs text-muted-foreground">{d.sub}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-display text-sm font-semibold tabular-nums">{v} {v === 1 ? "vote" : "votes"}</div>
                      <div className="text-[10px] text-muted-foreground">{pct}%</div>
                    </div>
                  </div>
                  <div className="mt-3"><Bar pct={pct} highlight={winning} /></div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-3">Confirm the accommodation</div>
          <div className="space-y-3">
            {(() => {
              const v = hotelVotes[hotelId] || 0;
              const pct = totalHotel ? Math.round((v / totalHotel) * 100) : 100;
              return (
                <button onClick={() => voteHotel(hotelId)} className={`w-full text-left rounded-2xl p-4 ring-hairline transition ${myHotel === hotelId ? "bg-primary-soft" : "bg-card hover:bg-secondary"}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-display font-semibold truncate flex items-center gap-2 flex-wrap">
                        {hotelLabel}
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">AI pick</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">{fmtNGN(hotelPrice)}/night · ⭐ {hotelRating}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-display text-sm font-semibold tabular-nums">{v} {v === 1 ? "vote" : "votes"}</div>
                      <div className="text-[10px] text-muted-foreground">{pct}%</div>
                    </div>
                  </div>
                  <div className="mt-3"><Bar pct={pct} highlight /></div>
                </button>
              );
            })()}
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-4">
          <BackBtn onClick={onBack} />
          <span className="hidden sm:block text-xs text-muted-foreground">{(myDate ? 1 : 0) + (myHotel ? 1 : 0)} of 2 votes cast</span>
        </div>
        <PrimaryBtn fullWidth onClick={onNext} disabled={!myDate || !myHotel}>Lock it in & open contributions</PrimaryBtn>
      </div>
    </Section>
  );
}

/* ---------------- step 5: contributions ---------------- */
function ContributionsView({ intake, plan: realPlan, onNext, onBack }: { intake: Intake; plan: GeminiPlan | null; onNext: () => void; onBack: () => void }) {
  const fallback = useMemo(() => buildPlan(intake), [intake]);
  const plan = { perPerson: realPlan?.cost_breakdown.per_person ?? fallback.perPerson, total: realPlan?.cost_breakdown.total ?? fallback.total };
  const [members, setMembers] = useState<Member[]>(() =>
    Array.from({ length: intake.squadSize }, (_, i) => ({
      name: SQUAD_NAMES[i % SQUAD_NAMES.length],
      emoji: EMOJIS[i % EMOJIS.length],
      paid: i < Math.floor(intake.squadSize * 0.4), // 40% pre-paid for liveliness
      share: plan.perPerson,
    })),
  );

  // simulate live payments
  useEffect(() => {
    const t = setInterval(() => {
      setMembers((ms) => {
        const next = [...ms];
        const idx = next.findIndex((m) => !m.paid);
        if (idx === -1) return ms;
        next[idx] = { ...next[idx], paid: true };
        return next;
      });
    }, 2200);
    return () => clearInterval(t);
  }, []);

  const paidCount = members.filter((m) => m.paid).length;
  const collected = paidCount * plan.perPerson;
  const goal = plan.total;
  const pct = Math.round((collected / goal) * 100);

  return (
    <Section>
      <StepHeader eyebrow="Step 5 of 7 · Contributions" title="Live payment tracker." sub="The bot DMs each member their own Paystack link. No spreadsheet, no chasing." />

      <div className="rounded-2xl bg-gradient-primary text-primary-foreground p-6 md:p-8 mb-6 shadow-glow">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] opacity-80">Collected</div>
            <div className="font-display text-4xl md:text-5xl font-semibold mt-1">{fmtNGN(collected)}</div>
            <div className="text-sm opacity-80 mt-1">of {fmtNGN(goal)} goal · {paidCount}/{members.length} paid</div>
          </div>
          <div className="font-display text-5xl font-semibold tabular-nums">{pct}%</div>
        </div>
        <div className="mt-5 h-2 rounded-full bg-primary-foreground/20 overflow-hidden">
          <div className="h-full bg-primary-foreground transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {members.map((m, i) => (
          <div key={i} className={`flex items-center justify-between rounded-2xl p-4 ring-hairline transition ${m.paid ? "bg-primary-soft" : "bg-card"}`}>
            <div className="flex items-center gap-3">
              <div className="grid place-items-center w-10 h-10 rounded-full bg-secondary text-lg">{m.emoji}</div>
              <div>
                <div className="font-display font-semibold text-sm">{m.name}</div>
                <div className="text-xs text-muted-foreground">{fmtNGN(m.share)} · share</div>
              </div>
            </div>
            {m.paid ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                Paid
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-google-yellow animate-pulse" />
                Awaiting
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-4">
          <BackBtn onClick={onBack} />
          <span className="hidden sm:block text-xs text-muted-foreground">Auto-reminders sent at 72h · 24h · 2h before deadline.</span>
        </div>
        <PrimaryBtn fullWidth onClick={onNext}>Trip day — let's go 🚌</PrimaryBtn>
      </div>
    </Section>
  );
}

/* ---------------- step 6: during the trip ---------------- */
type TripPing = {
  kind: "depart" | "uber" | "stop" | "expense" | "photo" | "update" | "packup";
  who: string;
  emoji: string;
  text: string;
  time: string;
};

function DuringTripView({ intake, onNext, onBack }: { intake: Intake; onNext: () => void; onBack: () => void }) {
  const opName = operatorsFor(intake.transport).find(o => o.id === intake.operatorId)?.brand ?? intake.transport;

  const FEED_SEQ: TripPing[] = useMemo(() => [
    { kind: "depart", who: "MySquadGo Bot", emoji: "🚌", text: `🌅 Good morning squad! Day 1 — ${opName} departs 7:00am sharp.\nFirst stop: Agodi Gardens · 11:00am.\nFull itinerary 👉 [link]`, time: "Day 1 · 06:00" },
    { kind: "uber", who: "MySquadGo Bot", emoji: "🛡️", text: `🛡️ Safety check-in: tap below so loved ones back home know you're good. Quick, one tap.`, time: "Day 1 · 10:42" },
    { kind: "stop", who: "MySquadGo Bot", emoji: "📍", text: `📍 Stop reached: Agodi Gardens. Tap once everyone is together — no spam after.`, time: "Day 1 · 11:08" },
    { kind: "photo", who: "MySquadGo Bot", emoji: "📸", text: `📸 Cocoa House looks 🔥 — drop a few shots for the recap reel whenever.`, time: "Day 1 · 16:35" },
    { kind: "expense", who: "Tunde 🦁", emoji: "💸", text: `Logged ₦5,000 for lunch — split 12 ways = ₦417 each. Settled at end of trip ✅`, time: "Day 1 · 13:42" },
    { kind: "uber", who: "MySquadGo Bot", emoji: "🛡️", text: `🛡️ Night move to Amala Skye. Quick safety tap so we know the whole squad rolled out together.`, time: "Day 1 · 19:50" },
    { kind: "update", who: "MySquadGo Bot", emoji: "🔁", text: `🔁 Itinerary update: tomorrow's brunch pushed to 10am (chef's request). Map pin refreshed.`, time: "Day 1 · 22:10" },
    { kind: "packup", who: "MySquadGo Bot", emoji: "🎒", text: `🎒 Last morning! Quick reminder before you check out — sweep the room, grab everything you came with: chargers, ID, that one slipper under the bed 👀`, time: "Day 2 · 09:30" },
  ], [opName]);

  const [shown, setShown] = useState(1);
  useEffect(() => {
    if (shown >= FEED_SEQ.length) return;
    const t = setTimeout(() => setShown((s) => s + 1), 1800);
    return () => clearTimeout(t);
  }, [shown, FEED_SEQ.length]);

  const [photosSent, setPhotosSent] = useState(0);
  const [uberShared, setUberShared] = useState<Record<number, boolean>>({});
  const [stopOk, setStopOk] = useState<Record<number, boolean>>({});

  const kindStyles: Record<TripPing["kind"], string> = {
    depart: "bg-google-blue/15 text-google-blue",
    uber: "bg-foreground/10 text-foreground",
    stop: "bg-google-green/15 text-google-green",
    expense: "bg-primary/15 text-primary",
    photo: "bg-google-pink/15 text-google-pink",
    update: "bg-google-purple/15 text-google-purple",
    packup: "bg-google-yellow/20 text-google-yellow",
  };

  return (
    <Section>
      <StepHeader eyebrow="Step 6 of 7 · During the trip" title="The bot rides shotgun." sub="Stop-based check-ins, Uber trip-share, and quiet reminders — never every-4-hours nagging." />

      <div className="grid lg:grid-cols-[1.1fr,1fr] gap-6">
        {/* live trip feed */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Live trip feed</div>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-google-green/15 text-google-green flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-google-green animate-pulse" /> Trip live
            </span>
          </div>
          <div className="space-y-2.5 max-h-[32rem] overflow-y-auto pr-1">
            {FEED_SEQ.slice(0, shown).map((p, i) => (
              <div key={i} className="rounded-2xl bg-card ring-hairline p-4 animate-rise">
                <div className="flex items-start gap-3">
                  <div className={`grid place-items-center w-9 h-9 rounded-full text-base shrink-0 ${kindStyles[p.kind]}`}>{p.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="font-display text-sm font-semibold truncate">{p.who}</div>
                      <div className="text-[10px] text-muted-foreground shrink-0">{p.time}</div>
                    </div>
                    <div className="text-sm text-foreground/90 whitespace-pre-line mt-0.5">{p.text}</div>

                    {p.kind === "uber" && (
                      <button
                        onClick={() => setUberShared((u) => ({ ...u, [i]: true }))}
                        disabled={uberShared[i]}
                        className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${uberShared[i] ? "bg-google-green/15 text-google-green" : "bg-foreground text-background hover:opacity-90"}`}
                      >
                        {uberShared[i] ? "✓ Safe — loved ones notified" : "🛡️ Tap to check in"}
                      </button>
                    )}
                    {p.kind === "stop" && (
                      <button
                        onClick={() => setStopOk((s) => ({ ...s, [i]: true }))}
                        disabled={stopOk[i]}
                        className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${stopOk[i] ? "bg-google-green/15 text-google-green" : "bg-foreground text-background hover:opacity-90"}`}
                      >
                        {stopOk[i] ? "✓ Squad linked up" : "👍 We're all here"}
                      </button>
                    )}
                    {p.kind === "photo" && (
                      <button
                        onClick={() => setPhotosSent((n) => n + 1)}
                        className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-google-pink/15 text-google-pink px-3 py-1.5 text-xs font-medium hover:bg-google-pink/25 transition"
                      >
                        📸 Send photo {photosSent > 0 && `· ${photosSent} sent`}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {shown < FEED_SEQ.length && (
              <div className="text-[11px] text-muted-foreground italic px-2">Bot is typing the next ping…</div>
            )}
          </div>
        </div>

        {/* right column: today's stops + check-in summary + pack-up */}
        <div className="space-y-4">
          {/* in-city stops mini-map */}
          <div className="rounded-2xl bg-card ring-hairline p-5">
            <div className="font-display font-semibold mb-1 flex items-center gap-2">🗺️ Today's stops</div>
            <div className="text-[11px] text-muted-foreground mb-3">Squad rolls together. One safety tap per stop.</div>
            <ol className="space-y-2.5">
              {[
                { time: "11:00", stop: "Agodi Gardens" },
                { time: "14:00", stop: "Cocoa House rooftop" },
                { time: "20:00", stop: "Amala Skye" },
              ].map((s) => (
                <li key={s.stop} className="flex items-center gap-3 text-sm">
                  <span className="font-display text-xs font-semibold tabular-nums text-muted-foreground w-12">{s.time}</span>
                  <span className="flex-1 truncate">{s.stop}</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-google-green/15 text-google-green">🛡️ check-in</span>
                </li>
              ))}
            </ol>
          </div>

          {/* squad check-ins */}
          <div className="rounded-2xl bg-google-green/10 ring-1 ring-google-green/20 p-5">
            <div className="font-display font-semibold flex items-center gap-2 mb-2">🛡️ Safety check-ins</div>
            <div className="text-sm text-foreground/80">
              {Object.keys(stopOk).length + Object.keys(uberShared).length} taps logged. The squad travels together — taps just let loved ones at home know all is well.
            </div>
          </div>

          {/* pack-up reminder (replaces packing checklist) */}
          <div className="rounded-2xl bg-google-yellow/15 ring-1 ring-google-yellow/30 p-5">
            <div className="font-display font-semibold flex items-center gap-2 mb-1.5">🎒 Pack-up reminder</div>
            <div className="text-sm text-foreground/80">
              On the last morning the bot sends a single nudge: <em>"Sweep the room — grab everything you came with."</em> No checklists, no chasing.
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <BackBtn onClick={onBack} />
        <PrimaryBtn fullWidth onClick={onNext}>Trip's done — see the recap 📸</PrimaryBtn>
      </div>
    </Section>
  );
}


/* ---------------- step 7: after the trip ---------------- */
function AfterTripView({ intake, onRestart }: { intake: Intake; onRestart: () => void }) {
  const plan = useMemo(() => buildPlan(intake), [intake]);
  const extraExpenses = [
    { who: "Tunde 🦁", what: "Group lunch", amount: 5000 },
    { who: "Ada 🌶️", what: "Extra Uber", amount: 2400 },
    { who: "Kemi 🎧", what: "Souvenirs round", amount: 3200 },
  ];
  const extraTotal = extraExpenses.reduce((a, b) => a + b.amount, 0);
  const settlePerPerson = Math.round(extraTotal / intake.squadSize);

  const [collageBuilding, setCollageBuilding] = useState(true);
  const [reelBuilding, setReelBuilding] = useState(true);
  useEffect(() => {
    const t1 = setTimeout(() => setCollageBuilding(false), 1800);
    const t2 = setTimeout(() => setReelBuilding(false), 3200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const ratings = [
    { name: plan.hotel.name, kind: "Hotel", stars: 5 },
    { name: "Amala Skye", kind: "Restaurant", stars: 5 },
    { name: "Agodi Gardens", kind: "Activity", stars: 4 },
    { name: "Bay Lounge", kind: "Nightlife", stars: 4 },
  ];
  const [userRatings, setUserRatings] = useState<Record<string, number>>({});

  // mock photo collage tiles
  const collageTiles = [
    "from-google-pink/40 to-google-purple/40",
    "from-google-blue/40 to-primary/40",
    "from-google-yellow/40 to-google-pink/40",
    "from-google-green/40 to-google-blue/40",
    "from-primary/40 to-google-yellow/40",
    "from-google-purple/40 to-google-green/40",
  ];

  return (
    <Section>
      <StepHeader eyebrow="Step 7 of 7 · After the trip" title="The squad recap." sub="Settle extras, rate the spots, and watch the bot turn 87 group photos into a highlight reel." />

      {/* Auto collage */}
      <div className="rounded-2xl bg-gradient-to-br from-google-pink/15 via-primary-soft to-google-blue/15 ring-hairline p-6 md:p-8 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-google-pink">📸 Auto collage</div>
            <div className="font-display text-xl md:text-2xl font-semibold mt-1">87 photos · 12 videos from the group</div>
          </div>
          <span className={`text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full ${collageBuilding ? "bg-google-yellow/20 text-google-yellow" : "bg-google-green/20 text-google-green"}`}>
            {collageBuilding ? "Building…" : "✓ Ready"}
          </span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {collageTiles.map((c, i) => (
            <div key={i} className={`aspect-square rounded-xl bg-gradient-to-br ${c} grid place-items-center text-2xl ${collageBuilding ? "animate-pulse" : ""}`}>
              {collageBuilding ? "" : ["🌅", "🍲", "🎉", "🌳", "🪩", "✈️"][i]}
            </div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Settlement */}
        <div className="rounded-2xl bg-card ring-hairline p-5">
          <div className="font-display font-semibold mb-3 flex items-center gap-2">💸 Final settlement</div>
          <div className="text-xs text-muted-foreground mb-3">Extra logged costs split across the squad.</div>
          <ul className="space-y-2 mb-4">
            {extraExpenses.map((e) => (
              <li key={e.what} className="flex items-center justify-between text-sm">
                <span className="text-foreground/80">{e.who} · {e.what}</span>
                <span className="font-display font-semibold tabular-nums">{fmtNGN(e.amount)}</span>
              </li>
            ))}
          </ul>
          <div className="rounded-xl bg-primary-soft p-3 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-primary">Each pays</div>
              <div className="font-display text-lg font-semibold">{fmtNGN(settlePerPerson)}</div>
            </div>
            <button className="rounded-full bg-foreground text-background px-4 py-2 text-xs font-medium">Send Paystack links</button>
          </div>
        </div>

        {/* Ratings */}
        <div className="rounded-2xl bg-card ring-hairline p-5">
          <div className="font-display font-semibold mb-3 flex items-center gap-2">⭐ Rate the spots</div>
          <div className="text-xs text-muted-foreground mb-3">Feeds SquadGo's West African venue database.</div>
          <ul className="space-y-3">
            {ratings.map((r) => {
              const current = userRatings[r.name] ?? r.stars;
              return (
                <li key={r.name}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-sm">
                      <div className="font-medium">{r.name}</div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{r.kind}</div>
                    </div>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          onClick={() => setUserRatings((u) => ({ ...u, [r.name]: n }))}
                          className={`text-base leading-none transition ${n <= current ? "text-google-yellow" : "text-muted-foreground/40 hover:text-google-yellow/60"}`}
                          aria-label={`Rate ${n} stars`}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Recap reel */}
      <div className="rounded-2xl bg-foreground text-background p-6 md:p-8 mb-6 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-google-pink/20 via-transparent to-google-blue/20" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">🎬 Squad recap reel</div>
            <div className="font-display text-2xl md:text-3xl font-semibold mt-1">{intake.origin} → {intake.destination} · 0:47</div>
            <div className="text-sm opacity-80 mt-1">Auto-edited from your photos & clips. Shareable to WhatsApp Status & IG.</div>
          </div>
          <div className="relative w-40 h-24 rounded-xl bg-background/10 grid place-items-center ring-1 ring-background/20">
            {reelBuilding ? (
              <div className="text-xs font-medium opacity-80 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-background animate-pulse" />
                Rendering…
              </div>
            ) : (
              <div className="grid place-items-center w-12 h-12 rounded-full bg-background text-foreground">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
              </div>
            )}
          </div>
        </div>
        {!reelBuilding && (
          <div className="relative mt-4 flex flex-wrap gap-2">
            <button className="rounded-full bg-whatsapp text-primary-foreground px-4 py-2 text-xs font-medium">Share to WhatsApp Status</button>
            <button className="rounded-full bg-background/10 ring-1 ring-background/20 px-4 py-2 text-xs font-medium">Share to Instagram</button>
            <button className="rounded-full bg-background/10 ring-1 ring-background/20 px-4 py-2 text-xs font-medium">Download MP4</button>
          </div>
        )}
      </div>

      <div className="mt-8 relative overflow-hidden rounded-2xl bg-foreground text-background p-6 md:p-8">
        <div className="pointer-events-none absolute -top-16 -right-16 w-56 h-56 rounded-full bg-primary/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-accent/20 blur-3xl" />
        <div className="relative">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-50 mb-2">You've seen the full flow</div>
          <h3 className="font-display text-2xl md:text-3xl font-semibold leading-tight mb-2">
            Ready to do it for real?
          </h3>
          <p className="text-sm opacity-75 mb-6 max-w-md">
            Drop your WhatsApp number. We'll message you the moment the beta opens in your city — Lagos, Accra, Dakar, or Abidjan.
          </p>
          <WaitlistForm source="demo_end" dark />
          <p className="mt-3 text-[11px] opacity-40">We only message once. Promise.</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">Trip Journal saved · venue ratings synced · settlement closed.</div>
        <div className="flex gap-2">
          <GhostBtn onClick={onRestart}>Run demo again</GhostBtn>
          <Link to="/" className="inline-flex items-center gap-2 rounded-full bg-foreground text-background px-5 py-3 text-sm font-medium hover:opacity-90 transition-opacity">
            Back to home
          </Link>
        </div>
      </div>
    </Section>
  );
}

/* ---------------- shell ---------------- */
const STEPS = ["WhatsApp", "Intake", "AI Plan", "Vote", "Pay", "On Trip", "Recap"];
const AUTO_DELAYS = [6500, 7000, 8000, 5500, 6000, 9000];

const Demo = () => {
  const [step, setStep] = useState(0);
  const [intake, setIntake] = useState<Intake | null>(null);
  const [plan, setPlan] = useState<GeminiPlan | null>(null);
  const [auto, setAuto] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const navigate = useNavigate();

  const goTo = (n: number) => {
    setTransitioning(true);
    setTimeout(() => { setStep(n); setTransitioning(false); }, 450);
  };

  useEffect(() => {
    document.title = "MySquadGo — Interactive Demo";
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  // auto-play: walk through steps with timed delays
  useEffect(() => {
    if (!auto) return;
    if (step >= STEPS.length - 1) { setAuto(false); return; }
    if (step === 1 && !intake) {
      setIntake({
        origin: "Lagos", destination: "Ibadan", vibe: "Chill & scenic",
        budget: 25000, days: 2, squadSize: 8, accommodationType: "Hotel",
        dateFlexibility: "Flexible", dealbreakers: "",
        transport: "Charter bus", extras: ["City tour", "Local food crawl"],
        operatorId: "gigm", seats: 8,
      });
    }
    const t = setTimeout(() => setStep((s) => s + 1), AUTO_DELAYS[step] ?? 6000);
    return () => clearTimeout(t);
  }, [auto, step, intake]);

  const reset = () => { setStep(0); setIntake(null); setPlan(null); setAuto(false); setTransitioning(false); };
  const startAuto = () => { reset(); setAuto(true); };

  return (
    <main className="min-h-screen bg-hero-mesh">
      <div className="pointer-events-none fixed -top-32 -left-32 w-[28rem] h-[28rem] rounded-full bg-primary/15 blur-3xl animate-float" />
      <div className="pointer-events-none fixed top-40 -right-32 w-[28rem] h-[28rem] rounded-full bg-accent/15 blur-3xl animate-float" style={{ animationDelay: "2s" }} />

      <header className="relative pt-8 pb-6">
        <div className="mx-auto max-w-4xl px-6 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 font-display font-semibold">
            <span className="grid place-items-center w-8 h-8 rounded-xl bg-gradient-primary text-primary-foreground shadow-soft">
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3 7 7 .8-5.3 4.7L18.5 22 12 18l-6.5 4 1.8-7.5L2 9.8 9 9z" /></svg>
            </span>
            MySquadGo
          </Link>
          <div className="flex items-center gap-2">
            {auto ? (
              <button onClick={() => setAuto(false)} className="text-xs font-semibold px-3 py-1.5 rounded-full bg-foreground text-background inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-google-green animate-pulse" /> Auto-playing · pause
              </button>
            ) : (
              <button onClick={startAuto} className="text-xs font-semibold px-3 py-1.5 rounded-full bg-gradient-primary text-primary-foreground shadow-glow inline-flex items-center gap-1.5">
                ▶ Show me the demo
              </button>
            )}
            <span className="hidden md:inline text-xs font-medium px-3 py-1.5 rounded-full glass ring-hairline text-muted-foreground">Interactive</span>
          </div>
        </div>
      </header>

      {/* stepper */}
      <div className="relative mx-auto max-w-4xl px-6 mb-6">
        <div className="flex items-start">
          {STEPS.map((label, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <div key={label} className={`flex items-start min-w-0 ${i < STEPS.length - 1 ? "flex-1" : ""}`}>
                <div className="flex flex-col items-center gap-1.5 shrink-0 w-8 sm:w-16">
                  <button
                    type="button"
                    onClick={() => done && !transitioning && goTo(i)}
                    disabled={!done || transitioning}
                    className={`grid place-items-center w-7 h-7 rounded-full text-[11px] font-display font-semibold ring-hairline transition-transform ${done ? "bg-primary text-primary-foreground hover:scale-110 cursor-pointer" : active ? "bg-foreground text-background cursor-default" : "bg-card text-muted-foreground cursor-default"}`}
                  >
                    {done ? "✓" : i + 1}
                  </button>
                  <span className={`hidden sm:block text-[10px] font-medium tracking-wide text-center leading-tight ${active ? "text-foreground" : done ? "text-primary" : "text-muted-foreground"}`}>{label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-px mt-3.5 ${done ? "bg-primary" : "bg-border"}`} />
                )}
              </div>
            );
          })}
        </div>
        <p className="sm:hidden text-xs font-medium text-center text-muted-foreground mt-3">
          Step {step + 1} of {STEPS.length} · <span className="text-foreground font-semibold">{STEPS[step]}</span>
        </p>
      </div>

      <div className="relative mx-auto max-w-4xl px-6 pb-24">
        {transitioning ? (
          <div className="rounded-3xl bg-card ring-hairline shadow-card p-12 grid place-items-center gap-4 min-h-[360px] animate-rise">
            <div className="w-14 h-14 rounded-2xl bg-gradient-primary grid place-items-center shadow-glow animate-float">
              <svg viewBox="0 0 24 24" className="w-7 h-7 text-primary-foreground" fill="currentColor"><path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4L12 2z" /></svg>
            </div>
            <p className="font-display text-lg text-gradient">Loading…</p>
          </div>
        ) : (
          <>
            {step === 0 && <WhatsAppView onNext={() => goTo(1)} onBack={() => navigate("/")} />}
            {step === 1 && <IntakeForm onSubmit={(i) => { setIntake(i); goTo(2); }} onBack={() => goTo(0)} />}
            {step === 2 && intake && <PlanView intake={intake} onNext={(p) => { setPlan(p); goTo(3); }} onBack={() => goTo(1)} />}
            {step === 3 && intake && <VoteView intake={intake} plan={plan} onNext={() => goTo(4)} onBack={() => goTo(2)} />}
            {step === 4 && intake && <ContributionsView intake={intake} plan={plan} onNext={() => goTo(5)} onBack={() => goTo(3)} />}
            {step === 5 && intake && <DuringTripView intake={intake} onNext={() => goTo(6)} onBack={() => goTo(4)} />}
            {step === 6 && intake && <AfterTripView intake={intake} onRestart={reset} />}
          </>
        )}
      </div>
    </main>
  );
};

export default Demo;
