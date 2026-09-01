import { Link } from "react-router-dom";
import { WaitlistForm } from "@/components/WaitlistForm";
import { KarijeLogo } from "@/components/Nav";

export const CTA = () => (
  <section id="cta" className="py-28 md:py-36">
    <div className="mx-auto max-w-5xl px-6">
      <div className="relative overflow-hidden rounded-[2.5rem] bg-ink text-paper p-12 md:p-20 text-center">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/30 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-accent/30 blur-3xl" />

        <div className="relative">
          <h2 className="font-display text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05] text-signal">
            Your next squad trip
            <br />
            shouldn't take 3 weeks.
          </h2>
          <p className="mt-6 text-lg opacity-70 max-w-xl mx-auto">
            Plan it tonight. Send the WhatsApp link. Wake up to a confirmed trip.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm">
            <div className="flex items-center gap-2 opacity-70">
              <span className="w-1.5 h-1.5 rounded-full bg-whatsapp flex-shrink-0" />
              <span>47 squads in beta · ₦12M+ collected</span>
            </div>
            <p className="italic opacity-60 max-w-xs">"Sorted our Abuja trip in 4 minutes. Everyone paid before we boarded." — Tunde, Lagos</p>
          </div>

          <WaitlistForm source="cta_section" dark className="mt-8 max-w-md mx-auto" />
          <p className="mt-4 text-xs opacity-50">We only message once. Promise.</p>
        </div>
      </div>
    </div>
  </section>
);

export const Footer = () => (
  <footer className="border-t border-border py-12">
    <div className="mx-auto max-w-6xl px-6 flex flex-col md:flex-row items-center justify-between gap-4">
      <KarijeLogo size="sm" />
      <p className="text-xs text-muted-foreground">© 2026 Karije. Made for West African squads. 🇳🇬 🇬🇭 🇸🇳 🇨🇮</p>
      <div className="flex gap-5 text-xs text-muted-foreground">
        <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
        <Link to="/terms"   className="hover:text-foreground transition-colors">Terms</Link>
        <a href="mailto:hello@karije.com" className="hover:text-foreground transition-colors">Contact</a>
      </div>
    </div>
  </footer>
);
