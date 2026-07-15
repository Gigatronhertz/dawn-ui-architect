// All bot copy. Voice: Warm. Sharp. Nigerian.

const M = {
  // ── Intake ─────────────────────────────────────────────────────────────────

  WELCOME: (name) =>
    `Hey${name ? ` ${name}` : ''}! 👋 I'm MySquadGo — powered by Gemini.\n\nI'll sort the itinerary, hotels, group coordination, and money for your squad trip. All of it. For free to start.\n\nLet's get into it. *Where is everyone travelling from?* (e.g. Lagos, Abuja, Port Harcourt)`,

  Q2_DESTINATION:
    `Nice. *Where are you all heading?* (e.g. Ibadan, Calabar, Abuja, Accra)`,

  Q3_BUDGET: (origin, destination) =>
    `${origin} → ${destination}. Good combo. 👌\n\n*What's the budget per person?* Give me a number in Naira — I'll build around it. (e.g. 25000 for ₦25,000)`,

  Q4_DAYS:
    `Got it. *How many days is the trip?*`,

  Q5_SQUAD:
    `Cool. *How many people in the squad?* (include yourself)`,

  Q6_ACCOMMODATION:
    `Right. *What type of accommodation?*\n\n1. Hotel\n2. Shortlet\n3. Budget guesthouse\n4. Surprise me`,

  Q7_DATES:
    `Almost done. *Specific dates or flexible?*\n\n1. Flexible — we'll vote in the group\n2. I have specific dates`,

  Q7B_SPECIFIC_DATES:
    `What are the dates? (e.g. "Aug 9 – 11" or "3 nights from Dec 20")`,

  Q8_DEALBREAKERS:
    `Last one. *Any dealbreakers the squad needs to know about?* (e.g. "must have AC", "halal food only", "no shared rooms")\n\nType *none* if there aren't any.`,

  GENERATING: (destination) =>
    `Sorting the ${destination} trip now... ✨\n\nGemini is pricing hotels, checking operators, and building the itinerary. Give me 15 seconds.`,

  // ── Plan review ────────────────────────────────────────────────────────────

  PLAN_ERROR:
    `Something went sideways while generating your plan. Try typing *retry* and I'll go again, or type *reset* to start fresh.`,

  PLAN_CONFIRM_PROMPT:
    `\nType *confirm* to lock this in and get your group link.\nOr tell me what to change — hotel, budget, transport, anything.`,

  PLAN_CONFIRMED: (destination) =>
    `Locked. ✅\n\nHere's how to get the bot into your WhatsApp group:\n\n1. Open your squad's WhatsApp group (or create one)\n2. Go to *Group Info → Add Participants*\n3. Add this number: *+${process.env.WA_DISPLAY_NUMBER || '234XXXXXXXXXX'}*\n\nThe moment I join, I'll reveal the full plan to the squad and kick off the votes. They won't know you already sorted everything 👀\n\nSend me *ready* once you've added me to the group.`,

  // ── Group reveal ───────────────────────────────────────────────────────────

  GROUP_REVEAL: (destination, origin, days, squadSize, hotelName, perPerson) =>
    `👋 Hey squad! MySquadGo here.\n\n` +
    `${origin ? `${origin.split(',')[0].trim()} → ` : ''}${destination} · ${days} day${days > 1 ? 's' : ''} · ${squadSize} squad 🚌\n\n` +
    `Tunde's been planning something... and it's ready. 👀\n\n` +
    `🏨 ${hotelName}\n💰 Est. *${new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(perPerson)}/person* all-in\n\n` +
    `Now two quick squad questions before we lock it:\n` +
    `1️⃣ Which dates work for everyone?\n` +
    `2️⃣ Which hotel?\n\n` +
    `First up — *dates.* See the options below 👇`,

  GROUP_WELCOME_ALREADY_LINKED:
    `👋 Hey! MySquadGo is already running a trip in this group. Send *status* to see where we're at.`,

  // ── Voting ─────────────────────────────────────────────────────────────────

  VOTE_DATES_PROMPT:
    `📅 *Pick your dates.* Tap your choice:`,

  VOTE_HOTEL_PROMPT:
    `🏨 *Now pick the hotel.* Tap your choice:`,

  VOTE_DATE_CAST: (label, name) =>
    `${name || 'You'} voted *${label}* 🗳️`,

  VOTE_HOTEL_CAST: (label, name) =>
    `${name || 'You'} voted *${label}* 🗳️`,

  VOTE_DATE_RESULTS: (options, votes) => {
    const lines = options.map((o) => {
      const v = votes[o.id] || 0;
      const bar = '█'.repeat(Math.min(v, 10)) + '░'.repeat(Math.max(0, 10 - v));
      return `${o.label}\n${bar} ${v} vote${v !== 1 ? 's' : ''}`;
    });
    return `📊 *Date votes so far:*\n\n${lines.join('\n\n')}`;
  },

  VOTE_DATES_LOCKED: (label) =>
    `📅 Dates locked: *${label}* 🎉\n\nNow vote on the hotel 👇`,

  VOTE_HOTEL_LOCKED: (name, date) =>
    `🏨 Hotel locked: *${name}*\n📅 Dates: *${date}*\n\n` +
    `✅ Both votes are in. I'm generating individual payment links for everyone — sending them out now 👇`,

  // ── Payments ───────────────────────────────────────────────────────────────

  PAYMENT_LINK_PRIVATE: (name, tripId, amount, url) => {
    const fmtNGN = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 });
    return (
      `Hey${name ? ` ${name}` : ''}! 👋\n\n` +
      `Your squad's trip is confirmed. Time to lock in your spot.\n\n` +
      `💰 *Your share: ${fmtNGN.format(amount)}*\n\n` +
      `Pay securely via Paystack:\n${url}\n\n` +
      `_This link is just for you — not shared with the group._`
    );
  },

  PAYMENT_GROUP_STATUS: (paid, total, amountNGN) => {
    const fmtNGN = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 });
    const pct = Math.round((paid / total) * 100);
    const bar = '█'.repeat(Math.round(pct / 10)) + '░'.repeat(10 - Math.round(pct / 10));
    return (
      `💳 *Payment tracker:*\n\n` +
      `${bar} ${pct}%\n` +
      `${paid} of ${total} paid · ${fmtNGN.format(amountNGN * paid)} collected\n\n` +
      `Deadline: 48 hours. Reminders go out automatically.`
    );
  },

  PAYMENT_CONFIRMED_GROUP: (name) =>
    `✅ *${name || 'Squad member'} just paid!* Spot locked. 🔒`,

  PAYMENT_CONFIRMED_PRIVATE: (name, destination, amountFormatted) =>
    `✅ Payment confirmed${name ? `, ${name}` : ''}! Your spot on the *${destination}* trip is locked.\n\n` +
    `*${amountFormatted}* received via Paystack. 🎉\n\n` +
    `You'll get the full offline itinerary once everyone on the squad has paid.`,

  PAYMENT_REMINDER_PRIVATE: (name, url) =>
    `Hey${name ? ` ${name}` : ''} — just a heads up, payment deadline is in 24 hours.\n\n` +
    `Your link: ${url}\n\n` +
    `Quick tap and you're sorted. 💳`,

  PAYMENT_ALL_DONE: (destination) =>
    `🎉 *Everyone's in!* Full squad paid for ${destination}.\n\n` +
    `I'm sending everyone the offline PDF itinerary now — hotel address, departure details, and everyone's payment confirmation.\n\n` +
    `See you on the road. 🚌`,

  // ── PDF / offline itinerary ────────────────────────────────────────────────

  PDF_SENT: (destination) =>
    `📄 *Here's your offline itinerary — save this in case network is spotty on the road.*\n\n` +
    `It has:\n` +
    `• Day-by-day schedule\n` +
    `• Hotel address + phone number\n` +
    `• Transport operator + pickup point + departure time\n` +
    `• Your individual payment confirmation\n\n` +
    `See you in ${destination}! 🚌`,

  // ── During trip ────────────────────────────────────────────────────────────

  DAY_START: (day, opName, firstStop) =>
    `🌅 Good morning squad! Day ${day} — ${opName ? `${opName} departs 7:00am sharp. ` : ''}` +
    `${firstStop ? `First stop: ${firstStop}.` : ''}\nFull itinerary below 👉`,

  SAFETY_CHECK: (destination) =>
    `🛡️ Safety tap — let loved ones at home know you arrived in ${destination} safe. One tap below.`,

  // ── Utility ────────────────────────────────────────────────────────────────

  UNKNOWN:
    `I didn't catch that. Reply *help* to see what I can do, or *reset* to start a new trip.`,

  HELP:
    `Here's what you can do:\n\n` +
    `• *new trip* — start planning a trip\n` +
    `• *status* — see where your current trip is\n` +
    `• *reset* — clear everything and start fresh\n` +
    `• *confirm* — confirm your trip plan\n` +
    `• *retry* — retry the last step if something went wrong`,

  INVALID_NUMBER: (field) =>
    `Hmm, I need a number for ${field}. Just send the digits — no commas, no ₦ symbol. (e.g. 25000)`,

  RESET_CONFIRM:
    `Done — I've cleared your current session. Send anything to start planning a new trip.`,
};

module.exports = M;
