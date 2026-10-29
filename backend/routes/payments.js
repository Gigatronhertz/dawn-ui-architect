/**
 * Trip payments through Pandascrow escrow.
 *
 *   GET  /api/banks                                   — banks for the payout picker
 *   POST /api/banks/resolve                           — the name on an account
 *   GET  /api/payments/config                         — which payment rail is live
 *   POST /api/public/plan/:tripId/escrow              — open (or reuse) a traveller's escrow
 *   GET  /api/public/plan/:tripId/escrow/:participantId — that escrow's state, checked with Pandascrow
 *   GET  /api/auth/plans/:tripId/collection           — a friend trip's option, fee and payout account
 *   POST /api/auth/plans/:tripId/collection           — choose free / notify / escrow
 *   PUT  /api/auth/plans/:tripId/payout               — the organiser's checked bank account
 *   POST /pandascrow/webhook                          — Pandascrow's signed events
 *
 * Every traveller pays into their own escrow; nothing here pools a group's
 * money. Paystack keeps working exactly as before until Pandascrow is
 * configured (see services/pandascrow.js).
 */
const crypto = require('crypto');
const { Router } = require('express');
const db = require('../db/client');
const pandascrow = require('../services/pandascrow');
const premium = require('../services/premium');
const { requireAuth } = require('../middleware/auth');
const { limit } = require('../services/rateLimit');
const { normalisePhone } = require('../services/phone');
const risk = require('../services/risk');
const { sendPaymentReceiptEmail } = require('../services/email');

const api = Router();      // mounted at /api
const hooks = Router();    // mounted at /

const SHAREABLE = ['awaiting_group', 'curated', 'custom'];
const frontend = () => (process.env.FRONTEND_URL || 'https://karije.com').replace(/\/$/, '');

const { FRIEND_ESCROW, TIERS, tripKind, collects, parseJson } = require('../services/collection');

/**
 * Who the escrow pays out to: the agency, the friend-trip organiser, or
 * Karije itself on its own curated trips. Null when that seller has no
 * checked bank account yet — the traveller cannot pay until there is one.
 */
/**
 * Karije's own bank code: KARIJE_PAYOUT_BANK_CODE if set, otherwise looked up
 * by KARIJE_PAYOUT_BANK_NAME (e.g. "Kuda") in Pandascrow's bank list, so the
 * code — which differs between providers — never has to be found by hand.
 */
async function karijeBankCode() {
  const e = process.env;
  if (e.KARIJE_PAYOUT_BANK_CODE) return e.KARIJE_PAYOUT_BANK_CODE.trim();
  const want = String(e.KARIJE_PAYOUT_BANK_NAME || '').trim().toLowerCase();
  if (!want) return null;
  try {
    const banks = await pandascrow.listBanks();
    const hit = banks.find((b) => b.name.toLowerCase() === want)
      || banks.filter((b) => b.name.toLowerCase().includes(want)).sort((x, y) => x.name.length - y.name.length)[0];
    return hit ? hit.code : null;
  } catch {
    return null;
  }
}

