import { Link } from "react-router-dom";
import { KarijeLogo } from "@/components/Nav";
import { Footer } from "@/components/CTA";

export default function Terms() {
  return (
    <main className="min-h-screen bg-background">
      <header className="pt-8 pb-6 border-b border-border">
        <div className="mx-auto max-w-3xl px-6 flex items-center justify-between">
          <KarijeLogo />
          <Link to="/" className="text-xs font-jost font-light text-muted-foreground hover:text-foreground transition-colors">← Home</Link>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-6 py-16 pb-24">
        <div className="flex items-center gap-4 mb-6">
          <span className="h-px w-8 bg-primary" />
          <span className="text-[10px] font-jost font-light tracking-label text-muted-foreground uppercase">Legal</span>
        </div>

        <h1 className="font-marcellus text-4xl text-foreground mb-3">Terms of Service</h1>
        <p className="font-jost font-light text-sm text-muted-foreground mb-12">Last updated: August 2026</p>

        <div className="space-y-10 font-jost font-light text-foreground leading-relaxed">

          <section>
            <h2 className="font-marcellus text-xl text-foreground mb-3">What Karije is</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Karije is a trip planning platform that uses AI to help groups plan and coordinate domestic travel in Nigeria and West Africa. We help you build itineraries, collect squad payments, and coordinate via WhatsApp. We are not a travel agent, airline, hotel, or transport operator.
            </p>
          </section>

          <section>
            <h2 className="font-marcellus text-xl text-foreground mb-3">What we provide</h2>
            <ul className="text-muted-foreground text-sm space-y-1.5 pl-4 list-disc">
              <li>AI-generated trip itineraries based on your inputs — these are recommendations, not guarantees of availability or price.</li>
              <li>Squad payment collection via Paystack — we facilitate payments but do not hold your funds.</li>
              <li>WhatsApp coordination tools — the Karije bot assists your group but does not replace direct communication with hotels, transport operators, or venues.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-marcellus text-xl text-foreground mb-3">Payments</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              All payments are processed by Paystack. Karije charges a platform fee on AI plans and a 10% commission on Ready-made Trips. Fees are shown clearly before any payment is made. Refunds are subject to the cancellation policy shown on your trip confirmation — typically 48 hours before travel for full refunds.
            </p>
          </section>

          <section>
            <h2 className="font-marcellus text-xl text-foreground mb-3">Pro agency accounts</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Pro accounts are billed monthly. Cancellation takes effect at the end of the billing period — no partial refunds. Agency users are responsible for their clients' trips and any service fees they set. Karije is not liable for disputes between agencies and their clients.
            </p>
          </section>

          <section>
            <h2 className="font-marcellus text-xl text-foreground mb-3">Acceptable use</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              You may not use Karije to plan or facilitate illegal activities, impersonate another person, or abuse our AI generation capacity. Accounts found doing so will be suspended without refund.
            </p>
          </section>

          <section>
            <h2 className="font-marcellus text-xl text-foreground mb-3">Limitation of liability</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Karije provides itinerary suggestions based on publicly available data and AI outputs. We are not responsible for third-party service failures (transport cancellations, hotel overbooking, etc.). Our total liability in any dispute is limited to the fees paid to Karije for the affected trip.
            </p>
          </section>

          <section>
            <h2 className="font-marcellus text-xl text-foreground mb-3">Contact</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Questions or disputes? Email <a href="mailto:hello@karije.com" className="text-primary hover:underline">hello@karije.com</a>. We aim to respond within 2 business days.
            </p>
          </section>

        </div>

        <div className="mt-14 pt-8 border-t border-border flex gap-5 text-xs font-jost font-light text-muted-foreground">
          <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
          <Link to="/"        className="hover:text-foreground transition-colors">← Back to Karije</Link>
        </div>
      </div>

      <Footer />
    </main>
  );
}
