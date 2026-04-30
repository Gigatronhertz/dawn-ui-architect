import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

/* ---------------- types ---------------- */
type Intake = {
  origin: string;
  destination: string;
  vibe: string;
  budget: number;
  days: number;
  squadSize: number;
  startWindow: string;
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
  <div className="rounded-3xl bg-card ring-hairline shadow-card p-6 md:p-10 animate-rise">{children}</div>
);

const StepHeader = ({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) => (
  <div className="mb-8">
    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</span>
    <h2 className="font-display text-3xl md:text-5xl font-semibold tracking-tight mt-2 leading-[1.05] text-gradient">{title}</h2>
    {sub && <p className="mt-3 text-muted-foreground max-w-xl">{sub}</p>}
  </div>
);

const PrimaryBtn = ({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="group inline-flex items-center gap-2 rounded-full bg-gradient-primary text-primary-foreground px-6 py-3 text-sm font-medium shadow-glow hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-50 disabled:hover:scale-100"
  >
    {children}
    <svg viewBox="0 0 24 24" className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7" /></svg>
  </button>
);

const GhostBtn = ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
  <button onClick={onClick} className="inline-flex items-center gap-2 rounded-full bg-card ring-hairline px-5 py-3 text-sm font-medium text-foreground hover:bg-secondary transition-colors">
    {children}
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
  { from: "user", who: "Tunde 🦁", text: "Squad, we said Ibadan trip in August. Are we still doing this or nah 😅", time: "10:38" },
  { from: "user", who: "Ada 🌶️", text: "I'm in! But who's planning this time? Last time was chaos 💀", time: "10:39" },
  { from: "user", who: "Kemi 🎧", text: "Not me again abeg. Spreadsheet almost killed me last December 🥲", time: "10:40" },
  { from: "user", who: "Femi 🚀", text: "Wait — let me add the MySquadGo bot. My cousin used it for her Calabar trip, sorted everything in 5 mins.", time: "10:41" },
];

const BOT_SEQUENCE: ChatMsg[] = [
  { from: "system", text: "Femi 🚀 added MySquadGo Bot to the group", time: "10:41" },
  { from: "bot", text: "👋 Hey Ibadan Squad! I'm MySquadGo — powered by Google Gemini.\nI'll plan the trip, run the votes, split costs, and collect payments — all here in this chat.", time: "10:41" },
  { from: "bot", text: "I just need 9 quick answers from one of you to get started. Ready?", time: "10:42", highlight: true },
];

function WhatsAppView({ onNext }: { onNext: () => void }) {
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
        sub="Watch what happens the moment someone adds the MySquadGo bot to a group."
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
              <li className="flex gap-2"><span className="text-primary">①</span> Squad started chatting about a trip</li>
              <li className="flex gap-2"><span className="text-primary">②</span> Femi added <strong>MySquadGo Bot</strong> to the group</li>
              <li className="flex gap-2"><span className="text-primary">③</span> Bot greets the squad and asks 9 questions</li>
              <li className="flex gap-2"><span className="text-primary">④</span> From here, it plans, votes, and collects — automatically</li>
            </ul>
          </div>
          <div className="rounded-2xl bg-card ring-hairline p-4 text-xs text-muted-foreground">
            <strong className="text-foreground">No app to download.</strong> No new logins. The bot lives in the group your squad already uses every day.
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <PrimaryBtn onClick={onNext} disabled={step < BOT_SEQUENCE.length}>
          {step < BOT_SEQUENCE.length ? "Bot is talking…" : "Answer the bot's 9 questions"}
        </PrimaryBtn>
      </div>
    </Section>
  );
}