async function sellerFor(trip) {
  const kind = tripKind(trip);
  if (kind === 'curated') {
    const e = process.env;
    const bankCode = await karijeBankCode();
    if (!bankCode || !e.KARIJE_PAYOUT_ACCOUNT_NO) return null;
    return {
      seller: { name: 'Karije', email: e.KARIJE_SELLER_EMAIL || 'hello@karije.com', phone: normalisePhone(e.KARIJE_SELLER_PHONE) || '' },
      payout: {
        bankCode, bankName: e.KARIJE_PAYOUT_BANK_NAME || '',
        accountNumber: e.KARIJE_PAYOUT_ACCOUNT_NO, accountName: e.KARIJE_PAYOUT_ACCOUNT_NAME || 'Karije',
      },
    };
  }
  if (kind === 'agency') {
    const agent = await db.agents.getById(trip.agent_id);
    // The trip's own snapshot wins; an agency that added its account after
    // creating the trip falls back to the account it has saved now.
    const code = trip.payout_bank_code || agent?.payout_bank_code;
    const no   = trip.payout_account_no || agent?.payout_account_no;
    if (!agent || !code || !no) return null;
    return {
      seller: { name: agent.agency_name, email: agent.email || 'hello@karije.com', phone: normalisePhone(agent.wa_number) || normalisePhone(agent.phone) || '' },
      payout: {
        bankCode: code, bankName: trip.payout_bank_name || agent.payout_bank_name || '',
        accountNumber: no, accountName: trip.payout_account_name || agent.payout_account_name || agent.agency_name,
      },
    };
  }
  // Friend trip — the organiser's own account and phone, saved through PUT .../payout.
  if (!trip.payout_bank_code || !trip.payout_account_no || !trip.user_id || !normalisePhone(trip.notify_wa)) return null;
  const user = await db.users.get(trip.user_id);
  return {
    seller: { name: trip.payout_account_name || user?.name || 'Trip organiser', email: user?.email || trip.notify_email || 'hello@karije.com', phone: normalisePhone(trip.notify_wa) },
    payout: {
      bankCode: trip.payout_bank_code, bankName: trip.payout_bank_name || '',
      accountNumber: trip.payout_account_no, accountName: trip.payout_account_name || '',
    },
  };
}

/** The day the trip happens, as Pandascrow wants it; a month out if not set. */
function deliveryDate(trip) {
  const raw = String(trip.selected_date || '');
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const d = new Date(Date.now() + 30 * 86400000);
  return d.toISOString().slice(0, 10);
}

function tripName(trip) {
  const plan = parseJson(trip.plan);
  return trip.title || plan?.curated?.name || trip.destination || 'Karije trip';
}

// ── Escrow rows ─────────────────────────────────────────────────────────────

async function currentEscrow(participantId) {
  return db.raw('SELECT * FROM escrows WHERE participant_id = ? ORDER BY created_at DESC, attempt DESC LIMIT 1', [participantId]);
}

function shapeEscrow(row) {
  if (!row) return null;
  return {
    escrowId:      Number(row.escrow_id),
    status:        row.status,
    gateway:       row.gateway,
    amount:        Number(row.amount),
    amountToPay:   Number(row.amount_pay || row.amount),
    accountNumber: row.account_number || null,
    accountName:   row.account_name || null,
    bankName:      row.bank_name || null,
    expiresAt:     row.expires_at || null,
    paymentUrl:    row.payment_url || null,
  };
}

/** Pandascrow reports times as "YYYY-MM-DD HH:MM:SS" in Lagos time. */
function expired(row) {
  if (!row?.expires_at) return false;
  const t = Date.parse(String(row.expires_at).replace(' ', 'T') + '+01:00');
  return Number.isFinite(t) && t <= Date.now();
}

/**
 * The traveller's money is in. Idempotent on the escrow id, so the webhook,
 * the status check and a retried delivery can all land here safely.
 */
async function creditEscrow(row) {
  await db.raw(`UPDATE escrows SET status = 'paid', updated_at = unixepoch() WHERE escrow_id = ? AND status IN ('awaiting','expired')`, [row.escrow_id]);
  const { credited } = await db.participants.recordPayment({
    id: row.participant_id, tripId: row.trip_id, amount: Number(row.amount), reference: `PSC-${row.escrow_id}`,
  });
  if (!credited) return false;
  console.log(`[pandascrow] escrow ${row.escrow_id} funded — participant ${row.participant_id}, ₦${row.amount}`);
  (async () => {
    try {
      const p = await db.participants.getById(row.participant_id);
      const trip = await db.trips.get(row.trip_id);
      if (!p?.email || !trip) return;
      await sendPaymentReceiptEmail({
        to: p.email, name: p.name, tripName: tripName(trip), amount: Number(row.amount),
        link: `${frontend()}/plan/${row.trip_id}`, reference: `PSC-${row.escrow_id}`,
      });
    } catch (err) {
      console.warn('[pandascrow] receipt email failed:', err.message);
    }
  })();
  return true;
}

// ── Banks ───────────────────────────────────────────────────────────────────

