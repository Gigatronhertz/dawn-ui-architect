const crypto = require('crypto');
const { Router } = require('express');
const { verifyPayment, initializeWebPayment } = require('./services/paystack');
const { sendPaymentReceiptEmail } = require('./services/email');
const db = require('./db/client');

const router = Router();

// ── Pay now — a link that can't go stale ──────────────────────────────────────
//
// Reminder emails point here rather than at a checkout URL. A reminder can be
// opened five days after it was sent, and a Paystack link minted at send time
// may not still be good by then; this mints one at the moment it's clicked.
//
// It also means the email carries no frontend URL at all, which is what put a
// localhost link in front of people in the first place.
router.get('/pay/:participantId', async (req, res) => {
  const frontendUrl = (process.env.FRONTEND_URL || 'https://karije.com').replace(/\/$/, '');

  try {
    const participant = await db.participants.getById(req.params.participantId);
    if (!participant) return res.redirect(frontendUrl);

    const planUrl = `${frontendUrl}/plan/${participant.trip_id}`;

    // Never send someone to pay for something they've already paid for.
    if (participant.paid) return res.redirect(`${planUrl}?paid=1`);

    // Paystack can't raise a transaction without an email address, and the
    // amount comes off the plan (or, for an installment payer, off their own
    // next-due slice). Missing either, the plan page handles it — that's the
    // form that asks.
    const trip = await db.trips.get(participant.trip_id);
    const plan = trip?.plan ? JSON.parse(trip.plan) : null;
    const { targetAmount, chargeAmount } = await db.participants.computeCharge(
      participant, plan?.cost_breakdown?.per_person, { payInFull: req.query.full === '1' }
    );
    if (!participant.email || !chargeAmount || chargeAmount <= 0) return res.redirect(planUrl);

    const { reference, authorization_url } = await initializeWebPayment({
      tripId:        participant.trip_id,
      participantId: participant.id,
      email:         participant.email,
      name:          participant.name,
      amountNGN:     chargeAmount,
      callbackUrl:   `${planUrl}?paid=1`,
    });

    await db.participants.updatePayment({
      id:           participant.id,
      email:        participant.email,
      amount:       targetAmount,
      paystack_ref: reference,
      paystack_url: authorization_url,
    });

    return res.redirect(authorization_url);
  } catch (err) {
    // A dead-end link is bad; a stack trace in the browser is worse. Send them
    // somewhere real and leave the reason in the logs.
    console.error('[pay]', err.message);
    return res.redirect(frontendUrl);
  }
});

// ── Shared payment processing logic ───────────────────────────────────────────
async function processPayment(reference) {
  const result = await verifyPayment(reference);
  if (!result.success) return false;

  // ── Phase 6: web squad payments (participants table) ──────────────────────
  // References starting with WEBSQ- belong to web squad members.
  if (reference.startsWith('WEBSQ-')) {
    // The reference stored on the row is only ever the most recent one, and
    // someone can pay from an older reminder's link. Fall back to the
    // participant Paystack carries in the transaction metadata — without it the
    // money arrives and nobody gets credited for it.
    const participant =
      (await db.participants.getByRef(reference)) ||
      (result.participantId ? await db.participants.getById(result.participantId) : null);
    if (!participant) { console.warn('[processPayment] participant not found for ref', reference); return false; }

    // Idempotency lives on the reference now, not a boolean — a participant
    // on an installment plan legitimately pays more than once, each under a
    // fresh reference, so "already paid" can no longer be the only guard.
    const { credited, paid } = await db.participants.recordPayment({
      id:       participant.id,
      tripId:   participant.trip_id,
      amount:   result.amountNGN,
      reference,
    });
    if (!credited) return false; // this reference was already recorded
    console.log(`[processPayment] web participant ${participant.id} paid ${result.amountNGN} for trip ${participant.trip_id}${paid ? ' — fully paid' : ' — installment recorded'}`);

    // Receipt. Non-blocking — a mail failure must never make a paid person
    // look unpaid, and the payment is already recorded either way.
    ;(async () => {
      try {
        const trip = await db.trips.get(participant.trip_id);
        const plan = trip?.plan ? JSON.parse(trip.plan) : null;
        await sendPaymentReceiptEmail({
          to:        participant.email,
          name:      participant.name,
          tripName:  plan?.curated?.name || trip?.destination || 'your trip',
          // The amount actually charged this time, not the full target — for
          // an installment payer these differ, and the receipt should say
          // what just happened, not the whole plan's price.
          amount:    result.amountNGN || 0,
          // Falling back to '' produced "/plan/abc" — a relative link, which is
          // meaningless in an email client.
          link:      `${(process.env.FRONTEND_URL || 'https://karije.com').replace(/\/$/, '')}/plan/${participant.trip_id}`,
          reference,
        });
      } catch (err) {
        console.warn('[processPayment] receipt email failed:', err.message);
      }
    })();

    return true;
  }

  // ── Legacy WhatsApp-group member payment flow ─────────────────────────────
  // The group bot that sent these notifications is retired (its outbound
  // channel, Zavu, was removed). Crediting the payment still happens — money
  // is never dropped on the floor — but there is no one left to notify.
  const { tripId, phone } = result;
  if (!tripId || !phone) return false;

  // Idempotency: bail if already marked paid
  const member = await db.members.get(tripId, phone);
  if (!member || member.paid) return false;

  await db.members.markPaid({ ref: reference, trip_id: tripId, phone });

  const trip = await db.trips.get(tripId);
  const members = await db.members.byTrip(tripId);
  const paidCount = members.filter((m) => m.paid).length;

  if (trip?.group_id && paidCount >= trip.squad_size) {
    await db.trips.update({
      id: tripId, status: 'active',
      origin: null, destination: null, budget: null, days: null, squad_size: null,
      accommodation: null, date_flexibility: null, specific_dates: null,
      dealbreakers: null, plan: null, selected_date: null, selected_hotel: null, group_id: null,
    });
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

// The payment-status endpoint in routes/api.js needs this too: a browser coming
// back from Paystack shouldn't be stuck waiting on a webhook that may never
// arrive. Shared rather than reimplemented so crediting a payment, sending the
// receipt and staying idempotent happen in exactly one place.
module.exports.processPayment = processPayment;
