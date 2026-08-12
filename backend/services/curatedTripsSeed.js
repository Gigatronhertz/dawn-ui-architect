/**
 * Ready-made trips — seeded into the `curated_trips` table on first boot.
 *
 * These are the six teasers that used to be hardcoded in src/pages/Trips.tsx.
 * They ship as drafts (published: 0) so the admin reviews and prices them
 * before anything goes live on /trips.
 */
const CURATED_TRIPS_SEED = [
  {
    id: 'lekki-escape',
    name: 'Lekki Weekend Escape',
    tagline: 'Two days of beach, bonfires and Lagos island air.',
    description:
      'A low-effort weekend on the Lekki axis. Saturday runs on Elegushi and Landmark Beach, Sunday slows down with brunch and a quiet drive back. Hotel and return transport are already sorted — you just show up.',
    origin: 'Lagos',
    state: 'Lagos',
    location: 'Lagos · Lekki / Elegushi',
    days: 2,
    priceFrom: 28000,
    tag: 'Beach & chill',
    emoji: '🏖️',
    colorFallback: '#B0682F',
    included: [
      'Return charter bus within Lagos',
      '1 night hotel on the Lekki axis',
      'Beach entry for the squad',
      'Saturday night bonfire setup',
    ],
    highlights: [
      'Elegushi and Landmark on the same weekend',
      'Sunday brunch before the drive back',
      'Works for squads of 6 and up',
    ],
    itinerary: [
      {
        day: 1,
        title: 'Beach day',
        activities: [
          { time: '09:00', activity: 'Pickup and drive to Lekki', details: 'Charter bus from the mainland.' },
          { time: '12:00', activity: 'Landmark Beach', details: 'Loungers and lunch on the sand.' },
          { time: '18:00', activity: 'Elegushi sunset + bonfire', details: 'Setup included.' },
        ],
      },
      {
        day: 2,
        title: 'Slow start, ride home',
        activities: [
          { time: '10:30', activity: 'Brunch in Lekki Phase 1' },
          { time: '14:00', activity: 'Drive back' },
        ],
      },
    ],
    groupMin: 6,
    groupMax: 25,
    notes: 'Beach entry rates climb on public holidays — book two weeks out.',
    sortOrder: 1,
  },
  {
    id: 'abuja-retreat',
    name: 'Abuja City & Nature Retreat',
    tagline: 'Rock formations, quiet parks and a capital-city reset.',
    description:
      'Three days built around Abuja\'s outdoors. Zuma Rock and Usuma Dam on the nature side, Jabi and the city core for food and evenings. Paced for a squad that wants scenery without a hard hike.',
    origin: 'Lagos',
    state: 'Abuja',
    location: 'Abuja · Gwagwalada / Aso Rock',
    days: 3,
    priceFrom: 45000,
    tag: 'Culture & outdoors',
    emoji: '🏞️',
    colorFallback: '#2F4A33',
    included: [
      'Return bus from Lagos',
      '2 nights hotel in Wuse or Utako',
      'Airport/park transfers within Abuja',
      'Entry fees for listed sites',
    ],
    highlights: [
      'Zuma Rock viewpoint stop',
      'Evening at Jabi Lake',
      'Millennium Park and the city core',
    ],
    itinerary: [
      {
        day: 1,
        title: 'Arrive and settle',
        activities: [
          { time: '07:00', activity: 'Depart Lagos' },
          { time: '17:00', activity: 'Check in, dinner in Wuse' },
        ],
      },
      {
        day: 2,
        title: 'Rock and water',
        activities: [
          { time: '09:00', activity: 'Zuma Rock viewpoint' },
          { time: '13:00', activity: 'Lower Usuma Dam' },
          { time: '18:00', activity: 'Jabi Lake boardwalk' },
        ],
      },
      {
        day: 3,
        title: 'City core, then home',
        activities: [
          { time: '10:00', activity: 'Millennium Park' },
          { time: '14:00', activity: 'Depart for Lagos' },
        ],
      },
    ],
    groupMin: 4,
    groupMax: 30,
    notes: null,
    sortOrder: 2,
  },
  {
    id: 'calabar-cultural',
    name: 'Calabar Cultural Weekend',
    tagline: 'Food, museums and the best-kept streets in the south.',
    description:
      'Calabar at a walking pace. The Slave History Museum and Marina Resort for context, Calabar street food for everything else. Built for a squad that likes a city with a story.',
    origin: 'Lagos',
    state: 'Cross River',
    location: 'Cross River · Calabar',
    days: 2,
    priceFrom: 38000,
    tag: 'Festival & food',
    emoji: '🎭',
    colorFallback: '#6B4C2A',
    included: [
      'Return transport from Lagos',
      '1 night hotel in Calabar',
      'Museum and resort entry',
      'Guided street food walk',
    ],
    highlights: [
      'Slave History Museum',
      'Marina Resort waterfront',
      'Calabar street food, properly guided',
    ],
    itinerary: [
      {
        day: 1,
        title: 'Arrive and eat',
        activities: [
          { time: '14:00', activity: 'Check in' },
          { time: '17:00', activity: 'Guided street food walk' },
        ],
      },
      {
        day: 2,
        title: 'History and the waterfront',
        activities: [
          { time: '10:00', activity: 'Slave History Museum' },
          { time: '13:00', activity: 'Marina Resort' },
          { time: '16:00', activity: 'Depart' },
        ],
      },
    ],
    groupMin: 4,
    groupMax: 20,
    notes: 'December carnival weeks are priced separately — ask before booking.',
    sortOrder: 3,
  },
  {
    id: 'jos-highlands',
    name: 'Jos Highlands Getaway',
    tagline: 'Cool air, rock formations and the closest Nigeria gets to a hill station.',
    description:
      'Three days on the Plateau. Riyom Rock and Kurra Falls for the scenery, Jos Wildlife Park for the easy afternoon, and genuinely cold evenings — bring a jacket.',
    origin: 'Abuja',
    state: 'Plateau',
    location: 'Plateau · Jos',
    days: 3,
    priceFrom: 41000,
    tag: 'Scenery & hiking',
    emoji: '⛰️',
    colorFallback: '#374B44',
    included: [
      'Return transport from Abuja',
      '2 nights hotel in Jos',
      'Park and falls entry fees',
      'Local driver for the full stay',
    ],
    highlights: [
      'Riyom Rock formation',
      'Kurra Falls',
      'Jos Wildlife Park',
    ],
    itinerary: [
      {
        day: 1,
        title: 'Up to the Plateau',
        activities: [
          { time: '08:00', activity: 'Depart Abuja' },
          { time: '13:00', activity: 'Check in, lunch' },
          { time: '16:00', activity: 'Jos Museum' },
        ],
      },
      {
        day: 2,
        title: 'Rocks and falls',
        activities: [
          { time: '09:00', activity: 'Riyom Rock' },
          { time: '13:00', activity: 'Kurra Falls' },
        ],
      },
      {
        day: 3,
        title: 'Wildlife, then home',
        activities: [
          { time: '10:00', activity: 'Jos Wildlife Park' },
          { time: '14:00', activity: 'Depart' },
        ],
      },
    ],
    groupMin: 4,
    groupMax: 24,
    notes: 'Evenings drop below 15°C between November and February.',
    sortOrder: 4,
  },
  {
    id: 'port-harcourt-creeks',
    name: 'Port Harcourt Creek Tour',
    tagline: 'Boats by day, the best nightlife in the delta after dark.',
    description:
      'Two days on the water and in the city. Creek boat run and Bonny waterfront during the day, Port Harcourt\'s bar strip at night. High-energy — not a rest trip.',
    origin: 'Lagos',
    state: 'Rivers',
    location: 'Rivers · Port Harcourt',
    days: 2,
    priceFrom: 33000,
    tag: 'Boat & nightlife',
    emoji: '⛵',
    colorFallback: '#1C3A4A',
    included: [
      'Return transport from Lagos',
      '1 night hotel in GRA',
      'Chartered creek boat',
      'Life jackets and boat guide',
    ],
    highlights: [
      'Creek boat run at golden hour',
      'Bonny waterfront',
      'GRA bar strip after dark',
    ],
    itinerary: [
      {
        day: 1,
        title: 'On the water',
        activities: [
          { time: '12:00', activity: 'Check in, GRA' },
          { time: '16:00', activity: 'Chartered creek boat run' },
          { time: '21:00', activity: 'Bar strip' },
        ],
      },
      {
        day: 2,
        title: 'Waterfront and out',
        activities: [
          { time: '11:00', activity: 'Bonny waterfront' },
          { time: '15:00', activity: 'Depart' },
        ],
      },
    ],
    groupMin: 6,
    groupMax: 20,
    notes: 'Boat charter is weather-dependent between June and September.',
    sortOrder: 5,
  },
  {
    id: 'obudu-ranch',
    name: 'Obudu Ranch Experience',
    tagline: 'The cable car, the canopy walk, and mountain air at 1,500m.',
    description:
      'Three days at Obudu Mountain Resort. The cable car up, the canopy walkway, and the grasslands at the top. The long drive in from Calabar is part of it — the last stretch is one of the best roads in the country.',
    origin: 'Lagos',
    state: 'Cross River',
    location: 'Cross River · Obudu',
    days: 3,
    priceFrom: 55000,
    tag: 'Adventure & wildlife',
    emoji: '🦅',
    colorFallback: '#3D2B1F',
    included: [
      'Return transport from Lagos',
      '2 nights at the ranch',
      'Cable car and canopy walk passes',
      'All resort entry fees',
    ],
    highlights: [
      'Cable car ride up the escarpment',
      'Canopy walkway',
      'Grasslands and the natural pool',
    ],
    itinerary: [
      {
        day: 1,
        title: 'The long drive',
        activities: [
          { time: '06:00', activity: 'Depart Lagos' },
          { time: '18:00', activity: 'Arrive Obudu, check in' },
        ],
      },
      {
        day: 2,
        title: 'Up the mountain',
        activities: [
          { time: '09:00', activity: 'Cable car' },
          { time: '12:00', activity: 'Canopy walkway' },
          { time: '16:00', activity: 'Natural pool' },
        ],
      },
      {
        day: 3,
        title: 'Grasslands, then home',
        activities: [
          { time: '08:00', activity: 'Grasslands walk' },
          { time: '11:00', activity: 'Depart' },
        ],
      },
    ],
    groupMin: 4,
    groupMax: 30,
    notes: 'The resort books out over Christmas and Easter.',
    sortOrder: 6,
  },
];

module.exports = { CURATED_TRIPS_SEED };
