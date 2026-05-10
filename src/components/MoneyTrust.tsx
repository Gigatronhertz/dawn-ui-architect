const pillars = [
  {
    emoji: "🔒",
    color: "text-google-green",
    bg: "bg-google-green/10",
    title: "Held in escrow",
    desc: "Contributions go into escrow — not the organiser's pocket. Hotel booking only releases when the squad confirms. If the trip is cancelled, money returns to every member within 48 hours. Automatically.",
  },
  {
    emoji: "📲",
    color: "text-google-blue",
    bg: "bg-google-blue/10",
    title: "Every spend announced",
    desc: "Every payment the organiser makes triggers an instant WhatsApp notification to the group. The whole squad sees what was collected, what was spent, and when. No black boxes.",
  },
  {
    emoji: "↩️",
    color: "text-primary",
    bg: "bg-primary-soft",
    title: "Full refunds, no drama",
    desc: "Trip cancelled via group poll or organiser call — 100% automatic refund to every member's original payment method. No form to fill. No support ticket. No chasing.",
  },
];

export const MoneyTrust = () => (
  <section id="trust" className="py-28 md:py-36 bg-google-green/5">
    <div className="mx-auto max-w-6xl px-6">
      <div className="text-center max-w-2xl mx-auto">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-google-green">Money safety</span>
        <h2 className="font-display text-4xl md:text-6xl font-semibold tracking-tight mt-3 leading-[1.05]">
          Your squad's money
          <br />
          <span className="text-muted-foreground">is protected. Always.</span>
        </h2>
        <p className="mt-5 text-muted-foreground">
          The hardest part of group trips isn't planning — it's trust. We handle it.
        </p>
      </div>

      <div className="mt-16 grid md:grid-cols-3 gap-5">
        {pillars.map((p) => (
          <div
            key={p.title}
            className="group rounded-3xl bg-card ring-hairline p-7 hover:shadow-card transition-all duration-500 hover:-translate-y-1"
          >
            <div className={`w-12 h-12 rounded-2xl grid place-items-center text-xl ${p.bg} mb-6`}>
              {p.emoji}
            </div>
            <h3 className={`font-display text-xl font-semibold mb-2 ${p.color}`}>{p.title}</h3>
            <p className="text-[15px] text-muted-foreground leading-relaxed">{p.desc}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 rounded-2xl bg-card ring-hairline px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">Not on Pro or Monthly yet?</span>{" "}
          Escrow and spend notifications are available on the Monthly plan and above.
        </p>
        <a href="#pricing" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline shrink-0">
          See pricing
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7" /></svg>
        </a>
      </div>
    </div>
  </section>
);
