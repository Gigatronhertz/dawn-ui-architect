import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { KarijeLogo } from "@/components/Nav";
import { LAGOS_EXPERIENCES, type Experience, type DaySchedule } from "@/data/experiences";
import { api } from "@/lib/api";
import type { AIPlan } from "@/lib/experienceTypes";
import type { CuratedTrip } from "@/lib/tripTypes";

// ── Types ─────────────────────────────────────────────────────────────────────
type ExploreStep = "browse" | "detail" | "share" | "ai-form" | "ai-result";

type AiVibe  = "Chill" | "Nightlife" | "Foodie" | "Adventure" | "Cultural";
type Budget  = "low" | "medium" | "high";

const VIBE_OPTIONS: { value: AiVibe; emoji: string; label: string }[] = [
  { value: "Chill",     emoji: "🌊", label: "Chill & relax" },
  { value: "Nightlife", emoji: "🎉", label: "Nightlife" },
  { value: "Foodie",    emoji: "🍽️", label: "Foodie tour" },
  { value: "Adventure", emoji: "⛵", label: "Adventure" },
  { value: "Cultural",  emoji: "🎭", label: "Cultural" },
];

const BUDGET_OPTIONS: { value: Budget; label: string; sub: string }[] = [
  { value: "low",    label: "Budget",   sub: "Under ₦15k/person" },
  { value: "medium", label: "Mid-range", sub: "₦15k–40k/person" },
  { value: "high",   label: "Premium",  sub: "₦40k+/person" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatNGN(amount: number): string {
  return `₦${amount.toLocaleString("en-NG")}`;
}

function cdnImg(id: string, w: number, h: number): string {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;
}

function getScheduleForDays(exp: Experience, days: number): DaySchedule[][] {
  const result: DaySchedule[][] = [];
  for (let d = 0; d < days; d++) {
    const override = exp.scheduleOverrides?.[d];
    result.push(override ?? exp.schedule);
  }
  return result;
}

// ── Category metadata ─────────────────────────────────────────────────────────
const CAT_LABEL: Record<string, string> = {
  adventure: "Adventure",
  culture:   "Culture",
  nature:    "Nature",
  leisure:   "Leisure",
  food:      "Food & Culture",
};

const CAT_COLOR: Record<string, string> = {
  adventure: "bg-forest text-parchment",
  culture:   "bg-primary text-white",
  nature:    "bg-sage text-parchment",
  leisure:   "bg-warm-grey text-white",
  food:      "bg-primary/90 text-white",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function PageHeader({ onBack }: { onBack?: () => void }) {
  return (
    <header className="relative pt-8 pb-4">
      <div className="mx-auto max-w-5xl px-6 flex items-center justify-between">
        <KarijeLogo />
        {onBack ? (
          <button
            onClick={onBack}
            className="text-xs font-jost font-light text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back
          </button>
        ) : (
          <Link
            to="/start"
            className="text-xs font-jost font-light text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Change trip type
          </Link>
        )}
      </div>
    </header>
  );
}

function ExperienceCard({ exp, onSelect }: { exp: Experience; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className="group relative aspect-square overflow-hidden text-left"
      style={{ backgroundColor: exp.colorFallback }}
    >
      {/* Full-bleed photo */}
      <img
        src={cdnImg(exp.imageId, 600, 600)}
        alt={exp.name}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
        loading="lazy"
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
      />

      {/* Gradient overlay — heavier at bottom */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/10" />

      {/* Top row: category + day cap */}
      <div className="absolute top-0 left-0 right-0 flex items-start justify-between p-3">
        <span className={`text-[10px] font-jost font-medium tracking-wide px-2 py-1 ${CAT_COLOR[exp.category]}`}>
          {CAT_LABEL[exp.category]}
        </span>
        <span className="text-[10px] font-jost font-light px-2 py-1 bg-black/50 text-white/90">
          {exp.maxDays === 1 ? "1 day" : `↑ ${exp.maxDays} days`}
        </span>
      </div>

      {/* Bottom: name, location, price */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <h3 className="font-marcellus text-base leading-snug text-white">{exp.name}</h3>
        <p className="text-[11px] font-jost font-light text-white/60 mt-0.5 truncate">📍 {exp.location}</p>
        <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-white/15">
          <span className="font-marcellus text-sm text-white">
            {formatNGN(exp.pricePerPersonPerDay)}
            <span className="text-[10px] font-jost font-light text-white/55">/p·day</span>
          </span>
          <span className="text-[11px] font-jost font-light text-white/70 group-hover:text-white transition">
            Explore →
          </span>
        </div>
      </div>
    </button>
  );
}

function RangeSlider({
  label,
  value,
  min,
  max,
  onChange,
  format = (v: number) => String(v),
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-sm font-jost font-light text-foreground">{label}</span>
        <span className="font-marcellus text-lg text-foreground">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-[3px] bg-border rounded-full appearance-none cursor-pointer"
        style={{ accentColor: "hsl(var(--primary))" }}
      />
      <div className="flex justify-between mt-1.5">
        <span className="text-[10px] font-jost font-light text-muted-foreground">{format(min)}</span>
        <span className="text-[10px] font-jost font-light text-muted-foreground">{format(max)}</span>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
// Cities with curated experience data vs cities that use AI-only
const CITIES_WITH_DATA = ["Lagos"];
const ALL_EXPLORE_CITIES = [
  "Lagos", "Abuja", "Port Harcourt", "Ibadan", "Enugu",
  "Calabar", "Benin City", "Kano", "Kaduna", "Jos",
  "Abeokuta", "Ilorin", "Akure", "Owerri", "Warri",
];

export default function Explore() {
  const [step, setStep]     = useState<ExploreStep>("browse");
  const [selected, setSelected] = useState<Experience | null>(null);
  const [days, setDays]     = useState(1);
  const [squadSize, setSquadSize] = useState(6);
  const [city, setCity]     = useState("Lagos");

  const hasData = CITIES_WITH_DATA.includes(city);

  // Experiences from API (falls back to local seed)
  const [experiences, setExperiences] = useState<Experience[]>(LAGOS_EXPERIENCES);

  // AI planning state
  const [aiVibe, setAiVibe]       = useState<AiVibe>("Chill");
  const [aiGroupSize, setAiGroup] = useState(6);
  const [aiBudget, setAiBudget]   = useState<Budget>("medium");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError]     = useState("");
  const [aiPlan, setAiPlan]       = useState<AIPlan | null>(null);

  // Ready-made trips whose destination is this city's state. The API resolves
  // city → state, so "Port Harcourt" correctly returns the Rivers trips.
  const [cityTrips, setCityTrips] = useState<CuratedTrip[]>([]);

  // Fetch curated experiences whenever city changes
  useEffect(() => {
    if (!hasData) return;
    api.getExperiences(city)
      .then(d => { if (d.experiences?.length) setExperiences(d.experiences); })
      .catch(() => {/* silently keep local fallback */});
  }, [city, hasData]);

  useEffect(() => {
    let live = true;
    setCityTrips([]);
    api.getCuratedTrips(city)
      .then(d => { if (live) setCityTrips(d.trips ?? []); })
      .catch(() => {/* section just stays hidden */});
    return () => { live = false; };
  }, [city]);

  // Reset to browse when city changes
  useEffect(() => {
    setStep("browse");
    setSelected(null);
    setAiPlan(null);
  }, [city]);

  useEffect(() => {
    const titles: Record<ExploreStep, string> = {
      browse:     `Explore ${city} · Karije`,
      detail:     selected ? `${selected.name} · Karije` : `Explore ${city} · Karije`,
      share:      "Trip ready · Karije",
      "ai-form":  `AI Day Plan · ${city} · Karije`,
      "ai-result":`Your ${city} plan · Karije`,
    };
    document.title = titles[step];
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step, selected, city]);

  async function handleAiPlan() {
    setAiLoading(true);
    setAiError("");
    try {
      const res = await api.explorePlan({
        state: city,
        vibe: aiVibe,
        groupSize: aiGroupSize,
        budget: aiBudget,
      });
      setAiPlan(res.plan);
      setStep("ai-result");
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setAiLoading(false);
    }
  }

  function handleSelect(exp: Experience) {
    setSelected(exp);
    setDays(1);
    setSquadSize(Math.max(6, exp.groupMin));
    setStep("detail");
  }

  const totalCost       = selected ? selected.pricePerPersonPerDay * days * squadSize : 0;
  const perPersonTotal  = selected ? selected.pricePerPersonPerDay * days : 0;

  // ── Step: Browse ─────────────────────────────────────────────────────────
  if (step === "browse") {
    return (
      <main className="min-h-screen bg-background">
        <PageHeader />

        <div className="mx-auto max-w-5xl px-6 pb-24">
          {/* Section header */}
          <div className="py-8 border-b border-border mb-8">
            <div className="flex items-center gap-4 mb-5">
              <span className="h-px w-8 bg-primary" />
              <span className="text-[10px] font-jost font-light tracking-label text-muted-foreground uppercase">
                Explore within a state
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
              <h1 className="font-marcellus text-3xl md:text-4xl text-foreground">
                Explore {city}
              </h1>
              {/* City picker */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-jost font-light text-muted-foreground">City:</span>
                <select
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  className="border border-border bg-background px-3 py-1.5 text-sm font-jost font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none pr-7 cursor-pointer"
                  style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='none' stroke='%238E93AA' stroke-width='1.5' stroke-linecap='round' d='M4 6l4 4 4-4'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 6px center", backgroundSize: "14px" }}
                >
                  {ALL_EXPLORE_CITIES.map(c => (
                    <option key={c} value={c}>{c}{!CITIES_WITH_DATA.includes(c) ? " (AI)" : ""}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Mode toggle */}
            <div className="flex gap-3">
              <div className="flex items-center gap-2 px-4 py-2 border border-forest bg-forest/5 text-sm font-jost font-medium text-forest">
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
                Curated experiences
              </div>
              <button
                onClick={() => setStep("ai-form")}
                className="flex items-center gap-2 px-4 py-2 border border-border text-sm font-jost font-light text-muted-foreground hover:border-forest hover:text-forest transition-colors"
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z" />
                  <path d="M12 6v6l4 2" />
                </svg>
                AI-planned
              </button>
            </div>
          </div>

          {/* No curated data for this city — prompt AI planner */}
          {!hasData ? (
            <div className="border border-border p-10 text-center">
              <div className="text-4xl mb-4">🗺️</div>
              <h2 className="font-marcellus text-2xl text-foreground mb-3">
                Curated experiences for {city} coming soon
              </h2>
              <p className="font-jost font-light text-sm text-muted-foreground leading-relaxed max-w-md mx-auto mb-6">
                We're building a hand-picked collection of {city} experiences. In the meantime, our AI can put together a custom day plan for your squad right now.
              </p>
              <button
                onClick={() => setStep("ai-form")}
                className="inline-flex items-center gap-2 bg-forest text-parchment px-6 py-3 text-sm font-jost font-medium tracking-[0.06em] hover:bg-primary transition-colors"
              >
                Get an AI day plan for {city}
                <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          ) : (
            /* Experience grid — 2-up on mobile, 3-up on desktop */
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {experiences.map((exp) => (
                <ExperienceCard
                  key={exp.id}
                  exp={exp}
                  onSelect={() => handleSelect(exp)}
                />
              ))}
            </div>
          )}

          {/* Ready-made trips for this state — packaged alternative to planning
              a day yourself. Hidden entirely when the state has none. */}
          {cityTrips.length > 0 && (
            <section className="mt-14">
              <div className="flex items-center gap-4 mb-5">
                <span className="h-px w-8 bg-primary" />
                <span className="text-[10px] font-jost font-light tracking-label text-muted-foreground uppercase">
                  Ready-made trips
                </span>
                <span className="h-px flex-1 bg-border" />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
                <div>
                  <h2 className="font-marcellus text-2xl text-foreground mb-1">
                    Or let us handle {cityTrips[0].state} entirely
                  </h2>
                  <p className="font-jost font-light text-sm text-muted-foreground leading-relaxed max-w-lg">
                    {cityTrips.length} packaged trip{cityTrips.length === 1 ? "" : "s"} with transport,
                    hotel and activities already locked in — no planning on your end.
                  </p>
                </div>
                <Link
                  to="/trips"
                  className="text-xs font-jost font-medium text-muted-foreground hover:text-primary transition-colors shrink-0"
                >
                  See all trips →
                </Link>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {cityTrips.map((trip) => (
                  <Link
                    key={trip.id}
                    to={`/trips?trip=${encodeURIComponent(trip.id)}`}
                    className="group border border-border hover:border-primary/40 transition-colors relative overflow-hidden flex flex-col"
                  >
                    <div
                      className="absolute top-0 left-0 right-0 h-1 z-10"
                      style={{ backgroundColor: trip.colorFallback }}
                    />

                    {trip.imageId && (
                      <div className="h-28 overflow-hidden" style={{ backgroundColor: trip.colorFallback }}>
                        <img
                          src={cdnImg(trip.imageId, 640, 360)}
                          alt=""
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      </div>
                    )}

                    <div className="p-5 flex flex-col flex-1">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="text-2xl">{trip.emoji}</div>
                        {trip.tag && (
                          <span className="text-[10px] font-jost font-light tracking-label text-muted-foreground uppercase border border-border px-2 py-1 rounded-full">
                            {trip.tag}
                          </span>
                        )}
                      </div>

                      <h3 className="font-marcellus text-lg text-foreground mb-1 leading-snug">
                        {trip.name}
                      </h3>
                      <p className="text-[11px] font-jost font-light text-muted-foreground mb-4">
                        {trip.days} day{trip.days === 1 ? "" : "s"} · from {trip.origin}
                      </p>

                      <div className="flex items-end justify-between border-t border-border/60 pt-3 mt-auto">
                        <div>
                          <div className="font-marcellus text-lg text-foreground leading-none">
                            {formatNGN(trip.priceFrom)}
                          </div>
                          <div className="text-[10px] font-jost font-light text-muted-foreground mt-0.5">
                            per person
                          </div>
                        </div>
                        <span className="text-[11px] font-jost font-medium text-muted-foreground group-hover:text-primary transition-colors">
                          View →
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    );
  }

  // ── Step: Detail ─────────────────────────────────────────────────────────
  if (step === "detail" && selected) {
    const daySchedules = getScheduleForDays(selected, days);

    return (
      <main className="min-h-screen bg-background">
        <PageHeader onBack={() => setStep("browse")} />

        <div className="mx-auto max-w-5xl px-6 pb-24">
          {/* Hero photo */}
          <div
            className="relative h-56 md:h-72 overflow-hidden mb-8"
            style={{ backgroundColor: selected.colorFallback }}
          >
            <img
              src={cdnImg(selected.imageId, 1200, 580)}
              alt={selected.name}
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
            <div className="absolute bottom-6 left-6 text-white">
              <span
                className={`text-[10px] font-jost font-medium tracking-wide px-2 py-1 mb-3 inline-block ${CAT_COLOR[selected.category]}`}
              >
                {CAT_LABEL[selected.category]}
              </span>
              <h2 className="font-marcellus text-3xl md:text-4xl leading-snug">
                {selected.name}
              </h2>
              <p className="font-jost font-light text-sm opacity-75 mt-1">
                📍 {selected.location}
              </p>
            </div>
          </div>

          {/* Two-column layout */}
          <div className="grid lg:grid-cols-[1fr,340px] gap-10">
            {/* ── Left: info & schedule ────── */}
            <div className="space-y-8 min-w-0">
              {/* Description */}
              <p className="font-jost font-light text-base text-foreground leading-relaxed">
                {selected.description}
              </p>

              {/* Why this one */}
              <div>
                <div className="flex items-center gap-4 mb-4">
                  <span className="h-px w-6 bg-primary" />
                  <span className="text-[10px] font-jost font-light tracking-label text-muted-foreground uppercase">
                    Why this one
                  </span>
                </div>
                <ul className="space-y-2.5">
                  {selected.highlights.map((h) => (
                    <li key={h} className="flex items-start gap-3">
                      <span className="text-primary mt-0.5 text-[8px] shrink-0">◆</span>
                      <span className="font-jost font-light text-sm text-foreground">{h}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* What's included */}
              <div>
                <div className="flex items-center gap-4 mb-4">
                  <span className="h-px w-6 bg-primary" />
                  <span className="text-[10px] font-jost font-light tracking-label text-muted-foreground uppercase">
                    What's included
                  </span>
                </div>
                <div className="grid sm:grid-cols-2 gap-y-2.5 gap-x-6">
                  {selected.included.map((item) => (
                    <div key={item} className="flex items-start gap-2.5">
                      <svg
                        className="w-4 h-4 text-forest mt-0.5 shrink-0"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                      <span className="font-jost font-light text-sm text-foreground">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Day-by-day schedule */}
              <div>
                <div className="flex items-center gap-4 mb-4">
                  <span className="h-px w-6 bg-primary" />
                  <span className="text-[10px] font-jost font-light tracking-label text-muted-foreground uppercase">
                    Day plan{days > 1 ? ` · ${days} days` : ""}
                  </span>
                </div>

                {daySchedules.map((sched, dayIdx) => (
                  <div key={dayIdx} className={dayIdx > 0 ? "mt-8" : ""}>
                    {days > 1 && (
                      <div className="font-marcellus text-sm text-forest mb-4 flex items-center gap-3">
                        <span>Day {dayIdx + 1}</span>
                        <span className="flex-1 h-px bg-border" />
                      </div>
                    )}
                    <div className="space-y-0">
                      {sched.map((slot, i) => (
                        <div
                          key={i}
                          className="flex gap-5 py-3 border-b border-border last:border-0"
                        >
                          <div className="w-14 shrink-0 pt-0.5">
                            <span className="text-[11px] font-jost font-light text-muted-foreground tabular-nums">
                              {slot.time}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="font-jost font-medium text-sm text-foreground">
                              {slot.activity}
                            </div>
                            {slot.details && (
                              <div className="font-jost font-light text-xs text-muted-foreground mt-0.5">
                                {slot.details}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {selected.notes && (
                  <div className="mt-5 p-4 border-l-2 border-primary bg-primary/5">
                    <p className="font-jost font-light text-xs text-foreground/70 leading-relaxed">
                      {selected.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* ── Right: sticky config panel ────── */}
            <div className="lg:sticky lg:top-8 self-start">
              <div className="border border-border p-6 space-y-6">
                <div className="flex items-center gap-4">
                  <span className="h-px w-6 bg-primary" />
                  <span className="text-[10px] font-jost font-light tracking-label text-muted-foreground uppercase">
                    Configure your trip
                  </span>
                </div>

                {/* Days slider */}
                <div>
                  <RangeSlider
                    label="Number of days"
                    value={days}
                    min={1}
                    max={selected.maxDays}
                    onChange={setDays}
                    format={(v) => (v === 1 ? "1 day" : `${v} days`)}
                  />
                  {selected.maxDays === 1 && (
                    <p className="text-[11px] font-jost font-light text-muted-foreground mt-2 leading-relaxed">
                      1-day experience. Book back-to-back for a repeat with the same squad.
                    </p>
                  )}
                </div>

                {/* Squad size slider */}
                <RangeSlider
                  label="Squad size"
                  value={squadSize}
                  min={selected.groupMin}
                  max={Math.min(selected.groupMax, 40)}
                  onChange={setSquadSize}
                  format={(v) => `${v} people`}
                />

                {/* Price breakdown */}
                <div className="border-t border-border pt-4 space-y-2">
                  <div className="text-xs font-jost font-light text-muted-foreground">
                    {formatNGN(selected.pricePerPersonPerDay)} × {days}{" "}
                    {days === 1 ? "day" : "days"} × {squadSize} people
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs font-jost font-light text-muted-foreground">
                      Squad total
                    </span>
                    <span className="font-marcellus text-2xl text-foreground">
                      {formatNGN(totalCost)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs font-jost font-light text-muted-foreground">
                    <span>Per person</span>
                    <span className="font-medium text-foreground">{formatNGN(perPersonTotal)}</span>
                  </div>
                </div>

                {/* CTA */}
                <button
                  onClick={() => setStep("share")}
                  className="w-full bg-forest text-parchment py-4 font-jost font-medium text-sm tracking-[0.06em] hover:bg-primary transition-colors"
                >
                  Share with squad →
                </button>

                <p className="text-[10px] font-jost font-light text-muted-foreground text-center leading-relaxed">
                  No payment collected here — you share the plan first, squad confirms, then payment comes next.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ── Step: Share ───────────────────────────────────────────────────────────
  if (step === "share" && selected) {
    const includedLines = selected.included.map((i) => `✅ ${i}`).join("\n");
    const waText = encodeURIComponent(
      `Hey squad! 🎉\n\nWe're doing this:\n\n` +
      `*${selected.name}*\n` +
      `📍 ${selected.location}\n` +
      `📅 ${days} ${days === 1 ? "day" : "days"}\n` +
      `👥 ${squadSize} people\n` +
      `💰 ${formatNGN(perPersonTotal)} per person\n` +
      `💰 ${formatNGN(totalCost)} total for the squad\n\n` +
      `What's included:\n${includedLines}\n\n` +
      `Drop your name below if you're in 👇\n\n` +
      `— Planned with Karije 🌍`
    );

    const clipboardText =
      `${selected.name} · ${selected.location}\n` +
      `${days} day${days > 1 ? "s" : ""} · ${squadSize} people\n` +
      `${formatNGN(perPersonTotal)}/person · ${formatNGN(totalCost)} total\n\n` +
      `Planned with Karije — karije.com`;

    return (
      <main className="min-h-screen bg-background">
        <PageHeader onBack={() => setStep("detail")} />

        <div className="mx-auto max-w-2xl px-6 pb-24">
          {/* Eyebrow */}
          <div className="flex items-center gap-4 mb-6">
            <span className="h-px w-8 bg-primary" />
            <span className="text-[10px] font-jost font-light tracking-label text-muted-foreground uppercase">
              Trip ready
            </span>
          </div>

          <h1 className="font-marcellus text-3xl text-foreground mb-2 leading-snug">
            Your Lagos trip is set.
          </h1>
          <p className="font-jost font-light text-base text-muted-foreground mb-10 leading-relaxed">
            Share to your squad's WhatsApp group — everyone confirms their spot, and you're done.
          </p>

          {/* Summary card */}
          <div className="border border-border p-6 mb-6">
            <div className="flex items-start gap-4">
              {/* Thumbnail */}
              <div
                className="w-20 h-20 overflow-hidden shrink-0"
                style={{ backgroundColor: selected.colorFallback }}
              >
                <img
                  src={cdnImg(selected.imageId, 160, 160)}
                  alt={selected.name}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <h2 className="font-marcellus text-xl text-foreground">{selected.name}</h2>
                <p className="text-[11px] font-jost font-light text-muted-foreground mt-0.5">
                  {selected.location}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-y-3 gap-x-4">
                  {[
                    { label: "Days",       value: String(days) },
                    { label: "People",     value: String(squadSize) },
                    { label: "Per person", value: formatNGN(perPersonTotal) },
                    { label: "Total",      value: formatNGN(totalCost), accent: true },
                  ].map(({ label, value, accent }) => (
                    <div key={label}>
                      <div className="text-[10px] font-jost font-light text-muted-foreground uppercase tracking-wide mb-0.5">
                        {label}
                      </div>
                      <div className={`font-marcellus text-lg ${accent ? "text-primary" : "text-foreground"}`}>
                        {value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-3 mb-10">
            <a
              href={`https://wa.me/?text=${waText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-3 bg-[#25D366] text-white py-4 font-jost font-medium text-sm tracking-[0.06em] hover:opacity-90 transition-opacity"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Share to WhatsApp group
            </a>

            <button
              onClick={() => {
                navigator.clipboard?.writeText(clipboardText).catch(() => {});
              }}
              className="w-full flex items-center justify-center gap-2 border border-border text-foreground py-3.5 font-jost font-light text-sm tracking-[0.06em] hover:border-primary hover:text-primary transition-colors"
            >
              Copy trip summary
            </button>
          </div>

          {/* What happens next */}
          <div className="border-t border-border pt-8 mb-10">
            <div className="flex items-center gap-4 mb-5">
              <span className="h-px w-6 bg-primary" />
              <span className="text-[10px] font-jost font-light tracking-label text-muted-foreground uppercase">
                What happens next
              </span>
            </div>
            <ol className="space-y-4">
              {[
                "Share to your squad's WhatsApp group using the button above",
                "Everyone who's in confirms their spot by dropping their name",
                "Payment collection — Karije handles it (coming soon)",
              ].map((item, i) => (
                <li key={i} className="flex gap-4 items-start">
                  <span className="font-marcellus text-3xl text-border shrink-0 leading-none">
                    0{i + 1}
                  </span>
                  <span className="font-jost font-light text-sm text-muted-foreground leading-relaxed mt-2">
                    {item}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          {/* Navigation */}
          <div className="flex flex-col sm:flex-row gap-4 text-sm font-jost font-light text-muted-foreground">
            <button
              onClick={() => { setStep("browse"); setSelected(null); }}
              className="hover:text-foreground transition-colors"
            >
              ← Browse more experiences
            </button>
            <Link to="/start" className="hover:text-foreground transition-colors">
              Plan a different trip type
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ── Step: AI form ─────────────────────────────────────────────────────────
  if (step === "ai-form") {
    return (
      <main className="min-h-screen bg-background">
        <PageHeader onBack={() => setStep("browse")} />

        <div className="mx-auto max-w-xl px-6 pb-24">
          <div className="py-8 border-b border-border mb-8">
            <div className="flex items-center gap-4 mb-5">
              <span className="h-px w-8 bg-primary" />
              <span className="text-[10px] font-jost font-light tracking-label text-muted-foreground uppercase">
                AI day plan · {city}
              </span>
            </div>
            <h1 className="font-marcellus text-3xl text-foreground mb-2">
              What kind of day are you after?
            </h1>
            <p className="font-jost font-light text-sm text-muted-foreground leading-relaxed">
              Tell us your vibe, group size, and budget — we'll build a custom day plan for your squad.
            </p>
          </div>

          {/* Vibe */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <span className="h-px w-6 bg-primary" />
              <span className="text-[10px] font-jost font-light tracking-label text-muted-foreground uppercase">
                Vibe
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {VIBE_OPTIONS.map(({ value, emoji, label }) => (
                <button
                  key={value}
                  onClick={() => setAiVibe(value)}
                  className={`p-4 border text-left transition-colors ${
                    aiVibe === value
                      ? "border-forest bg-forest/5 text-forest"
                      : "border-border text-foreground hover:border-forest/50"
                  }`}
                >
                  <span className="text-xl block mb-1.5">{emoji}</span>
                  <span className="font-jost font-medium text-sm">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Group size */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <span className="h-px w-6 bg-primary" />
              <span className="text-[10px] font-jost font-light tracking-label text-muted-foreground uppercase">
                Group size
              </span>
            </div>
            <RangeSlider
              label="How many people?"
              value={aiGroupSize}
              min={2}
              max={40}
              onChange={setAiGroup}
              format={(v) => `${v} people`}
            />
          </div>

          {/* Budget */}
          <div className="mb-10">
            <div className="flex items-center gap-4 mb-4">
              <span className="h-px w-6 bg-primary" />
              <span className="text-[10px] font-jost font-light tracking-label text-muted-foreground uppercase">
                Budget
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {BUDGET_OPTIONS.map(({ value, label, sub }) => (
                <button
                  key={value}
                  onClick={() => setAiBudget(value)}
                  className={`p-4 border text-left transition-colors ${
                    aiBudget === value
                      ? "border-forest bg-forest/5 text-forest"
                      : "border-border text-foreground hover:border-forest/50"
                  }`}
                >
                  <div className="font-jost font-medium text-sm mb-0.5">{label}</div>
                  <div className="text-[11px] font-jost font-light opacity-60">{sub}</div>
                </button>
              ))}
            </div>
          </div>

          {aiError && (
            <p className="text-xs text-red-500 mb-4">{aiError}</p>
          )}

          <button
            onClick={handleAiPlan}
            disabled={aiLoading}
            className="w-full bg-forest text-parchment py-4 font-jost font-medium text-sm tracking-[0.06em] hover:bg-primary transition-colors disabled:opacity-60"
          >
            {aiLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-parchment/30 border-t-parchment rounded-full animate-spin" />
                Building your plan…
              </span>
            ) : `Build my ${city} plan →`}
          </button>
        </div>
      </main>
    );
  }

  // ── Step: AI result ───────────────────────────────────────────────────────
  if (step === "ai-result" && aiPlan) {
    const waText = encodeURIComponent(
      `Hey squad! 🎉\n\nKarije built us a custom ${city} day plan:\n\n` +
      `*${aiPlan.title}*\n${aiPlan.tagline}\n\n` +
      `👥 ${aiGroupSize} people · 💰 ~${formatNGN(aiPlan.estimatedCostPerPerson)}/person\n\n` +
      aiPlan.schedule.map((s) => `${s.time}  ${s.activity}`).join("\n") +
      `\n\nPlanned with Karije — karije.com 🌍`
    );
    const copyText =
      `${aiPlan.title} · ${city}\n` +
      `${aiGroupSize} people · ~${formatNGN(aiPlan.estimatedCostPerPerson)}/person\n\n` +
      aiPlan.schedule.map((s) => `${s.time}  ${s.activity}`).join("\n") +
      `\n\nPlanned with Karije — karije.com`;

    return (
      <main className="min-h-screen bg-background">
        <PageHeader onBack={() => setStep("ai-form")} />

        <div className="mx-auto max-w-2xl px-6 pb-24">
          {/* Eyebrow */}
          <div className="flex items-center gap-4 mb-6 mt-4">
            <span className="h-px w-8 bg-primary" />
            <span className="text-[10px] font-jost font-light tracking-label text-muted-foreground uppercase">
              Your AI day plan · {city}
            </span>
          </div>

          <h1 className="font-marcellus text-3xl text-foreground mb-2 leading-snug">{aiPlan.title}</h1>
          <p className="font-jost font-light text-base text-muted-foreground mb-8 leading-relaxed">{aiPlan.tagline}</p>

          {/* Cost summary */}
          <div className="border border-border p-5 mb-8 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-jost font-light text-muted-foreground uppercase tracking-wide mb-0.5">Est. per person</div>
              <div className="font-marcellus text-2xl text-foreground">{formatNGN(aiPlan.estimatedCostPerPerson)}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-jost font-light text-muted-foreground uppercase tracking-wide mb-0.5">Squad total</div>
              <div className="font-marcellus text-2xl text-foreground">{formatNGN(aiPlan.estimatedCostPerPerson * aiGroupSize)}</div>
            </div>
          </div>

          {/* Highlights */}
          {aiPlan.highlights.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-4 mb-4">
                <span className="h-px w-6 bg-primary" />
                <span className="text-[10px] font-jost font-light tracking-label text-muted-foreground uppercase">Highlights</span>
              </div>
              <ul className="space-y-2.5">
                {aiPlan.highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="text-primary mt-0.5 text-[8px] shrink-0">◆</span>
                    <span className="font-jost font-light text-sm text-foreground">{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Schedule */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <span className="h-px w-6 bg-primary" />
              <span className="text-[10px] font-jost font-light tracking-label text-muted-foreground uppercase">Day schedule</span>
            </div>
            <div className="space-y-0">
              {aiPlan.schedule.map((slot, i) => (
                <div key={i} className="flex gap-5 py-3 border-b border-border last:border-0">
                  <div className="w-14 shrink-0 pt-0.5">
                    <span className="text-[11px] font-jost font-light text-muted-foreground tabular-nums">{slot.time}</span>
                  </div>
                  <div className="flex-1">
                    <div className="font-jost font-medium text-sm text-foreground">{slot.activity}</div>
                    {slot.details && (
                      <div className="font-jost font-light text-xs text-muted-foreground mt-0.5">{slot.details}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Included */}
          {aiPlan.included.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center gap-4 mb-4">
                <span className="h-px w-6 bg-primary" />
                <span className="text-[10px] font-jost font-light tracking-label text-muted-foreground uppercase">What's included</span>
              </div>
              <div className="grid sm:grid-cols-2 gap-y-2.5 gap-x-6">
                {aiPlan.included.map((item) => (
                  <div key={item} className="flex items-start gap-2.5">
                    <svg className="w-4 h-4 text-forest mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    <span className="font-jost font-light text-sm text-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {aiPlan.notes && (
            <div className="mb-8 p-4 border-l-2 border-primary bg-primary/5">
              <p className="font-jost font-light text-xs text-foreground/70 leading-relaxed">{aiPlan.notes}</p>
            </div>
          )}

          {/* Share actions */}
          <div className="space-y-3 mb-10">
            <a
              href={`https://wa.me/?text=${waText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-3 bg-[#25D366] text-white py-4 font-jost font-medium text-sm tracking-[0.06em] hover:opacity-90 transition-opacity"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Share to WhatsApp group
            </a>
            <button
              onClick={() => navigator.clipboard?.writeText(copyText).catch(() => {})}
              className="w-full flex items-center justify-center gap-2 border border-border text-foreground py-3.5 font-jost font-light text-sm tracking-[0.06em] hover:border-primary hover:text-primary transition-colors"
            >
              Copy plan summary
            </button>
            <button
              onClick={() => { setAiPlan(null); setStep("ai-form"); }}
              className="w-full border border-border text-foreground py-3.5 font-jost font-light text-sm tracking-[0.06em] hover:border-primary hover:text-primary transition-colors"
            >
              ↺ Generate a different plan
            </button>
          </div>

          {/* Nav */}
          <div className="flex flex-col sm:flex-row gap-4 text-sm font-jost font-light text-muted-foreground">
            <button
              onClick={() => setStep("browse")}
              className="hover:text-foreground transition-colors"
            >
              ← Browse curated experiences instead
            </button>
            <Link to="/start" className="hover:text-foreground transition-colors">
              Plan a different trip type
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return null;
}
