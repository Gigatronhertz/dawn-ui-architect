const { GoogleGenerativeAI } = require('@google/generative-ai');

let genAI;
function getClient() {
  if (!genAI) genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return genAI;
}

const fmtNGN = (n) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(n);

async function generateTripPlan(intake) {
  const model = getClient().getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `You are MySquadGo's West African group trip planner. Generate a detailed, realistic trip plan.

Trip details:
- From: ${intake.origin}
- To: ${intake.destination}
- Duration: ${intake.days} day(s)
- Squad size: ${intake.squad_size} people
- Budget per person: ₦${Number(intake.budget).toLocaleString()}
- Accommodation preference: ${intake.accommodation}
- Date preference: ${intake.date_flexibility}${intake.specific_dates ? ` (${intake.specific_dates})` : ''}
- Dealbreakers: ${intake.dealbreakers || 'none'}

Generate a realistic plan using actual West African hotels, transport operators (GIGM, GUO, ABC, Peace Mass for buses; Air Peace, Ibom Air for flights; UBER/Bolt for city transport), and local activities. Prices must be in Nigerian Naira and realistic for 2025.

Return ONLY valid JSON — no markdown, no explanation:
{
  "hotel": {
    "name": "exact hotel name",
    "area": "neighbourhood/area",
    "price_per_night": 45000,
    "rating": 4.3,
    "perks": ["Free breakfast", "Pool", "Wi-Fi"]
  },
  "transport": {
    "operator": "GIGM",
    "type": "Charter bus",
    "price_per_person": 8500,
    "depart_time": "07:00",
    "arrive_time": "09:30",
    "pickup": "Jibowu Motor Park, Lagos"
  },
  "days": [
    {
      "day": 1,
      "title": "Arrival & city pulse",
      "activities": [
        { "time": "13:00", "title": "Check-in at hotel", "cost_per_person": 0 },
        { "time": "16:00", "title": "Cocoa House rooftop", "cost_per_person": 2000 },
        { "time": "20:00", "title": "Dinner at Amala Skye", "cost_per_person": 4500 }
      ]
    }
  ],
  "date_options": [
    { "id": "d1", "label": "Fri 9 – Sun 11 Aug", "sub": "Weekend getaway" },
    { "id": "d2", "label": "Fri 16 – Sun 18 Aug", "sub": "Peak weekend" },
    { "id": "d3", "label": "Fri 23 – Sun 25 Aug", "sub": "Late August" }
  ],
  "cost_breakdown": {
    "transport_total": 68000,
    "lodging_total": 96000,
    "food_total": 78000,
    "activities_total": 45000,
    "buffer": 20000,
    "total": 307000,
    "per_person": 38375
  },
  "highlights": ["Cocoa House rooftop at sunset", "Amala Skye street food crawl", "Agodi Gardens nature walk"],
  "offline_note": "Premier Hotel Ibadan — 12 Molete Rd, Mokola, Ibadan. Tel: 0802 000 0000. GIGM pickup: Jibowu Motor Park 07:00."
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  // Strip markdown code fences if Gemini wraps the JSON
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  return JSON.parse(cleaned);
}

// Format a plan into a readable WhatsApp message
function formatPlanSummary(plan, intake) {
  const { hotel, transport, cost_breakdown: cost, highlights, days } = plan;

  const dayLines = days.map((d) => `  Day ${d.day}: ${d.title}`).join('\n');

  return (
    `✅ *${intake.origin} → ${intake.destination} trip is ready.*\n\n` +
    `📍 ${intake.days} day${intake.days > 1 ? 's' : ''} · ${intake.squad_size} squad\n` +
    `🏨 ${hotel.name} · ${fmtNGN(hotel.price_per_night)}/night · ⭐ ${hotel.rating}\n` +
    `🚌 ${transport.operator} · ${fmtNGN(transport.price_per_person)}/seat · departs ${transport.depart_time}\n` +
    `💰 Est. *${fmtNGN(cost.per_person)}/person* all-in\n\n` +
    `📋 *Itinerary:*\n${dayLines}\n\n` +
    `✨ *Highlights:* ${highlights.join(' · ')}\n\n` +
    `Type *confirm* to lock this in, or tell me what to change.`
  );
}

module.exports = { generateTripPlan, formatPlanSummary };
