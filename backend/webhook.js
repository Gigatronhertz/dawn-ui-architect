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
async function processPayment(reference) {
  const result = await verifyPayment(reference);
  if (!result.success) return false;

  // ── Phase 6: web squad payments (participants table) ──────────────────────
  // References starting with WEBSQ- belong to web squad members.
  if (reference.startsWith('WEBSQ-')) {
    const participant = await db.participants.getByRef(reference);
    if (!participant) { console.warn('[processPayment] participant not found for ref', reference); return false; }
    if (participant.paid) return false; // idempotent
    await db.participants.markPaid({ paystack_ref: reference });
    console.log(`[processPayment] web participant ${participant.id} paid for trip ${participant.trip_id}`);
    return true;
  }

  // ── Existing WhatsApp member payment flow ─────────────────────────────────
  const { tripId, phone, amountNGN } = result;
  if (!tripId || !phone) return false;

  // Idempotency: bail if already marked paid
  const member = await db.members.get(tripId, phone);
  if (!member || member.paid) return false;

  await db.members.markPaid({ ref: reference, trip_id: tripId, phone });

  const trip = await db.trips.get(tripId);
  const members = await db.members.byTrip(tripId);
  const paidCount = members.filter((m) => m.paid).length;
  const memberName = member.name || phone;

  await sendText(phone, M.PAYMENT_CONFIRMED_PRIVATE(memberName, trip?.destination, fmtNGN(amountNGN)));

  if (trip?.group_id) {
    await sendText(trip.group_id, M.PAYMENT_CONFIRMED_GROUP(memberName));

    const plan = trip.plan ? JSON.parse(trip.plan) : null;
    const perPerson = plan?.cost_breakdown?.per_person ?? 0;
    await sendText(trip.group_id, M.PAYMENT_GROUP_STATUS(paidCount, trip.squad_size, perPerson));

    if (paidCount >= trip.squad_size) {
      await sendText(trip.group_id, M.PAYMENT_ALL_DONE(trip.destination));
      // TODO: generate real PDF and send as WhatsApp document
      await sendText(trip.group_id, M.PDF_SENT(trip.destination));
      await db.trips.update({
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
router.post('/payment/webhook', async (req, res) => {
  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
    .update(req.rawBody)
    .digest('hex');

  if (hash !== req.headers['x-paystack-signature']) {
    console.warn('[payment/webhook] invalid signature — ignoring');
    return res.sendStatus(400);
  }

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
router.get('/payment/confirm', async (req, res) => {
  const { reference } = req.query;
  if (!reference) return res.redirect('/');

  try {
    await processPayment(reference);
    res.redirect(`/?paid=1`);
  } catch (err) {
    console.error('[payment/confirm]', err.message);
    res.status(500).send('Something went wrong verifying your payment. Please contact support.');
  }
});

module.exports = router;
