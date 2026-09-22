import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Nav } from "@/components/Nav";
import { HowItWorks } from "@/components/HowItWorks";
import { Footer } from "@/components/CTA";
import { Hero } from "@/components/Hero";
import { TripCategories } from "@/components/TripCategories";
import { ExploreCityTeaser } from "@/components/ExploreCityTeaser";
import { TrustProof } from "@/components/TrustProof";

// ── Services ─────────────────────────────────────────────────────────────────
const services = [
  {
    n: "01",
    color: "bg-forest", fg: "text-paper",
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
    title: "AI Trip Planning",
    desc: "Answer 9 quick questions and boom — full itinerary, hotels, transport, day-by-day, cost per person. Under 20 seconds.",
  },
  {
    n: "02",
    color: "bg-primary", fg: "text-ink",
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2.5" y="4.5" width="19" height="15" rx="2" />
        <path d="m3 6.5 8.1 6a1.5 1.5 0 0 0 1.8 0l8.1-6" />
      </svg>
    ),
    title: "Automatic Follow-ups",
    desc: "We email everyone their share and keep chasing the ones ghosting the group chat. You never have to ask twice.",
  },
  {
    n: "03",
    color: "bg-sage", fg: "text-paper",
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    ),
    title: "Squad Payments",
    desc: "Everyone gets their own Paystack link. Watch who's paid in real time. No spreadsheet, no chasing anybody on DM.",
  },
];

const Services = () => (
  <section id="services" className="py-24 md:py-32 bg-card border-t border-border">
    <div className="mx-auto max-w-6xl px-6">
      {/* Section heading */}
      <div className="mb-14">
        <div className="flex items-center gap-4 mb-5">
          <span className="h-px w-8 bg-primary" />
          <span className="text-[10px] font-jost font-light tracking-label text-muted-foreground uppercase">
            What we do
          </span>
        </div>
        <h2 className="font-marcellus text-3xl md:text-4xl text-foreground max-w-lg leading-snug">
          Everything a squad trip needs, in one place.
        </h2>
      </div>

      {/* Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        {services.map((s) => (
          <div
            key={s.title}
            className="bg-card border-[3px] border-foreground rounded-2xl p-8 md:p-10 flex flex-col gap-5 shadow-[5px_5px_0_0_hsl(var(--foreground))] hover:-translate-y-1 hover:shadow-[7px_7px_0_0_hsl(var(--foreground))] transition-transform group"
          >
            {/* Number + icon */}
            <div className="flex items-start justify-between">
              <div className={`w-10 h-10 rounded-lg border-2 border-foreground ${s.color} ${s.fg} grid place-items-center shrink-0`}>
                {s.icon}
              </div>
              <span className="font-marcellus text-3xl text-border group-hover:text-foreground/30 transition-colors">
                {s.n}
              </span>
            </div>
            <div>
              <h3 className="font-marcellus text-xl text-foreground mb-2">{s.title}</h3>
              <p className="font-jost font-light text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 flex items-center gap-5">
        <Link
          to="/start"
          className="inline-flex items-center gap-2 bg-signal text-ink border-[3px] border-foreground rounded-full px-7 py-3.5 text-sm font-jost font-bold tracking-[0.06em] shadow-[4px_4px_0_0_hsl(var(--foreground))] hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_hsl(var(--foreground))] transition-transform"
        >
          Try Karije free
          <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 5l7 7-7 7" />
          </svg>
        </Link>
        <span className="text-xs font-jost font-light tracking-[0.06em] text-muted-foreground">
          No account required
        </span>
      </div>
    </div>
  </section>
);

