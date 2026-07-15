const crypto = require('crypto');
const { Router } = require('express');
const { verifyPayment } = require('./services/paystack');
const { sendText } = require('./services/whatsapp');
const { routeMessage } = require('./bot/router');
const M = require('./bot/messages');
const db = require('./db/client');

const router = Router();

const fmtNGN = (n) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(n);

// ── WhatsApp webhook verification (GET) ───────────────────────────────────────
router.get('/webhook', (req, res) => {
  const { 'hub.mode': mode, 'hub.challenge': challenge, 'hub.verify_token': token } = req.query;
  if (mode === 'subscribe' && token === process.env.WA_VERIFY_TOKEN) {
    console.log('[webhook] verified ✓');
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

// ── WhatsApp incoming messages (POST) ─────────────────────────────────────────
router.post('/webhook', (req, res) => {
  // Always respond 200 immediately — Meta will retry if we don't
  res.sendStatus(200);

  try {
    const body = req.body;
    if (body.object !== 'whatsapp_business_account') return;

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value;
        const messages = value?.messages || [];
        const contacts = value?.contacts || [];
        const metadata = value?.metadata;

        for (const message of messages) {
          const contact = contacts.find((c) => c.wa_id === message.from);
          routeMessage(message, contact, metadata).catch((err) => {
            console.error('[router]', err.message);
          });
        }
      }
    }
  } catch (err) {
    console.error('[webhook] parse error:', err.message);
  }
});

// ── Shared payment processing logic ───────────────────────────────────────────
// Called by both the browser redirect and the server-to-server webhook.
// Returns true if the payment was newly processed, false if already handled.
async function processPayment(reference) {
  const result = await verifyPayment(reference);
  if (!result.success) return false;

  const { tripId, phone, amountNGN } = result;
  if (!tripId || !phone) return false;

  // Idempotency: bail out if already marked paid so we don't double-notify
  const member = db.members.get.get(tripId, phone);
  if (!member || member.paid) return false;

  db.members.markPaid.run({ ref: reference, trip_id: tripId, phone });

  const trip = db.trips.get.get(tripId);
  const members = db.members.byTrip.all(tripId);
  const paidCount = members.filter((m) => m.paid).length;
  const memberName = member.name || phone;

  // DM the payer their personal confirmation
  await sendText(phone, M.PAYMENT_CONFIRMED_PRIVATE(memberName, trip?.destination, fmtNGN(amountNGN)));

  // Notify the group
  if (trip?.group_id) {
    await sendText(trip.group_id, M.PAYMENT_CONFIRMED_GROUP(memberName));

    // Updated tracker
    const plan = trip.plan ? JSON.parse(trip.plan) : null;
    const perPerson = plan?.cost_breakdown?.per_person ?? 0;
    await sendText(trip.group_id, M.PAYMENT_GROUP_STATUS(paidCount, trip.squad_size, perPerson));

    // Everyone paid — celebrate and send itinerary
    if (paidCount >= trip.squad_size) {
      await sendText(trip.group_id, M.PAYMENT_ALL_DONE(trip.destination));
      // TODO: generate real PDF and send as WhatsApp document
      await sendText(trip.group_id, M.PDF_SENT(trip.destination));
      db.trips.update.run({
        id: tripId, status: 'active',
        origin: null, destination: null, budget: null, days: null, squad_size: null,
        accommodation: null, date_flexibility: null, specific_dates: null,
        dealbreakers: null, plan: null, selected_date: null, selected_hotel: null, group_id: null,
      });
    }
  }

  return true;
}

// ── Paystack server-to-server webhook (POST) ──────────────────────────────────
// This is the reliable path. Configure this URL in your Paystack dashboard under
// Settings → API Keys & Webhooks → Webhook URL.
// Paystack retries failed webhooks for up to 72 hours, so this handles cases
// where the user closes their browser before the redirect fires.
router.post('/payment/webhook', async (req, res) => {
  // Verify HMAC-SHA512 signature using the raw request body (not re-serialised JSON).
  // req.rawBody is set by the express.json({ verify }) middleware in index.js.
  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
    .update(req.rawBody)
    .digest('hex');

  if (hash !== req.headers['x-paystack-signature']) {
    console.warn('[payment/webhook] invalid signature — ignoring');
    return res.sendStatus(400);
  }

  // Acknowledge immediately — Paystack marks the delivery failed if we take >30s
  res.sendStatus(200);

  const { event, data } = req.body;
  if (event !== 'charge.success') return;

  try {
    await processPayment(data.reference);
  } catch (err) {
    console.error('[payment/webhook]', err.message);
  }
});

// ── Paystack browser redirect callback (GET) ───────────────────────────────────
// Paystack redirects the user here after they finish on the payment page.
// This is the fallback path — the webhook above is more reliable, but this
// handles cases where the webhook hasn't fired yet when the user lands here.
router.get('/payment/confirm', async (req, res) => {
  const { reference } = req.query;
  if (!reference) return res.redirect('/');

  try {
    await processPayment(reference);
    // Redirect regardless — the idempotency check inside processPayment
    // means double-firing is safe even if the webhook already ran.
    res.redirect(`/?paid=1`);
  } catch (err) {
    console.error('[payment/confirm]', err.message);
    res.status(500).send('Something went wrong verifying your payment. Please contact support.');
  }
});

module.exports = router;