/* ---------------- step 2: intake ---------------- */
const STEP1_QUESTIONS = 9;
function IntakeForm({ onSubmit }: { onSubmit: (i: Intake) => void }) {
  const [intake, setIntake] = useState<Intake>({
    origin: "Lagos",
    destination: "Ibadan",
    vibe: "Chill & scenic",
    budget: 25000,
    days: 2,
    squadSize: 8,
    startWindow: "Aug 2026",
    transport: "Charter bus",
    extras: ["City tour", "Local food crawl"],
  });

  const set = <K extends keyof Intake>(k: K, v: Intake[K]) => setIntake((p) => ({ ...p, [k]: v }));
  const toggleExtra = (x: string) =>
    set("extras", intake.extras.includes(x) ? intake.extras.filter((e) => e !== x) : [...intake.extras, x]);

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
      <StepHeader eyebrow="Step 2 of 7 · Intake" title="Tell us about the trip." sub={`${STEP1_QUESTIONS} quick questions. Under two minutes. The bot is asking — answer for the squad.`} />
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
        <Field n={7} label="Start window"><input className={inputCls} value={intake.startWindow} onChange={(e) => set("startWindow", e.target.value)} /></Field>
        <Field n={8} label="Transport">
          <div className="flex flex-wrap gap-2">{["Charter bus", "Public transport", "Flights"].map((t) => <button key={t} type="button" onClick={() => { set("transport", t); set("operatorId", undefined); }} className={chipCls(intake.transport === t)}>{t}</button>)}</div>
        </Field>
        <div className="md:col-span-2">
          <Field n={9} label="Add-ons (pick any)">
            <div className="flex flex-wrap gap-2">{EXTRAS_ALL.map((x) => <button key={x} type="button" onClick={() => toggleExtra(x)} className={chipCls(intake.extras.includes(x))}>{x}</button>)}</div>
          </Field>
        </div>

        {/* operator picker — appears inline based on transport choice */}
        <div className="md:col-span-2">
          <div className="rounded-2xl bg-secondary/40 ring-hairline p-4 md:p-5">
            <div className="flex items-baseline justify-between mb-1">
              <div className="font-display text-sm font-semibold flex items-center gap-2">
                🔎 Live {intake.transport.toLowerCase()} options
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-google-blue/15 text-google-blue">Pulled by Gemini</span>
              </div>
              <div className="text-[11px] text-muted-foreground">{intake.origin} → {intake.destination}</div>
            </div>
            <div className="text-[11px] text-muted-foreground mb-3">Pick the operator + how many seats. Price locks in after this.</div>

            <div className="grid sm:grid-cols-2 gap-2.5">
              {operatorsFor(intake.transport).map((op) => {
                const active = intake.operatorId === op.id;
                return (
                  <button
                    key={op.id}
                    type="button"
                    onClick={() => set("operatorId", op.id)}
                    className={`text-left rounded-xl p-3 ring-hairline transition ${active ? "bg-primary-soft ring-primary/40" : "bg-card hover:bg-secondary"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-display text-sm font-semibold flex items-center gap-1.5">
                          <span className="text-base leading-none">{op.logo}</span>
                          <span className="truncate">{op.brand}</span>
                          {active && <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground">Picked</span>}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{op.class}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-display text-sm font-semibold tabular-nums">{fmtNGN(op.pricePerSeat)}</div>
                        <div className="text-[10px] text-muted-foreground">per seat</div>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                      <span className="px-1.5 py-0.5 rounded bg-secondary">🕒 {op.depart} → {op.arrive}</span>
                      <span className="px-1.5 py-0.5 rounded bg-secondary">⏱ {op.duration}</span>
                      <span className="px-1.5 py-0.5 rounded bg-secondary">⭐ {op.rating}</span>
                      {op.note && <span className="px-1.5 py-0.5 rounded bg-secondary">{op.note}</span>}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* seat counter */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-card ring-hairline p-3">
              <div className="text-sm">
                <div className="font-medium">Seats / tickets</div>
                <div className="text-[11px] text-muted-foreground">Default = squad size ({intake.squadSize}). Adjust if some are joining later.</div>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => set("seats", Math.max(1, (intake.seats ?? intake.squadSize) - 1))} className="w-8 h-8 rounded-full ring-hairline bg-card hover:bg-secondary font-display text-base">−</button>
                <div className="w-10 text-center font-display font-semibold tabular-nums">{intake.seats ?? intake.squadSize}</div>
                <button type="button" onClick={() => set("seats", Math.min(30, (intake.seats ?? intake.squadSize) + 1))} className="w-8 h-8 rounded-full ring-hairline bg-card hover:bg-secondary font-display text-base">+</button>
                {intake.operatorId && (
                  <div className="ml-3 px-3 py-1.5 rounded-full bg-foreground text-background text-xs font-semibold tabular-nums">
                    Locks at {fmtNGN((operatorsFor(intake.transport).find(o => o.id === intake.operatorId)!.pricePerSeat) * (intake.seats ?? intake.squadSize))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
      <div className="mt-8 flex items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">{intake.operatorId ? `✓ ${operatorsFor(intake.transport).find(o => o.id === intake.operatorId)!.brand} selected` : "Pick an operator above to lock the price."}</div>
        <PrimaryBtn onClick={() => onSubmit({ ...intake, seats: intake.seats ?? intake.squadSize })} disabled={!intake.operatorId}>Generate plan with AI</PrimaryBtn>
      </div>
    </Section>
  );
}

/* ---------------- step 2: AI plan ---------------- */
function PlanView({ intake, onNext }: { intake: Intake; onNext: () => void }) {
  const plan = useMemo(() => buildPlan(intake), [intake]);
  const [phase, setPhase] = useState(0); // 0 = generating, 1 = done
  const phases = ["Analyzing route…", "Pricing 14 hotels with Gemini…", "Building daily itinerary…", "Calculating costs & buffer…"];
  const [pIdx, setPIdx] = useState(0);

  useEffect(() => {
    if (phase === 1) return;
    const t = setInterval(() => setPIdx((i) => (i + 1) % phases.length), 700);
    const done = setTimeout(() => setPhase(1), 2800);
    return () => { clearInterval(t); clearTimeout(done); };
  }, [phase]);

  if (phase === 0) {
    return (
      <Section>
        <StepHeader eyebrow="Step 3 of 7 · AI Planning" title="Gemini is cooking…" />
        <div className="rounded-2xl bg-secondary/60 p-8 text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-primary grid place-items-center shadow-glow animate-float">
            <svg viewBox="0 0 24 24" className="w-7 h-7 text-primary-foreground" fill="currentColor"><path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4L12 2z" /></svg>
          </div>
          <div className="mt-5 font-display text-lg">{phases[pIdx]}</div>
          <div className="mt-4 mx-auto max-w-md h-1.5 rounded-full bg-card overflow-hidden">
            <div className="h-full bg-gradient-primary animate-[typing_2.6s_linear_forwards]" style={{ width: "100%" }} />
          </div>
        </div>
      </Section>
    );
  }

  const itinerary = Array.from({ length: intake.days }, (_, i) => ({
    day: i + 1,
    title: i === 0 ? "Arrival & city pulse" : i === intake.days - 1 ? "Brunch & departure" : "Cultural day + nightlife",
    items: i === 0
      ? ["08:00 · GIGM bus, Jibowu", "13:00 · Check-in at hotel", "16:00 · Cocoa House rooftop", "20:00 · Amala spot at Amala Skye"]
      : i === intake.days - 1
      ? ["09:00 · Brunch at Kakanfo", "12:00 · Souvenirs at Bodija", "15:00 · Bus back to Lagos"]
      : ["10:00 · University of Ibadan tour", "14:00 · Agodi Gardens", "19:00 · Live music at Bay Lounge"],
  }));

  return (
    <div className="space-y-4">
      <Section>
        <StepHeader eyebrow="Step 3 of 7 · AI Plan" title={`${intake.origin} → ${intake.destination}`} sub={`${intake.days} days · ${intake.squadSize} people · ${intake.vibe.toLowerCase()} vibe`} />

        <div className="grid md:grid-cols-3 gap-3 mb-8">
          {[
            { tag: "Transport", val: fmtNGN(plan.transportTotal), sub: `${intake.transport} · ${fmtNGN(plan.transport)}/p`, color: "bg-google-blue/10 text-google-blue" },
            { tag: "Lodging", val: fmtNGN(plan.lodgingTotal), sub: `${plan.hotel.name} · ${intake.days} nights`, color: "bg-google-purple/10 text-google-purple" },
            { tag: "Per person", val: fmtNGN(plan.perPerson), sub: "All-in, locked", color: "bg-primary-soft text-primary" },
          ].map((c) => (
            <div key={c.tag} className="rounded-2xl bg-secondary/60 p-4">
              <span className={`inline-flex text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${c.color}`}>{c.tag}</span>
              <div className="mt-3 font-display text-2xl font-semibold">{c.val}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{c.sub}</div>
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
                <div className="px-2 py-0.5 rounded-full bg-card ring-hairline text-[10px] font-semibold text-foreground shadow-soft whitespace-nowrap">🏨 {plan.hotel.name.split(" ")[0]}</div>
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
          </div>
          <div className="mt-2 text-[11px] text-muted-foreground">Drag the map to explore. Pins refresh as the squad votes on hotels.</div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-3">Itinerary</div>
            <ol className="space-y-3">
              {itinerary.map((d) => (
                <li key={d.day} className="rounded-2xl bg-card ring-hairline p-4">
                  <div className="flex items-baseline gap-3">
                    <span className="font-display text-xs font-semibold text-muted-foreground">DAY {d.day}</span>
                    <span className="font-display text-base font-semibold">{d.title}</span>
                  </div>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">{d.items.map((it) => <li key={it}>· {it}</li>)}</ul>
                </li>
              ))}
            </ol>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-3">Hotel options</div>
            <div className="space-y-3">
              {HOTELS.map((h) => (
                <div key={h.id} className={`rounded-2xl p-4 ring-hairline ${h.id === plan.hotel.id ? "bg-primary-soft" : "bg-card"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-display text-base font-semibold flex items-center gap-2">
                        {h.name}
                        {h.id === plan.hotel.id && <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary text-primary-foreground">AI pick</span>}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">{h.area} · ⭐ {h.rating}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-display text-base font-semibold">{fmtNGN(h.pricePerNight)}</div>
                      <div className="text-[10px] text-muted-foreground">per night</div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">{h.perks.map((p) => <span key={p} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{p}</span>)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <PrimaryBtn onClick={onNext}>Send to squad for voting</PrimaryBtn>
        </div>
      </Section>
    </div>
  );
}

/* ---------------- step 3: voting ---------------- */
function VoteView({ intake, onNext }: { intake: Intake; onNext: () => void }) {
  // pre-seed votes to feel alive
  const [dateVotes, setDateVotes] = useState<Record<string, number>>({ d1: 2, d2: 5, d3: 1 });
  const [hotelVotes, setHotelVotes] = useState<Record<string, number>>({ h1: 1, h2: 6, h3: 1 });
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
            {DATE_OPTIONS.map((d) => {
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
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-3">Pick the hotel</div>
          <div className="space-y-3">
            {HOTELS.map((h) => {
              const v = hotelVotes[h.id] || 0;
              const pct = totalHotel ? Math.round((v / totalHotel) * 100) : 0;
              const winning = v === Math.max(...Object.values(hotelVotes));
              return (
                <button key={h.id} onClick={() => voteHotel(h.id)} className={`w-full text-left rounded-2xl p-4 ring-hairline transition ${myHotel === h.id ? "bg-primary-soft" : "bg-card hover:bg-secondary"}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-display font-semibold">{h.name}</div>
                      <div className="text-xs text-muted-foreground">{fmtNGN(h.pricePerNight)}/night · ⭐ {h.rating}</div>
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
      </div>

      <div className="mt-8 flex items-center justify-between">
        <div className="text-xs text-muted-foreground">{(myDate ? 1 : 0) + (myHotel ? 1 : 0)} of 2 votes cast</div>
        <PrimaryBtn onClick={onNext} disabled={!myDate || !myHotel}>Lock it in & open contributions</PrimaryBtn>
      </div>
    </Section>
  );
}

/* ---------------- step 4: contributions ---------------- */
function ContributionsView({ intake, onNext }: { intake: Intake; onNext: () => void }) {
  const plan = useMemo(() => buildPlan(intake), [intake]);
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

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">Auto-reminders sent at 72h · 24h · 2h before deadline.</div>
        <PrimaryBtn onClick={onNext}>Trip day — let's go 🚌</PrimaryBtn>
      </div>
    </Section>
  );
}

/* ---------------- step 6: during the trip ---------------- */
type TripPing = {
  kind: "packing" | "depart" | "safety" | "expense" | "photo" | "update";
  who: string;
  emoji: string;
  text: string;
  time: string;
};

const PACKING_LIST = [
  "Phone charger + power bank",
  "ID card / driver's license",
  "Toothbrush & toiletries",
  "2 outfits + sleepwear",
  "Slippers + sneakers",
  "Sunglasses & sunscreen",
  "Small cash (₦5k for tips)",
  "Meds you actually need",
];

function DuringTripView({ intake, onNext }: { intake: Intake; onNext: () => void }) {
  const [packed, setPacked] = useState<Record<string, boolean>>({});
  const packedCount = Object.values(packed).filter(Boolean).length;
  const packPct = Math.round((packedCount / PACKING_LIST.length) * 100);

  const FEED_SEQ: TripPing[] = useMemo(() => [
    { kind: "packing", who: "MySquadGo Bot", emoji: "🤖", text: `🎒 T-12 hours! Packing reminder for ${intake.squadSize} squad members.\nDon't forget: chargers, ID, meds, slippers. Tap the checklist 👉`, time: "Yesterday · 19:00" },
    { kind: "depart", who: "MySquadGo Bot", emoji: "🤖", text: `🌅 Good morning squad! Day 1 — Depart 7:00am sharp from GIGM Jibowu.\nFirst stop: Agodi Gardens · 11:00am.\nFull itinerary 👉 [link]`, time: "Today · 06:00" },
    { kind: "safety", who: "MySquadGo Bot", emoji: "🛡️", text: `🛡️ Safety check-in: tap "I'm good" so the squad knows you're safe. (Auto every 4 hours)`, time: "Today · 10:00" },
    { kind: "photo", who: "MySquadGo Bot", emoji: "📸", text: `📸 Photo drop time! Send your best shots from Cocoa House to the group — I'll save them for the trip collage 🎬`, time: "Today · 16:30" },
    { kind: "expense", who: "Tunde 🦁", emoji: "💸", text: `Logged ₦5,000 for lunch — split 12 ways = ₦417 each. Settled at end of trip ✅`, time: "Today · 13:42" },
    { kind: "update", who: "MySquadGo Bot", emoji: "🔁", text: `🔁 Itinerary update: 8pm Amala spot moved to Amala Skye (better reviews ⭐ 4.7). Map pin updated.`, time: "Today · 15:10" },
  ], [intake.squadSize]);

  const [shown, setShown] = useState(1);
  useEffect(() => {
    if (shown >= FEED_SEQ.length) return;
    const t = setTimeout(() => setShown((s) => s + 1), 1800);
    return () => clearTimeout(t);
  }, [shown, FEED_SEQ.length]);

  const [checkedIn, setCheckedIn] = useState(false);
  const [photosSent, setPhotosSent] = useState(0);

  const kindStyles: Record<TripPing["kind"], string> = {
    packing: "bg-google-yellow/15 text-google-yellow",
    depart: "bg-google-blue/15 text-google-blue",
    safety: "bg-google-green/15 text-google-green",
    expense: "bg-primary/15 text-primary",
    photo: "bg-google-pink/15 text-google-pink",
    update: "bg-google-purple/15 text-google-purple",
  };

  return (
    <Section>
      <StepHeader eyebrow="Step 6 of 7 · During the trip" title="The bot rides shotgun." sub="Day-of reminders, safety check-ins, expense logging, and photo prompts — all in your group chat." />

      <div className="grid lg:grid-cols-[1.1fr,1fr] gap-6">
        {/* live trip feed */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Live trip feed</div>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-google-green/15 text-google-green flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-google-green animate-pulse" /> Day 1 active
            </span>
          </div>
          <div className="space-y-2.5 max-h-[28rem] overflow-y-auto pr-1">
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

                    {p.kind === "safety" && (
                      <button
                        onClick={() => setCheckedIn(true)}
                        disabled={checkedIn}
                        className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${checkedIn ? "bg-google-green/15 text-google-green" : "bg-foreground text-background hover:opacity-90"}`}
                      >
                        {checkedIn ? "✓ Checked in safely" : "I'm good ✋"}
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

        {/* right column: packing + map + safety */}
        <div className="space-y-4">
          {/* packing */}
          <div className="rounded-2xl bg-secondary/60 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="font-display font-semibold flex items-center gap-2">🎒 Packing checklist</div>
              <div className="text-xs font-semibold tabular-nums text-muted-foreground">{packedCount}/{PACKING_LIST.length}</div>
            </div>
            <div className="h-1.5 rounded-full bg-card overflow-hidden mb-3">
              <div className="h-full bg-gradient-primary transition-all duration-500" style={{ width: `${packPct}%` }} />
            </div>
            <ul className="space-y-1.5">
              {PACKING_LIST.map((item) => (
                <li key={item}>
                  <button
                    onClick={() => setPacked((p) => ({ ...p, [item]: !p[item] }))}
                    className="w-full flex items-center gap-2.5 text-sm text-left py-1 hover:text-foreground transition-colors"
                  >
                    <span className={`grid place-items-center w-4 h-4 rounded ring-1 transition ${packed[item] ? "bg-primary ring-primary text-primary-foreground" : "ring-border bg-card"}`}>
                      {packed[item] && <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                    </span>
                    <span className={packed[item] ? "line-through text-muted-foreground" : ""}>{item}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* in-city stops mini-map */}
          <div className="rounded-2xl bg-card ring-hairline p-5">
            <div className="font-display font-semibold mb-3 flex items-center gap-2">🗺️ Today's stops</div>
            <ol className="space-y-2.5">
              {[
                { time: "11:00", stop: "Agodi Gardens", uber: "₦1,800" },
                { time: "14:00", stop: "Cocoa House rooftop", uber: "₦1,200" },
                { time: "20:00", stop: "Amala Skye", uber: "₦2,400" },
              ].map((s) => (
                <li key={s.stop} className="flex items-center gap-3 text-sm">
                  <span className="font-display text-xs font-semibold tabular-nums text-muted-foreground w-12">{s.time}</span>
                  <span className="flex-1 truncate">{s.stop}</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-google-blue/10 text-google-blue">Uber {s.uber}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* safety summary */}
          <div className="rounded-2xl bg-google-green/10 ring-1 ring-google-green/20 p-5">
            <div className="font-display font-semibold flex items-center gap-2 mb-2">🛡️ Squad safety</div>
            <div className="text-sm text-foreground/80">
              {checkedIn ? "11/12" : "10/12"} squad members checked in. Next auto check-in in 4 hours.
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <PrimaryBtn onClick={onNext}>Trip's done — see the recap 📸</PrimaryBtn>
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
          <div className="text-xs text-muted-foreground mb-3">Feeds SquadGo's Nigerian venue database.</div>
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

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
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

const Demo = () => {
  const [step, setStep] = useState(0);
  const [intake, setIntake] = useState<Intake | null>(null);

  useEffect(() => {
    document.title = "MySquadGo — Interactive Demo";
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  const reset = () => { setStep(0); setIntake(null); };

  return (
    <main className="min-h-screen bg-hero-mesh">
      <div className="pointer-events-none fixed -top-32 -left-32 w-[28rem] h-[28rem] rounded-full bg-primary/15 blur-3xl animate-float" />
      <div className="pointer-events-none fixed top-40 -right-32 w-[28rem] h-[28rem] rounded-full bg-accent/15 blur-3xl animate-float" style={{ animationDelay: "2s" }} />

      <header className="relative pt-8 pb-6">
        <div className="mx-auto max-w-4xl px-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-display font-semibold">
            <span className="grid place-items-center w-8 h-8 rounded-xl bg-gradient-primary text-primary-foreground shadow-soft">
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3 7 7 .8-5.3 4.7L18.5 22 12 18l-6.5 4 1.8-7.5L2 9.8 9 9z" /></svg>
            </span>
            MySquadGo
          </Link>
          <span className="text-xs font-medium px-3 py-1.5 rounded-full glass ring-hairline text-muted-foreground">Interactive demo</span>
        </div>
      </header>

      {/* stepper */}
      <div className="relative mx-auto max-w-4xl px-6 mb-8">
        <div className="flex items-center gap-2">
          {STEPS.map((label, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <div key={label} className="flex-1 flex items-center gap-2">
                <div className={`flex items-center gap-2 ${active ? "text-foreground" : done ? "text-primary" : "text-muted-foreground"}`}>
                  <div className={`grid place-items-center w-7 h-7 rounded-full text-[11px] font-display font-semibold ring-hairline ${done ? "bg-primary text-primary-foreground" : active ? "bg-foreground text-background" : "bg-card"}`}>
                    {done ? "✓" : i + 1}
                  </div>
                  <span className="hidden sm:inline text-xs font-medium">{label}</span>
                </div>
                {i < STEPS.length - 1 && <div className={`flex-1 h-px ${done ? "bg-primary" : "bg-border"}`} />}
              </div>
            );
          })}
        </div>
      </div>

      <div className="relative mx-auto max-w-4xl px-6 pb-24">
        {step === 0 && <WhatsAppView onNext={() => setStep(1)} />}
        {step === 1 && <IntakeForm onSubmit={(i) => { setIntake(i); setStep(2); }} />}
        {step === 2 && intake && <PlanView intake={intake} onNext={() => setStep(3)} />}
        {step === 3 && intake && <VoteView intake={intake} onNext={() => setStep(4)} />}
        {step === 4 && intake && <ContributionsView intake={intake} onNext={() => setStep(5)} />}
        {step === 5 && intake && <DuringTripView intake={intake} onNext={() => setStep(6)} />}
        {step === 6 && intake && <AfterTripView intake={intake} onRestart={reset} />}
      </div>
    </main>
  );
};

export default Demo;
