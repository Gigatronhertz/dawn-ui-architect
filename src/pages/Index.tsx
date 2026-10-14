import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Instagram } from "lucide-react";
import { api, imageUrl, type PublicAgency } from "@/lib/api";
import { Nav, Eyebrow } from "@/components/Nav";
import { Footer } from "@/components/CTA";
import { Hero } from "@/components/Hero";
import { TripCategories } from "@/components/TripCategories";
import { ExploreCityTeaser } from "@/components/ExploreCityTeaser";
import { UpcomingEvents } from "@/components/UpcomingEvents";
import { BrandIcon } from "@/lib/brandIcons";
import { PREMIUM_LOCKED, PremiumTag } from "@/lib/premium";

// ── Trust — the yellow band ─────────────────────────────────────────────────
const TRUST = [
  {
    icon: "M4 6h16v14H4z M4 10h16 M8 3v4 M16 3v4 M8 14h3",
    title: "Pay monthly",
    premium: true,
    desc: "On trips that support it, split your share into monthly payments instead of one lump sum.",
  },
  {
    icon: "M5 11h14v10H5z M8 11V7a4 4 0 018 0v4 M12 15v2",
    title: "Your money, held safe",
    desc: "Karije holds every payment and only releases it to the agency once the whole trip is paid up.",
  },
  {
    icon: "M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z M9 12l2 2 4-4",
    title: "Verified agencies only",
    desc: "Every agency running trips on Karije is ID- and business-checked before they go live.",
  },
];

