import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Instagram } from "lucide-react";
import { api, imageUrl, type PublicAgency } from "@/lib/api";
import { Nav, KarijeMark } from "@/components/Nav";
import { CARNIVAL_PHOTO } from "@/lib/photos";
import { Footer } from "@/components/CTA";
import { Hero } from "@/components/Hero";
import { TripCategories } from "@/components/TripCategories";
import { ExploreCityTeaser } from "@/components/ExploreCityTeaser";
import { UpcomingEvents } from "@/components/UpcomingEvents";
import { BrandIcon } from "@/lib/brandIcons";
import { PREMIUM_LOCKED, PremiumTag } from "@/lib/premium";

// ── More than just a trip — the banner ──────────────────────────────────────
const MoreThanATrip = () => (
  <section className="pt-14 md:pt-24 md:px-8">
    <div className="kj-dark relative overflow-hidden bg-ink md:rounded-3xl max-w-[1216px] mx-auto">
      <img src={CARNIVAL_PHOTO} alt="Dancers at the Calabar Carnival" className="absolute inset-0 w-full h-full object-cover object-[30%_center]" loading="lazy" />
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-ink via-ink/50 to-transparent md:bg-gradient-to-l md:from-ink/90 md:via-ink/55 md:to-ink/10" />
      <span aria-hidden="true" className="absolute top-6 right-6 md:top-10 md:right-10 text-signal opacity-90"><KarijeMark size={48} /></span>
      <div className="relative min-h-[520px] md:min-h-[460px] flex items-end md:items-center justify-end px-6 md:px-14 py-10 md:py-12">
        <div className="max-w-[420px] flex flex-col gap-4">
          <p className="kj-eyebrow">The Karije experience</p>
          <h2 className="kj-title text-white">More than just a trip.</h2>
          <p className="text-base md:text-lg text-white/85 leading-relaxed">
            New cities, good food, great people and the kind of weekend the group chat talks about for years.
          </p>
          <a href="#how" className="kj-btn rounded-full self-start px-5 py-2.5 text-sm">How it works →</a>
        </div>
      </div>
    </div>
  </section>
);

// ── What you can count on — the features row ────────────────────────────────
const FEATURES = [
  { icon: "M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z M9 12l2 2 4-4", title: "Money held safe", desc: "Paid in, held till release" },
  { icon: "M8 11a3 3 0 100-6 3 3 0 000 6z M16 11a3 3 0 100-6 3 3 0 000 6z M2 20c0-3 3-5 6-5s6 2 6 5 M14 15c3 0 8 1 8 5", title: "Verified agencies", desc: "ID- and business-checked" },
  { icon: "M4 6h16v12H4z M4 10h16 M8 15h3", title: "Pay your own share", desc: "In full, or monthly" },
  { icon: "M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9 M13.7 21a2 2 0 01-3.4 0", title: "We do the chasing", desc: "Reminders go out for you" },
];

const FeaturesRow = () => (
  <section className="max-w-[1280px] mx-auto px-6 md:px-8 pt-10 md:pt-14">
    <ul className="grid grid-cols-2 md:grid-cols-4 gap-y-8">
      {FEATURES.map((f, i) => (
        <li key={f.title} className={`flex flex-col items-center text-center gap-2 px-3 ${i % 2 === 1 ? "border-l border-line" : ""} ${i === 2 ? "md:border-l md:border-line" : ""}`}>
          <BrandIcon d={f.icon} className="w-7 h-7" />
          <span className="text-sm md:text-base font-semibold">{f.title}</span>
          <span className="text-xs md:text-sm text-muted-foreground">{f.desc}</span>
        </li>
      ))}
    </ul>
  </section>
);

// ── How it works — the pitch, in three beats ────────────────────────────────
const STEPS = [
  {
    icon: "M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M16.5 13v7 M13 16.5h7",
    title: "Pick or plan a trip",
    desc: "Join a trip we already run, or tell us where the squad's headed and build the days yourself.",
  },
  {
    icon: "M4 6h16v12H4z M4 10h16 M8 15h3",
    title: "Everyone pays their share",
    desc: "One link with the whole plan. Each person pays for their own place — all at once or monthly.",
  },
  {
    icon: "M3 13l18-8-6 16-3-7z M12 14l3-3",
    title: "We chase. You go.",
    desc: "Reminders go out on their own, nobody fronts the money, and the trip actually happens.",
  },
];

