const Groq = require('groq-sdk');
const {
  geocodeCity, getRoadDistance,
  searchHotels: googleHotels, searchHolidayRentals, searchActivities,
  formatHotelsForPrompt, formatRentalsForPrompt, formatActivitiesForPrompt,
} = require('./googleMaps');
const { searchFlights, formatFlightsForPrompt } = require('./amadeus');
const {
  searchHotels: bookingHotels, searchApartments, getDates, formatBookingHotelsForPrompt,
} = require('./bookingCom');
const GT   = require('./googleTravel');
const GIGM = require('./gigm');
const db   = require('../db/client');
const { cityToState, formatAttractionsForPrompt } = require('./attractions');

let _groq;
function getGroq() {
  if (!_groq) _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return _groq;
}

const fmtNGN = (n) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(n);

// ── Fetch real-world data to ground the Gemini plan ───────────────────────────
// All calls run in parallel. Any individual failure is non-fatal — the plan
// generation continues with whatever context was successfully retrieved.
async function fetchRealWorldContext(intake) {
  const isShortlet = (intake.accommodation || '').toLowerCase().includes('shortlet');
  const budgetPerNight = Math.round((intake.budget * 0.4) / (intake.days || 1));
  const { checkin, checkout } = getDates(intake);

  // Geocode destination first — needed for Google Places searches
  const coords = await geocodeCity(`${intake.destination}, Nigeria`);

  const depDate = intake.specific_dates?.match(/\d{4}-\d{2}-\d{2}/)?.[0];

  // Transport mode: bus → run GIGM, skip flights; flight → run flights, skip GIGM
  const isFlightMode = /flight/i.test(intake.transport || '');
  const isBusMode    = !isFlightMode;
  console.log(`[gemini] Transport mode: ${isFlightMode ? 'flight' : 'bus'} (intake.transport="${intake.transport}")`);

  // Run GT hotel/rental scrapers — needed regardless of transport mode
  const gtHotelsRaw  = await GT.scrapeHotels(intake.destination, checkin, checkout, intake.squad_size).catch(() => []);
  const gtRentalsRaw = isShortlet
    ? await GT.scrapeVacationRentals(intake.destination, checkin, checkout).catch(() => [])
    : [];
  // Only scrape flights if user chose flight mode
  const gtFlightsRaw = isFlightMode
    ? await GT.scrapeFlights(intake.origin, intake.destination, depDate).catch(() => null)
    : null;
  // GIGM — bus mode only, runs AFTER GT scrapers so both don't fight over Browserless at once.
  // scrapeGIGM returns [] on any failure — non-fatal, prompt falls back gracefully.
  const gigmTripsRaw = isBusMode
    ? await GIGM.scrapeGIGM(intake.origin, intake.destination, depDate).catch(() => [])
    : [];

  // Look up attractions from DB (fast — local/Turso query)
  const destState = cityToState(intake.destination);
  const localAttractions = destState
    ? await db.attractions.byState(destState).catch(() => [])
    : [];
  console.log(`[gemini/context] attractions for ${intake.destination} (${destState}): ${localAttractions.length}`);

  // All other API calls can run in parallel — they don't use Chrome
  const [
    road,
    gHotels, gRentals, activities,
    bHotels, bApartments,
    amadeusFlights,
  ] = await Promise.allSettled([
    getRoadDistance(intake.origin, intake.destination),
    // Google Places — ratings, addresses, phone numbers
    googleHotels(intake.destination, coords?.lat, coords?.lng, budgetPerNight),
    isShortlet
      ? searchHolidayRentals(intake.destination, coords?.lat, coords?.lng)
      : Promise.resolve([]),
    searchActivities(intake.destination, coords?.lat, coords?.lng),
    // Booking.com — real NGN prices with availability
    bookingHotels(intake.destination, checkin, checkout, intake.squad_size, budgetPerNight),
    isShortlet
      ? searchApartments(intake.destination, checkin, checkout, intake.squad_size)
      : Promise.resolve([]),
    // Amadeus — flight prices (skip in bus mode)
    isFlightMode ? searchFlights(intake.origin, intake.destination, depDate) : Promise.resolve(null),
  ]);

  const gtHotels   = { status: 'fulfilled', value: gtHotelsRaw };
  const gtRentals  = { status: 'fulfilled', value: gtRentalsRaw };
  const gtFlights  = { status: 'fulfilled', value: gtFlightsRaw };

  const val = (r) => r.status === 'fulfilled' ? r.value : null;

  // Log what each source returned so failures are visible in Render logs
  const logCount = (label, r) => {
    if (r.status === 'rejected') console.warn(`[gemini/context] ${label}: ERROR — ${r.reason?.message}`);
    else console.log(`[gemini/context] ${label}: ${Array.isArray(r.value) ? r.value.length + ' results' : r.value ? JSON.stringify(r.value).slice(0, 80) : 'null'}`);
  };
  const gigmTrips = { status: 'fulfilled', value: gigmTripsRaw };

  logCount('road distance', road);
  logCount('GT hotels', gtHotels);
  logCount('GT rentals', gtRentals);
  logCount('GT flights', gtFlights);
  logCount('GIGM buses', gigmTrips);
  logCount('Booking hotels', bHotels);
  logCount('Booking apartments', bApartments);
  logCount('Amadeus flights', amadeusFlights);

  // Prefer Google Travel flights if Amadeus returned nothing
  const flightData = val(amadeusFlights) || val(gtFlights);

  return {
    road:              val(road),
    gHotels:           val(gHotels)     || [],
    gRentals:          val(gRentals)    || [],
    activities:        val(activities)  || {},
    bHotels:           val(bHotels)     || [],
    bApartments:       val(bApartments) || [],
    flights:           flightData,
    gtHotels:          val(gtHotels)    || [],
    gtRentals:         val(gtRentals)   || [],
    gigmTrips:         val(gigmTrips)   || [],
    localAttractions:  localAttractions || [],
    nights:            intake.days || 1,
  };
}