const TrustBand = () => (
  <section className="mt-16 md:mt-24 bg-signal text-ink">
    <div className="max-w-[1280px] mx-auto px-5 md:px-8 py-12 md:py-16 flex flex-col gap-8 md:gap-10">
      <h2 className="kj-title-sm">Your money. <span className="kj-hl-ink px-2">Held safe.</span></h2>
      <div className="grid sm:grid-cols-3 gap-6 md:gap-10">
        {TRUST.map((t, i) => (
          <div key={t.title} className="flex flex-col gap-2 border-t-[3px] border-ink pt-4">
            <div className="flex justify-between items-center">
              <BrandIcon d={t.icon} className="w-7 h-7 md:w-8 md:h-8" />
              <span className="font-display text-base">0{i + 1}</span>
            </div>
            <h3 className="font-display text-lg md:text-xl flex items-center gap-2 flex-wrap">
              {t.title}
              {"premium" in t && t.premium && PREMIUM_LOCKED && <PremiumTag className="!bg-ink !text-signal" />}
            </h3>
            <p className="text-sm md:text-base leading-relaxed font-medium">{t.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

// ── How it works — the pitch, in three beats ────────────────────────────────
const STEPS = [
  {
    title: "Plan it in minutes",
    desc: "Tell us where the squad's headed. We pull live hotel and transport prices, you build the days — or pick a trip we already run.",
  },
  {
    title: "Send one link",
    desc: "The whole plan on one page. Everyone sees what they're paying for and pays their own share — all at once or monthly.",
  },
  {
    title: "We chase. You go.",
    desc: "Reminders go out on their own. Nobody's stuck fronting the money, and the trip actually happens.",
  },
];

const HowItWorks = () => (
  <section className="max-w-[1280px] mx-auto px-5 md:px-8 pt-16 md:pt-24 flex flex-col gap-8 md:gap-10">
    <div className="flex flex-col gap-3 max-w-2xl">
      <Eyebrow>How Karije works</Eyebrow>
      <h2 className="kj-title-sm">Group trips,<br /><span className="text-signal">minus the group chat chaos.</span></h2>
    </div>
    <div className="grid md:grid-cols-3 gap-3 md:gap-5">
      {STEPS.map((s, i) => (
        <div key={s.title} className="kj-card p-5 md:p-6 flex gap-4 md:flex-col md:gap-3">
          <span className="font-display text-2xl md:text-3xl text-signal leading-none shrink-0">0{i + 1}</span>
          <div className="flex flex-col gap-1.5">
            <h3 className="font-display text-lg md:text-xl">{s.title}</h3>
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed">{s.desc}</p>
          </div>
        </div>
      ))}
    </div>
    <div className="flex flex-wrap items-center gap-5">
      <Link to="/start" className="kj-btn text-base">Plan a trip →</Link>
      <Link to="/pricing" className="kj-label text-xs text-muted-foreground hover:text-signal">First plan's free · see pricing</Link>
    </div>
  </section>
);

// ── Agencies showcase ────────────────────────────────────────────────────────
// Real, verified agencies already running trips on Karije. Renders nothing
// when the list is empty rather than an awkward "no agencies yet" state.
const AgenciesShowcase = () => {
  const [agencies, setAgencies] = useState<PublicAgency[]>([]);

  useEffect(() => {
    let live = true;
    api.getAgencies()
      .then((d) => { if (live) setAgencies(d.agencies); })
      .catch(() => { /* the rest of the page works fine without this */ });
    return () => { live = false; };
  }, []);

  if (agencies.length === 0) return null;

  return (
    <section className="border-t-2 border-line">
      <div className="max-w-[1280px] mx-auto px-5 md:px-8 py-16 md:py-24 flex flex-col gap-8">
        <div className="flex flex-col gap-4">
          <Eyebrow>Agencies we work with</Eyebrow>
          <h2 className="kj-title-sm">Real agencies.<br /><span className="text-signal">Real trips.</span></h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {agencies.map((a) => {
            const initials = a.name.trim().split(/\s+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
            const logo = imageUrl(a.logoUrl);
            return (
              <div key={a.id} className="kj-card p-5 flex items-start gap-4">
                <div
                  className="w-14 h-14 grid place-items-center shrink-0 overflow-hidden font-display text-ink"
                  style={logo ? { backgroundColor: "#fff" } : { backgroundColor: a.color || "#F5C518" }}
                >
                  {logo ? <img src={logo} alt={a.name} className="w-full h-full object-contain" /> : initials || "?"}
                </div>
                <div className="min-w-0">
                  <h3 className="font-display text-xl truncate">{a.name}</h3>
                  {a.tagline && <p className="text-sm text-muted-foreground mt-1 leading-relaxed line-clamp-2">{a.tagline}</p>}
                  <div className="flex items-center gap-4 mt-2 kj-label text-[11px]">
                    <span className="text-signal">{a.tripCount} {a.tripCount === 1 ? "trip" : "trips"}</span>
                    {a.instagram && (
                      <a href={a.instagram} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-muted-foreground hover:text-paper transition-colors">
                        <Instagram className="w-3.5 h-3.5" /> Instagram
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

// ── Agencies / Pro ────────────────────────────────────────────────────────────
const PRO_POINTS: { text: string; premium?: boolean }[] = [
  { text: "Your brand on every trip page" },
  { text: "Pay-monthly plans for your travellers", premium: true },
  { text: "Reminders and chase-ups, automatic" },
  { text: "Bookkeeping built in — keep 100% of what you collect", premium: true },
];

const AgenciesSection = () => (
  <section id="agencies" className="border-t-[3px] border-signal">
    <div className="max-w-[1280px] mx-auto px-5 md:px-8 py-16 md:py-24 grid lg:grid-cols-[1.2fr,1fr] gap-10 lg:gap-16 items-center">
      <div className="flex flex-col gap-6">
        <Eyebrow>Karije Pro · For agencies</Eyebrow>
        <h2 className="kj-title-sm">Running a<br /><span className="kj-hl px-4">travel business?</span></h2>
        <ul className="flex flex-col gap-3 mt-2">
          {PRO_POINTS.map((p) => (
            <li key={p.text} className="flex gap-3 items-center flex-wrap text-base md:text-lg">
              <span className="text-signal font-bold">✓</span>{p.text}
              {p.premium && PREMIUM_LOCKED && <PremiumTag />}
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-signal text-ink p-7 md:p-9 flex flex-col gap-5 kj-cut-panel">
        <div>
          <div className="kj-label text-xs tracking-[0.24em]">Karije Pro</div>
          <div className="font-display text-4xl md:text-5xl leading-none mt-1">₦10,000<span className="font-sans text-base font-semibold normal-case"> /month</span></div>
        </div>
        <p className="text-base font-medium">
          {PREMIUM_LOCKED ? "Free while we're in beta — no card needed. Live in 10 minutes." : "Unlimited trips. No cut of what you collect. Live in 10 minutes."}
        </p>
        <Link to="/pro/login?mode=signup" className="kj-btn-ink text-base py-3.5">Create your agency account →</Link>
        <Link to="/pro" className="kj-label text-xs underline underline-offset-4">See what Pro does</Link>
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
    <main className="min-h-screen bg-background overflow-x-hidden">
      <Nav />
      <Hero />
      <HowItWorks />
      <UpcomingEvents />
      <TripCategories />
      <ExploreCityTeaser />
      <TrustBand />
      <AgenciesShowcase />
      <AgenciesSection />
      <Footer />
    </main>
  );
};

export default Index;
