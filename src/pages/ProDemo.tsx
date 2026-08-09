import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

const Chip = ({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "warn" | "good" | "brand" }) => {
  const tones = {
    default: "bg-secondary text-muted-foreground",
    warn: "bg-yellow-100 text-yellow-900",
    good: "bg-emerald-100 text-emerald-900",
    brand: "bg-primary/10 text-primary",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${tones[tone]}`}>{children}</span>
  );
};

const Section = ({ id, eyebrow, title, sub, children }: { id?: string; eyebrow?: string; title: React.ReactNode; sub?: string; children: React.ReactNode }) => (
  <section id={id} className="py-20 md:py-28">
    <div className="mx-auto max-w-6xl px-6">
      <div className="max-w-2xl mb-10">
        {eyebrow && <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</span>}
        <h2 className="font-display text-3xl md:text-5xl font-semibold tracking-tight mt-2 leading-[1.05]">{title}</h2>
        {sub && <p className="mt-4 text-muted-foreground">{sub}</p>}
      </div>
      {children}
    </div>
  </section>
);

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
      {/* Top bar */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-marcellus text-xl text-forest tracking-logo" style={{ textIndent: "0.1em" }}>
            Karije
            <span className="ml-1 text-[10px] font-jost font-bold uppercase tracking-wider px-1.5 py-0.5 bg-foreground text-background">Pro</span>
          </Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Back</Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-20 pb-16 bg-hero-mesh">
        <div className="mx-auto max-w-6xl px-6 grid md:grid-cols-[1.1fr,1fr] gap-12 items-center">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">For travel agents</span>
            <h1 className="font-display text-4xl md:text-6xl font-semibold tracking-tight mt-3 leading-[1.02]">
              Run your travel business
              <br />
              <span className="text-muted-foreground">properly.</span>
            </h1>
            <p className="mt-5 text-lg text-muted-foreground max-w-lg">
              Stop building itineraries in Word. Stop chasing 15 people for transfers. Karije Pro replaces all of it — fully branded as <span className="font-semibold text-foreground">your agency</span>.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#dashboard" className="rounded-full bg-foreground text-background px-5 py-2.5 text-sm font-medium hover:opacity-90">See the dashboard</a>
              <a href="#try-it" className="rounded-full ring-1 ring-foreground/20 px-5 py-2.5 text-sm font-medium hover:bg-foreground/5">Brand it as yours</a>
            </div>
            <div className="mt-6 flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex -space-x-2">
                {["AT", "CE", "YG"].map((b, i) => (<div key={i} className="w-6 h-6 rounded-full bg-gradient-primary grid place-items-center text-primary-foreground text-[9px] font-bold ring-2 ring-background">{b}</div>))}
              </div>
              34 agents in beta · West Africa
            </div>
          </div>

          {/* Persona card */}
          <div className="rounded-3xl bg-card ring-hairline p-6 shadow-card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-primary grid place-items-center text-primary-foreground font-display font-bold">CO</div>
              <div>
                <div className="font-semibold">Chioma Okeke</div>
                <div className="text-xs text-muted-foreground">Lagos · Solo travel agent · 4–6 trips/mo</div>
              </div>
              <Chip tone="brand">Beta</Chip>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl bg-secondary/60 p-3">
                <div className="text-muted-foreground mb-1">Before Pro</div>
                <ul className="space-y-1.5">
                  <li>• 3 hrs per itinerary in Word</li>
                  <li>• Chasing 15 transfers manually</li>
                  <li>• Cap: 3–4 trips/month</li>
                </ul>
              </div>
              <div className="rounded-xl bg-primary/10 p-3">
                <div className="text-primary font-semibold mb-1">After Pro</div>
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
        <div className="rounded-3xl bg-foreground text-background p-2 shadow-card overflow-hidden">
          {/* fake browser */}
          <div className="flex items-center gap-1.5 px-3 py-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
            <div className="ml-3 text-[10px] opacity-50">chiomatravel.karije.com / dashboard</div>
          </div>
          <div className="rounded-2xl bg-background text-foreground p-5 md:p-7">
            {/* topline */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-gradient-primary grid place-items-center text-primary-foreground text-xs font-display font-bold">CT</div>
                <div>
                  <div className="font-display font-semibold leading-tight">Chioma Travels</div>
                  <div className="text-[11px] text-muted-foreground">Pro Growth · 4 active trips</div>
                </div>
              </div>
              <div className="hidden md:flex items-center gap-2">
                <Chip tone="good">+ New trip</Chip>
                <Chip>Templates (8)</Chip>
                <Chip>Clients (47)</Chip>
              </div>
            </div>

            {/* KPI strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {[
                { k: "Active trips", v: "4", s: "of unlimited" },
                { k: "December revenue", v: "₦2.72m", s: "+38% vs Nov" },
                { k: "Service fees", v: "₦480k", s: "kept 100%" },
                { k: "Pending follow-ups", v: "3", s: "1 overdue" },
              ].map((m) => (
                <div key={m.k} className="rounded-xl bg-secondary/60 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{m.k}</div>
                  <div className="font-display text-xl font-semibold mt-1 tabular-nums">{m.v}</div>
                  <div className="text-[10px] text-muted-foreground">{m.s}</div>
                </div>
              ))}
            </div>

            {/* trips table */}
            <div className="rounded-xl ring-hairline overflow-hidden">
              <div className="grid grid-cols-12 px-4 py-2 text-[10px] uppercase tracking-wider text-muted-foreground bg-secondary/40">
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
                      className="w-full grid grid-cols-12 items-center px-4 py-3 text-xs text-left hover:bg-secondary/30 transition-colors"
                    >
                      <div className="col-span-4">
                        <div className="font-semibold flex items-center gap-2">{t.name} <Chip tone={t.tone}>{t.status}</Chip></div>
                        <div className="text-[10px] text-muted-foreground">{t.date} · {t.revenue}</div>
                      </div>
                      <div className="col-span-2 tabular-nums">{t.squad} ppl</div>
                      <div className="col-span-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                            <div className="h-full bg-gradient-primary" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="tabular-nums text-[10px] text-muted-foreground">{t.paid}/{t.total}</span>
                        </div>
                      </div>
                      <div className={`col-span-2 text-[11px] ${t.tone === "warn" ? "text-yellow-700" : "text-muted-foreground"}`}>{t.action}</div>
                      <div className="col-span-1 text-right text-muted-foreground text-[10px]">{isOpen ? "▲" : "▼"}</div>
                    </button>

                    {isOpen && (
                      <div className="px-4 pb-4 bg-secondary/20">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 pt-2">Members</div>
                        <div className="flex flex-wrap gap-2">
                          {members.map((m) => (
                            <div key={m.name} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${m.paid ? "bg-emerald-100 text-emerald-800" : "bg-yellow-100 text-yellow-800"}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${m.paid ? "bg-emerald-500" : "bg-yellow-500"}`} />
                              {m.name}
                              <span className="opacity-70">{m.paid ? "paid" : "pending"}</span>
                            </div>
                          ))}
                        </div>
                        {members.some((m) => !m.paid) && (
                          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-foreground text-background px-3 py-1.5 text-[11px] font-medium cursor-pointer hover:opacity-90">
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

            <div className="mt-3 text-[10px] text-muted-foreground">↑ Pro Growth view. Pro Starter caps at 3 active trips.</div>
          </div>
        </div>
      </Section>

      {/* White label */}
      <Section eyebrow="White label" title="Your clients never see Karije." sub="Itinerary, WhatsApp messages, payment page, booking page — all branded as your agency. We get paid quietly in the background.">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Branded itinerary */}
          <div className="rounded-3xl bg-card ring-hairline p-6 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary grid place-items-center text-primary-foreground text-xs font-bold">CT</div>
                <div>
                  <div className="text-sm font-semibold">Chioma Travels</div>
                  <div className="text-[10px] text-muted-foreground">Sample client itinerary</div>
                </div>
              </div>
              <button onClick={() => setShowInvisible(!showInvisible)} className="text-[10px] text-muted-foreground hover:text-foreground underline">
                {showInvisible ? "Hide" : "Show"} where Karije is
              </button>
            </div>

            <div className="rounded-2xl bg-secondary/40 p-5">
              <div className="h-1 rounded-full bg-primary mb-4 w-12" />
              <div className="font-display text-xl font-semibold leading-tight">Calabar Carnival 2026</div>
              <div className="text-xs text-muted-foreground mt-1">Curated by Chioma Travels · 4 days · 14 squad</div>
              <div className="font-display text-2xl font-semibold mt-3 tabular-nums">₦65,000<span className="text-sm font-normal text-muted-foreground">/person</span></div>

              <div className="mt-5 space-y-2">
                {[
                  ["Day 1", "Arrival · Marina sunset · welcome dinner at Freddie's"],
                  ["Day 2", "Carnival main parade · VIP stand · afterparty at Mirage"],
                  ["Day 3", "Tinapa · Obudu cable car · seafood night"],
                  ["Day 4", "Brunch at Calypso · departure"],
                ].map(([d, l]) => (
                  <div key={d} className="text-[11px] flex gap-3">
                    <span className="font-semibold w-10 shrink-0">{d}</span>
                    <span className="text-muted-foreground">{l}</span>
                  </div>
                ))}
              </div>

              <div className="mt-5 pt-4 border-t border-border text-[10px] text-muted-foreground flex items-center justify-between">
                <span>Questions? +234 802 ••• 4421 · Chioma Travels</span>
                {showInvisible && <Chip tone="brand">↑ no Karije anywhere</Chip>}
              </div>
            </div>
          </div>

          {/* Payment breakdown */}
          <div className="rounded-3xl bg-card ring-hairline p-6 shadow-card">
            <div className="text-xs text-muted-foreground mb-1">Client payment link · Paystack</div>
            <div className="font-display text-lg font-semibold mb-4">What Tolu sees on her phone</div>

            <div className="rounded-2xl bg-secondary/40 p-5 text-sm">
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
                <span className="font-display text-xl font-semibold tabular-nums">₦33,917</span>
              </div>
              <button className="mt-4 w-full rounded-full bg-foreground text-background py-2.5 text-sm font-medium">Pay with Paystack</button>
              <div className="mt-2 text-center text-[10px] text-muted-foreground">Powered by Chioma Travels</div>
            </div>
          </div>
        </div>
      </Section>

      {/* Interactive branding demo */}
      <Section id="try-it" eyebrow="Try it yourself" title={<>Type your name. <span className="text-muted-foreground">Watch it apply.</span></>} sub="Every client-facing surface updates instantly — itinerary, WhatsApp messages, payment page. Your clients never see us.">
        <div>
          {/* Agency name input */}
          <div className="flex items-center gap-3 mb-8 max-w-md">
            <div className="w-10 h-10 rounded-xl bg-gradient-primary grid place-items-center text-primary-foreground font-display font-bold shrink-0 transition-all">
              {agencyInitials}
            </div>
            <input
              value={agencyName}
              onChange={(e) => setAgencyName(e.target.value)}
              placeholder="Your agency name"
              maxLength={40}
              className="flex-1 rounded-xl bg-secondary/60 ring-hairline px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
            />
          </div>

          {/* Live preview panels */}
          <div className="grid md:grid-cols-3 gap-4">
            {/* Panel 1: WhatsApp message */}
            <div className="rounded-2xl bg-card ring-hairline p-5">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3">WhatsApp · Group message</div>
              <div className="rounded-xl bg-secondary/60 p-4 space-y-2.5">
                <div className="text-[11px] font-semibold text-primary">{agencyName || "Your Agency"} Bot</div>
                <div className="text-sm text-foreground/90 leading-snug whitespace-pre-line">
                  👋 Hey Calabar Carnival squad!{"\n"}{agencyName || "Your Agency"} here.{"\n"}Tolu's trip is ready:
                </div>
                <div className="rounded-lg bg-card p-3 text-xs space-y-1">
                  <div>📍 Lagos → Calabar · 4 days · 14 squad</div>
                  <div>🏨 Transcorp Calabar · ₦22k/night</div>
                  <div>💰 Est. ₦65,000/person all-in</div>
                </div>
              </div>
            </div>

            {/* Panel 2: Itinerary header */}
            <div className="rounded-2xl bg-card ring-hairline p-5">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3">PDF Itinerary · Header</div>
              <div className="rounded-xl bg-secondary/40 p-4">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-9 h-9 rounded-lg bg-gradient-primary grid place-items-center text-primary-foreground text-xs font-display font-bold shrink-0">
                    {agencyInitials}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{agencyName || "Your Agency"}</div>
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <svg viewBox="0 0 24 24" className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                      Verified Pro
                    </div>
                  </div>
                </div>
                <div className="font-display text-base font-semibold">Calabar Carnival 2026</div>
                <div className="text-xs text-muted-foreground mt-0.5">Curated by {agencyName || "Your Agency"} · 4 days · 14 squad</div>
                <div className="mt-4 pt-3 border-t border-border text-[10px] text-muted-foreground">
                  Questions? Contact {agencyName || "Your Agency"} directly.
                </div>
              </div>
            </div>

            {/* Panel 3: Payment page */}
            <div className="rounded-2xl bg-card ring-hairline p-5">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3">Client payment page · Paystack</div>
              <div className="rounded-xl bg-secondary/40 p-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-gradient-primary grid place-items-center text-primary-foreground text-[10px] font-bold">
                    {agencyInitials}
                  </div>
                  <div className="font-semibold text-sm">{agencyName || "Your Agency"}</div>
                </div>
                <div className="text-xs font-medium mb-3">Calabar Carnival — your share</div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Planning fee — {agencyName || "Your Agency"}</span>
                    <span className="font-semibold">₦10,000</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Hotel + transport</span>
                    <span className="font-semibold">₦23,917</span>
                  </div>
                </div>
                <div className="mt-4 rounded-lg bg-foreground text-background text-xs text-center py-2 font-medium">Pay ₦33,917</div>
                <div className="mt-2 text-center text-[9px] text-muted-foreground">Booking via {agencyName || "Your Agency"}</div>
              </div>
            </div>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">Karije doesn't appear anywhere your clients can see. We're the engine. You're the brand.</p>
        </div>
      </Section>

      {/* Feature grid */}
      <Section eyebrow="What's in the box" title="Everything you cobble together today — in one tool.">
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { i: "🎨", t: "Branded itineraries", d: "Your logo, your colors, your agency name on every PDF and message." },
            { i: "💸", t: "Service fee collection", d: "Set flat or %. Added to each Paystack link. You keep 100%." },
            { i: "👥", t: "Client profiles", d: "Trip history, payment status, notes — 'always pays late', 'vegetarian'." },
            { i: "🧱", t: "Trip templates", d: "Save full configs. New trip in one click — just change dates." },
            { i: "📊", t: "Revenue dashboard", d: "Monthly earnings, most profitable routes, service fees vs platform fees." },
            { i: "🌐", t: "Custom booking page", d: "chiomatravel.karije.com. Looks fully owned by you." },
          ].map((f) => (
            <div key={f.t} className="rounded-2xl bg-card ring-hairline p-5">
              <div className="text-2xl mb-2">{f.i}</div>
              <div className="font-semibold text-sm mb-1">{f.t}</div>
              <div className="text-xs text-muted-foreground leading-relaxed">{f.d}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* Pricing */}
      <Section id="pricing" eyebrow="Pricing" title="₦10,000/month to run your business properly." sub="One trip. One service fee. Pro pays for itself in less than half a trip.">
        <div className="grid md:grid-cols-2 gap-5">
          <div className="rounded-3xl bg-card ring-hairline p-7">
            <div className="flex items-center justify-between">
              <div className="font-display text-lg font-semibold">Pro Starter</div>
              <Chip>Solo agent</Chip>
            </div>
            <div className="mt-5 flex items-baseline gap-1">
              <span className="font-display text-4xl font-semibold tabular-nums">₦10,000</span>
              <span className="text-sm text-muted-foreground">/month</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">Move from WhatsApp chaos to a proper system.</p>
            <ul className="mt-6 space-y-2.5 text-[13px]">
              {["Up to 3 active trips", "Branded itineraries (no Karije branding)", "Service fee collection — keep 100%", "Paystack contribution links", "Auto reminders", "Trip templates (5)", "Verified Pro badge + directory listing", "WhatsApp bot fully branded"].map((f) => (
                <li key={f} className="flex gap-2"><span className="text-primary">✓</span>{f}</li>
              ))}
            </ul>
            <Link to="/pro/setup" className="mt-7 block text-center rounded-full bg-foreground text-background py-3 text-sm font-medium hover:opacity-90">Start Pro Starter</Link>
          </div>

          <div className="rounded-3xl bg-gradient-primary text-primary-foreground p-7 shadow-glow">
            <div className="flex items-center justify-between">
              <div className="font-display text-lg font-semibold">Pro Growth</div>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full bg-white/20">Scaling</span>
            </div>
            <div className="mt-5 flex items-baseline gap-1">
              <span className="font-display text-4xl font-semibold tabular-nums">₦20,000</span>
              <span className="text-sm opacity-80">/month</span>
            </div>
            <p className="text-sm opacity-90 mt-2">When 3 trips a month isn't enough anymore.</p>
            <ul className="mt-6 space-y-2.5 text-[13px]">
              {["Unlimited active trips", "Everything in Starter", "Full client dashboard with payment tracking", "Revenue analytics & route profitability", "Unlimited trip templates", "Multiple agent seats (assistant / partner)", "Priority WhatsApp support", "Custom subdomain — chiomatravel.karije.com"].map((f) => (
                <li key={f} className="flex gap-2"><span>✓</span>{f}</li>
              ))}
            </ul>
            <Link to="/pro/setup?plan=growth" className="mt-7 block text-center rounded-full bg-white text-foreground py-3 text-sm font-medium hover:bg-white/90">Start Pro Growth</Link>
          </div>
        </div>

        <div className="mt-8 rounded-3xl ring-hairline bg-secondary/40 p-6 md:p-8 grid md:grid-cols-[auto,1fr] gap-6 items-center">
          <div className="font-display text-3xl md:text-4xl font-semibold leading-tight">
            ₦10,000 fee × 4 trips
            <br />
            <span className="text-primary">= ₦40,000 / month</span>
          </div>
          <div className="text-sm text-muted-foreground max-w-md">
            At a single ₦10,000 service fee per trip and just 4 trips a month, Pro Starter pays for itself in less than half a trip. Everything beyond that is profit you weren't capturing before.
          </div>
        </div>
      </Section>

      {/* Onboarding */}
      <Section eyebrow="Onboarding" title="Live in 10 minutes.">
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { n: "01", t: "Agency setup", d: "Name, logo, WhatsApp number, brand color, default service fee. Once." },
            { n: "02", t: "First branded trip", d: "Bot walks you through. You see exactly what your client will receive." },
            { n: "03", t: "Public profile live", d: "karije.com/chioma — drop in your bio. Clients book directly." },
          ].map((s) => (
            <div key={s.n} className="rounded-2xl bg-card ring-hairline p-5">
              <div className="font-display text-3xl font-semibold text-primary tabular-nums">{s.n}</div>
              <div className="font-semibold text-sm mt-2">{s.t}</div>
              <div className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{s.d}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* Testimonial slot */}
      <Section eyebrow="From beta agents" title="What they're saying.">
        <div className="grid md:grid-cols-2 gap-5">
          <div className="rounded-3xl bg-card ring-hairline p-7">
            <div className="text-2xl text-primary leading-none">"</div>
            <p className="text-base leading-relaxed mt-2">
              I used to spend my Sundays building Word itineraries and chasing transfers. Now I send one link. My clients think I built the whole system myself.
            </p>
            <div className="mt-5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-primary grid place-items-center text-primary-foreground text-xs font-bold">AT</div>
              <div className="text-xs">
                <div className="font-semibold">Amaka — Amaka Travels</div>
                <div className="text-muted-foreground">Lagos · 9 trips since switching</div>
              </div>
            </div>
          </div>
          <div className="rounded-3xl ring-hairline border-2 border-dashed border-border p-7 grid place-items-center text-center text-muted-foreground">
            <div>
              <div className="text-xs uppercase tracking-wider">Testimonial slot</div>
              <div className="text-sm mt-1">Reserved for the next beta agent who closes a Pro trip end-to-end.</div>
            </div>
          </div>
        </div>
      </Section>

      {/* Final CTA */}
      <section className="py-24 bg-foreground text-background">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="font-display text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05]">
            Your agency. Your clients.
            <br />
            <span className="opacity-60">Our infrastructure.</span>
          </h2>
          <p className="mt-5 text-base opacity-80 max-w-xl mx-auto">
            Start with Pro Starter for ₦10,000/month. Upgrade to Growth the moment you're juggling more than 3 trips. Cancel anytime.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <Link to="/pro/setup" className="rounded-full bg-white text-foreground px-6 py-3 text-sm font-medium hover:bg-white/90">Start Pro Starter</Link>
            <a href="#try-it" className="rounded-full ring-1 ring-white/30 px-6 py-3 text-sm font-medium hover:bg-white/10">Brand it as yours ↑</a>
          </div>
        </div>
      </section>
    </main>
  );
};

export default ProDemo;
