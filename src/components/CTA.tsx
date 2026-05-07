export const CTA = () => (
  <section id="cta" className="py-28 md:py-36">
    <div className="mx-auto max-w-5xl px-6">
      <div className="relative overflow-hidden rounded-[2.5rem] bg-foreground text-background p-12 md:p-20 text-center">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/30 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-accent/30 blur-3xl" />

        <div className="relative">
          <h2 className="font-display text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05]">
            Your next squad trip
            <br />
            shouldn't take 3 weeks.
          </h2>
          <p className="mt-6 text-lg opacity-70 max-w-xl mx-auto">
            Plan it tonight. Send the WhatsApp link. Wake up to a confirmed trip.
          </p>

          <form className="mt-10 flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
            <input
              type="tel"
              placeholder="Your WhatsApp number"
              className="flex-1 rounded-full bg-white/10 ring-1 ring-white/20 px-5 py-3.5 text-sm placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            />
            <button
              type="button"
              className="rounded-full bg-gradient-primary text-primary-foreground px-6 py-3.5 text-sm font-medium shadow-glow hover:scale-[1.02] active:scale-[0.98] transition-transform"
            >
              Get early access
            </button>
          </form>
          <p className="mt-4 text-xs opacity-50">We only message once. Promise.</p>
        </div>
      </div>
    </div>
  </section>
);

export const Footer = () => (
  <footer className="border-t border-border py-12">
    <div className="mx-auto max-w-6xl px-6 flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-2 font-display font-semibold">
        <span className="grid place-items-center w-7 h-7 rounded-lg bg-gradient-primary text-primary-foreground">
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3 7 7 .8-5.3 4.7L18.5 22 12 18l-6.5 4 1.8-7.5L2 9.8 9 9z" /></svg>
        </span>
        MySquadGo
      </div>
      <p className="text-xs text-muted-foreground">© 2026 MySquadGo. Made for West African squads. 🇳🇬 🇬🇭 🇸🇳 🇨🇮</p>
      <div className="flex gap-5 text-xs text-muted-foreground">
        <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
        <a href="#" className="hover:text-foreground transition-colors">Terms</a>
        <a href="#" className="hover:text-foreground transition-colors">Contact</a>
      </div>
    </div>
  </footer>
);
