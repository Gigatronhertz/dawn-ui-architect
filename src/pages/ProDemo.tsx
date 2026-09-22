import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/CTA";

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
  { name: "Calabar Carnival", date: "Dec 26 — Dec 30", squad: 14, paid: 11, total: 14, status: "On track", tone: "good" as const, action: "All payments in by Fri", revenue: "₦770,000" },
  { name: "Ghana Detty Detty", date: "Dec 27 — Jan 2", squad: 18, paid: 12, total: 18, status: "Action", tone: "warn" as const, action: "Follow up Emeka — 3 days overdue", revenue: "₦1,260,000" },
  { name: "Lagos NYE House", date: "Dec 30 — Jan 1", squad: 8, paid: 8, total: 8, status: "Locked", tone: "good" as const, action: "Ready to send final itinerary", revenue: "₦480,000" },
  { name: "Cape Coast Weekend", date: "Jan 10 — Jan 12", squad: 6, paid: 2, total: 6, status: "Collecting", tone: "default" as const, action: "Deposit deadline Jan 4", revenue: "₦210,000" },
];

const tripMembers: Record<string, { name: string; paid: boolean }[]> = {
  "Calabar Carnival": [
    { name: "Tolu", paid: true }, { name: "Chidi", paid: true }, { name: "Ada", paid: true },
    { name: "Kemi", paid: true }, { name: "Bisi", paid: false }, { name: "Femi", paid: false },
  ],
  "Ghana Detty Detty": [
    { name: "Emeka", paid: false }, { name: "Zara", paid: true }, { name: "Kunle", paid: true },
    { name: "Lola", paid: true }, { name: "Tunde", paid: false }, { name: "Amaka", paid: true },
  ],
  "Lagos NYE House": [
    { name: "Yemi", paid: true }, { name: "Sade", paid: true }, { name: "Rotimi", paid: true },
    { name: "Nike", paid: true },
  ],
  "Cape Coast Weekend": [
    { name: "Dotun", paid: true }, { name: "Chisom", paid: true }, { name: "Eze", paid: false },
    { name: "Ngozi", paid: false },
  ],
};

