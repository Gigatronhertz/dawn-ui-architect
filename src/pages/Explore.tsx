import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { KarijeLogo } from "@/components/Nav";
import { LAGOS_EXPERIENCES, type Experience, type DaySchedule } from "@/data/experiences";

// ── Types ─────────────────────────────────────────────────────────────────────
type ExploreStep = "browse" | "detail" | "share";

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
      className="group border border-border text-left flex flex-col overflow-hidden hover:border-primary hover:shadow-card transition-all"
    >
      {/* Photo */}
      <div
        className="relative h-44 overflow-hidden"
        style={{ backgroundColor: exp.colorFallback }}
      >
        <img
          src={cdnImg(exp.imageId, 600, 350)}
          alt={exp.name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          loading="lazy"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        {/* Category tag */}
        <span className={`absolute top-3 left-3 text-[10px] font-jost font-medium tracking-wide px-2 py-1 ${CAT_COLOR[exp.category]}`}>
          {CAT_LABEL[exp.category]}
        </span>
        {/* Day cap badge */}
        {exp.maxDays === 1 && (
          <span className="absolute top-3 right-3 text-[10px] font-jost font-light px-2 py-1 bg-black/40 text-white">
            1 day
          </span>
        )}
        {exp.maxDays > 1 && (
          <span className="absolute top-3 right-3 text-[10px] font-jost font-light px-2 py-1 bg-black/40 text-white">
            Up to {exp.maxDays} days
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col gap-3">
        <div>
          <h3 className="font-marcellus text-lg text-foreground">{exp.name}</h3>
          <p className="text-[11px] font-jost font-light text-muted-foreground mt-0.5">
            📍 {exp.location}
          </p>
        </div>
        <p className="text-sm font-jost font-light text-muted-foreground leading-relaxed flex-1">
          {exp.tagline}
        </p>

        {/* Price + CTA row */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div>
            <span className="font-marcellus text-base text-foreground">
              {formatNGN(exp.pricePerPersonPerDay)}
            </span>
            <span className="text-[11px] font-jost font-light text-muted-foreground">
              {" "}/person/day
            </span>
          </div>
          <span className="text-xs font-jost font-medium text-primary group-hover:underline">
            See details →
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
export default function Explore() {
  const [step, setStep] = useState<ExploreStep>("browse");
  const [selected, setSelected] = useState<Experience | null>(null);
  const [days, setDays] = useState(1);
  const [squadSize, setSquadSize] = useState(6);

  useEffect(() => {
    document.title = step === "browse"
      ? "Explore Lagos · Karije"
      : step === "detail" && selected
      ? `${selected.name} · Karije`
      : "Trip ready · Karije";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step, selected]);

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
            <h1 className="font-marcellus text-3xl md:text-4xl text-foreground mb-6">
              Lagos experiences
            </h1>

            {/* State selector */}
            <div className="flex gap-2 flex-wrap mb-6">
              <span className="bg-forest text-parchment px-4 py-1.5 text-sm font-jost font-medium">
                Lagos ✓
              </span>
              {["Abuja", "Rivers", "Delta", "Oyo", "Anambra"].map((s) => (
                <span
                  key={s}
                  className="border border-border px-4 py-1.5 text-sm font-jost font-light text-muted-foreground/60 cursor-not-allowed select-none"
                  title="Coming soon"
                >
                  {s} <span className="text-[10px]">· soon</span>
                </span>
              ))}
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
              <div
                className="flex items-center gap-2 px-4 py-2 border border-border text-sm font-jost font-light text-muted-foreground/50 cursor-not-allowed select-none"
                title="Coming soon"
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z" />
                  <path d="M12 6v6l4 2" />
                </svg>
                AI-planned
                <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 font-medium">
                  Soon
                </span>
              </div>
            </div>
          </div>

          {/* Experience grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {LAGOS_EXPERIENCES.map((exp) => (
              <ExperienceCard
                key={exp.id}
                exp={exp}
                onSelect={() => handleSelect(exp)}
              />
            ))}
          </div>
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

  return null;
}
