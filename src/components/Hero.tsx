import { Link } from "react-router-dom";

export const Hero = () => {
  return (
    <section className="relative pt-36 pb-28 md:pt-48 md:pb-36 overflow-hidden bg-hero-mesh">
      {/* Soft floating orbs */}
      <div className="pointer-events-none absolute -top-20 -left-20 w-96 h-96 rounded-full bg-primary/15 blur-3xl animate-float" />
      <div className="pointer-events-none absolute top-40 -right-20 w-96 h-96 rounded-full bg-accent/15 blur-3xl animate-float" style={{ animationDelay: "2s" }} />

      <div className="relative mx-auto max-w-4xl px-6 text-center">
        {/* Beta badge */}
        <div className="animate-rise inline-flex items-center gap-2 rounded-full glass ring-hairline px-3 py-1.5 text-xs font-medium text-muted-foreground mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          <span>Now in private beta · Lagos · Accra · Dakar · Abidjan</span>
        </div>

        {/* Headline */}
        <h1 className="animate-rise font-display text-5xl sm:text-6xl md:text-7xl lg:text-[88px] font-semibold leading-[1.02] tracking-tight text-gradient">
          Group trips,
          <br />
          <span className="relative inline-block">
            <span className="relative z-10 inline-block bg-gradient-primary px-4 py-1 rounded-2xl text-primary-foreground">
              planned in minutes.
            </span>
          </span>
        </h1>

        {/* Subtitle */}
        <p
          className="animate-rise mt-8 max-w-xl mx-auto text-lg md:text-xl text-muted-foreground leading-relaxed"
          style={{ animationDelay: "0.1s" }}
        >
          From the first idea to the last contribution paid — MySquadGo handles the
          itinerary, the hotels, the WhatsApp updates, and the money.{" "}
          <span className="text-foreground font-medium">So your squad can just show up.</span>
        </p>

        {/* CTAs */}
        <div
          className="animate-rise mt-10 flex flex-col sm:flex-row items-center justify-center gap-3"
          style={{ animationDelay: "0.2s" }}
        >
          <Link
            to="/start"
            className="group inline-flex items-center gap-2 rounded-full bg-gradient-primary text-primary-foreground px-8 py-4 text-base font-medium shadow-glow hover:scale-[1.02] active:scale-[0.98] transition-transform"
          >
            Plan a trip
            <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </Link>
          <a
            href="#agencies"
            className="inline-flex items-center gap-2 rounded-full bg-card ring-hairline px-8 py-4 text-base font-medium text-foreground hover:bg-secondary transition-colors"
          >
            For agencies →
          </a>
        </div>

        {/* Social proof micro strip */}
        <p
          className="animate-rise mt-7 text-xs text-muted-foreground"
          style={{ animationDelay: "0.3s" }}
        >
          47 squads in beta · ₦12M+ collected · No app download needed
        </p>
      </div>
    </section>
  );
};
