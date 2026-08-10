/**
 * Amadeus for Developers — Flight Offers Search
 * The closest real alternative to "Google Flights API" (which isn't public).
 * Powers Kayak, Expedia, and many travel booking sites.
 *
 * Free tier: 500 live calls/month + unlimited test calls.
 * Register at: https://developers.amadeus.com
 *
 * Env vars required:
 *   AMADEUS_CLIENT_ID
 *   AMADEUS_CLIENT_SECRET
 *
 * Switch base URL from test → production when ready:
 *   AMADEUS_ENV=production  →  api.amadeus.com
 *   (default)               →  test.api.amadeus.com
 */
const axios = require('axios');

const BASE = process.env.AMADEUS_ENV === 'production'
  ? 'https://api.amadeus.com'
  : 'https://test.api.amadeus.com';

// ── IATA airport codes — West Africa + common destinations ─────────────────────
const CITY_TO_IATA = {
  // Nigeria
  'lagos':          'LOS',
  'abuja':          'ABV',
  'port harcourt':  'PHC',
  'kano':           'KAN',
  'calabar':        'CBQ',
  'enugu':          'ENU',
  'ibadan':         'IBA',
  'benin city':     'BNI',
  'benin':          'BNI',
  'owerri':         'QOW',
  'akure':          'AKR',
  'asaba':          'ABB',
  'kaduna':         'KAD',
  'maiduguri':      'MIU',
  'yola':           'YOL',
  'ilorin':         'ILR',
  'jos':            'JOS',
  'sokoto':         'SKO',
  'warri':          'QRW',
  // Ghana
  'accra':          'ACC',
  'kumasi':         'KMS',
  'tamale':         'TML',
  // Senegal
  'dakar':          'DKR',
  // Côte d\'Ivoire
  'abidjan':        'ABJ',
  // Cameroon
  'douala':         'DLA',
  'yaounde':        'NSI',
  'yaoundé':        'NSI',
  // Others in the region
  'lomé':           'LFW',
  'lome':           'LFW',
  'cotonou':        'COO',
  'libreville':     'LBV',
  'kinshasa':       'FIH',
  'nairobi':        'NBO',
  'addis ababa':    'ADD',
  'johannesburg':   'JNB',
  'cape town':      'CPT',
  'dubai':          'DXB',
  'london':         'LHR',
};

function cityToIATA(city) {
  return CITY_TO_IATA[(city || '').toLowerCase().trim()] || null;
}

// ── OAuth2 token (cached until 1 min before expiry) ───────────────────────────
let _token = null;
let _tokenExpiry = 0;

async function getToken() {
  if (_token && Date.now() < _tokenExpiry) return _token;
  const { data } = await axios.post(
    `${BASE}/v1/security/oauth2/token`,
    new URLSearchParams({
      grant_type:    'client_credentials',
      client_id:     process.env.AMADEUS_CLIENT_ID,
      client_secret: process.env.AMADEUS_CLIENT_SECRET,
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 8000 }
  );
  _token = data.access_token;
  _tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return _token;
}

// ── Flight search ──────────────────────────────────────────────────────────────
/**
 * Search for flights between two cities.
 * Returns null if no credentials, no IATA codes found, or no results.
 *
 * @param {string} originCity      e.g. "Lagos"
 * @param {string} destinationCity e.g. "Accra"
 * @param {string} departureDate   ISO date e.g. "2025-12-26" (optional — uses near-future date)
 * @param {number} adults          number of passengers (used for per-person pricing)
 * @returns {object|null}
 */
async function searchFlights(originCity, destinationCity, departureDate, adults = 1) {
  if (!process.env.AMADEUS_CLIENT_ID || !process.env.AMADEUS_CLIENT_SECRET) return null;

  const origin = cityToIATA(originCity);
  const dest   = cityToIATA(destinationCity);
  if (!origin || !dest || origin === dest) return null;

  // If no date given, use a date ~6 weeks out (enough for test API to return results)
  const date = departureDate || (() => {
    const d = new Date();
    d.setDate(d.getDate() + 42);
    return d.toISOString().split('T')[0];
  })();

  try {
    const token = await getToken();
    const { data } = await axios.get(`${BASE}/v2/shopping/flight-offers`, {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        originLocationCode:      origin,
        destinationLocationCode: dest,
        departureDate:           date,
        adults:                  1,        // always price per person
        max:                     10,
        currencyCode:            'NGN',
        nonStop:                 false,
      },
      timeout: 10000,
    });

    if (!data.data?.length) return null;

    const AIRLINE_NAMES = {
      P4: 'Air Peace', W3: 'Ibom Air', V5: 'Overland Airways',
      QS: 'Dana Air', RQ: 'Cobalt Air', DN: 'Arik Air',
      ET: 'Ethiopian Airlines', KQ: 'Kenya Airways', QR: 'Qatar Airways',
      EK: 'Emirates', LH: 'Lufthansa', BA: 'British Airways',
    };

    const offers = data.data.map(o => {
      const seg = o.itineraries[0]?.segments || [];
      const code = o.validatingAirlineCodes?.[0];
      return {
        airline:    AIRLINE_NAMES[code] || code,
        price:      Math.round(parseFloat(o.price?.grandTotal || 0)),
        departs:    seg[0]?.departure?.at,
        arrives:    seg.at(-1)?.arrival?.at,
        stops:      seg.length - 1,
        durationMin: parseDuration(o.itineraries[0]?.duration),
      };
    }).sort((a, b) => a.price - b.price);

    const cheapest = offers[0];
    const avg = Math.round(offers.reduce((s, o) => s + o.price, 0) / offers.length);

    return {
      available:       true,
      originCode:      origin,
      destCode:        dest,
      cheapestNGN:     cheapest.price,
      averageNGN:      avg,
      cheapestAirline: cheapest.airline,
      directAvailable: offers.some(o => o.stops === 0),
      offers:          offers.slice(0, 3),
    };
  } catch (err) {
    const msg = err.response?.data?.errors?.[0]?.detail || err.message;
    console.warn('[amadeus]', msg);
    return null;
  }
}

// Parse Amadeus ISO 8601 duration (e.g. "PT1H25M") → minutes
function parseDuration(iso) {
  if (!iso) return null;
  const h = (iso.match(/(\d+)H/) || [])[1] || 0;
  const m = (iso.match(/(\d+)M/) || [])[1] || 0;
  return Number(h) * 60 + Number(m);
}

// ── Format for AI planner prompt ──────────────────────────────────────────────
function formatFlightsForPrompt(result) {
  if (!result) return null;
  const fmtNGN = n => `₦${Number(n).toLocaleString('en-NG')}`;
  const lines = [
    `✈️  Flights available (${result.originCode} → ${result.destCode}):`,
    `   Cheapest: ${fmtNGN(result.cheapestNGN)}/person via ${result.cheapestAirline}`,
    `   Average: ${fmtNGN(result.averageNGN)}/person`,
    `   Direct available: ${result.directAvailable ? 'Yes' : 'No'}`,
  ];
  return lines.join('\n');
}

module.exports = { searchFlights, cityToIATA, formatFlightsForPrompt };
