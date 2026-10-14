/**
 * Premium features — locked for now.
 *
 * Karije is free while in beta. Paid features (AI drafting/suggestions, AI
 * plan packs, pay-monthly instalments, the Pro money/bookkeeping views, Pro
 * subscription billing) are switched off here as well as greyed out in the
 * UI, so they can't be reached by calling the API directly.
 *
 * Set PREMIUM_LOCKED=false to unlock everything (the frontend has a matching
 * VITE_PREMIUM_LOCKED switch).
 */
const LOCKED = process.env.PREMIUM_LOCKED !== 'false';

/** Express middleware: refuse the request while premium is locked. */
function premiumOnly(req, res, next) {
  if (!LOCKED) return next();
  return res.status(403).json({ code: 'PREMIUM', error: 'This is a Premium feature — coming soon.' });
}

module.exports = { LOCKED, premiumOnly };
