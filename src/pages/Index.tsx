import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Nav } from "@/components/Nav";
import { HowItWorks } from "@/components/HowItWorks";
import { AgencyForm } from "@/components/AgencyForm";
import { Footer } from "@/components/CTA";
import { Hero } from "@/components/Hero";

// ── Services section ──────────────────────────────────────────────────────────
const services = [
  {
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
    color: "bg-primary/10 text-primary",
    title: "AI Trip Planning",
    desc: "Answer 9 quick questions. Karije builds a complete itinerary — hotels, transport, day-by-day activities, and a per-person cost — in under 20 seconds.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    ),
    color: "bg-whatsapp/10 text-whatsapp",
    title: "WhatsApp Coordination",
    desc: "Your squad gets a dedicated bot in the group chat. It posts the itinerary, runs date and hotel votes, and sends payment reminders — automatically.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    ),
    color: "bg-google-blue/10 text-google-blue",
    title: "Squad Payments",
    desc: "Each member gets a personal Paystack link for their share. See who's paid in real time. No spreadsheets, no chasing people on DM.",
  },
];

const Services = () => (
  <section id="services" className="py-24 md:py-32">
    <div className="mx-auto max-w-6xl px-6">
      <div className="text-center max-w-2xl mx-auto mb-16">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">What we do</span>
        <h2 className="font-display text-4xl md:text-5xl font-semibold tracking-tight mt-3 leading-[1.05]">
          Everything a squad trip needs,<br className="hidden sm:block" /> in one place.
        </h2>
        <p className="mt-4 text-muted-foreground">
          From the first idea to the last person paid — MySquadGo handles it.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        {services.map((s) => (
          <div
            key={s.title}
            className="rounded-3xl bg-card ring-hairline p-7 hover:shadow-card transition-all duration-300 hover:-translate-y-1"
          >
            <div className={`w-10 h-10 rounded-2xl grid place-items-center mb-5 ${s.color}`}>
              {s.icon}
            </div>
            <h3 className="font-display text-xl font-semibold mb-2">{s.title}</h3>
            <p className="text-[15px] text-muted-foreground leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 text-center">
        <Link
          to="/start"
          className="inline-flex items-center gap-2 rounded-full bg-gradient-primary text-primary-foreground px-7 py-3.5 text-[15px] font-medium shadow-glow hover:scale-[1.02] active:scale-[0.98] transition-transform"
        >
          Try it free →
        </Link>
      </div>
    </div>
  </section>
);

// ── Photo destinations grid ───────────────────────────────────────────────────
const destinations = [
  // Actual Nigeria photos (shot on location)
  { id: "OxesnxkySD0", label: "Enugu",           sub: "Coal City, Nigeria",      tall: true  },
  { id: "xKPkKkreVK0", label: "Eastern Nigeria", sub: "Imo State Road Trip",     tall: false },
  // Squad / trip vibe photos
  { id: "t_XeExafoSM", label: "Beach Weekend",   sub: "Lagos Shoreline",         tall: false },
  { id: "lAQ7q8ADZSI", label: "Road Trip",        sub: "Calabar Adventure",       tall: false },
  { id: "SPS796v4KmM", label: "West Africa",      sub: "Crew Goals",              tall: false },
  { id: "eTpb0CNJ91A", label: "City Nights",      sub: "Night Out, Lagos",        tall: true  },
];

function imgUrl(id: string, w = 600, h = 450) {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;
}

const DestinationsGrid = () => (
  <section className="py-16 md:py-24 overflow-hidden">
    <div className="mx-auto max-w-6xl px-6">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Where squads go</span>
        <h2 className="font-display text-3xl md:text-5xl font-semibold tracking-tight mt-3 leading-[1.05]">
          Nigeria is waiting.
        </h2>
        <p className="mt-4 text-muted-foreground">
          From Obudu to Elegushi Beach — your squad can go anywhere. We'll plan every detail.
        </p>
      </div>

      {/* Desktop: masonry-style grid */}
      <div className="hidden md:grid grid-cols-3 gap-3" style={{ gridAutoRows: "220px" }}>
        {destinations.map((d) => (
          <div
            key={d.id}
            className={`relative rounded-2xl overflow-hidden group cursor-default ${d.tall ? "row-span-2" : ""}`}
          >
            <img
              src={imgUrl(d.id, d.tall ? 600 : 600, d.tall ? 900 : 440)}
              alt={d.label}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            <div className="absolute bottom-4 left-4 text-white">
              <div className="font-display font-semibold">{d.label}</div>
              <div className="text-[11px] opacity-75 mt-0.5">{d.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Mobile: horizontal scroll */}
      <div className="md:hidden -mx-6 overflow-x-auto flex gap-3 px-6 pb-2 snap-x snap-mandatory">
        {destinations.map((d) => (
          <div
            key={d.id}
            className="flex-none w-56 h-48 rounded-2xl overflow-hidden relative snap-start"
          >
            <img
              src={imgUrl(d.id, 400, 320)}
              alt={d.label}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-3 left-3 text-white">
              <div className="font-semibold text-sm">{d.label}</div>
              <div className="text-[10px] opacity-75">{d.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 text-center">
        <Link
          to="/start"
          className="inline-flex items-center gap-2 rounded-full bg-gradient-primary text-primary-foreground px-7 py-3.5 text-[15px] font-medium shadow-glow hover:scale-[1.02] active:scale-[0.98] transition-transform"
        >
          Plan your trip now →
        </Link>
      </div>
    </div>
  </section>
);

// ── Agencies / Pro section ────────────────────────────────────────────────────
const proBenefits = [
  { icon: "🏷️", text: "Branded plan pages with your agency name and logo" },
  { icon: "📊", text: "Live dashboard — see all trips, payments, and squad status" },
  { icon: "🤝", text: "Automated WhatsApp reminders on your behalf" },
  { icon: "💸", text: "Collect contributions and service fees in one flow" },
];

const AgenciesSection = () => (
  <section id="agencies" className="py-24 md:py-32 bg-secondary/40">
    <div className="mx-auto max-w-6xl px-6">
      <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-start">
        {/* Left: copy */}
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Pro Plan</span>
          <h2 className="font-display text-4xl md:text-5xl font-semibold tracking-tight mt-3 leading-[1.05]">
            Running a travel business?
          </h2>
          <p className="mt-4 text-muted-foreground text-[15px] leading-relaxed">
            MySquadGo Pro is built for travel agencies, tour operators, and individual planners who manage group trips on behalf of clients. Automate the coordination. Focus on the experience.
          </p>

          <ul className="mt-8 space-y-4">
            {proBenefits.map((b) => (
              <li key={b.text} className="flex items-start gap-3">
                <span className="text-lg shrink-0 mt-0.5">{b.icon}</span>
                <span className="text-[15px] text-muted-foreground">{b.text}</span>
              </li>
            ))}
          </ul>

          <div className="mt-8 rounded-2xl bg-primary/5 ring-1 ring-primary/10 px-5 py-4 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">Free during beta.</span>{" "}
            We're onboarding a small cohort of agencies first. Leave your details and we'll set everything up with you.
          </div>
        </div>

        {/* Right: lead form */}
        <div>
          <div className="rounded-3xl bg-card ring-hairline shadow-card p-7 md:p-8">
            <div className="mb-6">
              <h3 className="font-display text-xl font-semibold">Get early access</h3>
              <p className="text-sm text-muted-foreground mt-1">
                We'll reach out on WhatsApp to set up your account.
              </p>
            </div>
            <AgencyForm />
          </div>
        </div>
      </div>
    </div>
  </section>
);

// ── Page ──────────────────────────────────────────────────────────────────────
const Index = () => {
  useEffect(() => {
    document.title = "MySquadGo — Group trips, planned in minutes";
    const meta = document.querySelector('meta[name="description"]') ||
      Object.assign(document.createElement("meta"), { name: "description" });
    (meta as HTMLMetaElement).content =
      "MySquadGo plans your West African group trip end-to-end — AI itinerary, WhatsApp coordination, and squad payments. No app download. No spreadsheet.";
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