// Build the context block injected into the Gemini prompt.
// ORDER MATTERS — attractions come first so the AI treats them as the primary
// activity source, not a supplement to Google Places.
function buildContextBlock(ctx, intake) {
  const sections = [];

  // ── 1. ACTIVITY MENU (curated attractions) — always first ─────────────────
  // This is the primary source for all non-meal, non-travel activity slots.
  const attrStr = formatAttractionsForPrompt(ctx.localAttractions);
  if (attrStr) {
    sections.push(
      `🏛️  ACTIVITY MENU for ${intake.destination} — build ALL activity slots in the day schedule FROM THIS LIST ONLY.\n` +
      `    Every attraction, park, market, museum, beach or entertainment venue in the itinerary MUST appear here by exact name.\n` +
      `    Do NOT invent or substitute venue names. Entry fees are confirmed — use them exactly as stated:\n${attrStr}`
    );
  }

  // ── 2. Transport ──────────────────────────────────────────────────────────
  if (ctx.road) {
    sections.push(
      `🗺️  Real road distance (Google Maps): ${ctx.road.distanceText}, ~${ctx.road.durationText} by road.`
    );
  }

  const gigmStr = GIGM.formatGIGMForPrompt(ctx.gigmTrips);
  if (gigmStr) {
    sections.push(`🚌  ${gigmStr}`);
  }

  if (ctx.flights) {
    const src = ctx.flights.source === 'google_travel' ? 'Google Travel' : 'Amadeus';
    sections.push(formatFlightsForPrompt(ctx.flights).replace('✈️  Flights', `✈️  Flights (${src})`));
  }

  // ── 3. Hotels ─────────────────────────────────────────────────────────────
  const gtHotelStr = GT.formatHotelsForPrompt(ctx.gtHotels || []);
  const bHotelStr  = formatBookingHotelsForPrompt(ctx.bHotels, ctx.nights);
  const gHotelStr  = formatHotelsForPrompt(ctx.gHotels);

  if (gtHotelStr) {
    sections.push(
      `🏨  Hotels near ${intake.destination} — LIVE prices from Google Travel (highest priority, use these):\n${gtHotelStr}`
    );
  }
  if (bHotelStr) {
    sections.push(
      `🏨  Hotels near ${intake.destination} — Booking.com NGN prices + availability:\n${bHotelStr}`
    );
  }
  if (gHotelStr) {
    sections.push(
      `🏨  Hotels near ${intake.destination} — Google Places ratings + phone numbers:\n${gHotelStr}`
    );
  }

  // ── 4. Holiday rentals ────────────────────────────────────────────────────
  const gtRentalStr = GT.formatRentalsForPrompt(ctx.gtRentals || []);
  const bRentalStr  = formatBookingHotelsForPrompt(ctx.bApartments, ctx.nights);
  const gRentalStr  = formatRentalsForPrompt(ctx.gRentals);

  if (gtRentalStr) {
    sections.push(
      `🏠  Shortlets / vacation rentals near ${intake.destination} — LIVE from Google Travel:\n${gtRentalStr}`
    );
  }
  if (bRentalStr) {
    sections.push(
      `🏠  Apartments / shortlets near ${intake.destination} — Booking.com:\n${bRentalStr}`
    );
  }
  if (gRentalStr) {
    sections.push(
      `🏠  Shortlets / holiday rentals near ${intake.destination} — Google Places:\n${gRentalStr}`
    );
  }

  // ── 5. Google Places (food & nightlife names only) ────────────────────────
  const actStr = formatActivitiesForPrompt(ctx.activities);
  if (actStr) {
    sections.push(
      `🍽️  Nearby restaurants & nightlife (Google Places) — use for MEAL STOPS ONLY, not as activity venues:\n${actStr}`
    );
  }

  if (!sections.length) return '';

  return `\n## REAL-WORLD DATA — follow strictly; do not invent names or fees when real data is provided\n${sections.join('\n\n')}\n`;
}

