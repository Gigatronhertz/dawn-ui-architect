import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/CTA";
import { useScrollReveal } from "@/hooks/useScrollReveal";

// Status/paid-state colors stay functional (green/amber) rather than brand
// tokens — this dashboard mock needs "paid vs pending" to read at a glance,
// which is a usability need the ink/signal/paper palette doesn't serve.
const Chip = ({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "warn" | "good" | "brand" }) => {
  const tones = {
    default: "bg-secondary text-muted-foreground border-border",
    warn: "bg-signal text-ink border-foreground",
    good: "bg-emerald-100 text-emerald-900 border-emerald-300",
    brand: "bg-ink text-paper border-ink",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border-2 px-2.5 py-0.5 text-[10px] font-jost font-bold ${tones[tone]}`}>{children}</span>
  );
};

const Section = ({ id, eyebrow, title, sub, children }: { id?: string; eyebrow?: string; title: React.ReactNode; sub?: string; children: React.ReactNode }) => (
  <section id={id} className="py-20 md:py-28 border-t border-border">
    <div className="mx-auto max-w-6xl px-6">
      <div className="max-w-2xl mb-10">
        {eyebrow && (
          <div className="flex items-center gap-4 mb-4">
            <span className="h-px w-8 bg-primary" />
            <span className="text-[10px] font-jost font-light tracking-label text-muted-foreground uppercase">{eyebrow}</span>
          </div>
        )}
        <h2 className="font-marcellus text-3xl md:text-4xl text-foreground leading-snug">{title}</h2>
        {sub && <p className="mt-4 font-jost font-light text-muted-foreground">{sub}</p>}
      </div>
      {children}
    </div>
  </section>
);

// Bold card shell used throughout — matches the rest of the site's
// border-[3px] + hard offset shadow treatment.
const cardCls = "rounded-3xl bg-card border-[3px] border-foreground shadow-[6px_6px_0_0_hsl(var(--foreground))]";
const cardClsSm = "rounded-2xl bg-card border-[3px] border-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))]";
const avatarCls = "grid place-items-center bg-signal text-ink border-2 border-foreground font-marcellus font-bold";

const trips = [
  { name: "Calabar Carnival", date: "Dec 26 — 30", paid: 11, total: 14, status: "On track", tone: "good" as const },
  { name: "Ghana Detty Detty", date: "Dec 27 — Jan 2", paid: 12, total: 18, status: "Chase 6", tone: "warn" as const },
  { name: "Lagos NYE House", date: "Dec 30 — Jan 1", paid: 8, total: 8, status: "Fully paid", tone: "good" as const },
  { name: "Cape Coast Weekend", date: "Jan 10 — 12", paid: 2, total: 6, status: "Collecting", tone: "default" as const },
];

const ctaCls = "rounded-full bg-signal text-ink border-[3px] border-foreground px-7 py-3.5 text-sm font-jost font-bold shadow-[4px_4px_0_0_hsl(var(--foreground))] hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_hsl(var(--foreground))] transition-transform";

const ProDemo = () => {
  useEffect(() => {
    document.title = "Karije Pro — Run your travel business properly";
  }, []);

  const [agencyName, setAgencyName] = useState("Chioma Travels");

  const agency = agencyName.trim() || "Your Agency";
  const agencyInitials = agencyName.trim().split(/\s+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "YA";
  const dashReveal = useScrollReveal<HTMLDivElement>();

  return (
    <main className="min-h-screen bg-background">
      <Nav />

      {/* Hero */}
      <section className="relative pt-32 pb-20 bg-hero-mesh">
        <div className="mx-auto max-w-6xl px-6 grid md:grid-cols-[1.2fr,1fr] gap-12 items-center">
          <div>
            <div className="flex items-center gap-4 mb-5">
              <span className="h-px w-8 bg-primary" />
              <span className="text-[10px] font-jost font-light tracking-label text-muted-foreground uppercase">Karije Pro · For travel agents</span>
            </div>
            <h1 className="font-marcellus text-5xl md:text-7xl text-foreground leading-[1.02]">
              Stop chasing payments.
              <br />
              <span className="text-signal">Run more trips.</span>
            </h1>
            <p className="mt-6 font-jost text-lg text-muted-foreground max-w-md">
              Branded trip pages. Paystack payments. One dashboard. All under your name.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-5">
              <Link to="/pro/login?mode=signup" className={ctaCls}>Start Karije Pro</Link>
              <Link to="/pro/login" className="text-sm font-jost text-muted-foreground hover:text-foreground transition">
                Have an account? <span className="text-foreground font-medium underline underline-offset-2">Sign in</span>
              </Link>
            </div>
          </div>

          {/* Before → after */}
          <div className={`${cardCls} p-6 md:p-7`}>
            <div className="text-[10px] font-jost uppercase tracking-wider text-muted-foreground mb-4">Before → With Pro</div>
            <div className="space-y-4">
              {[
                ["3 hrs per itinerary", "5 minutes"],
                ["Chasing transfers", "Paystack collects"],
                ["4 trips a month", "10+ trips a month"],
              ].map(([before, after]) => (
                <div key={before} className="flex items-center justify-between gap-4 border-b border-border pb-4 last:border-0 last:pb-0">
                  <span className="font-jost text-sm text-muted-foreground line-through">{before}</span>
                  <span className="font-marcellus text-xl text-foreground text-right">{after}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Dashboard mock */}
      <Section
        id="dashboard"
        eyebrow="The dashboard"
        title={<>Every trip. Every payment.<br /><span className="text-signal text-5xl md:text-6xl">ONE SCREEN.</span></>}
      >
        {/* Outer owns the continuous float loop; inner owns the one-shot
           entrance — animate-rise and animate-float both set the CSS
           `animation` property, so they can't stack on the same element. */}
        <div ref={dashReveal.ref} className={dashReveal.visible ? "animate-float" : ""}>
        <div className={`${dashReveal.visible ? "animate-rise" : "opacity-0"} rounded-3xl bg-ink text-paper border-[3px] border-foreground shadow-[6px_6px_0_0_hsl(var(--signal))] p-2 overflow-hidden`}>
          {/* fake browser */}
          <div className="flex items-center gap-1.5 px-3 py-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
            <div className="ml-3 text-[10px] font-jost opacity-50">karije.com / pro / dashboard</div>
          </div>
          <div className="rounded-2xl bg-background text-foreground p-5 md:p-7">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className={`${avatarCls} w-9 h-9 rounded-lg text-xs`}>CT</div>
                <div className="font-marcellus text-foreground">Chioma Travels</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-jost uppercase tracking-wider text-muted-foreground">Collected</div>
                <div className="font-marcellus text-xl tabular-nums">₦2.72m</div>
              </div>
            </div>

            <div className="rounded-xl border-2 border-foreground overflow-hidden">
              {trips.map((t) => {
                const pct = Math.round((t.paid / t.total) * 100);
                return (
                  <div key={t.name} className="grid grid-cols-12 items-center gap-3 px-4 py-3.5 text-xs font-jost border-t border-border first:border-t-0">
                    <div className="col-span-7 md:col-span-5">
                      <div className="font-semibold">{t.name}</div>
                      <div className="text-[10px] text-muted-foreground">{t.date}</div>
                    </div>
                    <div className="hidden md:flex col-span-4 items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div className="h-full bg-signal" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="tabular-nums text-[10px] text-muted-foreground">{t.paid}/{t.total} paid</span>
                    </div>
                    <div className="col-span-5 md:col-span-3 text-right"><Chip tone={t.tone}>{t.status}</Chip></div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        </div>
      </Section>

      {/* Interactive branding demo */}
      <Section
        id="try-it"
        eyebrow="White label"
        title={<>Your name on everything. <span className="text-muted-foreground">Not ours.</span></>}
        sub="Type your agency name and watch it go live."
      >
        <div className="flex items-center gap-3 mb-8 max-w-md">
          <div className={`${avatarCls} w-10 h-10 rounded-xl shrink-0`}>{agencyInitials}</div>
          <input
            value={agencyName}
            onChange={(e) => setAgencyName(e.target.value)}
            placeholder="Your agency name"
            maxLength={40}
            className="flex-1 rounded-xl bg-background border-2 border-foreground px-4 py-3 text-sm font-jost font-medium focus:outline-none focus:border-signal transition"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {/* Trip page */}
          <div className={`${cardClsSm} p-5`}>
            <div className="text-[10px] font-jost uppercase tracking-wider text-muted-foreground mb-3">Trip page</div>
            <div className="rounded-xl border-2 border-border p-5">
              <div className="flex items-center gap-2.5 mb-4">
                <div className={`${avatarCls} w-9 h-9 rounded-lg text-xs shrink-0`}>{agencyInitials}</div>
                <div className="font-jost font-semibold text-sm">{agency}</div>
              </div>
              <div className="font-marcellus text-xl">Calabar Carnival 2026</div>
              <div className="text-xs font-jost text-muted-foreground mt-1">Curated by {agency} · 4 days</div>
              <div className="font-marcellus text-2xl mt-3 tabular-nums">₦65,000<span className="text-sm font-jost text-muted-foreground">/person</span></div>
            </div>
          </div>

          {/* Payment page */}
          <div className={`${cardClsSm} p-5`}>
            <div className="text-[10px] font-jost uppercase tracking-wider text-muted-foreground mb-3">Payment page</div>
            <div className="rounded-xl border-2 border-border p-5">
              <div className="flex items-center justify-between text-sm font-jost py-2 border-b border-border">
                <span className="text-muted-foreground">Trip share</span>
                <span className="font-semibold tabular-nums">₦23,917</span>
              </div>
              <div className="flex items-center justify-between text-sm font-jost py-2">
                <span className="text-muted-foreground">Planning fee — {agency}</span>
                <span className="font-semibold tabular-nums">₦10,000</span>
              </div>
              <div className="mt-4 rounded-full bg-signal text-ink border-2 border-foreground text-sm text-center py-2.5 font-jost font-bold">Pay ₦33,917</div>
              <div className="mt-2 text-center text-[10px] font-jost text-muted-foreground">Booking via {agency}</div>
            </div>
          </div>
        </div>
      </Section>

      {/* Pricing */}
      <Section id="pricing" eyebrow="Pricing" title={<>₦10,000 a month.<br /><span className="text-muted-foreground">One trip pays for it.</span></>}>
        <div className="max-w-md">
          <div className="rounded-3xl bg-ink text-paper border-[3px] border-signal shadow-[6px_6px_0_0_hsl(var(--signal))] p-7">
            <div className="font-marcellus text-lg">Karije Pro</div>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="font-marcellus text-5xl tabular-nums">₦10,000</span>
              <span className="text-sm font-jost opacity-80">/month</span>
            </div>
            <ul className="mt-6 space-y-2.5 text-sm font-jost">
              {[
                "Unlimited trips",
                "Your brand, not ours",
                "Keep 100% of your fees",
                "Paystack payments + reminders",
              ].map((f) => (
                <li key={f} className="flex gap-2"><span className="text-signal">✓</span>{f}</li>
              ))}
            </ul>
            <Link to="/pro/login?mode=signup" className="mt-7 block text-center rounded-full bg-signal text-ink border-2 border-paper py-3 text-sm font-jost font-bold hover:-translate-y-0.5 transition-transform">Start Karije Pro</Link>
            <div className="mt-3 text-center text-xs font-jost opacity-60">Cancel anytime.</div>
          </div>
        </div>
      </Section>

      {/* Final CTA */}
      <section className="py-24 bg-ink text-paper border-t-[3px] border-signal">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="font-marcellus text-4xl md:text-6xl leading-[1.05]">
            Your agency. Your clients.
            <br />
            <span className="text-signal">Live in 10 minutes.</span>
          </h2>
          <div className="mt-10">
            <Link to="/pro/login?mode=signup" className="inline-block rounded-full bg-signal text-ink border-[3px] border-paper px-8 py-3.5 text-sm font-jost font-bold shadow-[4px_4px_0_0_rgba(255,255,255,0.25)] hover:-translate-y-0.5 transition-transform">Start Karije Pro</Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
};

export default ProDemo;
