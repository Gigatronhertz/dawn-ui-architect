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
  none:   { amount: 0,    label: 'Free' },
  notify: { amount: 1000, label: 'Reminders' },
  escrow: { amount: 3000, label: 'Escrow collection' },
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

/** Does this trip take payments through Karije at all? */
function collects(trip) {
  if (!pandascrow.available()) return true;
  return tripKind(trip) !== 'friend' || (FRIEND_ESCROW && trip.collection_tier === 'escrow');
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
  if (!pandascrow.available() || tripKind(trip) !== 'friend') return true;
  return trip.collection_tier === 'notify' || trip.collection_tier === 'escrow';
}

module.exports = { FRIEND_ESCROW, TIERS, tripKind, collects, escrowed, remindersOn, parseJson };
