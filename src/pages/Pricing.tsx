import { useState } from "react";
import { Link } from "react-router-dom";
import { Check as CheckIcon, Minus } from "lucide-react";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/CTA";

// ── Check / X icons — one shared shape (lucide), just recolored per surface ──
const Check = () => <CheckIcon className="w-4 h-4 shrink-0 text-foreground mt-0.5" strokeWidth={2.5} />;
const CheckWhite = () => <CheckIcon className="w-4 h-4 shrink-0 text-parchment/60 mt-0.5" strokeWidth={2.5} />;
const Dash = () => <Minus className="w-4 h-4 shrink-0 text-muted-foreground/30 mt-0.5" />;

// ── Eyebrow / section label ────────────────────────────────────────────────
const SectionEyebrow = ({ label, light = false }: { label: string; light?: boolean }) => (
  <div className="flex items-center gap-4 mb-5">
    <span className={`h-px w-8 ${light ? "bg-parchment/40" : "bg-primary"}`} />
    <span className={`text-[10px] font-jost font-light tracking-label uppercase ${light ? "text-parchment/50" : "text-muted-foreground"}`}>
      {label}
    </span>
  </div>
);

// ── FAQ item ───────────────────────────────────────────────────────────────
const FAQ_ITEMS = [
  {
    q: "What counts as one AI plan?",
    a: "Every time you generate a new itinerary through the AI planner — new destination, different dates, or a fresh squad size — that's one plan. Editing an existing itinerary (changing activities, swapping venues) is free and doesn't count.",
  },
  {
    q: "How does the 10% commission work on Ready-made Trips?",
    a: "There's no upfront fee. When your squad books a Karije Ready-made Trip and pays via Paystack, Karije deducts 10% of the total collected amount. The remaining 90% goes to the trip operator. You see the full breakdown before you confirm the booking.",
  },
  {
    q: "Can I switch between pay-per-plan and monthly?",
    a: "Yes, anytime. If you're planning a big trip month and want unlimited plans, switch to monthly (₦1,000) before you start. Switch back to pay-per-plan the following month. No penalties, no questions asked.",
  },
  {
    q: "Is there a contract for Pro?",
    a: "No contracts, no lock-ins. Pro is billed month-to-month. Cancel before your next billing date and you won't be charged again. Your data and trip history are yours to export.",
  },
  {
    q: "What payment methods do you accept?",
    a: "All payments go through Paystack — Nigerian debit/credit cards, bank transfer, USSD, and Opay/PalmPay wallets. Pro subscriptions can be set to auto-renew or you can pay manually each month.",
  },
  {
    q: "Do you offer a free trial for Pro?",
    a: "Yes — new Pro accounts get 14 days free on the Starter plan. No card required to start. If you love it, your first billing runs at the end of the trial period.",
  },
];