api.get('/payments/config', (_req, res) => {
  res.json({
    provider: pandascrow.available() ? 'pandascrow' : 'paystack',
    tiers: Object.fromEntries(Object.entries(TIERS).map(([k, v]) => [k, { ...v, amount: premium.LOCKED ? 0 : v.amount, listAmount: v.amount }])),
    feesWaived: premium.LOCKED,
  });
});

api.get('/banks', async (_req, res) => {
  if (!pandascrow.available()) return res.status(503).json({ error: 'Bank lookup is not available yet.' });
  try {
    res.json({ banks: await pandascrow.listBanks() });
  } catch (err) {
    console.error('[api/banks]', err.message);
    res.status(502).json({ error: 'Could not load the bank list. Try again shortly.' });
  }
});

api.post('/banks/resolve', limit({ name: 'bank-resolve', max: 30, windowMs: 15 * 60 * 1000 }), requireAuth, async (req, res) => {
  if (!pandascrow.available()) return res.status(503).json({ error: 'Bank lookup is not available yet.' });
  const bankCode = String(req.body?.bankCode || '').trim();
  const accountNumber = String(req.body?.accountNumber || '').replace(/\D/g, '');
  if (!bankCode || accountNumber.length !== 10) {
    return res.status(400).json({ error: 'Pick a bank and enter the 10-digit account number.' });
  }
  try {
    res.json(await pandascrow.resolveAccount({ bankCode, accountNumber }));
  } catch (err) {
    res.status(400).json({ error: 'We could not find that account. Check the bank and number.' });
  }
});

// ── Traveller escrow ────────────────────────────────────────────────────────

/**
 * Open the traveller's escrow, or hand back the one they already have.
 * Body: { participantId, email?, phone?, gateway?: "virtual_account" | "payment_link", fresh?: boolean }
 * `fresh` asks for a new transfer account even if the current one is live.
 */
api.post('/public/plan/:tripId/escrow', limit({ name: 'escrow', max: 20, windowMs: 15 * 60 * 1000 }), async (req, res) => {
  if (!pandascrow.available()) return res.status(503).json({ error: 'Payments are not enabled yet.' });
  try {
    const trip = await db.trips.get(req.params.tripId);
    if (!trip) return res.status(404).json({ error: 'Plan not found.' });
    if (!SHAREABLE.includes(trip.status)) return res.status(403).json({ error: 'Plan is not yet confirmed.' });
    if (!collects(trip)) return res.status(403).json({ error: "The organiser isn't collecting payments on Karije for this trip." });

    const { participantId, email, phone, gateway, fresh } = req.body || {};
    const participant = participantId ? await db.participants.getById(participantId) : null;
    if (!participant || participant.trip_id !== trip.id) return res.status(404).json({ error: 'Participant not found.' });
    if (participant.paid) return res.status(400).json({ error: "You've already paid for your place." });

    const cleanEmail = String(email || participant.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ error: 'A valid email address is required to pay.' });
    }

    // Pandascrow needs the payer's phone. Travellers who joined before it was
    // asked for give it here.
    const cleanPhone = normalisePhone(phone) || normalisePhone(participant.wa_number);
    if (!cleanPhone) {
      return res.status(400).json({ error: 'Add your phone number to pay — escrow needs one for every traveller.', code: 'PHONE_REQUIRED' });
    }

    const wantGateway = gateway === 'payment_link' ? 'payment_link' : 'virtual_account';
    const existing = await currentEscrow(participant.id);
    if (existing && existing.status === 'paid') return res.status(400).json({ error: "You've already paid for your place." });
    if (existing && existing.status === 'awaiting' && !fresh && existing.gateway === wantGateway && !expired(existing)) {
      return res.json({ escrow: shapeEscrow(existing) });
    }

    const seller = await sellerFor(trip);
    if (!seller) {
      return res.status(409).json({ error: "This trip can't take payments yet — the organiser still needs to add their bank account and phone number." });
    }

    const plan = parseJson(trip.plan);
    const { targetAmount } = await db.participants.computeCharge(participant, plan?.cost_breakdown?.per_person);
    if (!targetAmount || targetAmount <= 0) return res.status(400).json({ error: 'Could not work out the price for this trip.' });

    const attempt = (existing ? Number(existing.attempt) : 0) + 1;
    const opened = await pandascrow.createTravellerEscrow({
      tripId: trip.id, participantId: participant.id, attempt,
      amount: targetAmount,
      title: `${tripName(trip)} — ${participant.name || 'traveller'}`,
      description: `One place on ${tripName(trip)} for ${participant.name || cleanEmail}.`,
      deliveryDate: deliveryDate(trip),
      buyer: { name: participant.name, email: cleanEmail, phone: cleanPhone },
      seller: seller.seller, payout: seller.payout,
      callbackUrl: `${frontend()}/plan/${trip.id}?paid=1`,
      gateway: wantGateway,
    });

    // The old account can't be paid into any more once it's replaced.
    if (existing && existing.status === 'awaiting') {
      await db.raw(`UPDATE escrows SET status = 'replaced', updated_at = unixepoch() WHERE escrow_id = ?`, [existing.escrow_id]);
    }
    await db.raw(
      `INSERT OR REPLACE INTO escrows (escrow_id, participant_id, trip_id, attempt, amount, amount_pay, gateway, status,
         account_number, account_name, bank_name, expires_at, payment_url, reference)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'awaiting', ?, ?, ?, ?, ?, ?)`,
      [
        opened.escrowId, participant.id, trip.id, attempt, targetAmount,
        opened.account?.amount || null, opened.gateway,
        opened.account?.accountNumber || null, opened.account?.accountName || null, opened.account?.bankName || null,
        opened.account?.expiresAt || null, opened.paymentUrl, opened.reference,
      ]
    );
    await db.raw(`UPDATE participants SET email = COALESCE(email, ?), wa_number = ?, amount = ? WHERE id = ?`, [cleanEmail, cleanPhone, targetAmount, participant.id]);

    res.json({ escrow: shapeEscrow(await currentEscrow(participant.id)) });
  } catch (err) {
    console.error('[api/escrow:open]', err.message, err.body ? JSON.stringify(err.body).slice(0, 300) : '');
    res.status(502).json({ error: 'Could not set up your payment. Please try again.' });
  }
});

