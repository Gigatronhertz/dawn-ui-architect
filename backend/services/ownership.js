/**
 * Who may act on a trip, and where a sign-in may send someone.
 *
 * A trip planned before signing in has no owner yet. Its creator is handed a
 * private owner key when the trip is made (kept in their browser), and that
 * key — not knowing the trip id, which is in every share link — is what lets
 * them attach the trip to their account or change it later.
 */
const crypto = require('crypto');
const db = require('../db/client');

function newOwnerKey() {
  return crypto.randomBytes(24).toString('hex');
}

function keyMatches(trip, ownerKey) {
  if (!trip?.owner_key || typeof ownerKey !== 'string' || ownerKey.length !== trip.owner_key.length) return false;
  return crypto.timingSafeEqual(Buffer.from(ownerKey), Buffer.from(trip.owner_key));
}

/** The trip's creator: its signed-in owner, or whoever holds its owner key. */
function isCreator(trip, { user, ownerKey } = {}) {
  if (!trip) return false;
  if (trip.user_id) return !!user && trip.user_id === user.uid;
  return keyMatches(trip, ownerKey);
}

/**
 * Attach an ownerless trip to a user, but only for the holder of its owner
 * key. Re-attaching a trip the user already owns is a no-op success.
 */
async function linkTrip({ tripId, uid, ownerKey }) {
  const trip = tripId ? await db.trips.get(tripId) : null;
  if (!trip) return { ok: false, reason: 'not_found' };
  if (trip.user_id === uid) return { ok: true, claimed: false };
  if (trip.user_id) return { ok: false, reason: 'owned' };
  if (!keyMatches(trip, ownerKey)) return { ok: false, reason: 'forbidden' };
  const n = await db.exec('UPDATE trips SET user_id = ? WHERE id = ? AND user_id IS NULL', [uid, trip.id]);
  return n ? { ok: true, claimed: true } : { ok: false, reason: 'owned' };
}

/**
 * Where a sign-in may send someone afterwards: a path on Karije's own site,
 * never another site. The session token is appended to this URL, so anything
 * else would hand it to whoever controls that site.
 */
function safeRedirect(redirect, frontendUrl) {
  const fe = String(frontendUrl).replace(/\/$/, '');
  const fallback = `${fe}/my-plans`;
  if (typeof redirect !== 'string' || !redirect) return fallback;
  const r = redirect.trim();
  if (r.startsWith('/') && !r.startsWith('//') && !r.startsWith('/\\')) return `${fe}${r}`;
  try {
    const u = new URL(r);
    if (u.origin === new URL(fe).origin) return u.toString();
  } catch { /* not a URL */ }
  return fallback;
}

module.exports = { newOwnerKey, isCreator, linkTrip, safeRedirect, keyMatches };