const ProDemo = () => {
  useEffect(() => {
    document.title = "Karije Pro — Run your travel business properly";
  }, []);

  const [showInvisible, setShowInvisible] = useState(false);
  const [agencyName, setAgencyName] = useState("Chioma Travels");
  const [expandedTrip, setExpandedTrip] = useState<string | null>(null);

  const agencyInitials = agencyName.trim().split(/\s+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "CT";

  return (
    <main className="min-h-screen bg-background">
      <Nav />

      {/* Hero */}
      <section className="relative pt-32 pb-16 bg-hero-mesh">
        <div className="mx-auto max-w-6xl px-6 grid md:grid-cols-[1.1fr,1fr] gap-12 items-center">
          <div>
            <div className="flex items-center gap-4 mb-5">
              <span className="h-px w-8 bg-primary" />
              <span className="text-[10px] font-jost font-light tracking-label text-muted-foreground uppercase">For travel agents</span>
            </div>
            <h1 className="font-marcellus text-4xl md:text-6xl text-foreground leading-[1.05]">
              Run your travel business
              <br />
              <span className="text-muted-foreground">properly.</span>
            </h1>
            <p className="mt-5 font-jost font-light text-lg text-muted-foreground max-w-lg leading-relaxed">
              Stop building itineraries in Word. Stop chasing 15 people for transfers. Karije Pro replaces all of it — fully branded as <span className="font-medium text-foreground">your agency</span>.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#dashboard" className="rounded-full bg-signal text-ink border-[3px] border-foreground px-6 py-3 text-sm font-jost font-bold shadow-[4px_4px_0_0_hsl(var(--foreground))] hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_hsl(var(--foreground))] transition-transform">See the dashboard</a>
              <a href="#try-it" className="rounded-full border-[3px] border-foreground px-6 py-3 text-sm font-jost font-bold text-foreground hover:bg-secondary transition-colors">Brand it as yours</a>
            </div>
            <div className="mt-4">
              <Link to="/pro/login" className="text-[13px] font-jost text-muted-foreground hover:text-foreground transition">
                Already a member? <span className="text-foreground font-medium underline underline-offset-2">Sign in →</span>
              </Link>
            </div>
            <div className="mt-5 flex items-center gap-3 text-xs font-jost text-muted-foreground">
              <div className="flex -space-x-2">
                {["AT", "CE", "YG"].map((b, i) => (<div key={i} className={`${avatarCls} w-6 h-6 rounded-full text-[9px]`}>{b}</div>))}
              </div>
              Travel agencies across West Africa
            </div>
          </div>

          {/* Persona card */}
          <div className={`${cardCls} p-6`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`${avatarCls} w-12 h-12 rounded-full`}>CO</div>
              <div>
                <div className="font-jost font-semibold text-foreground">Chioma Okeke</div>
                <div className="text-xs font-jost text-muted-foreground">Lagos · Solo travel agent · 4–6 trips/mo</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs font-jost">
              <div className="rounded-xl border-2 border-border p-3">
                <div className="text-muted-foreground mb-1">Before Pro</div>
                <ul className="space-y-1.5">
                  <li>• 3 hrs per itinerary in Word</li>
                  <li>• Chasing 15 transfers manually</li>
                  <li>• Cap: 3–4 trips/month</li>
                </ul>
              </div>
              <div className="rounded-xl border-2 border-signal bg-signal/10 p-3">
                <div className="text-foreground font-semibold mb-1">After Pro</div>
                <ul className="space-y-1.5">
                  <li>• 5 min per itinerary</li>
                  <li>• Paystack handles payments</li>
                  <li>• 8–10 trips/month</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dashboard mock */}
      <Section id="dashboard" eyebrow="Multi-trip dashboard" title="Every trip, every payment, one screen." sub="Click any trip to see who's paid and what to do next.">
        <div className="rounded-3xl bg-ink text-paper border-[3px] border-foreground shadow-[6px_6px_0_0_hsl(var(--signal))] p-2 overflow-hidden">
          {/* fake browser */}
          <div className="flex items-center gap-1.5 px-3 py-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
            <div className="ml-3 text-[10px] font-jost opacity-50">karije.com / pro / dashboard</div>
          </div>
          <div className="rounded-2xl bg-background text-foreground p-5 md:p-7">
            {/* topline */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <div className={`${avatarCls} w-9 h-9 rounded-lg text-xs`}>CT</div>
                <div>
                  <div className="font-marcellus text-foreground leading-tight">Chioma Travels</div>
                  <div className="text-[11px] font-jost text-muted-foreground">Karije Pro · 4 active trips</div>
                </div>
              </div>
              <div className="hidden md:flex items-center gap-2">
                <Chip tone="good">+ New trip</Chip>
                <Chip>Templates (8)</Chip>
                <Chip>Settings</Chip>
              </div>
            </div>

            {/* KPI strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {[
                { k: "Active trips", v: "4", s: "unlimited" },
                { k: "Total collected", v: "₦2.72m", s: "via Paystack" },
                { k: "Service fees", v: "₦480k", s: "kept 100%" },
                { k: "Pending payments", v: "3", s: "follow up" },
              ].map((m) => (
                <div key={m.k} className="rounded-xl border-2 border-border p-3">
                  <div className="text-[10px] font-jost uppercase tracking-wider text-muted-foreground">{m.k}</div>
                  <div className="font-marcellus text-xl mt-1 tabular-nums">{m.v}</div>
                  <div className="text-[10px] font-jost text-muted-foreground">{m.s}</div>
                </div>
              ))}
            </div>

            {/* trips table */}
            <div className="rounded-xl border-2 border-foreground overflow-hidden">
              <div className="grid grid-cols-12 px-4 py-2 text-[10px] font-jost uppercase tracking-wider text-muted-foreground bg-secondary/40">
                <div className="col-span-4">Trip</div>
                <div className="col-span-2">Squad</div>
                <div className="col-span-3">Payments</div>
                <div className="col-span-3">Next action</div>
              </div>
              {trips.map((t) => {
                const pct = Math.round((t.paid / t.total) * 100);
                const isOpen = expandedTrip === t.name;
                const members = tripMembers[t.name] || [];
                return (
                  <div key={t.name} className="border-t border-border">
                    <button
                      onClick={() => setExpandedTrip(isOpen ? null : t.name)}
                      className="w-full grid grid-cols-12 items-center px-4 py-3 text-xs font-jost text-left hover:bg-secondary/30 transition-colors"
                    >
                      <div className="col-span-4">
                        <div className="font-semibold flex items-center gap-2">{t.name} <Chip tone={t.tone}>{t.status}</Chip></div>
                        <div className="text-[10px] text-muted-foreground">{t.date} · {t.revenue}</div>
                      </div>
                      <div className="col-span-2 tabular-nums">{t.squad} ppl</div>
                      <div className="col-span-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                            <div className="h-full bg-signal" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="tabular-nums text-[10px] text-muted-foreground">{t.paid}/{t.total}</span>
                        </div>
                      </div>
                      <div className={`col-span-2 text-[11px] ${t.tone === "warn" ? "text-yellow-700" : "text-muted-foreground"}`}>{t.action}</div>
                      <div className="col-span-1 text-right text-muted-foreground text-[10px]">{isOpen ? "▲" : "▼"}</div>
                    </button>

                    {isOpen && (
                      <div className="px-4 pb-4 bg-secondary/20">
                        <div className="text-[10px] font-jost uppercase tracking-wider text-muted-foreground mb-2 pt-2">Members</div>
                        <div className="flex flex-wrap gap-2">
                          {members.map((m) => (
                            <div key={m.name} className={`inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1 text-xs font-jost font-medium ${m.paid ? "bg-emerald-100 text-emerald-800 border-emerald-300" : "bg-signal/20 text-ink border-signal"}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${m.paid ? "bg-emerald-500" : "bg-signal"}`} />
                              {m.name}
                              <span className="opacity-70">{m.paid ? "paid" : "pending"}</span>
                            </div>
                          ))}
                        </div>
                        {members.some((m) => !m.paid) && (
                          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-foreground text-background border-2 border-foreground px-3 py-1.5 text-[11px] font-jost font-medium cursor-pointer hover:opacity-90">
                            <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.4 8.4 0 01-1.3 4.5 8.5 8.5 0 01-7.3 4 8.4 8.4 0 01-4.4-1.2L3 20l1.4-4.9a8.4 8.4 0 01-1.3-4.5 8.5 8.5 0 014-7.3 8.4 8.4 0 014.5-1.3 8.5 8.5 0 018.5 8.5z" /></svg>
                            Send reminder to unpaid members
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-3 text-[10px] font-jost text-muted-foreground">↑ Your dashboard. One plan, unlimited active trips.</div>
          </div>
        </div>
      </Section>

      {/* White label */}
      <Section eyebrow="White label" title="Your clients never see Karije." sub="Trip page, payment page, reminders — all branded as your agency. We get paid quietly in the background.">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Branded itinerary */}
          <div className={`${cardCls} p-6`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className={`${avatarCls} w-8 h-8 rounded-lg text-xs`}>CT</div>
                <div>
                  <div className="text-sm font-jost font-semibold">Chioma Travels</div>
                  <div className="text-[10px] font-jost text-muted-foreground">Sample client itinerary</div>
                </div>
              </div>
              <button onClick={() => setShowInvisible(!showInvisible)} className="text-[10px] font-jost text-muted-foreground hover:text-foreground underline">
                {showInvisible ? "Hide" : "Show"} where Karije is
              </button>
            </div>

            <div className="rounded-2xl border-2 border-border p-5">
              <div className="h-1 rounded-full bg-signal mb-4 w-12" />
              <div className="font-marcellus text-xl leading-tight">Calabar Carnival 2026</div>
              <div className="text-xs font-jost text-muted-foreground mt-1">Curated by Chioma Travels · 4 days · 14 squad</div>
              <div className="font-marcellus text-2xl mt-3 tabular-nums">₦65,000<span className="text-sm font-jost font-normal text-muted-foreground">/person</span></div>

              <div className="mt-5 space-y-2">
                {[
                  ["Day 1", "Arrival · Marina sunset · welcome dinner at Freddie's"],
                  ["Day 2", "Carnival main parade · VIP stand · afterparty at Mirage"],
                  ["Day 3", "Tinapa · Obudu cable car · seafood night"],
                  ["Day 4", "Brunch at Calypso · departure"],
                ].map(([d, l]) => (
                  <div key={d} className="text-[11px] font-jost flex gap-3">
                    <span className="font-semibold w-10 shrink-0">{d}</span>
                    <span className="text-muted-foreground">{l}</span>
                  </div>
                ))}
              </div>

              <div className="mt-5 pt-4 border-t border-border text-[10px] font-jost text-muted-foreground flex items-center justify-between">
                <span>Questions? +234 802 ••• 4421 · Chioma Travels</span>
                {showInvisible && <Chip tone="brand">↑ no Karije anywhere</Chip>}
              </div>
            </div>
          </div>

          {/* Payment breakdown */}
          <div className={`${cardCls} p-6`}>
            <div className="text-xs font-jost text-muted-foreground mb-1">Client payment link · Paystack</div>
            <div className="font-marcellus text-lg mb-4">What Tolu sees on her phone</div>

            <div className="rounded-2xl border-2 border-border p-5 text-sm font-jost">
              <div className="text-xs text-muted-foreground mb-3">Calabar Carnival · your share</div>
              {[
                ["Transport (charter)", "₦7,000", undefined],
                ["Hotel (3 nights, shared)", "₦12,000", undefined],
                ["Activities & VIP stand", "₦4,500", undefined],
                ["Planning fee — Chioma Travels", "₦10,000", "kept"],
                ["Platform fee", "₦417", "invisible"],
              ].map(([k, v, tag]) => (
                <div key={k} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <span className="text-foreground/80">{k}</span>
                  <div className="flex items-center gap-2">
                    {showInvisible && tag === "kept" && <Chip tone="good">100% to Chioma</Chip>}
                    {showInvisible && tag === "invisible" && <Chip tone="brand">Karije</Chip>}
                    <span className="tabular-nums font-semibold">{v}</span>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between pt-3 mt-1">
                <span className="font-semibold">Total</span>
                <span className="font-marcellus text-xl tabular-nums">₦33,917</span>
              </div>
              <button className="mt-4 w-full rounded-full bg-signal text-ink border-2 border-foreground py-2.5 text-sm font-jost font-bold">Pay with Paystack</button>
              <div className="mt-2 text-center text-[10px] font-jost text-muted-foreground">Powered by Chioma Travels</div>
            </div>
          </div>
        </div>
      </Section>

      {/* Interactive branding demo */}
      <Section id="try-it" eyebrow="Try it yourself" title={<>Type your name. <span className="text-muted-foreground">Watch it apply.</span></>} sub="Every client-facing surface updates instantly — trip page, payment reminders, payment page. Your clients never see us.">
        <div>
          {/* Agency name input */}
          <div className="flex items-center gap-3 mb-8 max-w-md">
            <div className={`${avatarCls} w-10 h-10 rounded-xl shrink-0 transition-all`}>
              {agencyInitials}
            </div>
            <input
              value={agencyName}
              onChange={(e) => setAgencyName(e.target.value)}
              placeholder="Your agency name"
              maxLength={40}
              className="flex-1 rounded-xl bg-background border-2 border-foreground px-4 py-3 text-sm font-jost font-medium focus:outline-none focus:border-signal transition"
            />
          </div>

          {/* Live preview panels */}
          <div className="grid md:grid-cols-3 gap-4">
            {/* Panel 1: the payment reminder — one person, not a group. */}
            <div className={`${cardClsSm} p-5`}>
              <div className="text-[10px] font-jost uppercase tracking-wider text-muted-foreground mb-3">Payment reminder · Email</div>
              <div className="rounded-xl border-2 border-border p-4 space-y-2.5">
                <div className="text-[11px] font-jost font-semibold text-foreground">From {agencyName || "Your Agency"}</div>
                <div className="text-sm font-jost text-foreground/90 leading-snug whitespace-pre-line">
                  Hi Tolu,{"\n"}Your place on Calabar Carnival is held — here's what's outstanding:
                </div>
                <div className="rounded-lg bg-card p-3 text-xs font-jost space-y-1">
                  <div>📍 Lagos → Calabar · 4 days</div>
                  <div>💰 ₦65,000 your share</div>
                  <div className="text-muted-foreground">→ Pay with Paystack</div>
                </div>
              </div>
            </div>

            {/* Panel 2: Itinerary header */}
            <div className={`${cardClsSm} p-5`}>
              <div className="text-[10px] font-jost uppercase tracking-wider text-muted-foreground mb-3">Trip page · Header</div>
              <div className="rounded-xl border-2 border-border p-4">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className={`${avatarCls} w-9 h-9 rounded-lg text-xs shrink-0`}>
                    {agencyInitials}
                  </div>
                  <div>
                    <div className="font-jost font-semibold text-sm">{agencyName || "Your Agency"}</div>
                    <div className="text-[10px] font-jost text-muted-foreground">Your agency, your branding</div>
                  </div>
                </div>
                <div className="font-marcellus text-base">Calabar Carnival 2026</div>
                <div className="text-xs font-jost text-muted-foreground mt-0.5">Curated by {agencyName || "Your Agency"} · 4 days · 14 squad</div>
                <div className="mt-4 pt-3 border-t border-border text-[10px] font-jost text-muted-foreground">
                  Questions? Contact {agencyName || "Your Agency"} directly.
                </div>
              </div>
            </div>

            {/* Panel 3: Payment page */}
            <div className={`${cardClsSm} p-5`}>
              <div className="text-[10px] font-jost uppercase tracking-wider text-muted-foreground mb-3">Client payment page · Paystack</div>
              <div className="rounded-xl border-2 border-border p-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className={`${avatarCls} w-8 h-8 rounded-lg text-[10px]`}>
                    {agencyInitials}
                  </div>
                  <div className="font-jost font-semibold text-sm">{agencyName || "Your Agency"}</div>
                </div>
                <div className="text-xs font-jost font-medium mb-3">Calabar Carnival — your share</div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-jost">
                    <span className="text-muted-foreground">Planning fee — {agencyName || "Your Agency"}</span>
                    <span className="font-semibold">₦10,000</span>
                  </div>
                  <div className="flex justify-between text-xs font-jost">
                    <span className="text-muted-foreground">Hotel + transport</span>
                    <span className="font-semibold">₦23,917</span>
                  </div>
                </div>
                <div className="mt-4 rounded-full bg-signal text-ink border-2 border-foreground text-xs text-center py-2 font-jost font-bold">Pay ₦33,917</div>
                <div className="mt-2 text-center text-[9px] font-jost text-muted-foreground">Booking via {agencyName || "Your Agency"}</div>
              </div>
            </div>
          </div>

          <p className="mt-4 text-xs font-jost text-muted-foreground">Karije doesn't appear anywhere your clients can see. We're the engine. You're the brand.</p>
        </div>
      </Section>

      {/* Feature grid */}
      <Section eyebrow="What's in the box" title="Everything you cobble together today — in one tool.">
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { i: "🎨", t: "Branded trip pages", d: "Your logo, your colors, your agency name on every trip page and reminder." },
            { i: "💸", t: "Service fee collection", d: "Set your fee once. Added to each Paystack link. You keep 100%." },
            { i: "🧱", t: "Trip templates", d: "Save a trip's shape and start the next one from it — only the dates move." },
            { i: "📋", t: "Payment tracking", d: "Who joined, who paid, when, and the Paystack reference for each one." },
            { i: "🔔", t: "Payment reminders", d: "Chase one person or everyone still owing, without typing the message." },
            { i: "📤", t: "Export to CSV", d: "The full traveller list — names, contacts, payment status — in one file." },
          ].map((f) => (
            <div key={f.t} className={`${cardClsSm} p-5`}>
              <div className="text-2xl mb-2">{f.i}</div>
              <div className="font-jost font-semibold text-sm mb-1">{f.t}</div>
              <div className="text-xs font-jost text-muted-foreground leading-relaxed">{f.d}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* Pricing */}
      <Section id="pricing" eyebrow="Pricing" title="₦10,000/month to run your business properly." sub="One trip. One service fee. Pro pays for itself in less than half a trip.">
        <div className="max-w-md">
          <div className="rounded-3xl bg-ink text-paper border-[3px] border-signal shadow-[6px_6px_0_0_hsl(var(--signal))] p-7">
            <div className="flex items-center justify-between">
              <div className="font-marcellus text-lg">Karije Pro</div>
              <span className="text-[10px] font-jost font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border-2 border-signal text-signal">Everything</span>
            </div>
            <div className="mt-5 flex items-baseline gap-1">
              <span className="font-marcellus text-4xl tabular-nums">₦10,000</span>
              <span className="text-sm font-jost opacity-80">/month</span>
            </div>
            <p className="text-sm font-jost opacity-90 mt-2">Unlimited trips. No per-trip cut.</p>
            <ul className="mt-6 space-y-2.5 text-[13px] font-jost">
              {[
                "Unlimited active trips",
                "Branded trip pages — no Karije branding",
                "Service fee collection — keep 100%",
                "Paystack payment links",
                "Payment tracking — who paid, when, which reference",
                "Payment reminders, one person or everyone",
                "Unlimited trip templates",
                "Traveller list export (CSV)",
              ].map((f) => (
                <li key={f} className="flex gap-2"><span className="text-signal">✓</span>{f}</li>
              ))}
            </ul>
            <Link to="/pro/login?mode=signup" className="mt-7 block text-center rounded-full bg-signal text-ink border-2 border-paper py-3 text-sm font-jost font-bold hover:-translate-y-0.5 transition-transform">Start Karije Pro</Link>
          </div>
        </div>

        <div className="mt-8 rounded-3xl border-[3px] border-foreground bg-secondary/40 p-6 md:p-8 grid md:grid-cols-[auto,1fr] gap-6 items-center">
          <div className="font-marcellus text-3xl md:text-4xl leading-tight">
            ₦10,000 fee × 4 trips
            <br />
            <span className="text-foreground">= ₦40,000 / month</span>
          </div>
          <div className="text-sm font-jost text-muted-foreground max-w-md">
            At a single ₦10,000 service fee per trip and just 4 trips a month, Pro pays for itself in less than half a trip. Everything beyond that is profit you weren't capturing before.
          </div>
        </div>
      </Section>

      {/* Onboarding */}
      <Section eyebrow="Onboarding" title="Live in 10 minutes.">
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { n: "01", t: "Agency setup", d: "Name, logo, phone number, brand color, default service fee. Once." },
            { n: "02", t: "First branded trip", d: "The builder walks you through. You see exactly what your client will receive." },
            { n: "03", t: "Share one link", d: "Send it out. Watch who joins and who pays, from your dashboard." },
          ].map((s) => (
            <div key={s.n} className={`${cardClsSm} p-5`}>
              <div className="font-marcellus text-3xl text-foreground tabular-nums">{s.n}</div>
              <div className="font-jost font-semibold text-sm mt-2">{s.t}</div>
              <div className="text-xs font-jost text-muted-foreground mt-1.5 leading-relaxed">{s.d}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* Testimonial slot */}
      <Section eyebrow="What agencies are saying" title="From agencies already running on Pro.">
        <div className="grid md:grid-cols-2 gap-5">
          <div className={`${cardCls} p-7`}>
            <div className="text-2xl text-signal leading-none">"</div>
            <p className="text-base font-jost leading-relaxed mt-2">
              I used to spend my Sundays building Word itineraries and chasing transfers. Now I send one link. My clients think I built the whole system myself.
            </p>
            <div className="mt-5 flex items-center gap-3">
              <div className={`${avatarCls} w-9 h-9 rounded-full text-xs`}>AT</div>
              <div className="text-xs font-jost">
                <div className="font-semibold">Amaka — Amaka Travels</div>
                <div className="text-muted-foreground">Lagos · 9 trips since switching</div>
              </div>
            </div>
          </div>
          <div className="rounded-3xl border-[3px] border-dashed border-foreground/40 p-7 grid place-items-center text-center text-muted-foreground">
            <div>
              <div className="text-xs font-jost uppercase tracking-wider">Testimonial slot</div>
              <div className="text-sm font-jost mt-1">Reserved for the next agency who closes a Pro trip end-to-end.</div>
            </div>
          </div>
        </div>
      </Section>

      {/* Final CTA */}
      <section className="py-24 bg-ink text-paper border-t-[3px] border-signal">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="font-marcellus text-4xl md:text-6xl leading-[1.05]">
            Your agency. Your clients.
            <br />
            <span className="opacity-60">Our infrastructure.</span>
          </h2>
          <p className="mt-5 font-jost font-light text-base opacity-80 max-w-xl mx-auto">
            ₦10,000/month, unlimited trips, no cut of what you collect. Cancel anytime.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <Link to="/pro/login?mode=signup" className="rounded-full bg-signal text-ink border-[3px] border-paper px-7 py-3 text-sm font-jost font-bold shadow-[4px_4px_0_0_rgba(255,255,255,0.25)] hover:-translate-y-0.5 transition-transform">Start Karije Pro</Link>
            <a href="#try-it" className="rounded-full border-[3px] border-paper/30 px-7 py-3 text-sm font-jost font-bold hover:border-paper/60 transition-colors">Brand it as yours ↑</a>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
};

export default ProDemo;