const HowItWorks = () => (
  <section id="how" className="scroll-mt-24 max-w-[1280px] mx-auto px-6 md:px-8 pt-20 md:pt-28 flex flex-col gap-10 md:gap-12">
    <div className="flex flex-col gap-3 max-w-2xl">
      <p className="kj-eyebrow">How Karije works</p>
      <h2 className="kj-title">Simple steps. <span className="kj-hl">Big trips.</span></h2>
      <p className="text-base md:text-lg text-muted-foreground">Getting the squad from group chat to the road is easy. Here's how.</p>
    </div>

    <ol className="grid md:grid-cols-3 gap-0 md:gap-8">
      {STEPS.map((s, i) => (
        <li key={s.title} className="relative flex md:flex-col gap-5 md:gap-5 pb-8 md:pb-0">
          {/* The line that joins the numbers — down on a phone, across on desktop */}
          {i < STEPS.length - 1 && (
            <span aria-hidden="true" className="absolute left-[19px] top-11 bottom-0 w-px bg-line-strong md:left-14 md:right-[-2rem] md:top-5 md:bottom-auto md:w-auto md:h-px" />
          )}
          <span className="relative z-10 w-10 h-10 shrink-0 rounded-full bg-signal text-ink grid place-items-center font-semibold text-sm">
            {String(i + 1).padStart(2, "0")}
          </span>
          <div className="flex gap-4 items-start flex-1 md:border-0 border-b border-line md:pb-0 pb-8">
            <span className="w-11 h-11 shrink-0 rounded-xl border border-line-strong grid place-items-center text-foreground">
              <BrandIcon d={s.icon} className="w-5 h-5" />
            </span>
            <div className="flex flex-col gap-1.5">
              <h3 className="text-xl md:text-2xl">{s.title}</h3>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">{s.desc}</p>
            </div>
          </div>
        </li>
      ))}
    </ol>

    <Link to="/start" className="group flex items-center gap-4 rounded-2xl bg-signal/25 hover:bg-signal/35 transition-colors px-5 py-5 md:px-7">
      <span className="w-12 h-12 shrink-0 rounded-xl bg-signal text-ink grid place-items-center">
        <BrandIcon d="M8 11a3 3 0 100-6 3 3 0 000 6z M16 11a3 3 0 100-6 3 3 0 000 6z M2 20c0-3 3-5 6-5s6 2 6 5 M14 15c3 0 8 1 8 5" className="w-6 h-6" />
      </span>
      <span className="flex-1">
        <span className="block font-semibold">Travelling with a group?</span>
        <span className="block text-sm text-muted-foreground">Plan it once, send one link, and let everyone pay their own way. First plan's free.</span>
      </span>
      <span className="text-xl transition-transform group-hover:translate-x-1" aria-hidden="true">›</span>
    </Link>
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
    <section>
      <div className="max-w-[1280px] mx-auto px-6 md:px-8 pt-20 md:pt-28 flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <p className="kj-eyebrow">Agencies we work with</p>
          <h2 className="kj-title-sm">Real agencies. <span className="kj-hl">Real trips.</span></h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {agencies.map((a) => {
            const initials = a.name.trim().split(/\s+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
            const logo = imageUrl(a.logoUrl);
            return (
              <div key={a.id} className="kj-card p-5 flex items-start gap-4">
                <div
                  className="w-14 h-14 rounded-xl grid place-items-center shrink-0 overflow-hidden font-display text-ink"
                  style={logo ? { backgroundColor: "#fff" } : { backgroundColor: a.color || "#F5C518" }}
                >
                  {logo ? <img src={logo} alt={a.name} className="w-full h-full object-contain" /> : initials || "?"}
                </div>
                <div className="min-w-0">
                  <h3 className="text-xl truncate">{a.name}</h3>
                  {a.tagline && <p className="text-sm text-muted-foreground mt-1 leading-relaxed line-clamp-2">{a.tagline}</p>}
                  <div className="flex items-center gap-4 mt-2 kj-label text-[11px]">
                    <span className="text-foreground">{a.tripCount} {a.tripCount === 1 ? "trip" : "trips"}</span>
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
  <section id="agencies" className="max-w-[1280px] mx-auto px-6 md:px-8 pt-20 md:pt-28 pb-20 md:pb-28 grid lg:grid-cols-[1.2fr,1fr] gap-10 lg:gap-16 items-center">
    <div className="flex flex-col gap-5">
      <p className="kj-eyebrow">Karije Pro · For agencies</p>
      <h2 className="kj-title-sm">Running a <span className="kj-hl">travel business?</span></h2>
      <ul className="flex flex-col gap-3 mt-1">
        {PRO_POINTS.map((p) => (
          <li key={p.text} className="flex gap-3 items-start text-base md:text-lg">
            <span className="w-6 h-6 mt-0.5 rounded-full bg-signal text-ink grid place-items-center text-xs font-bold shrink-0">✓</span>
            <span>{p.text}{p.premium && PREMIUM_LOCKED && <> <PremiumTag className="ml-1" /></>}</span>
          </li>
        ))}
      </ul>
    </div>

    <div className="bg-signal text-ink rounded-3xl p-7 md:p-9 flex flex-col gap-5">
      <div>
        <div className="kj-label text-xs">Karije Pro</div>
        <div className="font-display text-5xl leading-none mt-2">₦10,000<span className="font-sans text-base font-semibold"> /month</span></div>
      </div>
      <p className="text-base font-medium">
        {PREMIUM_LOCKED ? "Free while we're in beta — no card needed. Live in 10 minutes." : "Unlimited trips. No cut of what you collect. Live in 10 minutes."}
      </p>
      <Link to="/pro/login?mode=signup" className="kj-btn-ink text-base py-3.5">Create your agency account →</Link>
      <Link to="/pro" className="text-sm font-semibold underline underline-offset-4">See what Pro does</Link>
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
      <ExploreCityTeaser />
      <MoreThanATrip />
      <FeaturesRow />
      <HowItWorks />
      <UpcomingEvents />
      <TripCategories />
      <AgenciesShowcase />
      <AgenciesSection />
      <Footer />
    </main>
  );
};

export default Index;