/** Where the traveller's payment stands — asks Pandascrow, never the browser. */
api.get('/public/plan/:tripId/escrow/:participantId', async (req, res) => {
  try {
    const participant = await db.participants.getById(req.params.participantId);
    if (!participant || participant.trip_id !== req.params.tripId) return res.status(404).json({ error: 'Not found.' });
    let row = await currentEscrow(participant.id);
    if (row && row.status === 'awaiting' && pandascrow.available()) {
      try {
        const live = await pandascrow.getEscrow(row.escrow_id);
        if (pandascrow.FUNDED_STATES.has(live.status)) {
          await creditEscrow(row);
          row = await currentEscrow(participant.id);
        } else if (expired(row)) {
          await db.raw(`UPDATE escrows SET status = 'expired', updated_at = unixepoch() WHERE escrow_id = ?`, [row.escrow_id]);
          row = await currentEscrow(participant.id);
        }
      } catch (err) {
        console.warn('[api/escrow:status] check failed:', err.message);
      }
    }
    const fresh = await db.participants.getById(participant.id);
    res.json({ paid: !!fresh.paid, escrow: shapeEscrow(row) });
  } catch (err) {
    console.error('[api/escrow:status]', err.message);
    res.status(500).json({ error: 'Could not check that payment.' });
  }
});

// ── Friend-trip options (organiser only) ────────────────────────────────────

async function ownTripOr(res, req) {
  const trip = await db.trips.get(req.params.tripId);
  if (!trip) { res.status(404).json({ error: 'Plan not found.' }); return null; }
  if (trip.user_id !== req.user.uid) { res.status(403).json({ error: 'This is not your plan.' }); return null; }
  if (tripKind(trip) !== 'friend') { res.status(400).json({ error: 'This trip is run by an agency or by Karije.' }); return null; }
  return trip;
}

