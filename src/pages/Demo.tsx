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
};

type Hotel = { id: string; name: string; area: string; pricePerNight: number; rating: number; perks: string[] };
type DateOption = { id: string; label: string; sub: string };
type Member = { name: string; emoji: string; paid: boolean; share: number };

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

const fmtNGN = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n);

function buildPlan(intake: Intake) {
  const transport = intake.transport === "Charter bus" ? 7500 : intake.transport === "Flights" ? 95000 : 4500;
  const transportTotal = transport * intake.squadSize;
  const hotel = HOTELS[1]; // recommended
  const lodgingTotal = hotel.pricePerNight * intake.days * Math.ceil(intake.squadSize / 2);
  const food = 6500 * intake.days * intake.squadSize;
  const activities = 9000 * intake.squadSize;
  const buffer = Math.round((transportTotal + lodgingTotal + food + activities) * 0.07);
  const total = transportTotal + lodgingTotal + food + activities + buffer;
  const perPerson = Math.round(total / intake.squadSize);
  return { transport, transportTotal, hotel, lodgingTotal, food, activities, buffer, total, perPerson };
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
        eyebrow="Step 1 of 5 · WhatsApp"
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
      <StepHeader eyebrow="Step 2 of 5 · Intake" title="Tell us about the trip." sub={`${STEP1_QUESTIONS} quick questions. Under two minutes. The bot is asking — answer for the squad.`} />
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
          <div className="flex flex-wrap gap-2">{["Charter bus", "Public transport", "Flights"].map((t) => <button key={t} type="button" onClick={() => set("transport", t)} className={chipCls(intake.transport === t)}>{t}</button>)}</div>
        </Field>
        <div className="md:col-span-2">
          <Field n={9} label="Add-ons (pick any)">
            <div className="flex flex-wrap gap-2">{EXTRAS_ALL.map((x) => <button key={x} type="button" onClick={() => toggleExtra(x)} className={chipCls(intake.extras.includes(x))}>{x}</button>)}</div>
          </Field>
        </div>
      </div>
      <div className="mt-8 flex justify-end">
        <PrimaryBtn onClick={() => onSubmit(intake)}>Generate plan with AI</PrimaryBtn>
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
        <StepHeader eyebrow="Step 3 of 5 · AI Planning" title="Gemini is cooking…" />
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
        <StepHeader eyebrow="Step 3 of 5 · AI Plan" title={`${intake.origin} → ${intake.destination}`} sub={`${intake.days} days · ${intake.squadSize} people · ${intake.vibe.toLowerCase()} vibe`} />

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
      <StepHeader eyebrow="Step 4 of 5 · Vote" title="Squad picks the details." sub={`${intake.squadSize} members are voting in real time. Tap to cast yours.`} />

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
function ContributionsView({ intake, onRestart }: { intake: Intake; onRestart: () => void }) {
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
      <StepHeader eyebrow="Step 5 of 5 · Contributions" title="Live payment tracker." sub="The bot DMs each member their own Paystack link. No spreadsheet, no chasing." />

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
const STEPS = ["WhatsApp", "Intake", "AI Plan", "Vote", "Pay"];

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
        {step === 0 && <IntakeForm onSubmit={(i) => { setIntake(i); setStep(1); }} />}
        {step === 1 && intake && <PlanView intake={intake} onNext={() => setStep(2)} />}
        {step === 2 && intake && <VoteView intake={intake} onNext={() => setStep(3)} />}
        {step === 3 && intake && <ContributionsView intake={intake} onRestart={reset} />}
      </div>
    </main>
  );
};

export default Demo;
