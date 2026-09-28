/**
 * Who pays for an AI trip plan, and how.
 *
 * Everyone's first plan is free — no account needed, keyed on the email the
 * planner already asks for. After that it's a one-off pack: ₦500 for 3 plans,
 * no monthly fee, no expiry. Pro agencies generate free.
 */
const db = require('../db/client');

const PACK_PRICE_NGN = 500;
const PACK_CREDITS   = 3;

/** Pro = an agency whose subscription hasn't lapsed. */
async function isProUser(user) {
  if (!user) return false;
  let agent = await db.agents.getByUser(user.uid);
  if (!agent && user.email) agent = await db.agents.getByEmail(user.email);
  return !!agent && agent.subscription_status !== 'suspended';
}

/**
 * Decides how a new plan is paid for.
 * @returns {{ kind: 'pro'|'free'|'credit' } | { denied: 'SIGN_IN_REQUIRED'|'NO_CREDITS' }}
 */
async function decide({ user, email }) {
  if (await isProUser(user)) return { kind: 'pro' };

  const who = { userId: user?.uid || null, email: (user?.email || email || '').toLowerCase() || null };
  if (!(await db.aiCredits.hasUsedFree(who))) return { kind: 'free' };

  if (!user) return { denied: 'SIGN_IN_REQUIRED' };
  if ((await db.aiCredits.balance(user.uid)) > 0) return { kind: 'credit' };
  return { denied: 'NO_CREDITS' };
}

/** What the planner shows someone before they generate. */
async function status(user) {
  const isPro = await isProUser(user);
  const credits = user ? await db.aiCredits.balance(user.uid) : 0;
  const freeUsed = await db.aiCredits.hasUsedFree({
    userId: user?.uid || null, email: user?.email?.toLowerCase() || null,
  });
  return { isPro, credits, freeUsed, packPrice: PACK_PRICE_NGN, packCredits: PACK_CREDITS };
}

module.exports = { decide, status, isProUser, PACK_PRICE_NGN, PACK_CREDITS };
