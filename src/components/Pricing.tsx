import { Link } from "react-router-dom";

const plans = [
  {
    name: "Free",
    price: "₦0",
    cadence: "forever",
    tag: "Try it",
    desc: "Plan your first 2 trips with the basics.",
    features: ["2 trips lifetime", "AI itinerary (2 days)", "WhatsApp summary + date poll", "Up to 8 members"],
    cta: "Start free",
    style: "ring",
  },
  {
    name: "Per Trip",
    price: "₦5,000",
    cadence: "per trip",
    tag: "Most loved",
    desc: "Split across your squad. Added invisibly to each member's Paystack link.",
    detail: "8 members → ₦625 each · 12 members → ₦417 each",
    features: ["Full AI itinerary", "Hotel suggestions", "Paystack contribution links", "Auto reminders", "Up to 30 members"],
    cta: "Plan a trip",
    style: "primary",
  },
  {
    name: "Pro Starter",
    price: "₦10,000",
    cadence: "per month",
    tag: "Solo agent",
    desc: "Branded as your agency. Move from WhatsApp chaos to a real system.",
    features: ["Up to 3 active trips", "Branded itineraries (no Karije branding)", "Service fee — keep 100%", "Trip templates (5)", "Verified Pro badge"],
    cta: "Start Pro Starter",
    style: "ring",
    href: "/pro",
  },
  {
    name: "Pro Growth",
    price: "₦20,000",
    cadence: "per month",
    tag: "Scaling",
    desc: "Unlimited trips, revenue analytics, custom subdomain. For agents at 4+ trips/month.",
    features: ["Unlimited active trips", "Client dashboard + payment tracking", "Revenue analytics", "Multiple agent seats", "chiomatravel.karije.com"],
    cta: "Go Growth",
    style: "dark",
    href: "/pro",
  },
];

