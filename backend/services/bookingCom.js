/**
 * Booking.com via RapidAPI
 * Real hotel + apartment/shortlet prices with live availability.
 * Complements Google Places (which gives ratings/venues but not always prices).
 *
 * Register at: https://rapidapi.com/apidojo/api/booking
 * Free tier: 500 requests/month
 *
 * Env var required:
 *   RAPIDAPI_KEY
 */
const axios = require('axios');

const HOST = 'booking-com.p.rapidapi.com';

function headers() {
  return {
    'X-RapidAPI-Key':  process.env.RAPIDAPI_KEY,
    'X-RapidAPI-Host': HOST,
  };
}

function enabled() {
  return !!process.env.RAPIDAPI_KEY;
}

// ── Step 1: resolve city name → Booking.com dest_id ───────────────────────────
async function resolveDestination(cityName) {
  if (!enabled()) return null;
  try {
    const { data } = await axios.get(`https://${HOST}/v1/hotels/locations`, {
      headers: headers(),
      params: { name: cityName, locale: 'en-gb' },
      timeout: 6000,
    });
    // Prefer city-type results over regions/countries
    const city = data.find(d => d.dest_type === 'city') || data[0];
    if (!city) return null;
    return { dest_id: city.dest_id, dest_type: city.dest_type, label: city.label };
  } catch (err) {
    console.warn('[booking/resolve]', err.message);
    return null;
  }
}

// ── Step 2: search for properties ─────────────────────────────────────────────
async function searchProperties(dest_id, dest_type, checkinDate, checkoutDate, adults, propertyTypeFilter) {
  if (!enabled()) return [];
  try {
    const params = {
      dest_id,
      dest_type,
      checkin_date:   checkinDate,
      checkout_date:  checkoutDate,
      adults_number:  String(adults || 1),
      room_number:    '1',
      units:          'metric',
      locale:         'en-gb',
      currency:       'NGN',
      order_by:       'popularity',
      filter_by_currency: 'NGN',
      page_number:    '0',
    };
    if (propertyTypeFilter) {
      // Booking.com property type IDs: 201=Apartments, 203=Holiday homes, 208=Villas, 204=Hostels
      params.categories_filter_ids = propertyTypeFilter;
    }

    const { data } = await axios.get(`https://${HOST}/v1/hotels/search`, {
      headers: headers(),
      params,
      timeout: 10000,
    });

    return (data.result || []).slice(0, 8).map(h => ({
      id:           h.hotel_id,
      name:         h.hotel_name || h.hotel_name_trans,
      rating:       h.review_score ? parseFloat(h.review_score) : null,
      ratingWord:   h.review_score_word,
      ratingCount:  h.review_nr,
      address:      [h.address, h.city].filter(Boolean).join(', '),
      pricePerNight: h.min_total_price
        ? Math.round(h.min_total_price / (h.lengthofstay || 1))
        : null,
      totalPrice:   h.min_total_price ? Math.round(h.min_total_price) : null,
      currency:     h.currency_code || 'NGN',
      propertyType: h.accommodation_type_name,
      url:          h.url,
      stars:        h.class || null,
      freeCancellation: h.is_free_cancellable,
      breakfastIncluded: h.is_no_prepayment_block,
    }));
  } catch (err) {
    console.warn('[booking/search]', err.response?.data?.message || err.message);
    return [];
  }
}

// ── Public functions ───────────────────────────────────────────────────────────

// Returns hotels with real NGN prices
async function searchHotels(cityName, checkinDate, checkoutDate, adults, maxBudgetPerNight) {
  const dest = await resolveDestination(cityName);
  if (!dest) return [];
  const results = await searchProperties(dest.dest_id, dest.dest_type, checkinDate, checkoutDate, adults);
  return results
    .filter(h => !maxBudgetPerNight || !h.pricePerNight || h.pricePerNight <= maxBudgetPerNight * 2)
    .sort((a, b) => (a.pricePerNight || 999999) - (b.pricePerNight || 999999))
    .slice(0, 5);
}

// Returns apartments, holiday homes, and shortlets
async function searchApartments(cityName, checkinDate, checkoutDate, adults) {
  const dest = await resolveDestination(cityName);
  if (!dest) return [];
  // 201=Apartments, 203=Holiday homes, 208=Villas
  const results = await searchProperties(
    dest.dest_id, dest.dest_type,
    checkinDate, checkoutDate, adults,
    'class::201,class::203,class::208'
  );
  return results.slice(0, 5);
}

// ── Date helpers ───────────────────────────────────────────────────────────────
// Generate checkin/checkout dates from intake. Falls back to 6 weeks out.
function getDates(intake) {
  const match = (intake.specific_dates || '').match(/(\d{4}-\d{2}-\d{2})/g);
  if (match && match.length >= 1) {
    const checkin = match[0];
    const d = new Date(checkin);
    d.setDate(d.getDate() + (intake.days || 2));
    return { checkin, checkout: d.toISOString().split('T')[0] };
  }
  // No dates — use a reference window 6 weeks out for pricing
  const checkin = new Date();
  checkin.setDate(checkin.getDate() + 42);
  const checkout = new Date(checkin);
  checkout.setDate(checkout.getDate() + (intake.days || 2));
  return {
    checkin:  checkin.toISOString().split('T')[0],
    checkout: checkout.toISOString().split('T')[0],
  };
}

// ── Format for AI planner prompt ──────────────────────────────────────────────
function formatBookingHotelsForPrompt(hotels, nights) {
  if (!hotels.length) return null;
  const fmtNGN = n => n ? `₦${Number(n).toLocaleString('en-NG')}` : 'price TBC';
  return hotels.map(h => {
    const parts = [`- ${h.name}`];
    if (h.rating) parts.push(`${h.rating}/10`);
    if (h.stars) parts.push(`${h.stars}★`);
    if (h.pricePerNight) parts.push(`${fmtNGN(h.pricePerNight)}/night`);
    if (h.totalPrice && nights) parts.push(`(${fmtNGN(h.totalPrice)} total for ${nights} nights)`);
    if (h.address) parts.push(h.address.split(',')[0]);
    if (h.propertyType) parts.push(h.propertyType);
    if (h.freeCancellation) parts.push('free cancellation');
    return parts.join(' | ');
  }).join('\n');
}

module.exports = {
  searchHotels,
  searchApartments,
  getDates,
  formatBookingHotelsForPrompt,
};
