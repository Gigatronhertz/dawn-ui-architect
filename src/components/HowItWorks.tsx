const phases = [
  {
    n: "01",
    title: "Create the trip",
    desc: "Nine quick questions. Where from, where to, vibe, budget, accommodation type, and more. Done in under two minutes.",
    accent: "bg-primary",
  },
  {
    n: "02",
    title: "We auto-plan it",
    desc: "AI builds the itinerary, surfaces three hotels, calculates in-city movement, and gives you one clean cost.",
    accent: "bg-google-yellow",
  },
  {
    n: "03",
    title: "Share to WhatsApp",
    desc: "The bot joins your group, posts the plan, runs the date and hotel votes — everyone stays in sync.",
    accent: "bg-google-purple",
  },
  {
    n: "04",
    title: "Collect contributions",
    desc: "Each member gets a personal Paystack link. Live tracker. Auto reminders. No spreadsheet, no drama.",
    accent: "bg-google-green",
  },
];

export const HowItWorks = () => (
  <section id="how" className="py-28 md:py-36 bg-secondary/40">
    <div className="mx-auto max-w-6xl px-6">
      <div className="text-center max-w-2xl mx-auto">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">How it works</span>
        <h2 className="font-display text-2xl md:text-4xl font-semibold tracking-tight mt-3 leading-[1.05]">
          Four steps. No spreadsheet.
        </h2>
      </div>

      <div className="mt-20 grid md:grid-cols-2 gap-6">
        {phases.map((p) => (
          <div
            key={p.n}
            className="relative rounded-3xl bg-card ring-hairline p-8 md:p-10 overflow-hidden"
          >
            <div className={`absolute top-0 left-0 h-1 w-16 ${p.accent} rounded-br-full`} />
            <div className="flex items-baseline gap-4">
              <span className="font-display text-sm font-semibold text-muted-foreground tabular-nums">{p.n}</span>
              <h3 className="font-display text-xl md:text-2xl font-semibold tracking-tight">{p.title}</h3>
            </div>
            <p className="mt-4 text-[15px] md:text-base text-muted-foreground leading-relaxed pl-10">
              {p.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  </section>
);