// ── Main plan generation ───────────────────────────────────────────────────────
async function generateTripPlan(intake) {

  // Fetch live data in parallel — takes ~2-4s, runs while user sees "Generating…"
  const ctx = await fetchRealWorldContext(intake);
  const contextBlock = buildContextBlock(ctx, intake);

  const isFlightMode = /flight/i.test(intake.transport || '');
  const transportHint = isFlightMode
    ? ctx.flights?.available
      ? `USER CHOSE FLIGHT MODE. Flights from ${ctx.flights.cheapestNGN.toLocaleString()} NGN/person. Use Air Peace, Ibom Air, or cheapest available airline.`
      : `USER CHOSE FLIGHT MODE. Use Air Peace / Ibom Air for this route — user explicitly chose to fly.`
    : `USER CHOSE BUS MODE. Use GIGM as the primary transport operator. Estimate realistic NGN bus fares for this route.`;

  const prompt = `You are Karije's West African group trip planner. Generate a detailed, realistic trip plan.

Trip details:
- From: ${intake.origin}
- To: ${intake.destination}
- Duration: ${intake.days} day(s)
- Squad size: ${intake.squad_size} people
- Budget per person: ₦${Number(intake.budget).toLocaleString()}
- Accommodation preference: ${intake.accommodation}
- Date preference: ${intake.date_flexibility}${intake.specific_dates ? ` (${intake.specific_dates})` : ''}
- Dealbreakers: ${intake.dealbreakers || 'none'}
- Squad vibe: ${intake.vibe || 'Chill & scenic'}
- Transport: ${transportHint}
${contextBlock}
INSTRUCTIONS:
1. Pick the hotel from the "Hotels" section above if provided — use the EXACT name and address. If NO hotel data was scraped, do NOT invent a name. Set hotel.name to "See Hotels.ng or Booking.com for current availability" and estimate price_per_night (₦25,000–₦60,000 Abuja, ₦20,000–₦50,000 other cities).
2. If shortlet/rental listings are provided and accommodation preference is "Shortlet", pick from that list instead.
3. DAY SCHEDULE — STRICT SOURCE RULE:
   a. Every non-travel, non-hotel, non-meal slot MUST use a venue from the ACTIVITY MENU above — exact name, exact entry fee.
   b. Pick 2–3 activity venues per full day. For a half-day (arrival/departure day) pick 1.
   c. Select venues that match the squad vibe: Chill → parks, lakes, beaches; Adventure → waterfalls, hikes, wildlife; Cultural → museums, palaces, markets, craft villages; Foodie → markets + food areas + art; Nightlife → entertainment parks, beach clubs, food strips.
   d. If the fee_note says "Free" or the fee is 0, set cost_per_person to 0. If it gives a range (e.g. ₦500–₦1,000), use the midpoint (750).
   e. NEVER invent an activity venue name that is not in the ACTIVITY MENU. If the menu is empty for this destination, write activities as area descriptions only (e.g. "Explore central market area").
4. MEAL SLOTS — 1 per day (lunch or dinner). Use a Google Places name if one was provided in the "Restaurants & nightlife" section. If none, describe type and area (e.g. "Lunch at a local bukka near Wuse Market (est.)", "Dinner at a rooftop bar, Maitama area (est.)"). Append "(est.)" to any meal cost. Realistic meal costs: ₦3,000–₦6,000 budget, ₦6,000–₦15,000 mid-range, ₦15,000+ upscale.
5. TRANSPORT — use real GIGM data (prices, times, terminal names) if provided. Otherwise use the road distance and realistic NGN fares for the chosen mode.
6. Hotel price levels: INEXPENSIVE ≈ ₦8,000–₦20,000/night, MODERATE ≈ ₦20,000–₦50,000/night, EXPENSIVE ≈ ₦50,000–₦150,000/night.
7. All costs in NGN, realistic for 2025. Squad vibe must shape tone AND venue selection.
8. In cost_breakdown: transport_total and lodging_total are confirmed when real data was used; food_total and activities_total are estimates. Note this honestly in offline_note.
9. Return ONLY valid JSON — no markdown fences, no explanation outside the JSON object.

{
  "hotel": {
    "name": "exact name from Google Places list, or invented if none provided",
    "area": "neighbourhood/area from address",
    "price_per_night": 45000,
    "rating": 4.3,
    "perks": ["Free breakfast", "Pool", "Wi-Fi"],
    "address": "full address if available from Places data",
    "phone": "phone number if available from Places data"
  },
  "transport": {
    "operator": "GIGM or Air Peace etc.",
    "type": "Charter bus or Flight",
    "price_per_person": 8500,
    "depart_time": "07:00",
    "arrive_time": "09:30",
    "pickup": "Jibowu Motor Park, Lagos"
  },
  "days": [
    {
      "day": 1,
      "title": "Arrival & first impressions",
      "activities": [
        { "time": "14:00", "title": "Check-in at hotel", "cost_per_person": 0 },
        { "time": "16:30", "title": "[EXACT name from ACTIVITY MENU, e.g. Millennium Park]", "cost_per_person": 0 },
        { "time": "19:30", "title": "Dinner near [area] (est.)", "cost_per_person": 6000 }
      ]
    },
    {
      "day": 2,
      "title": "Full exploration day",
      "activities": [
        { "time": "09:00", "title": "[EXACT name from ACTIVITY MENU, e.g. Kofar Mata Dye Pits]", "cost_per_person": 0 },
        { "time": "12:30", "title": "Lunch at [area or Google Places name] (est.)", "cost_per_person": 5000 },
        { "time": "14:30", "title": "[EXACT name from ACTIVITY MENU, e.g. Kurmi Market]", "cost_per_person": 0 },
        { "time": "17:30", "title": "[EXACT name from ACTIVITY MENU, e.g. Emir's Palace, Kano]", "cost_per_person": 1500 }
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
  "highlights": ["real venue 1", "real venue 2", "real venue 3"],
  "offline_note": "Hotel: [name] — [address]. Tel: [phone if available]. Transport: [operator], departs [terminal] at [time]. Attraction fees confirmed from curated list; food costs are estimates.",
  "data_sources": {
    "hotels_from_google_travel": ${(ctx.gtHotels || []).length > 0},
    "hotels_from_booking": ${ctx.bHotels.length > 0},
    "hotels_from_places": ${ctx.gHotels.length > 0},
    "rentals_from_google_travel": ${(ctx.gtRentals || []).length > 0},
    "rentals_from_booking": ${ctx.bApartments.length > 0},
    "rentals_from_places": ${ctx.gRentals.length > 0},
    "activities_from_google": ${Object.keys(ctx.activities || {}).length > 0},
    "distance_from_google": ${!!ctx.road},
    "flights_from_amadeus": ${!!ctx.flights && ctx.flights.source !== 'google_travel'},
    "flights_from_google_travel": ${!!ctx.flights && ctx.flights.source === 'google_travel'},
    "buses_from_gigm": ${(ctx.gigmTrips || []).length > 0}
  }
}`;

  const completion = await getGroq().chat.completions.create({
    model: 'llama-3.3-70b-versatile',   // free tier — 14,400 req/day, no card needed
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.4,
  });
  const text = completion.choices[0].message.content.trim();
  // response_format:json_object guarantees raw JSON, but strip fences defensively
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const plan = JSON.parse(cleaned);
  return {
    plan,
    scraped: {
      flights:     ctx.flights,
      gtHotels:    ctx.gtHotels    || [],
      bHotels:     ctx.bHotels     || [],
      gtRentals:   ctx.gtRentals   || [],
      bApartments: ctx.bApartments || [],
      gigmTrips:        ctx.gigmTrips        || [],
      localAttractions: ctx.localAttractions || [],
    },
  };
}

