import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { KarijeLogo } from "@/components/Nav";
import { LAGOS_EXPERIENCES, type Experience, type DaySchedule } from "@/data/experiences";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { tripImageUrl } from "@/lib/tripImage";

// ── Types ─────────────────────────────────────────────────────────────────────
type ExploreStep = "browse" | "detail" | "share";

/** Vibe chips — `value` matches the `category` column on a curated trip. */
const VIBE_FILTERS: { value: string; emoji: string; label: string }[] = [
  { value: "all",       emoji: "🌍", label: "Everything" },
  { value: "adventure", emoji: "⛵", label: "Adventure" },
  { value: "culture",   emoji: "🎭", label: "Culture" },
  { value: "nature",    emoji: "🌿", label: "Nature" },
  { value: "leisure",   emoji: "🌊", label: "Chill" },
  { value: "food",      emoji: "🍽️", label: "Food" },
  { value: "nightlife", emoji: "🎉", label: "Nightlife" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatNGN(amount: number): string {
  return `₦${amount.toLocaleString("en-NG")}`;
}

const cdnImg = tripImageUrl;

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
  leisure:   "Chill",
  food:      "Food & Culture",
  nightlife: "Nightlife",
};

const CAT_COLOR: Record<string, string> = {
  adventure: "bg-forest text-parchment",
  culture:   "bg-primary text-white",
  nature:    "bg-sage text-parchment",
  leisure:   "bg-warm-grey text-white",
  food:      "bg-primary/90 text-white",
  nightlife: "bg-foreground text-background",
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

  // Curated trips for this city, from the API. LAGOS_EXPERIENCES is only an
  // offline fallback so the page still renders if the backend is unreachable.
  const [experiences, setExperiences] = useState<Experience[]>(LAGOS_EXPERIENCES);
  const [loading, setLoading] = useState(true);
  const [vibe, setVibe] = useState("all");

  useEffect(() => {
    let live = true;
    setLoading(true);
    api.getExperiences(city)
      .then(d => { if (live) setExperiences(d.experiences ?? []); })
      .catch(() => {/* keep whatever is on screen */})
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [city]);

  // Reset to browse when city changes
  useEffect(() => {
    setStep("browse");
    setSelected(null);
    setVibe("all");
  }, [city]);

  useEffect(() => {
    const titles: Record<ExploreStep, string> = {
      browse: `Explore ${city} · Karije`,
      detail: selected ? `${selected.name} · Karije` : `Explore ${city} · Karije`,
      share:  "Trip ready · Karije",
    };
    document.title = titles[step];
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step, selected, city]);

  // ── Save to the signed-in user's plans ──────────────────────────────────────
  const { user, getIdToken } = useAuth();
  const [saving, setSaving]   = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [saveErr, setSaveErr] = useState("");

  async function handleAddToPlan() {
    if (!selected) return;
    setSaving(true);
    setSaveErr("");
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Please sign in first.");
      const res = await api.addCuratedToPlan(selected.id, { days, squadSize }, token);
      setSavedId(res.tripId);
    } catch (err) {
      setSaveErr(err instanceof Error ? err.message : "Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  const shown = vibe === "all" ? experiences : experiences.filter(e => e.category === vibe);

  // Only offer a vibe chip when something in this city actually carries it.
  const availableVibes = VIBE_FILTERS.filter(
    v => v.value === "all" || experiences.some(e => e.category === v.value)
  );

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
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <p className="font-jost font-light text-sm text-muted-foreground leading-relaxed max-w-xl mb-6">
              Trips we've picked, priced and will run for your squad. Pick one, choose your
              days and squad size, and we handle the rest.
            </p>

            {/* Vibe filter — chips only appear for vibes this city actually has */}
            {availableVibes.length > 1 && (
              <div className="flex gap-2 flex-wrap">
                {availableVibes.map(({ value, emoji, label }) => (
                  <button
                    key={value}
                    onClick={() => setVibe(value)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 border text-sm font-jost transition-colors ${
                      vibe === value
                        ? "border-forest bg-forest/5 text-forest font-medium"
                        : "border-border text-muted-foreground font-light hover:border-forest hover:text-forest"
                    }`}
                  >
                    <span>{emoji}</span>
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {loading && (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="border border-border animate-pulse">
                  <div className="h-40 bg-secondary" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-secondary" />
                    <div className="h-3 w-2/3 bg-secondary" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && shown.length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {shown.map((exp) => (
                <ExperienceCard
                  key={exp.id}
                  exp={exp}
                  onSelect={() => handleSelect(exp)}
                />
              ))}
            </div>
          )}

          {/* Nothing for this city yet, or nothing under the chosen vibe */}
          {!loading && shown.length === 0 && (
            <div className="border border-border p-10 text-center">
              <div className="text-4xl mb-4">🗺️</div>
              <h2 className="font-marcellus text-2xl text-foreground mb-3">
                {experiences.length === 0
                  ? `Curated trips for ${city} coming soon`
                  : `No ${VIBE_FILTERS.find(v => v.value === vibe)?.label.toLowerCase()} trips in ${city}`}
              </h2>
              <p className="font-jost font-light text-sm text-muted-foreground leading-relaxed max-w-md mx-auto mb-6">
                {experiences.length === 0
                  ? `We're picking and pricing the first ${city} trips now. Try another city — or plan a trip between cities instead.`
                  : `Nothing under that vibe here yet. Try another one, or browse everything in ${city}.`}
              </p>
              {experiences.length === 0 ? (
                <Link
                  to="/start/trip"
                  className="inline-flex items-center gap-2 bg-forest text-parchment px-6 py-3 text-sm font-jost font-medium tracking-[0.06em] hover:bg-primary transition-colors"
                >
                  Plan a trip between cities
                  <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M13 5l7 7-7 7" />
                  </svg>
                </Link>
              ) : (
                <button
                  onClick={() => setVibe("all")}
                  className="inline-flex items-center gap-2 bg-forest text-parchment px-6 py-3 text-sm font-jost font-medium tracking-[0.06em] hover:bg-primary transition-colors"
                >
                  Show everything in {city}
                </button>
              )}
            </div>
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

                {/* Save it for later — needs an account, since it persists */}
                {savedId ? (
                  <Link
                    to="/my-plans"
                    className="w-full flex items-center justify-center gap-2 border border-forest text-forest py-3.5 font-jost font-medium text-sm tracking-[0.06em] hover:bg-forest/5 transition-colors"
                  >
                    ✓ Saved — view in My Plans
                  </Link>
                ) : user ? (
                  <button
                    onClick={handleAddToPlan}
                    disabled={saving}
                    className="w-full border border-border text-foreground py-3.5 font-jost font-light text-sm tracking-[0.06em] hover:border-forest hover:text-forest transition-colors disabled:opacity-50"
                  >
                    {saving ? "Saving…" : "+ Add to my plans"}
                  </button>
                ) : (
                  <Link
                    to="/login?redirect=/start/explore"
                    className="w-full flex items-center justify-center border border-border text-foreground py-3.5 font-jost font-light text-sm tracking-[0.06em] hover:border-forest hover:text-forest transition-colors"
                  >
                    Sign in to save this trip
                  </Link>
                )}

                {saveErr && (
                  <p className="text-[11px] font-jost font-light text-red-500 text-center">{saveErr}</p>
                )}

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
            Your {city} trip is set.
          </h1>
          <p className="font-jost font-light text-base text-muted-foreground mb-10 leading-relaxed">
            Karije runs this one — we're the organisers. Share it to your squad, and pick how
            you want to handle payment below.
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

            {savedId ? (
              <Link
                to="/my-plans"
                className="w-full flex items-center justify-center gap-2 border border-forest text-forest py-3.5 font-jost font-medium text-sm tracking-[0.06em] hover:bg-forest/5 transition-colors"
              >
                ✓ Saved — view in My Plans
              </Link>
            ) : user ? (
              <button
                onClick={handleAddToPlan}
                disabled={saving}
                className="w-full border border-border text-foreground py-3.5 font-jost font-light text-sm tracking-[0.06em] hover:border-forest hover:text-forest transition-colors disabled:opacity-50"
              >
                {saving ? "Saving…" : "+ Save to my plans"}
              </button>
            ) : (
              <Link
                to="/login?redirect=/start/explore"
                className="w-full flex items-center justify-center border border-border text-foreground py-3.5 font-jost font-light text-sm tracking-[0.06em] hover:border-forest hover:text-forest transition-colors"
              >
                Sign in to save this trip
              </Link>
            )}

            {saveErr && (
              <p className="text-[11px] font-jost font-light text-red-500 text-center">{saveErr}</p>
            )}
          </div>

          {/* Three ways to settle up — Karije is the organiser on curated trips */}
          <div className="border-t border-border pt-8 mb-10">
            <div className="flex items-center gap-4 mb-5">
              <span className="h-px w-6 bg-primary" />
              <span className="text-[10px] font-jost font-light tracking-label text-muted-foreground uppercase">
                How your squad pays
              </span>
            </div>
            <div className="space-y-3">
              {[
                {
                  emoji: "💬",
                  title: "Add us to your group",
                  body: `Drop Karije into your squad's WhatsApp group and we'll coordinate the ${selected.name} run from there — headcount, reminders, the lot.`,
                },
                {
                  emoji: "🔗",
                  title: "Send everyone a link",
                  body: `Each person registers and pays their own ${formatNGN(perPersonTotal)} — you don't have to chase anybody or front the money.`,
                },
                {
                  emoji: "💳",
                  title: "Pay for everything at once",
                  body: `Settle the full ${formatNGN(totalCost)} yourself and sort your squad out however you like.`,
                },
              ].map((opt) => (
                <div key={opt.title} className="border border-border p-4 flex gap-4">
                  <span className="text-2xl shrink-0 leading-none">{opt.emoji}</span>
                  <div>
                    <div className="font-jost font-medium text-sm text-foreground mb-1">{opt.title}</div>
                    <p className="font-jost font-light text-[13px] text-muted-foreground leading-relaxed">
                      {opt.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] font-jost font-light text-muted-foreground mt-4 leading-relaxed">
              Payment links go live once you've confirmed your headcount with us — nothing is charged today.
            </p>
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
                "Pick one of the three payment routes above and we take it from there",
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
  return null;
}
