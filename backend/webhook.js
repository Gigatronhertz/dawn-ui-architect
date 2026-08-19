const crypto = require('crypto');
const { Router } = require('express');
const { verifyPayment } = require('./services/paystack');
const { sendText } = require('./services/whatsapp');
const { sendPaymentReceiptEmail } = require('./services/email');
const { routeMessage } = require('./bot/router');
const M = require('./bot/messages');
const db = require('./db/client');

const router = Router();

const fmtNGN = (n) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(n);

// ── Zavu inbound webhook ──────────────────────────────────────────────────────
//
// Outbound moved to Zavu in the previous commit; this is the other half.
// Zavu has no GET challenge handshake — you register the URL against a sender
// in the dashboard and they POST events straight to it — so the old
// hub.verify_token route is gone rather than left to rot.
//
// Two things worth knowing before touching this:
//
//  1. The signature is the only thing standing between a stranger and the bot.
//     An unsigned POST here can drive any conversation flow, so verification
//     fails closed: no secret configured means no messages get through.
//
//  2. Zavu speaks in 1:1 conversations. Meta's group/system events have no
//     equivalent, so router.js's `system` branch — the "someone added the bot
//     to the squad group" path — can no longer fire. See the note by
//     toRouterMessage below.

const SIGNATURE_HEADER = 'x-zavu-signature';
const MAX_AGE_S  = 300;  // reject anything signed more than 5 minutes ago
const MAX_SKEW_S = 60;   // …or more than a minute in the future

/** `t=1786113454,v1=52a5…,v2=b4b2…` → `{ t, v1, v2 }`. */
function parseSignatureHeader(header) {
  const parts = {};
  for (const piece of String(header || '').split(',')) {
    const i = piece.indexOf('=');
    if (i > 0) parts[piece.slice(0, i).trim()] = piece.slice(i + 1).trim();
  }
  return parts;
}

/**
 * HMAC-SHA256 over the exact bytes Zavu signed.
 *
 * v2 signs `{timestamp}.{body}`, v1 signed the body alone. Both may appear in
 * one header while an account migrates, so prefer v2 and accept v1 — the same
 * code works before, during and after the move.
 */
function verifySignature(req) {
  const secret = process.env.ZAVU_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[webhook] ZAVU_WEBHOOK_SECRET not set — rejecting. Copy the sender\'s webhook secret from the Zavu dashboard.');
    return false;
  }

  const parts = parseSignatureHeader(req.headers[SIGNATURE_HEADER]);
  const received = parts.v2 || parts.v1;
  if (!received || !parts.t) {
    console.warn('[webhook] missing or malformed signature header');
    return false;
  }

  // Replay window. Without this a captured request stays valid forever.
  const age = Math.floor(Date.now() / 1000) - Number(parts.t);
  if (!Number.isFinite(age) || age > MAX_AGE_S || age < -MAX_SKEW_S) {
    console.warn(`[webhook] signature timestamp out of tolerance (${age}s)`);
    return false;
  }

  const signed = parts.v2 ? `${parts.t}.${req.rawBody}` : req.rawBody;
  const expected = crypto.createHmac('sha256', secret).update(signed).digest('hex');

  // Buffer.from silently truncates invalid hex, so compare lengths first —
  // timingSafeEqual throws on a mismatch.
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(received, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * Zavu retries a delivery five times if we ever fail to ack, and a restart
 * mid-handler is exactly when that happens. Replaying an inbound message
 * re-runs a whole conversation step, so drop ids we have already handled.
 */
const seenMessages = new Map();
const SEEN_LIMIT = 500;

function firstTimeSeeing(messageId) {
  if (!messageId) return true;               // nothing to key on — let it through
  if (seenMessages.has(messageId)) return false;
  seenMessages.set(messageId, Date.now());
  if (seenMessages.size > SEEN_LIMIT) {
    seenMessages.delete(seenMessages.keys().next().value);  // oldest first
  }
  return true;
}

/**
 * Zavu's event.data → the message shape bot/router.js already reads.
 *
 * The router and every flow under bot/ were written against Meta's payload.
 * Translating once here keeps the provider swap to the two files that talk to
 * the provider, exactly as the outbound change did — the alternative is
 * rewriting six flow files to gain nothing.
 *
 * Not translatable: `type: 'system'`. That branch handles the bot being added
 * to a WhatsApp group, and Zavu has no group concept or membership event, so
 * nothing will produce it any more.
 */
function toRouterMessage(d) {
  const reply = d.content?.interactiveReply;

  // Button and list taps are how squads vote.
  if (reply) {
    const slot = reply.type === 'list_reply' ? 'list_reply' : 'button_reply';
    return {
      from: d.from,
      id: d.messageId,
      type: 'interactive',
      interactive: { [slot]: { id: reply.id, title: reply.title } },
    };
  }

  return {
    from: d.from,
    id: d.messageId,
    type: d.messageType || 'text',        // non-text types are dropped by the router
    text: { body: d.text || '' },
  };
}

router.post('/webhook', (req, res) => {
  if (!verifySignature(req)) return res.sendStatus(401);

  // Ack before doing any work. Zavu wants 2xx within 30 seconds and retries
  // on a schedule of 1m/5m/15m/1h/4h if it doesn't get one.
  res.sendStatus(200);

  try {
    const event = req.body || {};
    const d = event.data || {};

    switch (event.type) {
      case 'message.inbound':
      case 'button.reply': {
        if (!firstTimeSeeing(d.messageId)) {
          console.log(`[webhook] duplicate ${d.messageId} — already handled`);
          return;
        }
        const contact  = { profile: { name: d.profileName || null } };
        const metadata = { phone_number_id: event.senderId, display_phone_number: d.to };
        routeMessage(toRouterMessage(d), contact, metadata).catch((err) => {
          console.error('[router]', err.message);
        });
        break;
      }

      // A send we made didn't land. Named here because the outbound path only
      // learns about failures that happen while the request is open.
      case 'message.failed':
        console.warn(`[webhook] delivery to ${d.to || d.from} failed: ${d.failureReason || d.reason || 'no reason given'}`);
        break;

      // Outbound lifecycle — nothing to do, but don't log them as unknown.
      case 'conversation.new':
      case 'message.queued':
      case 'message.sent':
      case 'message.delivered':
      case 'message.read':
        break;

      default:
        console.log(`[webhook] ignoring event type: ${event.type}`);
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
          amount:    plan?.cost_breakdown?.per_person || 0,
          link:      `${process.env.FRONTEND_URL || ''}/plan/${participant.trip_id}`,
          reference,
        });
      } catch (err) {
        console.warn('[processPayment] receipt email failed:', err.message);
      }
    })();

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
