import { Link } from "react-router-dom";
import { KarijeLogo } from "@/components/Nav";
import { Footer } from "@/components/CTA";

export default function Privacy() {
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

        <h1 className="font-marcellus text-4xl text-foreground mb-3">Privacy Policy</h1>
        <p className="font-jost font-light text-sm text-muted-foreground mb-12">Last updated: August 2026</p>

        <div className="prose-karije space-y-10 font-jost font-light text-foreground leading-relaxed">

          <section>
            <h2 className="font-marcellus text-xl text-foreground mb-3">What we collect</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              We collect the information you give us when you plan a trip — your email address, trip preferences (destination, squad size, budget), and payment details processed securely via Paystack. We do not store your card number or bank details.
            </p>
          </section>

          <section>
            <h2 className="font-marcellus text-xl text-foreground mb-3">How we use it</h2>
            <p className="text-muted-foreground text-sm leading-relaxed mb-3">
              Your data is used to:
            </p>
            <ul className="text-muted-foreground text-sm space-y-1.5 pl-4 list-disc">
              <li>Generate your AI trip plan and send it to your squad</li>
              <li>Process and track squad payments through Paystack</li>
              <li>Send trip reminders and updates via WhatsApp (if you opt in)</li>
              <li>Improve Karije's AI recommendations over time</li>
            </ul>
            <p className="text-muted-foreground text-sm leading-relaxed mt-3">
              We do not sell your data to third parties. Ever.
            </p>
          </section>

          <section>
            <h2 className="font-marcellus text-xl text-foreground mb-3">Data storage</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Your trip data is stored securely on servers hosted in the EU (Render / Turso). Payment records are held by Paystack, governed by their privacy policy and Nigerian CBN regulations. We retain your trip history for 12 months, after which inactive accounts are anonymised.
            </p>
          </section>

          <section>
            <h2 className="font-marcellus text-xl text-foreground mb-3">Your rights</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              You can request a copy of your data, ask us to delete your account, or opt out of any communications at any time. Email us at <a href="mailto:hello@karije.com" className="text-primary hover:underline">hello@karije.com</a> and we'll respond within 48 hours.
            </p>
          </section>

          <section>
            <h2 className="font-marcellus text-xl text-foreground mb-3">Cookies</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              We use minimal cookies — only what's needed to keep you signed in and to measure basic usage (page views, error rates). No advertising or tracking cookies are used.
            </p>
          </section>

          <section>
            <h2 className="font-marcellus text-xl text-foreground mb-3">Contact</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Questions about this policy? Reach us at <a href="mailto:hello@karije.com" className="text-primary hover:underline">hello@karije.com</a> or on WhatsApp at the number shown after your trip is confirmed.
            </p>
          </section>

        </div>

        <div className="mt-14 pt-8 border-t border-border flex gap-5 text-xs font-jost font-light text-muted-foreground">
          <Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
          <Link to="/"      className="hover:text-foreground transition-colors">← Back to Karije</Link>
        </div>
      </div>

      <Footer />
    </main>
  );
}
