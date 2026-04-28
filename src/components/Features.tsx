const features = [
  {
    title: "Auto-planned itinerary",
    desc: "Tell us the vibe and budget. AI builds a day-by-day plan that actually fits.",
    color: "text-google-yellow",
    bg: "bg-google-yellow/10",
    icon: (
      <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
    ),
  },
  {
    title: "Hotels that fit the squad",
    desc: "Filtered by capacity, rating, and budget — pulled live from Google Maps.",
    color: "text-google-purple",
    bg: "bg-google-purple/10",
    icon: <path d="M3 21V8l9-5 9 5v13M9 21v-6h6v6M3 21h18" />,
  },
  {
    title: "WhatsApp does the chasing",
    desc: "Bot DMs each member, posts polls, sends payment reminders — so you don't.",
    color: "text-whatsapp",
    bg: "bg-whatsapp/10",
    icon: <path d="M21 11.5a8.4 8.4 0 01-1.3 4.5 8.5 8.5 0 01-7.3 4 8.4 8.4 0 01-4.4-1.2L3 20l1.4-4.9a8.4 8.4 0 01-1.3-4.5 8.5 8.5 0 014-7.3 8.4 8.4 0 014.5-1.3 8.5 8.5 0 018.5 8.5z" />,
  },
  {
    title: "Money, tracked & locked",
    desc: "Per-person Paystack links, live X-of-12-paid tracker, escrow on Pro.",
    color: "text-google-green",
    bg: "bg-google-green/10",
    icon: <path d="M12 1v22M17 5H9.5a3.5 3.5 0 100 7h5a3.5 3.5 0 110 7H6" />,
  },
  {
    title: "One link, no downloads",
    desc: "Tap a WhatsApp link — you're in. Members don't install anything.",
    color: "text-google-blue",
    bg: "bg-google-blue/10",
    icon: <path d="M10 13a5 5 0 007.5.5l3-3a5 5 0 00-7-7l-1.7 1.7M14 11a5 5 0 00-7.5-.5l-3 3a5 5 0 007 7l1.7-1.7" />,
  },
  {
    title: "Built for Naija",
    desc: "GIGM, GUO, Hotels.ng, Paystack — and shortlets that actually have power.",
    color: "text-google-pink",
    bg: "bg-google-pink/10",
    icon: <path d="M12 2a10 10 0 1010 10A10 10 0 0012 2zM2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />,
  },
];

export const Features = () => (
  <section id="features" className="py-28 md:py-36">
    <div className="mx-auto max-w-6xl px-6">
      <div className="max-w-2xl">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Features</span>
        <h2 className="font-display text-4xl md:text-6xl font-semibold tracking-tight mt-3 leading-[1.05]">
          Everything you'd
          <br />
          <span className="text-muted-foreground">delegate to a friend.</span>
        </h2>
      </div>

      <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {features.map((f) => (
          <div
            key={f.title}
            className="group rounded-3xl bg-card ring-hairline p-7 hover:shadow-card transition-all duration-500 hover:-translate-y-1"
          >
            <div className={`w-12 h-12 rounded-2xl grid place-items-center ${f.bg} ${f.color} mb-6`}>
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {f.icon}
              </svg>
            </div>
            <h3 className="font-display text-xl font-semibold mb-2">{f.title}</h3>
            <p className="text-[15px] text-muted-foreground leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);
