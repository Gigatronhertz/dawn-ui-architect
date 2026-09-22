import { useScrollReveal } from "@/hooks/useScrollReveal";

// Phone mockup with a stacked notification banner — not photos. Copy below
// is a draft; confirm exact wording against the live reminder emails.
const NOTIFICATIONS = [
  {
    title: "Reminder sent",
    sub: "Your Lekki trip departs in 2 days",
    icon: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    time: "now",
  },
  {
    title: "Payment confirmed",
    sub: "₦45,000 secured for your trip",
    icon: <><circle cx="12" cy="12" r="10" /><path d="M8 12l3 3 5-6" /></>,
    time: "2m",
  },
  {
    title: "Itinerary ready",
    sub: "Beach Camping at Tarkwa Bay is set",
    icon: <path d="M4 4h16v12H8l-4 4V4z" />,
    time: "5m",
  },
];

export const TrustProof = () => {
  const reveal = useScrollReveal<HTMLDivElement>();

  return (
    <section className="py-24 md:py-32 bg-ink overflow-hidden">
      <div className="mx-auto max-w-6xl px-6 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <h2 className="font-marcellus text-3xl md:text-4xl text-paper leading-none mb-1">
            Real trips.
          </h2>
          <h2 className="font-marcellus font-bold uppercase text-6xl md:text-7xl text-signal leading-[0.95] tracking-tight mb-4">
            Zero wahala.
          </h2>
          <p className="font-jost text-base text-paper/60 max-w-md">
            Reminders sent, payments tracked, plans locked in — while you do literally nothing.
          </p>
        </div>

        <div ref={reveal.ref} className="relative flex justify-center py-6">
          {/* decorative offset block behind the phone — floats out of sync with the phone for a layered feel */}
          <div
            className="absolute w-64 sm:w-72 h-[420px] sm:h-[480px] bg-signal rounded-[2.5rem] rotate-[-4deg] translate-x-3 animate-float"
            style={{ animationDuration: "9s" }}
          />

          {/* Outer div owns the continuous float loop; inner owns the one-shot
             entrance — animate-rise and animate-float both set the CSS
             `animation` property, so stacking them on one element would just
             have the later class win instead of combining. */}
          <div className={reveal.visible ? "animate-float" : ""}>
            <div
              className={`${reveal.visible ? "animate-rise" : "opacity-0"} relative w-64 sm:w-72 h-[420px] sm:h-[480px] bg-ink border-[5px] border-paper rounded-[2.5rem] shadow-[8px_8px_0_0_hsl(var(--signal))] overflow-hidden`}
            >
              {/* notch */}
              <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-24 h-5 bg-ink rounded-full z-10" />

              {/* status bar */}
              <div className="pt-5 px-5 flex justify-between text-[11px] font-jost font-semibold text-paper">
                <span>9:41</span>
                <span className="opacity-70">●●●</span>
              </div>

              {/* notification stack */}
              <div className="mt-9 px-3 flex flex-col gap-2.5">
                {NOTIFICATIONS.map((n, i) => (
                  <div
                    key={n.title}
                    className={`${reveal.visible ? "animate-rise" : "opacity-0"} bg-paper border-[3px] border-ink rounded-2xl px-3.5 py-2.5 flex items-start gap-2.5 shadow-[3px_3px_0_0_hsl(var(--ink))]`}
                    style={{ animationDelay: `${0.15 + i * 0.15}s` }}
                  >
                    <span className="shrink-0 w-7 h-7 rounded-lg bg-signal border-2 border-ink flex items-center justify-center mt-0.5 animate-pulse">
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="#0B0B0B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        {n.icon}
                      </svg>
                    </span>
                    <span className="min-w-0">
                      <span className="block font-jost font-bold text-[12px] text-ink">Karije — {n.title}</span>
                      <span className="block font-jost text-[11px] text-muted-foreground leading-snug">{n.sub}</span>
                    </span>
                    <span className="shrink-0 font-jost text-[10px] text-muted-foreground/70 mt-0.5">{n.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
