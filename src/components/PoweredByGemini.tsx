const capabilities = [
  { label: "Smart Itinerary Generation", color: "text-google-blue" },
  { label: "Real-time Cost Analysis", color: "text-google-green" },
  { label: "Hotel & Transport Matching", color: "text-google-purple" },
  { label: "Group Sentiment Analysis", color: "text-primary" },
  { label: "Dynamic Budget Splitting", color: "text-google-yellow" },
  { label: "Risk & Weather Forecasts", color: "text-accent" },
  { label: "Local Insider Tips", color: "text-google-pink" },
  { label: "Conversational Trip Editing", color: "text-google-blue" },
  { label: "Auto-translated Updates", color: "text-google-green" },
  { label: "Fraud & Vendor Vetting", color: "text-primary" },
];

/** Karije spark — a stylised K built from two angled strokes */
const KarijeLogo = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden fill="none">
    <defs>
      <linearGradient id="karije-grad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="hsl(var(--primary))" />
        <stop offset="100%" stopColor="hsl(var(--accent))" />
      </linearGradient>
    </defs>
    {/* Left vertical bar */}
    <rect x="4" y="3" width="3" height="18" rx="1.5" fill="url(#karije-grad)" />
    {/* Upper diagonal arm */}
    <path d="M7 12 L19 3" stroke="url(#karije-grad)" strokeWidth="3" strokeLinecap="round" />
    {/* Lower diagonal arm */}
    <path d="M7 12 L19 21" stroke="url(#karije-grad)" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

export const PoweredByKarije = () => {
  const row = [...capabilities, ...capabilities];

  return (
    <section className="relative py-24 md:py-32 overflow-hidden bg-hero-mesh text-foreground">
      <div className="pointer-events-none absolute -top-20 -left-20 w-96 h-96 rounded-full bg-primary/20 blur-3xl animate-float" />
      <div className="pointer-events-none absolute top-40 -right-20 w-96 h-96 rounded-full bg-accent/20 blur-3xl animate-float" style={{ animationDelay: "2s" }} />

      <div className="relative mx-auto max-w-6xl px-6 text-center">
        <div className="inline-flex items-center gap-2 rounded-full glass ring-hairline px-3 py-1.5 text-xs font-medium text-muted-foreground mb-8">
          <KarijeLogo />
          Powered by Karije
        </div>

        <h2 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold leading-[1.05] tracking-tight text-foreground max-w-4xl mx-auto">
          Every trip, thought through by{" "}
          <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            Karije.
          </span>
        </h2>

        <p className="mt-6 max-w-2xl mx-auto text-lg text-muted-foreground leading-relaxed">
          We don't just send messages. Karije reads your group, crunches the
          numbers, and engineers the perfect plan — in the time it takes to
          send a voice note.
        </p>
      </div>

      {/* Marquee */}
      <div className="relative mt-16 group">
        <div className="pointer-events-none absolute inset-y-0 left-0 w-32 z-10 bg-gradient-to-r from-background to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-32 z-10 bg-gradient-to-l from-background to-transparent" />

        <div className="flex gap-3 marquee whitespace-nowrap">
          {row.map((c, i) => (
            <div
              key={i}
              className="shrink-0 inline-flex items-center gap-2.5 rounded-full bg-card ring-hairline px-5 py-3 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
            >
              <KarijeLogo />
              <span>{c.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