export const Pricing = () => (
  <section id="pricing" className="py-28 md:py-36 bg-secondary/40">
    <div className="mx-auto max-w-6xl px-6">
      <div className="text-center max-w-2xl mx-auto">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground">Pricing</span>
        <h2 className="font-display text-4xl md:text-6xl font-semibold tracking-tight mt-3 leading-[1.05]">
          Honest pricing.
          <br />
          <span className="text-muted-foreground">No transaction cuts.</span>
        </h2>
        <p className="mt-5 text-muted-foreground">
          ₦5,000 split across your squad. Everyone chips in a little, nobody feels it.
        </p>
      </div>

      <div className="mt-16 grid md:grid-cols-2 lg:grid-cols-4 gap-5">
        {plans.map((p) => {
          const isPrimary = p.style === "primary";
          const isDark = p.style === "dark";
          return (
            <div
              key={p.name}
              className={`relative rounded-3xl p-7 flex flex-col transition-all duration-500 hover:-translate-y-1 ${
                isPrimary
                  ? "bg-gradient-primary text-primary-foreground shadow-glow"
                  : isDark
                  ? "bg-foreground text-background"
                  : "bg-card ring-hairline"
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-semibold">{p.name}</h3>
                <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full ${
                  isPrimary ? "bg-white/20" : isDark ? "bg-white/10" : "bg-secondary text-muted-foreground"
                }`}>{p.tag}</span>
              </div>

              <div className="mt-6 flex items-baseline gap-1">
                <span className="font-display text-4xl font-semibold tracking-tight">{p.price}</span>
                <span className={`text-sm ${isPrimary || isDark ? "opacity-80" : "text-muted-foreground"}`}>/{p.cadence.replace("per ", "")}</span>
              </div>
              <p className={`mt-2 text-sm ${isPrimary || isDark ? "opacity-80" : "text-muted-foreground"}`}>{p.desc}</p>
              {"detail" in p && p.detail && (
                <p className={`mt-1.5 text-xs font-medium tabular-nums ${isPrimary ? "opacity-70" : "text-muted-foreground"}`}>{p.detail}</p>
              )}

              <ul className="mt-6 space-y-3 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-[13px]">
                    <svg viewBox="0 0 24 24" className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isPrimary || isDark ? "" : "text-foreground"}`} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              {(() => {
                const btnClass = `mt-7 rounded-full py-3 text-sm font-medium transition-all text-center ${
                  isPrimary
                    ? "bg-white text-ink hover:bg-white/90"
                    : isDark
                    ? "bg-background text-foreground hover:opacity-90"
                    : "bg-foreground text-background hover:opacity-90"
                }`;
                return (p as any).href ? (
                  <Link to={(p as any).href} className={btnClass}>{p.cta}</Link>
                ) : (
                  <Link to="/start" className={btnClass}>{p.cta}</Link>
                );
              })()}
            </div>
          );
        })}
      </div>

      {/* Pro Planner showcase */}
      <div className="mt-8 rounded-3xl bg-foreground text-background p-8 md:p-10 overflow-hidden relative">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-google-blue/10 via-transparent to-google-purple/10" />
        <div className="relative grid md:grid-cols-[1fr,auto] gap-8 items-start">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider opacity-50 mb-3">Pro Planner · from ₦10,000/mo</div>
            <h3 className="font-display text-2xl md:text-3xl font-semibold mb-3 leading-tight">
              Run your travel business properly.
            </h3>
            <p className="text-sm opacity-80 leading-relaxed mb-6 max-w-lg">
              Fully white-label. Your agency name and logo on every itinerary, message, and payment page. Service fees you keep 100% of. Multi-trip dashboard, client profiles, and trip templates that scale you from 3 trips to 10.
            </p>
            <Link to="/pro" className="inline-flex items-center gap-2 rounded-lg bg-white text-ink px-5 py-2.5 text-sm font-medium hover:bg-white/90 mb-6">
              See Pro in action
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7" /></svg>
            </Link>

            <div className="flex flex-wrap gap-3 mb-6">
              {[
                { badge: "AT", name: "Amaka Travels", role: "Travel agent", stat: "34 trips planned" },
                { badge: "CE", name: "Chidi Explores", role: "Content creator", stat: "18 trips planned" },
                { badge: "YG", name: "Yemi Goes", role: "Frequent organiser", stat: "12 trips planned" },
              ].map((prof) => (
                <div key={prof.name} className="flex items-center gap-2.5 rounded-2xl bg-white/5 ring-1 ring-white/10 px-3 py-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-primary grid place-items-center text-primary-foreground text-[11px] font-display font-bold shrink-0">{prof.badge}</div>
                  <div>
                    <div className="text-sm font-semibold leading-none mb-0.5">{prof.name}</div>
                    <div className="text-[11px] opacity-60">{prof.role} · {prof.stat}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 text-sm opacity-70">
              <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              Verified Pro badge appears on every itinerary you share
            </div>
          </div>

          {/* Branded itinerary mock */}
          <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-5 min-w-[180px] shrink-0 self-start">
            <div className="text-[10px] opacity-50 uppercase tracking-wider mb-3">Sample itinerary</div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-primary grid place-items-center text-primary-foreground text-[11px] font-display font-bold shrink-0">AT</div>
              <div>
                <div className="text-xs font-semibold">Amaka Travels</div>
                <div className="text-[10px] opacity-60 flex items-center gap-1">
                  <svg viewBox="0 0 24 24" className="w-2.5 h-2.5" fill="currentColor"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                  Verified Pro
                </div>
              </div>
            </div>
            <div className="font-display text-sm font-semibold mb-0.5">Calabar Carnival 2026</div>
            <div className="text-[11px] opacity-60 mb-1">4 days · 14 squad</div>
            <div className="font-display text-lg font-semibold mb-3">₦55,000<span className="text-sm font-normal opacity-60">/person</span></div>
            <div className="space-y-1 mb-3">
              {["Day 1 — Arrival & Carnival parade", "Day 2 — Beach day + seafood", "Day 3 — Cultural tour + nightlife", "Day 4 — Brunch & departure"].map((d) => (
                <div key={d} className="text-[10px] opacity-50 flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-current shrink-0" />
                  {d}
                </div>
              ))}
            </div>
            <div className="pt-3 border-t border-white/10 text-[10px] opacity-40">Planned by Amaka via Karije</div>
          </div>
        </div>
      </div>
    </div>
  </section>
);
