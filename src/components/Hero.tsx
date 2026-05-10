import { Link } from "react-router-dom";

export const Hero = () => {
  return (
    <section className="relative pt-36 pb-24 md:pt-44 md:pb-32 overflow-hidden bg-hero-mesh">
      {/* Soft floating orbs */}
      <div className="pointer-events-none absolute -top-20 -left-20 w-96 h-96 rounded-full bg-primary/20 blur-3xl animate-float" />
      <div className="pointer-events-none absolute top-40 -right-20 w-96 h-96 rounded-full bg-accent/20 blur-3xl animate-float" style={{ animationDelay: "2s" }} />

      <div className="relative mx-auto max-w-6xl px-6 text-center">
        <div className="animate-rise inline-flex items-center gap-2 rounded-full glass ring-hairline px-3 py-1.5 text-xs font-medium text-muted-foreground mb-8">
          <span className="inline-flex items-center gap-1 text-foreground font-semibold">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l1.8 4.6L18.5 8l-3.7 3.2L16 16l-4-2.6L8 16l1.2-4.8L5.5 8l4.7-1.4L12 2z" />
            </svg>
            AI-powered insights
          </span>
          <span className="w-1 h-1 rounded-full bg-border" />
          Now in private beta · Lagos · Accra · Dakar · Abidjan
        </div>

        <h1 className="animate-rise font-display text-5xl sm:text-6xl md:text-7xl lg:text-[88px] font-semibold leading-[1.02] tracking-tight text-gradient max-w-4xl mx-auto">
          Group trips,{" "}
          <span className="relative inline-block align-baseline">
            <span className="relative z-10 inline-block bg-gradient-primary px-3 py-1 rounded-xl text-primary-foreground">
              <span className="typewriter">planned in minutes.</span>
            </span>
          </span>
        </h1>

        <p className="animate-rise mt-7 max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground leading-relaxed" style={{ animationDelay: "0.1s" }}>
          From the first idea to the last contribution paid — MySquadGo handles the
          itinerary, the hotels, the WhatsApp updates, and the money. So your
          squad can just show up.
        </p>

        <div className="animate-rise mt-10 flex flex-col sm:flex-row items-center justify-center gap-3" style={{ animationDelay: "0.2s" }}>
          <a
            href="https://wa.me/2349000000000?text=Hey%20MySquadGo%21%20Let%27s%20plan%20a%20group%20trip%20%F0%9F%9A%80"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2 rounded-full bg-whatsapp text-white px-7 py-3.5 text-[15px] font-medium hover:scale-[1.02] active:scale-[0.98] transition-transform"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Start on WhatsApp
          </a>
          <Link
            to="/demo"
            className="inline-flex items-center gap-2 rounded-full bg-card ring-hairline px-7 py-3.5 text-[15px] font-medium text-foreground hover:bg-secondary transition-colors"
          >
            Try the live demo
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        <p className="animate-rise mt-6 text-xs text-muted-foreground" style={{ animationDelay: "0.3s" }}>
          No download. No sign-up form. Just a WhatsApp link.
        </p>

        {/* Floating preview card */}
        <div className="animate-rise mt-20 relative max-w-3xl mx-auto" style={{ animationDelay: "0.4s" }}>
          <div className="relative rounded-3xl bg-card ring-hairline shadow-card overflow-hidden">
            <div className="flex items-center gap-1.5 px-5 py-3 border-b border-border">
              <span className="w-3 h-3 rounded-full bg-destructive/60" />
              <span className="w-3 h-3 rounded-full bg-google-yellow" />
              <span className="w-3 h-3 rounded-full bg-google-green" />
              <span className="ml-3 text-xs text-muted-foreground font-medium">Lagos → Ibadan · 12 people · 2 days</span>
            </div>
            <div className="p-6 md:p-8 grid md:grid-cols-3 gap-4 text-left">
              {[
                { tag: "Transport", val: "₦42,000", sub: "GIGM · ₦3,500/p", color: "bg-google-blue/10 text-google-blue" },
                { tag: "Lodging", val: "₦96,000", sub: "Kakanfo Inn · 2 nights", color: "bg-google-purple/10 text-google-purple" },
                { tag: "Per person", val: "₦20,500", sub: "All-in, locked", color: "bg-primary-soft text-primary" },
              ].map((c) => (
                <div key={c.tag} className="rounded-2xl bg-secondary/60 p-4">
                  <span className={`inline-flex text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${c.color}`}>{c.tag}</span>
                  <div className="mt-3 font-display text-2xl font-semibold">{c.val}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{c.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
