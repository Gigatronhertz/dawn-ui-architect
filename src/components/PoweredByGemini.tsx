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

const GeminiLogo = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden>
    <defs>
      <linearGradient id="gem" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="hsl(var(--g-blue))" />
        <stop offset="50%" stopColor="hsl(var(--g-purple))" />
        <stop offset="100%" stopColor="hsl(var(--primary))" />
      </linearGradient>
    </defs>
    <path
      fill="url(#gem)"
      d="M12 2c.4 4.6 3.4 7.6 8 8-4.6.4-7.6 3.4-8 8-.4-4.6-3.4-7.6-8-8 4.6-.4 7.6-3.4 8-8z"
    />
  </svg>
);

export const PoweredByGemini = () => {
  const row = [...capabilities, ...capabilities];

  return (
    <section className="relative py-24 md:py-32 overflow-hidden bg-foreground text-background">
      {/* Ambient gradient mesh */}
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute -top-40 left-1/4 w-[500px] h-[500px] rounded-full bg-google-blue/30 blur-3xl" />
        <div className="absolute -bottom-40 right-1/4 w-[500px] h-[500px] rounded-full bg-primary/30 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-google-purple/20 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-background/10 ring-1 ring-background/20 backdrop-blur px-3 py-1.5 text-xs font-medium text-background/80 mb-8">
          <GeminiLogo />
          Powered by Google Gemini
        </div>

        <h2 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold leading-[1.05] tracking-tight max-w-4xl mx-auto">
          Every trip, thought through by{" "}
          <span className="bg-gradient-to-r from-google-blue via-google-purple to-primary bg-clip-text text-transparent">
            Gemini.
          </span>
        </h2>

        <p className="mt-6 max-w-2xl mx-auto text-lg text-background/70 leading-relaxed">
          We don't just send messages. Gemini reads your group, crunches the
          numbers, and engineers the perfect plan — in the time it takes to
          send a voice note.
        </p>
      </div>

      {/* Marquee */}
      <div className="relative mt-16 group">
        {/* Edge fades */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-32 z-10 bg-gradient-to-r from-foreground to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-32 z-10 bg-gradient-to-l from-foreground to-transparent" />

        <div className="flex gap-3 marquee whitespace-nowrap">
          {row.map((c, i) => (
            <div
              key={i}
              className="shrink-0 inline-flex items-center gap-2.5 rounded-full bg-background/5 ring-1 ring-background/15 backdrop-blur px-5 py-3 text-sm font-medium text-background/90 hover:bg-background/10 transition-colors"
            >
              <GeminiLogo />
              <span>{c.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
