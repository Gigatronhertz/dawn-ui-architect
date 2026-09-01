import { Link } from "react-router-dom";

// Karije "How it works" — 4 steps, editorial grid
const phases = [
  {
    n: "01",
    title: "Create the trip",
    desc: "Nine quick questions. Where from, where to, vibe, budget, accommodation type, and more. Done in under two minutes.",
    accent: "bg-forest",
  },
  {
    n: "02",
    title: "Karije auto-plans it",
    desc: "AI builds the itinerary, surfaces three hotels, calculates in-city movement, and gives you one clean cost per person.",
    accent: "bg-primary",
  },
  {
    n: "03",
    title: "Share to WhatsApp",
    desc: "The bot joins your group, posts the plan, runs the date and hotel votes — everyone stays in sync, no back-and-forth.",
    accent: "bg-sage",
  },
  {
    n: "04",
    title: "Collect contributions",
    desc: "Each member gets a personal Paystack link. Live tracker. Auto reminders. No spreadsheet, no drama.",
    accent: "bg-warm-grey",
  },
];

export const HowItWorks = () => (
  <section id="how" className="py-24 md:py-32 border-t border-border">
    <div className="mx-auto max-w-6xl px-6">
      {/* Heading */}
      <div className="flex items-end justify-between mb-14 gap-8">
        <div>
          <div className="flex items-center gap-4 mb-5">
            <span className="h-px w-8 bg-primary" />
            <span className="text-[10px] font-jost font-light tracking-label text-muted-foreground uppercase">
              How it works
            </span>
          </div>
          <h2 className="font-marcellus text-3xl md:text-4xl text-foreground leading-snug">
            Four steps.<br />No spreadsheet.
          </h2>
        </div>
        <Link
          to="/start"
          className="hidden md:inline-flex items-center gap-2 bg-forest text-parchment px-6 py-3 text-sm font-jost font-medium tracking-[0.06em] hover:bg-primary transition-colors shrink-0"
        >
          Try it free
        </Link>
      </div>

      {/* Step grid */}
      <div className="grid md:grid-cols-2 gap-px bg-border">
        {phases.map((p) => (
          <div
            key={p.n}
            className="relative bg-background p-8 md:p-10 flex flex-col gap-5 group hover:bg-card transition-colors"
          >
            {/* Top accent bar */}
            <div className={`absolute top-0 left-0 right-0 h-[3px] ${p.accent}`} />

            <div className="flex items-start justify-between">
              <span className="font-marcellus text-4xl text-border group-hover:text-foreground/25 transition-colors select-none">
                {p.n}
              </span>
            </div>

            <div>
              <h3 className="font-marcellus text-xl text-foreground mb-3">{p.title}</h3>
              <p className="font-jost font-light text-sm text-muted-foreground leading-relaxed">
                {p.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Mobile CTA */}
      <div className="mt-8 md:hidden">
        <Link
          to="/start"
          className="inline-flex items-center gap-2 bg-forest text-parchment px-7 py-3.5 text-sm font-jost font-medium tracking-[0.06em] hover:bg-primary transition-colors"
        >
          Try Karije free
          <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  </section>
);
