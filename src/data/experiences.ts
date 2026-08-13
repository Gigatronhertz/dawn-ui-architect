// Lagos curated experiences — Karije intrastate explore flow

export interface DaySchedule {
  time: string;
  activity: string;
  details?: string;
}

export interface Experience {
  id: string;
  name: string;
  tagline: string;
  description: string;
  pricePerPersonPerDay: number; // in NGN
  maxDays: number;              // hard cap — can't book this experience for more than N days
  category: "adventure" | "culture" | "nature" | "leisure" | "food" | "nightlife";
  location: string;
  imageId: string;             // Unsplash photo ID (cdn: images.unsplash.com/photo-{id})
  colorFallback: string;       // CSS color shown if image fails to load
  included: string[];
  schedule: DaySchedule[];     // base day schedule (used for day 1 and as default for subsequent days)
  scheduleOverrides?: Record<number, DaySchedule[]>; // day-index overrides — key 0 = day 1, key 1 = day 2, etc.
  highlights: string[];
  groupMin: number;
  groupMax: number;
  notes?: string;
}

export const LAGOS_EXPERIENCES: Experience[] = [
  {
    id: "beach-camp",
    name: "Beach Camping",
    tagline: "Tents, bonfires, and open water",
    description:
      "Escape to Tarkwa Bay — Lagos's car-free island beach. Arrive by speedboat, set up camp, and spend your nights under stars with the Atlantic right at your feet. No roads, no cars, no noise. Just your squad and the ocean.",
    pricePerPersonPerDay: 35000,
    maxDays: 3,
    category: "adventure",
    location: "Tarkwa Bay, Lagos Harbour",
    imageId: "1773146916270-e811bff4e923",
    colorFallback: "#2F4A33",
    included: [
      "Return speedboat ride from CMS Marina",
      "Tent & sleeping gear per person",
      "3 meals per day (breakfast, lunch, dinner)",
      "Bonfire setup & firewood",
      "Beach games kit (volleyball, frisbee)",
      "On-site safety coordinator",
    ],
    schedule: [
      { time: "08:00", activity: "Meet at CMS Marina", details: "Boat departs at 8:30 sharp. Sun cream advised." },
      { time: "09:00", activity: "Arrive Tarkwa Bay, set up camp", details: "Tents pitched and ready before 10am." },
      { time: "10:30", activity: "Beach games & open swimming", details: "Volleyball, frisbee, body surfing — no lifeguard needed, water is calm." },
      { time: "13:00", activity: "Lunch on the beach", details: "Grilled fish, jollof rice, cold drinks." },
      { time: "15:00", activity: "Kayaking & banana boat", details: "Rides available — ₦1,500 extra per ride if you want them." },
      { time: "18:30", activity: "Golden hour", details: "The sunset from Tarkwa Bay is genuinely unreal. Have your phone ready." },
      { time: "20:00", activity: "Bonfire & night hangout", details: "Music, games, open water swimming if you're brave." },
    ],
    scheduleOverrides: {
      1: [
        { time: "Morning", activity: "Wake up to waves", details: "No alarm needed — the Atlantic handles it." },
        { time: "09:00", activity: "Sunrise swim & beach walk", details: "Low tide reveals more beach. Good for a solo walk or group jog." },
        { time: "11:00", activity: "Leisure day", details: "Read, float, nap. Your squad, your tempo." },
        { time: "13:00", activity: "Lunch on the beach", details: "Same team, same fire, same fish." },
        { time: "15:00", activity: "Water activities", details: "Kayak, swim, rest — your call." },
        { time: "20:00", activity: "Final bonfire", details: "Last night under the stars. Make it count." },
      ],
      2: [
        { time: "08:00", activity: "Pack up camp", details: "Our team handles the heavy lifting." },
        { time: "09:30", activity: "Final swim & group photo", details: "One last time in the water." },
        { time: "10:30", activity: "Speedboat back to CMS Marina", details: "Return ride is included — arrives back by midday." },
      ],
    },
    highlights: [
      "Island access by speedboat only — no cars, no Lagos traffic",
      "Best sunset view in Lagos, confirmed",
      "Wake up to waves right outside your tent",
    ],
    groupMin: 5,
    groupMax: 40,
    notes:
      "3-day cap. For squads wanting more time: book back-to-back, separate check-in each time.",
  },

  {
    id: "water-park",
    name: "Water Park Day",
    tagline: "Slides, pools, and squad energy at full volume",
    description:
      "A full day at one of Lagos's top water parks — every slide, every pool, dedicated squad area, and lunch buffet included. No extra charges at the gate. You arrive, you play, you leave exhausted.",
    pricePerPersonPerDay: 18000,
    maxDays: 1,
    category: "leisure",
    location: "Lekki, Lagos",
    imageId: "1560118386-f35cf6a0791d",
    colorFallback: "#1E5F8E",
    included: [
      "All-day entry + full slide access",
      "Locker rental",
      "Lunch buffet (jollof, grills, soft drinks)",
      "Dedicated squad cabana area",
      "Shuttle from Lekki Phase 1 roundabout",
    ],
    schedule: [
      { time: "09:00", activity: "Arrival & wristbands", details: "Get there early — best to beat the peak Lagos heat." },
      { time: "09:30", activity: "Every thrill slide (all of them)", details: "Hit everything before the afternoon crowd arrives." },
      { time: "12:30", activity: "Lunch buffet", details: "Jollof, grills, soft drinks — covered in your rate." },
      { time: "14:00", activity: "Lazy river & wave pool", details: "Squad floats, squad photos. This is the real Lagos leisure." },
      { time: "16:00", activity: "Last rides before closing", details: "Park closes to new entries at 5pm." },
      { time: "17:30", activity: "Pack up & head out", details: "Optional after-party spot decided by the squad." },
    ],
    highlights: [
      "Multiple thrill slides — all included in the rate",
      "Wave pool and lazy river",
      "Dedicated cabana area just for your squad",
    ],
    groupMin: 4,
    groupMax: 50,
    notes:
      "This is a 1-day experience — you genuinely won't need more time. Book back-to-back if you want a repeat.",
  },

  {
    id: "upside-down",
    name: "Upside Down House",
    tagline: "Where physics takes a day off",
    description:
      "Lagos's most Instagrammable experience — a fully immersive upside-down house on Victoria Island. Every room is a different photo concept, a laugh, and a small puzzle. Resident photographer included. Digital photos delivered same day.",
    pricePerPersonPerDay: 12000,
    maxDays: 1,
    category: "culture",
    location: "Victoria Island, Lagos",
    imageId: "1761986758241-77549539536a",
    colorFallback: "#8B4513",
    included: [
      "Entry & full room access",
      "Guided photo session per room",
      "Resident photographer (full day)",
      "Digital photo package (delivered same day)",
      "Post-visit brunch at partner café on VI",
    ],
    schedule: [
      { time: "10:00", activity: "Arrive at the Upside Down House, VI", details: "Walking distance from most VI hotels and restaurants." },
      { time: "10:15", activity: "Room-by-room guided experience", details: "Every room is a different installation — roughly 90 minutes total." },
      { time: "11:45", activity: "Squad photo session", details: "Resident photographer captures the full chaos. This is the best content you'll shoot all year." },
      { time: "12:30", activity: "Brunch at partner café", details: "Included — the food is genuinely good, not an afterthought." },
      { time: "14:00", activity: "Optional: Onikan stroll", details: "National Museum and Rele Gallery are a 10-minute walk. No extra charge." },
    ],
    highlights: [
      "Resident photographer included — professional shots in every room",
      "Digital photos delivered same day",
      "Every single room is a different photo concept",
    ],
    groupMin: 2,
    groupMax: 30,
  },

  {
    id: "sneaker-art",
    name: "Sneaker & Street Art Tour",
    tagline: "Culture, kicks, and Lagos creativity",
    description:
      "A curated day through Lagos's sneaker culture scene and street art trail. Yaba's galleries to Lagos Island's iconic murals, rooftop brunch included, Balogun market with a guide so there's no tourist stress. Professional photographer with you throughout.",
    pricePerPersonPerDay: 15000,
    maxDays: 1,
    category: "culture",
    location: "Yaba & Lagos Island",
    imageId: "1509099896299-af46ad97ff57",
    colorFallback: "#4A2F45",
    included: [
      "Sneaker gallery entry (Yaba)",
      "Guided street art trail walk (~1.5km)",
      "Rooftop brunch",
      "Balogun market guided walk",
      "Professional photographer throughout",
    ],
    schedule: [
      { time: "09:30", activity: "Sneaker Gallery, Yaba", details: "Nigeria's premier sneaker culture space. More than just shoes — it's documentation." },
      { time: "11:00", activity: "Yaba street art trail", details: "Guided walk through Lagos's best murals. Every piece has a story the guide can tell." },
      { time: "12:30", activity: "Rooftop brunch", details: "Panoramic Lagos views. Included in your rate — no surprise bill at the end." },
      { time: "14:00", activity: "Balogun market immersion", details: "The heartbeat of Lagos commerce. Guided means no tourist markup and no getting lost." },
      { time: "15:30", activity: "Content & squad photos", details: "Curated stops on Lagos Island. Photographer with you the whole time." },
      { time: "16:30", activity: "Free time on Lagos Island", details: "Wind down however you want. Guide can recommend a rooftop bar (not included)." },
    ],
    highlights: [
      "Only curated sneaker + street art day experience in Lagos",
      "Professional photographer throughout — not just at one spot",
      "Balogun market with a guide — the authentic version, not the tourist one",
    ],
    groupMin: 3,
    groupMax: 20,
  },

  {
    id: "lekki-conservation",
    name: "Lekki Conservation Centre",
    tagline: "Africa's longest canopy walk — inside Lagos",
    description:
      "A 400-metre suspended walkway above a living rainforest, 45 minutes from Lagos Island. Monkeys, exotic birds, monitor lizards, and views that make no sense for a city this size. Picnic brunch set up and waiting for you after the walk.",
    pricePerPersonPerDay: 14000,
    maxDays: 1,
    category: "nature",
    location: "Lekki Phase 2, Lagos",
    imageId: "1577900190299-7316c32fe85f",
    colorFallback: "#2A5C2A",
    included: [
      "Centre entry ticket",
      "Full canopy walkway access",
      "Professional nature guide",
      "Squad picnic brunch (set up & waiting)",
      "Bird & wildlife spotting session",
    ],
    schedule: [
      { time: "07:30", activity: "First-entry slot — dawn light in the canopy", details: "Book this slot specifically. Wildlife is most active before 9am." },
      { time: "08:00", activity: "Guided nature walk", details: "Spot vervet monkeys, exotic birds, and monitor lizards. The guide knows exactly where they are." },
      { time: "09:00", activity: "The canopy walkway", details: "400m of suspension bridge, 22m above the forest floor. Absolutely breathtaking." },
      { time: "10:30", activity: "Picnic brunch", details: "We set it up. You show up and eat. Spread laid out in the clearing." },
      { time: "12:00", activity: "Free exploration", details: "Photography, hammocks, more wildlife watching. Centre is yours until 5pm." },
      { time: "13:30", activity: "Head back", details: "Or stay longer — entirely your call." },
    ],
    highlights: [
      "Africa's longest suspended canopy walkway — 400 metres",
      "Wildlife you didn't know existed inside Lagos",
      "Impossible to over-photograph — every direction is a shot",
    ],
    groupMin: 3,
    groupMax: 40,
    notes:
      "Strongly recommend the 7:30am first-entry slot — wildlife activity drops significantly by 10am.",
  },

  {
    id: "island-food",
    name: "Lagos Island Food & Culture",
    tagline: "Markets, history, and the city's best jollof",
    description:
      "A full-day immersion into Lagos's oldest neighbourhood — from Jankara market at dawn to a harbour boat ride in the afternoon. Five legendary food stops. Real Lagos, not tourist Lagos. Day 2 pivots to Badagry for Nigeria's most significant historical town.",
    pricePerPersonPerDay: 20000,
    maxDays: 2,
    category: "food",
    location: "Lagos Island (CMS, Marina, Balogun)",
    imageId: "1761986756798-a13b39989361",
    colorFallback: "#B0682F",
    included: [
      "Guided food tour (5 stops, all food covered)",
      "Cultural & architectural history walk",
      "Lagos Harbour boat ride (25 min)",
      "Nok Gallery entry",
      "All food and drink at tour stops",
    ],
    schedule: [
      { time: "08:30", activity: "Jankara Market, CMS", details: "Herbs, produce, and the full morning energy of Lagos Island. Arrive before the heat." },
      { time: "10:00", activity: "Nok by Alara Gallery", details: "Nigerian contemporary art at a genuinely world-class standard. Take your time here." },
      { time: "11:30", activity: "The amala spot (cult-classic address)", details: "The one locals don't share with outsiders. You're in." },
      { time: "13:00", activity: "Lagos Island history walk", details: "Brazilian returnee architecture, colonial buildings, the real founding stories." },
      { time: "14:30", activity: "Lagos Harbour boat ride", details: "25-minute ride from CMS jetty — best city perspective you'll find anywhere." },
      { time: "16:00", activity: "Street food closing round", details: "Suya, puff-puff, coconut candy — the full circuit." },
      { time: "17:30", activity: "End of day", details: "Guide recommends the right rooftop bar for the evening (not included)." },
    ],
    scheduleOverrides: {
      1: [
        { time: "09:00", activity: "Drive to Badagry (55km)", details: "Historical town. Worth every minute of the drive." },
        { time: "10:30", activity: "Badagry Heritage Museum", details: "One of Nigeria's most important and least-visited historical sites." },
        { time: "12:00", activity: "Point of No Return Beach", details: "The exact beach where enslaved people left Nigeria for the last time. Heavy. Essential." },
        { time: "14:00", activity: "Lunch in Badagry", details: "Local restaurant — fresh catch from the lagoon. Covered in your rate." },
        { time: "16:30", activity: "Return drive to Lagos", details: "Back by early evening." },
      ],
    },
    highlights: [
      "5 legendary Lagos food stops — all covered in the rate",
      "Harbour boat ride included (best view of the city)",
      "Day 2 goes deep into Badagry — Nigeria's most historically significant town",
    ],
    groupMin: 4,
    groupMax: 25,
    notes:
      "Day 2 is a different itinerary entirely — Badagry history and coast. Both days are strong standalone experiences.",
  },
];
