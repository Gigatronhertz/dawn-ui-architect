/**
 * Google Maps Platform services
 * All three APIs share one GOOGLE_API_KEY.
 * Enable in Google Cloud Console:
 *   - Geocoding API
 *   - Places API (New)
 *   - Distance Matrix API
 */
const axios = require('axios');

const KEY = () => process.env.GOOGLE_API_KEY;

/**
 * A place's first photo, as our own proxy path rather than a raw Google URL —
 * the actual media fetch happens server-side in the /api/place-photo route so
 * the API key never rides along in an <img src> sent to the browser.
 */
function firstPhotoUrl(place) {
  const name = place.photos?.[0]?.name; // "places/PLACE_ID/photos/PHOTO_ID"
  return name ? `/api/place-photo/${encodeURIComponent(name)}` : null;
}

// ── Geocoding ──────────────────────────────────────────────────────────────────
// Convert a city name to { lat, lng } using the Geocoding API.
async function geocodeCity(city) {
  if (!KEY()) return null;
  try {
    const { data } = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
      params: { address: city, key: KEY() },
      timeout: 5000,
    });
    if (data.status !== 'OK' || !data.results[0]) return null;
    return data.results[0].geometry.location; // { lat, lng }
  } catch (err) {
    console.warn('[geocode]', err.message);
    return null;
  }
}

// ── Distance Matrix ────────────────────────────────────────────────────────────
// Real road distance and driving time between two cities.
async function getRoadDistance(origin, destination) {
  if (!KEY()) return null;
  try {
    const { data } = await axios.get('https://maps.googleapis.com/maps/api/distancematrix/json', {
      params: {
        origins: origin,
        destinations: destination,
        mode: 'driving',
        key: KEY(),
      },
      timeout: 5000,
    });
    const el = data.rows?.[0]?.elements?.[0];
    if (!el || el.status !== 'OK') return null;
    return {
      distanceText: el.distance?.text,       // "680 km"
      durationText: el.duration?.text,       // "7 hours 28 mins"
      distanceKm: Math.round((el.distance?.value || 0) / 1000),
      durationMinutes: Math.round((el.duration?.value || 0) / 60),
    };
  } catch (err) {
    console.warn('[distancematrix]', err.message);
    return null;
  }
}

// ── Places API (New) ───────────────────────────────────────────────────────────
// Text search for places near a location.
async function placesTextSearch(query, lat, lng, radiusMetres = 15000) {
  if (!KEY()) return [];
  try {
    const body = { textQuery: query, maxResultCount: 8 };
    if (lat && lng) {
      body.locationBias = {
        circle: { center: { latitude: lat, longitude: lng }, radius: radiusMetres },
      };
    }
    const { data } = await axios.post(
      'https://places.googleapis.com/v1/places:searchText',
      body,
      {
        headers: {
          'X-Goog-Api-Key': KEY(),
          'X-Goog-FieldMask': [
            'places.id',
            'places.displayName',
            'places.rating',
            'places.userRatingCount',
            'places.priceLevel',
            'places.formattedAddress',
            'places.types',
            'places.internationalPhoneNumber',
            'places.photos',
          ].join(','),
          'Content-Type': 'application/json',
        },
        timeout: 8000,
      }
    );
    return data.places || [];
  } catch (err) {
    console.warn('[places]', err.message);
    return [];
  }
}

// ── Hotel search ───────────────────────────────────────────────────────────────
// Returns real hotels near a destination.
async function searchHotels(destination, lat, lng, maxBudgetPerNightNGN) {
  const raw = await placesTextSearch(`hotels in ${destination}`, lat, lng);
  return raw
    .filter(p => p.rating >= 3.0)
    .slice(0, 5)
    .map(p => ({
      name: p.displayName?.text || 'Unknown Hotel',
      address: p.formattedAddress || '',
      rating: p.rating || null,
      ratingCount: p.userRatingCount || 0,
      priceLevel: p.priceLevel || null,
      phone: p.internationalPhoneNumber || null,
      estimatedNightNGN: priceLevelToNGN(p.priceLevel),
      imageUrl: firstPhotoUrl(p),
    }))
    .filter(h => !maxBudgetPerNightNGN || !h.estimatedNightNGN || h.estimatedNightNGN <= maxBudgetPerNightNGN * 1.5);
}