// ── Main page ──────────────────────────────────────────────────────────────
export default function Pricing() {
  const [aiMode, setAiMode]     = useState<"pay" | "monthly">("pay");
  const [openFaq, setOpenFaq]   = useState<number | null>(null);

  return (
    <main className="min-h-screen bg-background">
      <Nav />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="pt-32 pb-20 bg-hero-mesh text-center px-6">
        <div className="mx-auto max-w-3xl">
          <div className="inline-flex items-center gap-2 text-[10px] font-jost font-light tracking-label uppercase text-muted-foreground mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
            Pricing
          </div>
          <h1 className="font-marcellus text-4xl md:text-6xl text-foreground leading-[1.1] mb-5">
            Pay for what you actually use.
          </h1>
          <p className="text-muted-foreground font-jost font-light text-base md:text-lg max-w-xl mx-auto leading-relaxed">
            Start free. Generate an AI trip plan for ₦500. Book a curated Karije experience. Or power your travel agency on Pro — all priced for Nigeria.
          </p>
        </div>
      </section>

      {/* ── For Travelers ─────────────────────────────────────────────────── */}
      <section className="py-20 px-6 border-t border-border">
        <div className="mx-auto max-w-6xl">
          <SectionEyebrow label="For Travelers" />
          <h2 className="font-marcellus text-3xl md:text-4xl text-foreground mb-14 max-w-lg leading-snug">
            Plan trips that actually happen.
          </h2>

          <div className="grid md:grid-cols-3 gap-6">

            {/* ── Free ──────────────────────────────────────────────── */}
            <div className="rounded-3xl border-[3px] border-foreground bg-card p-8 flex flex-col shadow-[6px_6px_0_0_hsl(var(--foreground))]">
              <div className="mb-6">
                <span className="inline-block text-[10px] font-jost font-semibold tracking-[0.12em] uppercase px-3 py-1 rounded-full bg-secondary text-muted-foreground mb-4">
                  Free
                </span>
                <div className="font-marcellus text-5xl text-foreground leading-none mb-1">₦0</div>
                <div className="text-sm font-jost font-light text-muted-foreground">forever free</div>
              </div>

              <p className="text-sm font-jost font-light text-muted-foreground leading-relaxed mb-7">
                Try the AI planner, browse Karije's curated trip catalog, and see if it fits your squad.
              </p>

              <ul className="space-y-3 text-sm font-jost font-light text-foreground flex-1 mb-8">
                <li className="flex items-start gap-2.5"><Check /><span>3 AI trip plans per month</span></li>
                <li className="flex items-start gap-2.5"><Check /><span>Browse Ready-made Trips catalog</span></li>
                <li className="flex items-start gap-2.5"><Check /><span>Basic itinerary view</span></li>
                <li className="flex items-start gap-2.5"><Dash /><span className="text-muted-foreground">Squad Paystack payment collection</span></li>
                <li className="flex items-start gap-2.5"><Dash /><span className="text-muted-foreground">Share or download itinerary</span></li>
                <li className="flex items-start gap-2.5"><Dash /><span className="text-muted-foreground">Trip history beyond 30 days</span></li>
              </ul>

              <Link
                to="/start"
                className="w-full text-center py-3 rounded-full border-[3px] border-foreground font-jost font-bold text-sm tracking-[0.06em] text-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_hsl(var(--foreground))] transition-transform"
              >
                Start planning free →
              </Link>
            </div>

            {/* ── AI Curated (featured) ──────────────────────────── */}
            <div className="rounded-3xl border-[3px] border-foreground bg-primary-soft p-8 flex flex-col shadow-[6px_6px_0_0_hsl(var(--signal))] relative">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="inline-block text-[10px] font-jost font-bold tracking-[0.12em] uppercase px-4 py-1.5 rounded-full bg-signal text-ink border-2 border-foreground whitespace-nowrap">
                  Most popular
                </span>
              </div>

              <div className="mb-6 mt-2">
                <span className="inline-block text-[10px] font-jost font-semibold tracking-[0.12em] uppercase px-3 py-1 rounded-full bg-primary/10 text-foreground mb-4">
                  AI Curated Trips
                </span>

                {/* Mode toggle */}
                <div className="flex rounded-full bg-background border-[3px] border-foreground p-1 mb-4 w-fit gap-1">
                  {(["pay", "monthly"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setAiMode(m)}
                      className={`text-[11px] font-jost font-bold px-3.5 py-1.5 rounded-full transition-all ${
                        aiMode === m
                          ? "bg-signal text-ink shadow-[2px_2px_0_0_hsl(var(--foreground))]"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {m === "pay" ? "Per plan" : "Monthly"}
                    </button>
                  ))}
                </div>

                {aiMode === "pay" ? (
                  <>
                    <div className="font-marcellus text-5xl text-foreground leading-none mb-1">₦500</div>
                    <div className="text-sm font-jost font-light text-muted-foreground">per AI plan generated</div>
                  </>
                ) : (
                  <>
                    <div className="font-marcellus text-5xl text-foreground leading-none mb-1">₦1,000</div>
                    <div className="text-sm font-jost font-light text-muted-foreground">
                      / month · unlimited plans{" "}
                      <span className="inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-foreground">saves ₦4,000+ vs per-plan</span>
                    </div>
                  </>
                )}
              </div>

              <p className="text-sm font-jost font-light text-muted-foreground leading-relaxed mb-7">
                Answer 9 questions. Get a full itinerary — hotels, transport, day-by-day, and a per-person cost — in under 20 seconds.
              </p>

              <ul className="space-y-3 text-sm font-jost font-light text-foreground flex-1 mb-8">
                <li className="flex items-start gap-2.5"><Check /><span>Full AI-generated itinerary</span></li>
                <li className="flex items-start gap-2.5"><Check /><span>All seeded venue options for your city</span></li>
                <li className="flex items-start gap-2.5"><Check /><span>Per-person cost breakdown</span></li>
                <li className="flex items-start gap-2.5"><Check /><span>Squad Paystack payment collection</span></li>
                <li className="flex items-start gap-2.5"><Check /><span>Share + print itinerary</span></li>
                <li className="flex items-start gap-2.5"><Check /><span>Trip history (unlimited)</span></li>
              </ul>

              <Link
                to="/start/trip"
                className="w-full text-center py-3 rounded-full bg-signal text-ink border-[3px] border-foreground font-jost font-bold text-sm tracking-[0.06em] shadow-[4px_4px_0_0_hsl(var(--foreground))] hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_hsl(var(--foreground))] transition-transform"
              >
                Generate your first plan →
              </Link>
            </div>

            {/* ── Ready-made Trips ───────────────────────────────── */}
            <div className="rounded-3xl border-[3px] border-foreground bg-card p-8 flex flex-col shadow-[6px_6px_0_0_hsl(var(--foreground))]">
              <div className="mb-6">
                <span className="inline-block text-[10px] font-jost font-semibold tracking-[0.12em] uppercase px-3 py-1 rounded-full bg-secondary text-muted-foreground mb-4">
                  Ready-made Trips
                </span>
                <div className="font-marcellus text-5xl text-foreground leading-none mb-1">10%</div>
                <div className="text-sm font-jost font-light text-muted-foreground">of total booking value</div>
              </div>

              <p className="text-sm font-jost font-light text-muted-foreground leading-relaxed mb-7">
                Pick a Karije-curated trip, pay with your squad, and go. No planning needed — we've already done it all.
              </p>

              <ul className="space-y-3 text-sm font-jost font-light text-foreground flex-1 mb-8">
                <li className="flex items-start gap-2.5"><Check /><span>No upfront cost to browse or plan</span></li>
                <li className="flex items-start gap-2.5"><Check /><span>Fully designed, pre-vetted itinerary</span></li>
                <li className="flex items-start gap-2.5"><Check /><span>Pre-booked hotels &amp; transport</span></li>
                <li className="flex items-start gap-2.5"><Check /><span>Group Paystack payment collection</span></li>
                <li className="flex items-start gap-2.5"><Check /><span>Karije coordination support</span></li>
                <li className="flex items-start gap-2.5"><Dash /><span className="text-muted-foreground">Custom itinerary changes (use AI tier)</span></li>
              </ul>

              <Link
                to="/start/explore"
                className="w-full text-center py-3 rounded-full border-[3px] border-foreground font-jost font-bold text-sm tracking-[0.06em] text-foreground shadow-[4px_4px_0_0_hsl(var(--foreground))] hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_hsl(var(--foreground))] transition-transform"
              >
                Browse ready-made trips →
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* ── For Agencies (dark) ────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-forest">
        <div className="mx-auto max-w-6xl">
          <SectionEyebrow label="For Travel Agencies" light />
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-14">
            <h2 className="font-marcellus text-3xl md:text-4xl text-parchment leading-snug max-w-md">
              Run your travel business on Karije Pro.
            </h2>
            <p className="text-parchment/50 font-jost font-light text-sm max-w-xs leading-relaxed">
              White-label the WhatsApp bot, set your own service fee, and let Karije collect payments for you — invisibly.
            </p>
          </div>

          <div className="max-w-lg mx-auto">

            {/* ── Pro Starter ───────────────────────────────────── */}
            <div className="rounded-3xl border-[3px] border-signal bg-parchment/5 p-8 flex flex-col shadow-[6px_6px_0_0_hsl(var(--signal))]">
              <div className="mb-6">
                <span className="inline-block text-[10px] font-jost font-semibold tracking-[0.12em] uppercase px-3 py-1 rounded-full border-2 border-signal text-parchment/80 mb-4">
                  Pro Starter
                </span>
                <div className="font-marcellus text-5xl text-parchment leading-none mb-1">₦10,000</div>
                <div className="text-sm font-jost font-light text-parchment/50">/ month · up to 5 active trips</div>
              </div>

              <p className="text-sm font-jost font-light text-parchment/60 leading-relaxed mb-7">
                Perfect for solo agents managing a few trips at a time. Your clients never see Karije.
              </p>

              <ul className="space-y-3 text-sm font-jost font-light text-parchment/80 flex-1 mb-8">
                <li className="flex items-start gap-2.5"><CheckWhite /><span>White-label WhatsApp bot</span></li>
                <li className="flex items-start gap-2.5"><CheckWhite /><span>Agency dashboard &amp; custom branding</span></li>
                <li className="flex items-start gap-2.5"><CheckWhite /><span>Set your own service fee (you keep 100%)</span></li>
                <li className="flex items-start gap-2.5"><CheckWhite /><span>Squad Paystack payment collection</span></li>
                <li className="flex items-start gap-2.5"><CheckWhite /><span>Up to 5 active trips at once</span></li>
                <li className="flex items-start gap-2.5">
                  <svg viewBox="0 0 16 16" className="w-4 h-4 shrink-0 text-parchment/20 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="4" y1="8" x2="12" y2="8"/></svg>
                  <span className="text-parchment/30">Trip analytics</span>
                </li>
              </ul>

              <Link
                to="/pro/login?mode=signup"
                className="w-full text-center py-3 rounded-full bg-signal text-ink border-[3px] border-foreground font-jost font-bold text-sm tracking-[0.06em] shadow-[4px_4px_0_0_rgba(0,0,0,0.4)] hover:-translate-y-0.5 transition-transform"
              >
                Create your account →
              </Link>
              <p className="text-center text-[11px] font-jost font-light text-parchment/30 mt-3">
                14 days free · no card required
              </p>
            </div>

          </div>

          {/* Proof line */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
            <span className="text-[11px] font-jost font-light text-parchment/30 flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-parchment/20 inline-block" />
              Cancel anytime
            </span>
            <span className="text-[11px] font-jost font-light text-parchment/30 flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-parchment/20 inline-block" />
              Paystack · NGN billing
            </span>
            <span className="text-[11px] font-jost font-light text-parchment/30 flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-parchment/20 inline-block" />
              Your clients never see Karije
            </span>
            <span className="text-[11px] font-jost font-light text-parchment/30 flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-parchment/20 inline-block" />
              14-day free trial
            </span>
          </div>
        </div>
      </section>

      {/* ── Comparison table ──────────────────────────────────────────────── */}
      <section className="py-20 px-6 border-t border-border">
        <div className="mx-auto max-w-4xl">
          <SectionEyebrow label="What's included" />
          <h2 className="font-marcellus text-3xl text-foreground mb-12 leading-snug">
            Everything at a glance.
          </h2>

          <div className="overflow-x-auto rounded-2xl border-[3px] border-foreground p-4">
            <table className="w-full min-w-[560px] text-sm font-jost font-light">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left pb-4 text-xs font-semibold tracking-[0.08em] uppercase text-muted-foreground w-[38%]">Feature</th>
                  <th className="pb-4 text-center text-xs font-semibold tracking-[0.08em] uppercase text-muted-foreground">Free</th>
                  <th className="pb-4 text-center text-xs font-semibold tracking-[0.08em] uppercase text-foreground">AI Plans</th>
                  <th className="pb-4 text-center text-xs font-semibold tracking-[0.08em] uppercase text-muted-foreground">Ready-made</th>
                  <th className="pb-4 text-center text-xs font-semibold tracking-[0.08em] uppercase text-muted-foreground">Pro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  ["AI trip plan generation",           "3/mo",  "✓",  "—",  "✓"],
                  ["Venue picker (full DB)",             "—",     "✓",  "✓",  "✓"],
                  ["Per-person cost breakdown",          "—",     "✓",  "✓",  "✓"],
                  ["Squad Paystack payment",             "—",     "✓",  "✓",  "✓"],
                  ["Share / download itinerary",         "—",     "✓",  "✓",  "✓"],
                  ["Trip history (unlimited)",           "—",     "✓",  "✓",  "✓"],
                  ["Pre-built curated packages",        "Browse", "—", "✓",  "—"],
                  ["Karije coordination support",        "—",     "—",  "✓",  "—"],
                  ["Build and own your own trips",       "—",     "—",  "—",  "✓"],
                  ["Agency dashboard + branding",        "—",     "—",  "—",  "✓"],
                  ["Send payment reminders yourself",    "—",     "—",  "—",  "✓"],
                  ["Set own service fee (keep 100%)",    "—",     "—",  "—",  "✓"],
                  ["Analytics & revenue dashboard",      "—",     "—",  "—",  "✓"],
                ].map(([feature, free, ai, ready, pro]) => (
                  <tr key={feature} className="hover:bg-secondary/30 transition-colors">
                    <td className="py-3.5 pr-4 text-foreground">{feature}</td>
                    <td className="py-3.5 text-center text-muted-foreground">
                      {free === "✓" ? <CheckIcon className="w-4 h-4 text-foreground mx-auto" /> : free === "—" ? <span className="opacity-25">—</span> : <span className="text-[11px] font-medium text-muted-foreground">{free}</span>}
                    </td>
                    <td className="py-3.5 text-center">
                      {ai === "✓" ? <CheckIcon className="w-4 h-4 text-foreground mx-auto" /> : ai === "—" ? <span className="opacity-25">—</span> : <span className="text-[11px] font-medium text-muted-foreground">{ai}</span>}
                    </td>
                    <td className="py-3.5 text-center text-muted-foreground">
                      {ready === "✓" ? <CheckIcon className="w-4 h-4 text-foreground mx-auto" /> : ready === "—" ? <span className="opacity-25">—</span> : <span className="text-[11px] font-medium text-muted-foreground">{ready}</span>}
                    </td>
                    <td className="py-3.5 text-center text-muted-foreground">
                      {pro === "✓" ? <CheckIcon className="w-4 h-4 text-foreground mx-auto" /> : pro === "—" ? <span className="opacity-25">—</span> : <span className="text-[11px] font-medium text-muted-foreground">{pro}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-secondary/30 border-t border-border">
        <div className="mx-auto max-w-3xl">
          <SectionEyebrow label="Questions" />
          <h2 className="font-marcellus text-3xl text-foreground mb-10 leading-snug">
            Frequently asked.
          </h2>

          <div className="divide-y divide-border">
            {FAQ_ITEMS.map((item, i) => (
              <div key={i}>
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between gap-4 py-5 text-left group"
                >
                  <span className="font-jost font-medium text-base text-foreground group-hover:text-foreground/60 transition-colors">
                    {item.q}
                  </span>
                  <span className={`text-muted-foreground transition-transform duration-200 shrink-0 ${openFaq === i ? "rotate-45" : ""}`}>
                    <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <line x1="8" y1="3" x2="8" y2="13" />
                      <line x1="3" y1="8" x2="13" y2="8" />
                    </svg>
                  </span>
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    openFaq === i ? "max-h-48 pb-5 opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <p className="font-jost font-light text-sm text-muted-foreground leading-relaxed">
                    {item.a}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ────────────────────────────────────────────────────── */}
      <section className="py-20 px-6 border-t border-border">
        <div className="mx-auto max-w-5xl">
          <div className="relative overflow-hidden rounded-[2.5rem] border-[3px] border-signal bg-foreground text-background p-12 md:p-20 text-center shadow-[8px_8px_0_0_hsl(var(--signal))]">
            <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/25 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-forest/40 blur-3xl pointer-events-none" />

            <div className="relative">
              <h2 className="font-marcellus text-3xl md:text-5xl leading-[1.1] mb-4">
                Your squad is waiting.
              </h2>
              <p className="font-jost font-light text-base opacity-60 max-w-md mx-auto mb-8 leading-relaxed">
                Start free. Generate your first AI trip plan — no account needed. See a full itinerary in 20 seconds.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  to="/start/trip"
                  className="inline-flex items-center gap-2 bg-signal text-ink border-[3px] border-background px-7 py-3.5 font-jost font-bold text-sm tracking-[0.06em] shadow-[4px_4px_0_0_rgba(255,255,255,0.25)] hover:-translate-y-0.5 transition-transform rounded-full"
                >
                  Plan a trip free
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M13 5l7 7-7 7" />
                  </svg>
                </Link>
                <Link
                  to="/pro"
                  className="inline-flex items-center gap-2 border-[3px] border-white/30 text-background/80 px-7 py-3.5 font-jost font-bold text-sm tracking-[0.06em] hover:text-background hover:border-white/60 transition-colors rounded-full"
                >
                  Explore Pro →
                </Link>
              </div>

              <p className="mt-5 text-[11px] font-jost font-light opacity-30">
                No sign-up needed · NGN pricing · Paystack payments
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
