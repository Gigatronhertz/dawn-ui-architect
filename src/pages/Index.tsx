import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Nav } from "@/components/Nav";
import { HowItWorks } from "@/components/HowItWorks";
import { AgencyForm } from "@/components/AgencyForm";
import { Footer } from "@/components/CTA";
import { Hero } from "@/components/Hero";

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
    desc: "Answer 9 quick questions. Karije builds a complete itinerary — hotels, transport, day-by-day activities, and a per-person cost — in under 20 seconds.",
  },
  {
    n: "02",
    color: "bg-primary", fg: "text-ink",
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    ),
    title: "WhatsApp Coordination",
    desc: "Your squad gets a dedicated Karije bot in the group chat. It posts the itinerary, runs date and hotel votes, and sends payment reminders — automatically.",
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
    desc: "Each member gets a personal Paystack link for their share. See who's paid in real time. No spreadsheets, no chasing people on DM.",
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
      <div className="grid md:grid-cols-3 gap-px bg-border">
        {services.map((s) => (
          <div
            key={s.title}
            className="bg-card p-8 md:p-10 flex flex-col gap-5 hover:bg-secondary/60 transition-colors group"
          >
            {/* Number + icon */}
            <div className="flex items-start justify-between">
              <div className={`w-10 h-10 ${s.color} ${s.fg} grid place-items-center shrink-0`}>
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
          className="inline-flex items-center gap-2 bg-forest text-parchment px-7 py-3.5 text-sm font-jost font-medium tracking-[0.06em] hover:bg-primary transition-colors"
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
const destinations = [
  { id: "1577900190299-7316c32fe85f", label: "Enugu",          sub: "Coal City, Nigeria",   tall: true  },
  { id: "1560118386-f35cf6a0791d",    label: "Eastern Nigeria", sub: "Imo State Road Trip",  tall: false },
  { id: "1773146916270-e811bff4e923", label: "Beach Weekend",   sub: "Lagos Shoreline",      tall: false },
  { id: "1761986756798-a13b39989361", label: "Road Trip",       sub: "Calabar Adventure",    tall: false },
  { id: "1509099896299-af46ad97ff57", label: "West Africa",     sub: "Crew Goals",           tall: false },
  { id: "1761986758241-77549539536a", label: "Road Trip Crew",  sub: "Adventure Van Life",   tall: true  },
];

function imgUrl(id: string, w = 600, h = 450) {
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
      <div className="hidden md:grid grid-cols-3 gap-2" style={{ gridAutoRows: "210px" }}>
        {destinations.map((d) => (
          <div
            key={d.id}
            className={`relative overflow-hidden group cursor-default ${d.tall ? "row-span-2" : ""}`}
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
      <div className="md:hidden -mx-6 overflow-x-auto flex gap-2 px-6 pb-2 snap-x snap-mandatory">
        {destinations.map((d) => (
          <div
            key={d.id}
            className="flex-none w-56 h-48 overflow-hidden relative snap-start"
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
          className="inline-flex items-center gap-2 border border-foreground text-foreground px-7 py-3.5 text-sm font-jost font-medium tracking-[0.06em] hover:bg-forest hover:border-forest hover:text-parchment transition-colors"
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

          <div className="mt-8 border border-parchment/20 px-5 py-4">
            <span className="font-marcellus text-parchment">Free during beta.</span>{" "}
            <span className="font-jost font-light text-sm text-parchment/70">
              We're onboarding a small cohort of agencies. Leave your details and
              we'll set everything up with you.
            </span>
          </div>
        </div>

        {/* Right — form */}
        <div className="bg-parchment text-foreground p-8">
          <div className="mb-6">
            <h3 className="font-marcellus text-xl text-foreground">Get early access</h3>
            <p className="font-jost font-light text-sm text-muted-foreground mt-1.5">
              We'll reach out on WhatsApp to set up your account.
            </p>
          </div>
          <AgencyForm />
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
      <Services />
      <DestinationsGrid />
      <HowItWorks />
      <AgenciesSection />
      <Footer />
    </main>
  );
};

export default Index;
