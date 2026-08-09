const steps = [
  {
    n: "01",
    emoji: "✏️",
    title: "You answer 8 questions privately",
    desc: "The organiser fills in the details — where, when, budget, accommodation, dealbreakers. Under 2 minutes. The squad doesn't see this part.",
    accent: "bg-primary",
  },
  {
    n: "02",
    emoji: "✨",
    title: "AI generates the draft plan",
    desc: "Karije builds the full itinerary, surfaces hotel options, and calculates the per-person cost. You review and edit before anyone else sees it.",
    accent: "bg-google-yellow",
  },
  {
    n: "03",
    emoji: "🔗",
    title: "You get a group link",
    desc: "Bot sends a one-tap link. Add it to your existing WhatsApp group or start a fresh one. No app to install, no account required.",
    accent: "bg-google-blue",
  },
  {
    n: "04",
    emoji: "🤖",
    title: "Bot enters knowing everything",
    desc: "First message is the plan reveal — not a questionnaire. Bot runs the vibe, date, and hotel votes. Everyone feels involved from the jump.",
    accent: "bg-whatsapp",
  },
];

export const OnboardingFlow = () => (
  <section id="onboarding" className="py-28 md:py-36 bg-secondary/40">
    <div className="mx-auto max-w-6xl px-6">
      <div className="max-w-2xl">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">How it starts</span>
        <h2 className="font-display text-4xl md:text-6xl font-semibold tracking-tight mt-3 leading-[1.05]">
          The organiser goes first.
          <br />
          <span className="text-muted-foreground">The squad gets the reveal.</span>
        </h2>
        <p className="mt-5 text-muted-foreground max-w-xl">
          You handle the logistics privately. The bot joins the group already knowing the plan — first message is the big reveal, not a form.
        </p>
      </div>

      <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {steps.map((s, i) => (
          <div key={s.n} className="relative rounded-3xl bg-card ring-hairline p-7 overflow-hidden">
            <div className={`absolute top-0 left-0 h-1 w-16 ${s.accent} rounded-br-full`} />
            <div className="text-3xl mb-4">{s.emoji}</div>
            <div className="font-display text-xs font-semibold tabular-nums text-muted-foreground mb-1">{s.n}</div>
            <h3 className="font-display text-lg font-semibold tracking-tight leading-tight mb-2">{s.title}</h3>
            <p className="text-[14px] text-muted-foreground leading-relaxed">{s.desc}</p>
            {i < steps.length - 1 && (
              <span className="hidden lg:block absolute top-10 -right-3.5 z-10 text-muted-foreground/40 text-xl font-light select-none">›</span>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-4">How to add the bot in 30 seconds</div>
        <div className="grid sm:grid-cols-3 gap-3">
          {[
            { emoji: "📱", title: "Open WhatsApp", desc: "Go to your existing squad group, or start a new one for this trip." },
            { emoji: "🔗", title: "Tap the link we send", desc: "One tap adds Karije to the group as a member. No searching, no QR code." },
            { emoji: "🤖", title: "Bot enters the group", desc: "It already knows the plan. First message is the big reveal to the squad." },
          ].map((s) => (
            <div key={s.title} className="rounded-2xl bg-card ring-hairline p-4 flex gap-3">
              <div className="text-xl shrink-0 mt-0.5">{s.emoji}</div>
              <div>
                <div className="font-display font-semibold text-sm mb-0.5">{s.title}</div>
                <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-card ring-hairline p-6 md:p-8 grid md:grid-cols-[1fr,auto] gap-6 items-center">
        <div>
          <div className="font-display text-lg font-semibold mb-1">The group still has a say.</div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            After the reveal, the bot asks the squad open questions — vibe, preferred dates, hotel pick. It reads the chat, spots the consensus, and privately confirms with you before locking anything in. Everyone owns the trip.
          </p>
        </div>
        <a
          href="https://wa.me/2349000000000?text=Hey%20Karije%21%20Let%27s%20plan%20a%20trip"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-whatsapp text-white px-6 py-3 text-sm font-medium whitespace-nowrap hover:scale-[1.02] transition-transform"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Start planning
        </a>
      </div>
    </div>
  </section>
);
