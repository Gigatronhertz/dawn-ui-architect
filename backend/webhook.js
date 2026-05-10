const { Router } = require('express');
const { verifyPayment } = require('./services/paystack');
const { sendText } = require('./services/whatsapp');
const { routeMessage } = require('./bot/router');
const M = require('./bot/messages');
const db = require('./db/client');

const router = Router();

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
          // Fire and forget — errors logged inside routeMessage
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

// ── Paystack payment confirmation (GET callback) ───────────────────────────────
router.get('/payment/confirm', async (req, res) => {
  const { reference } = req.query;
  if (!reference) return res.redirect('/');

  try {
    const result = await verifyPayment(reference);
    if (!result.success) return res.send('Payment not yet confirmed. Try again in a moment.');

    const { tripId, phone } = result;
    if (!tripId || !phone) return res.send('Payment received. Thank you!');

    // Mark member as paid
    db.members.markPaid.run({ ref: reference, trip_id: tripId, phone });

    const trip = db.trips.get.get(tripId);
    const members = db.members.byTrip.all(tripId);
    const paidCount = members.filter((m) => m.paid).length;
    const totalCount = members.length;

    // Notify group
    if (trip?.group_id) {
      const memberName = members.find((m) => m.phone === phone)?.name || phone;
      await sendText(trip.group_id, M.PAYMENT_CONFIRMED_GROUP(memberName));

      // If everyone has paid, celebrate and send offline PDF prompt
      if (paidCount >= totalCount && totalCount >= trip.squad_size) {
        await sendText(trip.group_id, M.PAYMENT_ALL_DONE(trip.destination));
        // TODO: generate and send actual PDF via WhatsApp document message
        await sendText(trip.group_id, M.PDF_SENT(trip.destination));
        db.trips.update.run({
          id: tripId, status: 'active',
          origin: null, destination: null, budget: null, days: null, squad_size: null,
          accommodation: null, date_flexibility: null, specific_dates: null,
          dealbreakers: null, plan: null, selected_date: null, selected_hotel: null, group_id: null,
        });
      }
    }

    // Redirect payer to a simple confirmation page
    res.redirect(`/?paid=1&trip=${tripId}`);
  } catch (err) {
    console.error('[payment/confirm]', err.message);
    res.status(500).send('Something went wrong verifying payment. Contact support.');
  }
});

// ── Paystack webhook (for server-side payment events) ─────────────────────────
router.post('/payment/webhook', async (req, res) => {
  // Verify the Paystack signature
  const crypto = require('crypto');
  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (hash !== req.headers['x-paystack-signature']) return res.sendStatus(400);
  res.sendStatus(200);

  const { event, data } = req.body;
  if (event !== 'charge.success') return;

  const reference = data.reference;
  const result = await verifyPayment(reference).catch(() => null);
  if (!result?.success) return;

  const { tripId, phone } = result;
  if (!tripId || !phone) return;

  db.members.markPaid.run({ ref: reference, trip_id: tripId, phone });

  const trip = db.trips.get.get(tripId);
  const members = db.members.byTrip.all(tripId);
  const paidCount = members.filter((m) => m.paid).length;

  if (trip?.group_id) {
    const memberName = members.find((m) => m.phone === phone)?.name || phone;
    await sendText(trip.group_id, M.PAYMENT_CONFIRMED_GROUP(memberName));

    if (paidCount >= trip.squad_size) {
      await sendText(trip.group_id, M.PAYMENT_ALL_DONE(trip.destination));
      await sendText(trip.group_id, M.PDF_SENT(trip.destination));
    }
  }
});

module.exports = router;
