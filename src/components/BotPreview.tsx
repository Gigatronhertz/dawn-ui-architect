const messages = [
  { from: "bot", text: "👋 MySquadGo here! Lagos → Ibadan plan is ready.\n💰 Est. ₦18,500/person", time: "10:42" },
  { from: "user", text: "Let's gooo 🔥", who: "Tunde", time: "10:43" },
  { from: "bot", text: "📅 Vote your dates:\n· Aug 9–11\n· Aug 16–18  ← winning\n· Aug 23–25", time: "10:44" },
  { from: "bot", text: "✅ 8 of 12 paid. 4 to go — deadline Aug 3rd.", time: "11:20", highlight: true },
];

export const BotPreview = () => (
  <section id="bot" className="py-28 md:py-36">
    <div className="mx-auto max-w-6xl px-6 grid lg:grid-cols-2 gap-16 items-center">
      <div>
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-whatsapp">WhatsApp first</span>
        <h2 className="font-display text-4xl md:text-6xl font-semibold tracking-tight mt-3 leading-[1.05]">
          Where your squad already lives.
        </h2>
        <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-lg">
          No new app to download. No accounts to create. MySquadGo runs the trip
          right inside the WhatsApp group you're already chatting in.
        </p>

        <ul className="mt-8 space-y-4">
          {[
            "Trip summaries posted automatically",
            "Date & hotel polls run by the bot",
            "Private DMs for each member's payment link",
            "Day-of reminders so nobody misses departure",
          ].map((item) => (
            <li key={item} className="flex items-start gap-3 text-[15px]">
              <span className="mt-1 grid place-items-center w-5 h-5 rounded-full bg-whatsapp/15 text-whatsapp">
                <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              </span>
              <span className="text-foreground/90">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="relative">
        <div className="absolute -inset-6 bg-whatsapp/10 rounded-[2.5rem] blur-2xl" />
        <div className="relative rounded-[2rem] bg-card ring-hairline shadow-card p-5 max-w-md mx-auto">
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            <div className="w-10 h-10 rounded-full bg-gradient-primary grid place-items-center text-primary-foreground font-display font-semibold">S</div>
            <div>
              <div className="font-display font-semibold text-sm">Ibadan Squad 🚌</div>
              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-whatsapp" />
                MySquadGo Bot · 12 members
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-5">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.from === "user" ? "justify-end" : ""}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-line leading-snug ${
                  m.from === "user"
                    ? "bg-whatsapp/15 text-foreground rounded-br-md"
                    : m.highlight
                    ? "bg-gradient-primary text-primary-foreground rounded-bl-md"
                    : "bg-secondary text-foreground rounded-bl-md"
                }`}>
                  {m.who && <div className="text-[11px] font-semibold text-google-blue mb-0.5">{m.who}</div>}
                  {m.text}
                  <div className={`text-[10px] mt-1 ${m.from === "user" || m.highlight ? "opacity-70" : "text-muted-foreground"}`}>{m.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </section>
);
