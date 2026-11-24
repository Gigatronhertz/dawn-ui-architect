/**
 * What a trip is, and what Karije does for it.
 *
 *   agency  — an agency's own trip; it pays the Pro subscription
 *   curated — Karije's own trip
 *   friend  — a squad's trip; the organiser picks an option (TIERS)
 *
 * Until Pandascrow is configured every trip keeps the Paystack behaviour it
 * has always had, so none of the friend-trip gating applies yet.
 */
const pandascrow = require('./pandascrow');

const TIERS = {
  none:    { amount: 0,    label: 'Free' },
  notify:  { amount: 1000, label: 'Reminders' },
  escrow:  { amount: 3000, label: 'Escrow collection' },
  // Karije books the trip and sells it to the friends at a quoted price; its
  // margin is in that price, so there's no organiser fee.
  managed: { amount: 0,    label: 'Karije books it' },
};

function parseJson(s) { try { return s ? JSON.parse(s) : null; } catch { return null; } }

function tripKind(trip) {
  if (trip.agent_id) return 'agency';
  const intake = parseJson(trip.intake_json);
  if (trip.status === 'curated' || intake?.curatedId) return 'curated';
  return 'friend';
}

/**
 * Friend-trip escrow is switched off: Karije sells agency and curated trips
 * as the merchant of record, but doesn't collect friends' shares for each
 * other (see the Terms, section 8). Flip this to bring the option back.
 */
const FRIEND_ESCROW = false;

/** A friend trip Karije has priced and the organiser has accepted: Karije sells it. */
function managedAccepted(trip) {
  return trip.collection_tier === 'managed' && trip.managed_status === 'accepted' && Number(trip.managed_price) > 0;
}

/**
 * Does this trip take payments through Karije at all? Agency and Karije trips
 * do: Karije sells them. A friend trip only does once Karije is booking it —
 * collecting friends' shares to pass on to the organiser is not something
 * Karije does (Terms, section 8).
 */
function collects(trip) {
  if (tripKind(trip) !== 'friend') return true;
  if (managedAccepted(trip)) return true;
  return pandascrow.available() && FRIEND_ESCROW && trip.collection_tier === 'escrow';
}

/** What one traveller pays: Karije's quoted price on a trip it books, else the plan's. */
function perPersonPrice(trip, plan) {
  if (managedAccepted(trip)) return Number(trip.managed_price);
  const p = plan || parseJson(trip.plan);
  return Number(p?.cost_breakdown?.per_person) || 0;
}

/**
 * Is money for this trip held in Pandascrow escrow? Pandascrow needs a phone
 * number for everyone on an escrow — each traveller paying and whoever is paid.
 */
function escrowed(trip) {
  return pandascrow.available() && collects(trip);
}

/** Does Karije chase this trip's travellers? */
function remindersOn(trip) {
  if (tripKind(trip) !== 'friend') return true;
  return trip.collection_tier === 'notify' || trip.collection_tier === 'escrow' || managedAccepted(trip);
}

module.exports = { FRIEND_ESCROW, TIERS, tripKind, collects, managedAccepted, perPersonPrice, escrowed, remindersOn, parseJson };
