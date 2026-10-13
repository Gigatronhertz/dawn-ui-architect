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
import { BuildYourOwn } from "@/pages/Explore";
import { BrandIcon } from "@/lib/brandIcons";

// ── Trust — the yellow band ─────────────────────────────────────────────────
const TRUST = [
  {
    icon: "M4 6h16v14H4z M4 10h16 M8 3v4 M16 3v4 M8 14h3",
    title: "Pay monthly",
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
  <section className="mt-24 md:mt-28 bg-signal text-ink">
    <div className="max-w-[1280px] mx-auto px-5 md:px-8 py-20 md:py-24 flex flex-col gap-12">
      <h2 className="kj-title">Your money.<br /><span className="kj-hl-ink px-4">Held safe.</span></h2>
      <div className="grid gap-10 [grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr))]">
        {TRUST.map((t, i) => (
          <div key={t.title} className="flex flex-col gap-3 border-t-4 border-ink pt-5">
            <div className="flex justify-between items-center">
              <BrandIcon d={t.icon} className="w-12 h-12" />
              <span className="font-display text-[22px]">0{i + 1}</span>
            </div>
            <h3 className="font-display text-2xl md:text-[26px]">{t.title}</h3>
            <p className="text-[17px] leading-relaxed font-medium">{t.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

// ── Build your own — the real day builder, embedded ─────────────────────────
const BuildSection = () => (
  <section id="build" className="max-w-[1280px] mx-auto px-5 md:px-8 py-24 md:py-28 flex flex-col gap-10">
    <div className="flex flex-col gap-4">
      <Eyebrow>Build your own</Eyebrow>
      <h2 className="kj-title">Your day out.<br /><span className="text-signal">Your rules.</span></h2>
      <p className="text-lg md:text-[19px] leading-relaxed text-muted-foreground max-w-[640px]">
        Plan your own day out in Lagos. Add the places you want, we'll tell you what they cost, then share it with your squad to collect everyone's share.
      </p>
    </div>
    <BuildYourOwn city="Lagos" />
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
      <div className="max-w-[1280px] mx-auto px-5 md:px-8 py-24 md:py-28 flex flex-col gap-10">
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
const PRO_POINTS = [
  "Your brand on every trip page",
  "Pay-monthly plans for your travellers",
  "WhatsApp reminders and chase-ups, automatic",
  "Bookkeeping built in — keep 100% of what you collect",
];

const AgenciesSection = () => (
  <section id="agencies" className="border-t-[3px] border-signal">
    <div className="max-w-[1280px] mx-auto px-5 md:px-8 py-24 md:py-28 grid lg:grid-cols-[1.2fr,1fr] gap-12 lg:gap-16 items-center">
      <div className="flex flex-col gap-6">
        <Eyebrow>Karije Pro · For agencies</Eyebrow>
        <h2 className="kj-title-sm">Running a<br /><span className="kj-hl px-4">travel business?</span></h2>
        <ul className="flex flex-col gap-3 mt-2">
          {PRO_POINTS.map((p) => (
            <li key={p} className="flex gap-3 text-lg"><span className="text-signal font-bold">✓</span>{p}</li>
          ))}
        </ul>
      </div>

      <div className="bg-signal text-ink p-7 md:p-9 flex flex-col gap-5 kj-cut-panel">
        <div>
          <div className="kj-label text-xs tracking-[0.24em]">Karije Pro</div>
          <div className="font-display text-5xl md:text-6xl leading-none mt-1">₦10,000<span className="font-sans text-base font-semibold normal-case"> /month</span></div>
        </div>
        <p className="text-base font-medium">Unlimited trips. No cut of what you collect. Live in 10 minutes.</p>
        <Link to="/pro/login?mode=signup" className="kj-btn-ink text-lg py-4">Create your agency account →</Link>
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
      <UpcomingEvents />
      <TripCategories />
      <ExploreCityTeaser />
      <TrustBand />
      <BuildSection />
      <AgenciesShowcase />
      <AgenciesSection />
      <Footer />
    </main>
  );
};

export default Index;