async function collectionState(trip) {
  const fee = await db.raw(`SELECT * FROM trip_fees WHERE trip_id = ? ORDER BY created_at DESC LIMIT 1`, [trip.id]);
  return {
    tier: trip.collection_tier || 'none',
    phone: trip.notify_wa || null,
    feesWaived: premium.LOCKED,
    provider: pandascrow.available() ? 'pandascrow' : 'paystack',
    payout: trip.payout_account_no ? {
      bankCode: trip.payout_bank_code, bankName: trip.payout_bank_name || null,
      accountNumber: trip.payout_account_no, accountName: trip.payout_account_name,
    } : null,
    pendingFee: fee && fee.status === 'awaiting' ? {
      tier: fee.tier, amount: Number(fee.amount), reference: fee.reference,
      accountNumber: fee.account_number, accountName: fee.account_name, bankName: fee.bank_name, expiresAt: fee.expires_at,
    } : null,
  };
}

api.get('/auth/plans/:tripId/collection', requireAuth, async (req, res) => {
  const trip = await ownTripOr(res, req);
  if (!trip) return;
  res.json(await collectionState(trip));
});

/** Body: { tier: "none" | "notify" | "escrow" } */
api.post('/auth/plans/:tripId/collection', requireAuth, async (req, res) => {
  try {
    const trip = await ownTripOr(res, req);
    if (!trip) return;
    const tier = String(req.body?.tier || '');
    if (!TIERS[tier]) return res.status(400).json({ error: 'Choose free or reminders.' });
    if (tier === 'escrow' && !FRIEND_ESCROW) return res.status(400).json({ error: 'Escrow collection isn’t available for friend trips.' });

    const order = ['none', 'notify', 'escrow'];
    // Stepping down, or anything while the beta waives fees, needs no payment.
    if (premium.LOCKED || order.indexOf(tier) <= order.indexOf(trip.collection_tier || 'none')) {
      await db.raw('UPDATE trips SET collection_tier = ? WHERE id = ?', [tier, trip.id]);
      return res.json(await collectionState(await db.trips.get(trip.id)));
    }
    if (!pandascrow.available()) return res.status(503).json({ error: 'Payments are not enabled yet.' });

    // An upgrade from notify to escrow pays the difference.
    const owed = TIERS[tier].amount - TIERS[trip.collection_tier || 'none'].amount;
    const user = await db.users.get(req.user.uid);
    const acct = await pandascrow.createFeeAccount({ amount: owed, payerName: user?.name || req.user.email });
    await db.raw(
      `INSERT INTO trip_fees (reference, trip_id, tier, amount, account_number, account_name, bank_name, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [acct.reference, trip.id, tier, owed, acct.account?.accountNumber, acct.account?.accountName, acct.account?.bankName, acct.account?.expiresAt]
    );
    res.json(await collectionState(trip));
  } catch (err) {
    console.error('[api/collection]', err.message);
    res.status(502).json({ error: 'Could not set that up. Please try again.' });
  }
});

/** The friend-trip organiser's bank account, checked with the bank. */
api.put('/auth/plans/:tripId/payout', requireAuth, async (req, res) => {
  const trip = await ownTripOr(res, req);
  if (!trip) return;
  if (!pandascrow.available()) return res.status(503).json({ error: 'Bank lookup is not available yet.' });
  const bankCode = String(req.body?.bankCode || '').trim();
  const bankName = String(req.body?.bankName || '').trim();
  const accountNumber = String(req.body?.accountNumber || '').replace(/\D/g, '');
  if (!bankCode || accountNumber.length !== 10) return res.status(400).json({ error: 'Pick your bank and enter the 10-digit account number.' });
  // Escrow needs the organiser's phone as well as their account.
  const phone = normalisePhone(req.body?.phone) || normalisePhone(trip.notify_wa);
  if (!phone) return res.status(400).json({ error: 'Add your phone number — escrow needs one for whoever is paid.', code: 'PHONE_REQUIRED' });
  // Once a friend has paid, the account their money is going to stays put.
  const paidIn = await db.raw(`SELECT COUNT(*) AS n FROM escrows WHERE trip_id = ? AND status <> 'replaced' AND status <> 'expired'`, [trip.id]);
  if (Number(paidIn?.n || 0) > 0 && trip.payout_account_no) {
    return res.status(409).json({ error: 'Payments are already set up against this account, so it can no longer change.' });
  }
  try {
    const { accountName } = await pandascrow.resolveAccount({ bankCode, accountNumber });
    await db.raw(
      'UPDATE trips SET payout_bank_code = ?, payout_bank_name = ?, payout_account_no = ?, payout_account_name = ?, notify_wa = ? WHERE id = ?',
      [bankCode, bankName || null, accountNumber, accountName, phone, trip.id]
    );
    await risk.logPayoutChange({
      subject: 'trip', subjectId: trip.id,
      before: { bankCode: trip.payout_bank_code, accountNo: trip.payout_account_no },
      after:  { bankCode, accountNo: accountNumber, accountName },
    });
    res.json(await collectionState(await db.trips.get(trip.id)));
  } catch (err) {
    res.status(400).json({ error: 'We could not find that account. Check the bank and number.' });
  }
});

// ── Webhook ─────────────────────────────────────────────────────────────────

const ESCROW_STATUS = {
  'escrow.completed':        'released',
  'escrow.payout.completed': 'paid_out',
  'escrow.dispute.opened':   'disputed',
};

hooks.post('/pandascrow/webhook', async (req, res) => {
  const raw = req.rawBody || '';
  if (!pandascrow.verifyWebhook(raw, req.get('X-Pandascrow-Signature'), req.get('X-Pandascrow-Timestamp'))) {
    console.warn('[pandascrow/webhook] bad signature or stale timestamp — ignored');
    return res.status(401).json({ status: false, error: 'invalid signature' });
  }

  const body = req.body || {};
  const event = body.event || req.get('X-Pandascrow-Event') || '';
  const data = body.data || {};
  const escrowId = data.escrow_id != null ? Number(data.escrow_id) : null;
  const reference = body.dva?.reference || body.transaction_ref || data.transaction?.transaction_ref || null;

  // A retried delivery has the same body, so the same id — skip it.
  const id = crypto.createHash('sha256').update(raw).digest('hex');
  let fresh = 0;
  try {
    fresh = await db.exec(
      `INSERT OR IGNORE INTO pandascrow_events (id, event, escrow_id, reference, payload) VALUES (?, ?, ?, ?, ?)`,
      [id, event, escrowId, reference, raw]
    );
  } catch (err) {
    console.error('[pandascrow/webhook] log failed:', err.message);
    return res.status(500).json({ status: false });
  }
  res.json({ status: true });
  if (!fresh) return; // already handled

  try {
    if (event === 'escrow.paid' && escrowId) {
      const row = await db.raw('SELECT * FROM escrows WHERE escrow_id = ?', [escrowId]);
      if (row) await creditEscrow(row);
      else console.warn('[pandascrow/webhook] escrow.paid for an escrow we never opened:', escrowId);
    } else if (ESCROW_STATUS[event] && escrowId) {
      await db.raw('UPDATE escrows SET status = ?, updated_at = unixepoch() WHERE escrow_id = ?', [ESCROW_STATUS[event], escrowId]);
      if (event === 'escrow.dispute.opened') {
        console.warn(`[pandascrow] DISPUTE on escrow ${escrowId}: ${data.dispute?.reason || 'no reason given'}`);
      }
    } else if (event === 'wallet.deposit.success' && reference) {
      const fee = await db.raw('SELECT * FROM trip_fees WHERE reference = ?', [reference]);
      if (fee && fee.status !== 'paid') {
        await db.raw(`UPDATE trip_fees SET status = 'paid', paid_at = unixepoch() WHERE reference = ?`, [reference]);
        await db.raw('UPDATE trips SET collection_tier = ? WHERE id = ?', [fee.tier, fee.trip_id]);
        console.log(`[pandascrow] trip ${fee.trip_id} fee paid — ${fee.tier}`);
      }
    }
  } catch (err) {
    console.error('[pandascrow/webhook]', event, err.message);
  }
});

module.exports = { api, hooks };
