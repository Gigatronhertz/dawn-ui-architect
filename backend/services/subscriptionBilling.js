/**
 * Karije's own recurring charge for the ₦10,000/month Pro subscription.
 *
 * Rather than Paystack's Subscriptions/Plans API and its own webhook event
 * zoo, this reuses a reusable card authorization — captured once via
 * POST /api/pro/billing/setup — and charges it again directly via
 * charge_authorization. Same hourly-tick cron shape as
 * services/installmentReminders.js, so Karije's own cron decides when to
 * charge and how to handle failure, one mental model rather than two.
 *
 * A lapsed subscription only ever delists a trip from the public catalog
 * (GET /api/listings, GET /api/agencies) — it never touches a trip's
 * collected money, payments in flight, or payouts. That's a fully separate
 * system and stays untouched by anything here.
 */
const db = require('../db/client');
const paystack = require('./paystack');
const { sendSubscriptionPaymentFailedEmail } = require('./email');

const HOUR = 3600;
const SUBSCRIPTION_FEE_NGN = Number(process.env.PRO_SUBSCRIPTION_FEE || 10000);

/** Charges one agency's saved card and records the outcome either way. */
async function chargeOne(agent) {
  if (!agent.email || !agent.subscription_authorization_code) {
    // Shouldn't happen — both are set together in db.agents.activateSubscription
    // — but a due agency missing either can't be charged, so skip rather than crash.
    console.warn(`[subscriptionBilling] agent ${agent.id} due but missing email/authorization — skipping`);
    return;
  }

  try {
    const result = await paystack.chargeAuthorization({
      agentId:           agent.id,
      authorizationCode: agent.subscription_authorization_code,
      email:             agent.email,
      amountNGN:         SUBSCRIPTION_FEE_NGN,
    });

    if (result.success) {
      // Also idempotent against the async charge.success webhook arriving
      // for this exact reference — see db.agents.creditSubscriptionCharge.
      await db.agents.creditSubscriptionCharge({
        agentId:           agent.id,
        authorizationCode: agent.subscription_authorization_code,
        amount:            SUBSCRIPTION_FEE_NGN,
        reference:         result.reference,
      });
      console.log(`[subscriptionBilling] charged agent ${agent.id} ₦${SUBSCRIPTION_FEE_NGN}`);
    } else {
      await handleFailure(agent, result.gatewayResponse || 'declined');
    }
  } catch (err) {
    await handleFailure(agent, err.message);
  }
}

async function handleFailure(agent, reason) {
  const { attempts, suspended } = await db.agents.markSubscriptionFailed(agent.id);
  console.warn(
    `[subscriptionBilling] charge failed for agent ${agent.id} ` +
    `(attempt ${attempts}${suspended ? ', suspended — delisted' : ', will retry'}): ${reason}`
  );
  try {
    await sendSubscriptionPaymentFailedEmail({
      to: agent.email, agencyName: agent.agency_name, attempts, suspended,
    });
  } catch (err) {
    console.warn(`[subscriptionBilling] failure email failed for agent ${agent.id}: ${err.message}`);
  }
}

/** One pass over due subscriptions. Safe to call repeatedly. */
async function runOnce() {
  const due = await db.agents.dueSubscriptions();
  if (due.length === 0) return { checked: 0 };
  for (const agent of due) await chargeOne(agent);
  console.log(`[subscriptionBilling] ${due.length} due, processed`);
  return { checked: due.length };
}

/** Start the background loop — hourly, same as the other two cron loops. */
function start({ intervalMs = HOUR * 1000 } = {}) {
  const tick = () => runOnce().catch(err => console.error('[subscriptionBilling]', err.message));
  setTimeout(tick, 60_000).unref?.();
  const timer = setInterval(tick, intervalMs);
  timer.unref?.();
  console.log(`[subscriptionBilling] running every ${Math.round(intervalMs / 60000)} min`);
  return timer;
}

module.exports = { start, runOnce, chargeOne, SUBSCRIPTION_FEE_NGN };