// ── WhatsApp plan summary ──────────────────────────────────────────────────────
function formatPlanSummary(plan, intake) {
  const { hotel, transport, cost_breakdown: cost, highlights, days, data_sources } = plan;

  const dayLines = days.map((d) => `  Day ${d.day}: ${d.title}`).join('\n');

  const dataBadge = data_sources
    ? '\n_📍 Hotels, venues & distances pulled live from Google Maps_'
    : '';

  return (
    `✅ *${intake.origin} → ${intake.destination} trip is ready.*\n\n` +
    `📍 ${intake.days} day${intake.days > 1 ? 's' : ''} · ${intake.squad_size} squad\n` +
    `🏨 ${hotel.name} · ${fmtNGN(hotel.price_per_night)}/night · ⭐ ${hotel.rating}\n` +
    `🚌 ${transport.operator} · ${fmtNGN(transport.price_per_person)}/seat · departs ${transport.depart_time}\n` +
    `💰 Est. *${fmtNGN(cost.per_person)}/person* all-in\n\n` +
    `📋 *Itinerary:*\n${dayLines}\n\n` +
    `✨ *Highlights:* ${highlights.join(' · ')}` +
    dataBadge +
    `\n\nType *confirm* to lock this in, or tell me what to change.`
  );
}

module.exports = { generateTripPlan, formatPlanSummary };