// ── Holiday rental search ──────────────────────────────────────────────────────
// Searches for shortlets / serviced apartments / vacation rentals.
async function searchHolidayRentals(destination, lat, lng) {
  // Try vacation rental specific terms first, then broaden to serviced apartments
  const raw = await placesTextSearch(
    `shortlet apartment vacation rental serviced apartment in ${destination}`,
    lat,
    lng,
    20000
  );
  return raw
    .slice(0, 5)
    .map(p => ({
      name: p.displayName?.text || 'Unknown Property',
      address: p.formattedAddress || '',
      rating: p.rating || null,
      ratingCount: p.userRatingCount || 0,
      priceLevel: p.priceLevel || null,
      phone: p.internationalPhoneNumber || null,
      type: 'shortlet',
      imageUrl: firstPhotoUrl(p),
    }));
}

// ── Nearby activities ──────────────────────────────────────────────────────────
// Returns real restaurants, attractions, and nightlife near the destination.
async function searchActivities(destination, lat, lng) {
  const [restaurants, attractions, nightlife] = await Promise.all([
    placesTextSearch(`popular restaurants in ${destination}`, lat, lng, 10000),
    placesTextSearch(`tourist attractions in ${destination}`, lat, lng, 20000),
    placesTextSearch(`nightlife bars clubs in ${destination}`, lat, lng, 10000),
  ]);

  const pick = (arr, n) =>
    arr
      .filter(p => p.rating >= 3.5)
      .slice(0, n)
      .map(p => `${p.displayName?.text} (${p.rating}★, ${p.formattedAddress?.split(',')[0]})`);

  return {
    restaurants: pick(restaurants, 4),
    attractions: pick(attractions, 4),
    nightlife: pick(nightlife, 3),
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────────
// Rough Naira estimate per night from Google's price level enum.
function priceLevelToNGN(priceLevel) {
  const map = {
    PRICE_LEVEL_FREE:          0,
    PRICE_LEVEL_INEXPENSIVE:   12000,
    PRICE_LEVEL_MODERATE:      35000,
    PRICE_LEVEL_EXPENSIVE:     80000,
    PRICE_LEVEL_VERY_EXPENSIVE: 200000,
  };
  return map[priceLevel] ?? null;
}

// Format a hotel list into a compact context string for the AI planner.
function formatHotelsForPrompt(hotels) {
  if (!hotels.length) return null;
  return hotels.map(h =>
    `- ${h.name} | ${h.rating ? h.rating + '★' : 'unrated'} | ${h.address?.split(',')[0]} | ${
      h.estimatedNightNGN ? '~₦' + h.estimatedNightNGN.toLocaleString() + '/night' : h.priceLevel || 'price unknown'
    }${h.phone ? ' | ' + h.phone : ''}`
  ).join('\n');
}

function formatRentalsForPrompt(rentals) {
  if (!rentals.length) return null;
  return rentals.map(r =>
    `- ${r.name} | ${r.rating ? r.rating + '★' : 'unrated'} | ${r.address?.split(',')[0]}${r.phone ? ' | ' + r.phone : ''}`
  ).join('\n');
}

function formatActivitiesForPrompt(activities) {
  const parts = [];
  if (activities.restaurants?.length) parts.push(`Restaurants: ${activities.restaurants.join('; ')}`);
  if (activities.attractions?.length) parts.push(`Attractions: ${activities.attractions.join('; ')}`);
  if (activities.nightlife?.length) parts.push(`Nightlife: ${activities.nightlife.join('; ')}`);
  return parts.join('\n') || null;
}

module.exports = {
  geocodeCity,
  getRoadDistance,
  searchHotels,
  searchHolidayRentals,
  searchActivities,
  formatHotelsForPrompt,
  formatRentalsForPrompt,
  formatActivitiesForPrompt,
};