// ── Destinations ──────────────────────────────────────────────────────────────
// Mixed sourcing — Unsplash and Pexels, both free for commercial use with no
// attribution required. imgUrl() below detects a full URL vs a bare Unsplash
// ID, so a Pexels entry just carries its complete image URL as `id`.
const destinations = [
  { id: "1577900190299-7316c32fe85f", label: "Enugu",            sub: "Coal City, Nigeria",     tall: true  },
  { id: "https://images.pexels.com/photos/33687458/pexels-photo-33687458.jpeg", label: "Culture & Heritage", sub: "Traditional Gathering", tall: false },
  { id: "1773146916270-e811bff4e923", label: "Beach Weekend",     sub: "Lagos Shoreline",        tall: false },
  { id: "1761986756798-a13b39989361", label: "Road Trip",         sub: "Calabar Adventure",      tall: false },
  { id: "https://images.pexels.com/photos/33033191/pexels-photo-33033191.jpeg", label: "Abuja",   sub: "Friends in the Park",   tall: false },
  { id: "1761986758241-77549539536a", label: "Road Trip Crew",    sub: "Adventure Van Life",     tall: true  },
];

function imgUrl(id: string, w = 600, h = 450) {
  if (/^https?:\/\//i.test(id)) return `${id}?auto=compress&cs=tinysrgb&w=${w}&h=${h}&fit=crop`;
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;
}

const DestinationsGrid = () => (
  <section className="py-20 md:py-28 overflow-hidden">
    <div className="mx-auto max-w-6xl px-6">
      {/* Heading */}
      <div className="flex items-end justify-between mb-10">
        <div>
          <div className="flex items-center gap-4 mb-4">
            <span className="h-px w-8 bg-primary" />
            <span className="text-[10px] font-jost font-light tracking-label text-muted-foreground uppercase">
              Where squads go
            </span>
          </div>
          <h2 className="font-marcellus text-3xl md:text-4xl text-foreground">
            Nigeria is waiting.
          </h2>
        </div>
        <p className="hidden md:block text-sm font-jost font-light text-muted-foreground max-w-xs text-right leading-relaxed">
          From Obudu to Elegushi Beach — your squad can go anywhere. We'll plan every detail.
        </p>
      </div>

      {/* Desktop grid — masonry-style */}
      <div className="hidden md:grid grid-cols-3 gap-4" style={{ gridAutoRows: "210px" }}>
        {destinations.map((d) => (
          <div
            key={d.id}
            className={`relative overflow-hidden group cursor-default rounded-2xl border-[3px] border-foreground shadow-[5px_5px_0_0_hsl(var(--foreground))] ${d.tall ? "row-span-2" : ""}`}
          >
            <img
              src={imgUrl(d.id, d.tall ? 600 : 600, d.tall ? 900 : 440)}
              alt={d.label}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-forest/70 via-forest/10 to-transparent" />
            <div className="absolute bottom-4 left-4 text-parchment">
              <div className="font-marcellus text-sm">{d.label}</div>
              <div className="text-[10px] font-jost font-light tracking-wide opacity-70 mt-0.5">{d.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Mobile — horizontal scroll */}
      <div className="md:hidden -mx-6 overflow-x-auto flex gap-3 px-6 pb-2 snap-x snap-mandatory">
        {destinations.map((d) => (
          <div
            key={d.id}
            className="flex-none w-56 h-48 overflow-hidden relative snap-start rounded-2xl border-[3px] border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))]"
          >
            <img
              src={imgUrl(d.id, 400, 320)}
              alt={d.label}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-forest/65 to-transparent" />
            <div className="absolute bottom-3 left-3 text-parchment">
              <div className="font-marcellus text-sm">{d.label}</div>
              <div className="text-[10px] font-jost font-light opacity-70">{d.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Mobile description */}
      <p className="md:hidden mt-6 text-sm font-jost font-light text-muted-foreground leading-relaxed">
        From Obudu to Elegushi Beach — your squad can go anywhere. We'll plan every detail.
      </p>

      <div className="mt-8">
        <Link
          to="/start"
          className="inline-flex items-center gap-2 border-[3px] border-foreground text-foreground rounded-full px-7 py-3.5 text-sm font-jost font-bold tracking-[0.06em] shadow-[4px_4px_0_0_hsl(var(--foreground))] hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_hsl(var(--foreground))] transition-transform"
        >
          Plan your trip now
          <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  </section>
);

// ── Agencies / Pro ────────────────────────────────────────────────────────────
const proBenefits = [
  { icon: "◆", text: "Branded plan pages with your agency name and logo" },
  { icon: "◆", text: "Live dashboard — trips, payments, and squad status" },
  { icon: "◆", text: "Automated WhatsApp reminders on your behalf" },
  { icon: "◆", text: "Collect contributions and service fees in one flow" },
];

const AgenciesSection = () => (
  <section id="agencies" className="py-24 md:py-32 bg-forest text-parchment">
    <div className="mx-auto max-w-6xl px-6">
      <div className="grid lg:grid-cols-2 gap-14 lg:gap-20 items-start">
        {/* Left — copy */}
        <div>
          <div className="flex items-center gap-4 mb-6">
            <span className="h-px w-8 bg-primary" />
            <span className="text-[10px] font-jost font-light tracking-label text-parchment/60 uppercase">
              Pro Plan
            </span>
          </div>
          <h2 className="font-marcellus text-3xl md:text-4xl text-parchment leading-snug">
            Running a travel business?
          </h2>
          <p className="mt-5 font-jost font-light text-base text-parchment/70 leading-relaxed max-w-md">
            Karije Pro is built for travel agencies, tour operators, and individual
            planners who manage group trips on behalf of clients. Automate the
            coordination. Focus on the experience.
          </p>

          <ul className="mt-8 space-y-4">
            {proBenefits.map((b) => (
              <li key={b.text} className="flex items-start gap-4">
                <span className="text-foreground text-[8px] mt-1.5 shrink-0">{b.icon}</span>
                <span className="font-jost font-light text-sm text-parchment/80 leading-relaxed">
                  {b.text}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-8 border-[3px] border-signal rounded-2xl px-5 py-4">
            <span className="font-marcellus text-parchment">Set up in minutes.</span>{" "}
            <span className="font-jost font-light text-sm text-parchment/70">
              No waitlist, no cohort — create your account and start listing trips today.
            </span>
          </div>
        </div>

        {/* Right — direct signup, no lead-capture form */}
        <div className="bg-card text-foreground border-[3px] border-foreground rounded-2xl p-8 shadow-[6px_6px_0_0_hsl(var(--signal))] flex flex-col items-center text-center gap-5">
          <div>
            <h3 className="font-marcellus text-xl text-foreground">Create your agency account</h3>
            <p className="font-jost font-light text-sm text-muted-foreground mt-1.5">
              Name, logo, phone number, service fee — set once, live in minutes.
            </p>
          </div>
          <Link
            to="/pro/login?mode=signup"
            className="w-full inline-flex items-center justify-center gap-2 bg-signal text-ink border-[3px] border-foreground rounded-full px-7 py-3.5 text-sm font-jost font-bold tracking-[0.06em] shadow-[4px_4px_0_0_hsl(var(--foreground))] hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_hsl(var(--foreground))] transition-transform"
          >
            Create account
            <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </Link>
          <Link to="/pro" className="text-xs font-jost text-muted-foreground hover:text-foreground transition-colors">
            See what Pro does &amp; costs →
          </Link>
        </div>
      </div>
    </div>
  </section>
);

// ── Page ──────────────────────────────────────────────────────────────────────
const Index = () => {
  useEffect(() => {
    document.title = "Karije — Group trips, planned in minutes";
    const meta =
      document.querySelector('meta[name="description"]') ||
      Object.assign(document.createElement("meta"), { name: "description" });
    (meta as HTMLMetaElement).content =
      "Karije plans your West African group trip end-to-end — AI itinerary, WhatsApp coordination, and squad payments. No app download. No spreadsheet.";
    if (!meta.parentNode) document.head.appendChild(meta);
  }, []);

  return (
    <main className="min-h-screen bg-background">
      <Nav />
      <Hero />
      <TripCategories />
      <ExploreCityTeaser />
      <TrustProof />
      <Services />
      <DestinationsGrid />
      <HowItWorks />
      <AgenciesSection />
      <Footer />
    </main>
  );
};

export default Index;
