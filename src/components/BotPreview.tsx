const messages = [
  { from: "user", text: "Tunde what you cooking 👀", who: "Ada 🌶️", time: "10:41" },
  { from: "bot", text: "👋 Hey Ibadan Squad! Karije here.\nSomeone's been planning something... 👀", time: "10:41" },
  { from: "bot", text: "Your trip is ready:\n📍 Lagos → Ibadan · 2 days · 8 squad\n🏨 Premier Hotel Ibadan · ₦48k/night\n💰 Est. ₦18,500/person all-in", time: "10:42" },
  { from: "user", text: "Let's GOOOO 🔥🔥", who: "Kemi 🎧", time: "10:43" },
  { from: "bot", text: "Two quick squad votes:\n🗳️ Aug 9–11 · 5 votes ← winning\n🗳️ Aug 16–18 · 3 votes\n🗳️ Aug 23–25 · 0 votes", time: "10:44" },
  { from: "bot", text: "✅ 8 of 12 paid. 4 to go — deadline Aug 3rd.", time: "11:20", highlight: true },
];

const bullets = [
  "Bot's first message is the plan reveal — not a questionnaire",
  "Asks the group open questions before running structured polls",
  "Date & hotel polls run by bot after the squad chats it out",
  "Tunde gets a private edit link — tweak before it goes to the group",
  "Private payment link DMed to every member individually",
  "Day-of reminders so nobody misses departure",
];

export const BotPreview = () => (
  <section id="bot" className="py-28 md:py-36">
    <div className="mx-auto max-w-6xl px-6 grid lg:grid-cols-2 gap-16 items-center">
      <div>
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-whatsapp">WhatsApp first</span>
        <h2 className="font-display text-4xl md:text-6xl font-semibold tracking-tight mt-3 leading-[1.05]">
          Where your squad
          <br />
          <span className="text-muted-foreground">already lives.</span>
        </h2>
        <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-lg">
          No new app. No accounts. Karije runs the trip inside the WhatsApp group you're already chatting in — and it arrives knowing the plan.
        </p>

        <ul className="mt-8 space-y-3.5">
          {bullets.map((item) => (
            <li key={item} className="flex items-start gap-3 text-[15px]">
              <span className="mt-0.5 grid place-items-center w-5 h-5 shrink-0 rounded-full bg-whatsapp/15 text-whatsapp">
                <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              </span>
              <span className="text-foreground/90">{item}</span>
            </li>
          ))}
        </ul>

        <div className="mt-8 rounded-2xl bg-secondary/60 ring-hairline p-4 text-sm text-muted-foreground leading-relaxed">
          <strong className="text-foreground block mb-1">The group still has a say.</strong>
          Bot reads the chat responses, spots the consensus, then privately asks the organiser to confirm before locking anything in. No cold polls. No dropped votes.
        </div>
      </div>

      <div className="relative">
        <div className="absolute -inset-6 bg-whatsapp/10 rounded-[2.5rem] blur-2xl" />
        <div className="relative rounded-[2rem] bg-card ring-hairline shadow-card p-5 max-w-md mx-auto">
          {/* chat header */}
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            <div className="w-10 h-10 rounded-full bg-gradient-primary grid place-items-center text-primary-foreground font-display font-semibold text-sm">IB</div>
            <div>
              <div className="font-display font-semibold text-sm">Ibadan Squad 🚌</div>
              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-whatsapp" />
                Karije Bot · 12 members
              </div>
            </div>
          </div>

          {/* messages */}
          <div className="space-y-3 pt-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.from === "user" ? "justify-end" : ""}`}>
                <div className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-line leading-snug ${
                  m.from === "user"
                    ? "bg-whatsapp/15 text-foreground rounded-br-md"
                    : m.highlight
                    ? "bg-gradient-primary text-primary-foreground rounded-bl-md shadow-glow"
                    : "bg-secondary text-foreground rounded-bl-md"
                }`}>
                  {m.who && <div className="text-[11px] font-semibold text-google-blue mb-0.5">{m.who}</div>}
                  {!m.who && m.from === "bot" && (
                    <div className="text-[11px] font-semibold text-foreground mb-0.5 flex items-center gap-1">🤖 Karije Bot</div>
                  )}
                  {m.text}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </section>
);
