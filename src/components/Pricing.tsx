const plans = [
  {
    name: "Free",
    price: "₦0",
    cadence: "forever",
    tag: "Try it",
    desc: "Plan your first 2 trips with the basics.",
    features: ["2 trips lifetime", "AI itinerary (2 days)", "WhatsApp summary + date poll", "Up to 8 members"],
    cta: "Start free",
    style: "ring",
  },
  {
    name: "Per Trip",
    price: "₦5,000",
    cadence: "per trip",
    tag: "Most loved",
    desc: "Unlock everything for one specific trip.",
    features: ["Full AI itinerary", "Hotel suggestions", "Paystack contribution links", "Auto reminders", "Up to 30 members"],
    cta: "Plan a trip",
    style: "primary",
  },
  {
    name: "Monthly",
    price: "₦7,000",
    cadence: "per month",
    tag: "Frequent",
    desc: "Unlimited trips, all features, every month.",
    features: ["Unlimited trips", "Multiple active trips", "Trip templates", "Remove SquadGo branding", "Trip escrow"],
    cta: "Go monthly",
    style: "ring",
  },
  {
    name: "Pro Planner",
    price: "₦15,000",
    cadence: "per month",
    tag: "For agents",
    desc: "Run your travel-planning business on SquadGo.",
    features: ["Public planner profile", "Charge service fees (keep 100%)", "Client dashboard", "Branded itineraries", "Verified Pro badge"],
    cta: "Go pro",
    style: "dark",
  },
];

export const Pricing = () => (
  <section id="pricing" className="py-28 md:py-36 bg-secondary/40">
    <div className="mx-auto max-w-6xl px-6">
      <div className="text-center max-w-2xl mx-auto">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Pricing</span>
        <h2 className="font-display text-4xl md:text-6xl font-semibold tracking-tight mt-3 leading-[1.05]">
          Honest pricing.
          <br />
          <span className="text-muted-foreground">No transaction cuts.</span>
        </h2>
        <p className="mt-5 text-muted-foreground">
          ₦5,000 to coordinate a ₦200,000 group trip. Your sanity is worth more.
        </p>
      </div>

      <div className="mt-16 grid md:grid-cols-2 lg:grid-cols-4 gap-5">
        {plans.map((p) => {
          const isPrimary = p.style === "primary";
          const isDark = p.style === "dark";
          return (
            <div
              key={p.name}
              className={`relative rounded-3xl p-7 flex flex-col transition-all duration-500 hover:-translate-y-1 ${
                isPrimary
                  ? "bg-gradient-primary text-primary-foreground shadow-glow"
                  : isDark
                  ? "bg-foreground text-background"
                  : "bg-card ring-hairline"
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-semibold">{p.name}</h3>
                <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full ${
                  isPrimary ? "bg-white/20" : isDark ? "bg-white/10" : "bg-secondary text-muted-foreground"
                }`}>{p.tag}</span>
              </div>

              <div className="mt-6 flex items-baseline gap-1">
                <span className="font-display text-4xl font-semibold tracking-tight">{p.price}</span>
                <span className={`text-sm ${isPrimary || isDark ? "opacity-80" : "text-muted-foreground"}`}>/{p.cadence.replace("per ", "")}</span>
              </div>
              <p className={`mt-2 text-sm ${isPrimary || isDark ? "opacity-80" : "text-muted-foreground"}`}>{p.desc}</p>

              <ul className="mt-6 space-y-3 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-[13px]">
                    <svg viewBox="0 0 24 24" className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isPrimary || isDark ? "" : "text-primary"}`} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <button className={`mt-7 rounded-full py-3 text-sm font-medium transition-all ${
                isPrimary
                  ? "bg-white text-foreground hover:bg-white/90"
                  : isDark
                  ? "bg-background text-foreground hover:opacity-90"
                  : "bg-foreground text-background hover:opacity-90"
              }`}>
                {p.cta}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  </section>
);
