/**
 * Pandascrow — escrow for trip payments.
 *
 * Every traveller pays into their own one-time escrow, by bank transfer to a
 * virtual account (9PSB) that Pandascrow issues per escrow, or by card. Karije
 * sits in the middle as broker; the seller is whoever runs the trip (the
 * agency, the friend-trip organiser, or Karije itself on curated trips), and
 * the escrow pays out to that seller's bank account when it is released.
 *
 * Organiser fees (the friend-trip reminders and escrow options) are paid into
 * Karije's own Pandascrow wallet through a dynamic virtual account.
 *
 * Configuration (backend/.env):
 *   PANDASCROW_SECRET_KEY  — the dashboard's secret key (sktest… / sklive…); signs webhooks
 *   PANDASCROW_PUBLIC_KEY  — the dashboard's public key
 *   PANDASCROW_API_KEY     — optional: force the key sent as the `Token` header
 *   PANDASCROW_UUID        — Karije's own Pandascrow account uuid
 *
 * The docs don't say which dashboard key the `Token` header takes, so the
 * client tries the secret key, then the public key, and keeps the first one
 * Pandascrow accepts (PANDASCROW_API_KEY, if set, is tried first).
 *   PANDASCROW_ENABLED     — "true" to move trip payments to Pandascrow; keys alone don't
 *   PANDASCROW_ENV         — "sandbox" (default) or "live"
 *   PANDASCROW_BASE_URL    — optional override (used by the local tests)
 *   PANDASCROW_FEES_PAID_BY — "buyer" (default), "seller" or "both"
 *
 * Amounts are whole naira, not kobo.
 */
const crypto = require('crypto');
const axios = require('axios');

const BASE_URLS = { sandbox: 'https://sandbox.pandascrow.io', live: 'https://api.pandascrow.io' };

function config() {
  const env = process.env.PANDASCROW_ENV === 'live' ? 'live' : 'sandbox';
  return {
    env,
    base:   (process.env.PANDASCROW_BASE_URL || BASE_URLS[env]).replace(/\/$/, ''),
    // Keys to try in the Token header, in order, without repeats.
    keys:   [...new Set([process.env.PANDASCROW_API_KEY, process.env.PANDASCROW_SECRET_KEY, process.env.PANDASCROW_PUBLIC_KEY]
      .map((k) => String(k || '').trim()).filter(Boolean))],
    secret: process.env.PANDASCROW_SECRET_KEY || process.env.PANDASCROW_API_KEY || '',
    uuid:   process.env.PANDASCROW_UUID || '',
    feesBy: ['buyer', 'seller', 'both'].includes(process.env.PANDASCROW_FEES_PAID_BY)
      ? process.env.PANDASCROW_FEES_PAID_BY : 'buyer',
  };
}

/** Keys and account are in place (enough to run the admin check). */
function configured() {
  const c = config();
  return !!(c.keys.length && c.uuid);
}

/**
 * Pandascrow takes over trip payments only when configured AND switched on.
 * Keys alone never move real money: PANDASCROW_ENABLED=true is a separate,
 * deliberate step once the check has passed.
 */
function available() {
  return configured() && String(process.env.PANDASCROW_ENABLED || '').toLowerCase() === 'true';
}

/**
 * Which configured key, if any, the given Pandascrow server accepts — asked
 * with the read-only bank list. Used by the admin check to tell sandbox keys
 * from live ones.
 */
async function probeKeys(base) {
  const e = process.env;
  const named = [['secret', e.PANDASCROW_SECRET_KEY], ['public', e.PANDASCROW_PUBLIC_KEY], ['api', e.PANDASCROW_API_KEY]]
    .map(([n, k]) => [n, String(k || '').trim()]).filter(([, k]) => k);
  for (const [name, key] of named) {
    try {
      const res = await axios.get(`${base}/bank/lists`, { headers: { Token: key, Accept: 'application/json' }, timeout: 20000 });
      if (res.data?.status !== false) return name;
    } catch { /* refused or unreachable — try the next */ }
  }
  return null;
}

class PandascrowError extends Error {
  constructor(message, { status, body } = {}) {
    super(message);
    this.name = 'PandascrowError';
    this.status = status;
    this.body = body;
  }
}

// The key Pandascrow last accepted in the Token header.
let acceptedKey = null;

/** Which configured key the Token header uses: "api", "secret", "public", or null before any call. */
function tokenKeyName() {
  if (!acceptedKey) return null;
  const e = process.env;
  if (acceptedKey === String(e.PANDASCROW_API_KEY || '').trim()) return 'api';
  if (acceptedKey === String(e.PANDASCROW_SECRET_KEY || '').trim()) return 'secret';
  return 'public';
}

async function call(method, path, opts = {}) {
  const { keys } = config();
  const order = acceptedKey && keys.includes(acceptedKey) ? [acceptedKey, ...keys.filter((k) => k !== acceptedKey)] : keys;
  let lastErr;
  for (const key of order) {
    try {
      const data = await callWith(key, method, path, opts);
      acceptedKey = key;
      return data;
    } catch (err) {
      lastErr = err;
      // Only a refused key is worth retrying with the other one.
      if (!refusedKey(err)) throw err;
    }
  }
  throw lastErr || new PandascrowError('Pandascrow is not configured.');
}

/** Pandascrow said no to the key itself (a 401/403, or a 200 whose message says so). */
function refusedKey(err) {
  if (err.status === 401 || err.status === 403) return true;
  return /invalid (api )?(token|key)|unauthori[sz]ed|token (is )?(missing|required|invalid)/i.test(err.message || '');
}

async function callWith(key, method, path, { body, query } = {}) {
  const c = config();
  try {
    const res = await axios({
      method,
      url: `${c.base}${path}`,
      params: query,
      data: body,
      headers: { Token: key, 'Content-Type': 'application/json', Accept: 'application/json' },
      timeout: 30000,
    });
    if (res.data && res.data.status === false) {
      throw new PandascrowError(res.data?.data?.message || 'Pandascrow refused the request.', { status: res.status, body: res.data });
    }
    return res.data?.data ?? res.data;
  } catch (err) {
    if (err instanceof PandascrowError) throw err;
    const data = err.response?.data;
    const message = data?.data?.message || data?.message || err.message;
    throw new PandascrowError(`Pandascrow ${method} ${path} failed: ${message}`, { status: err.response?.status, body: data });
  }
}

// ── Banks ───────────────────────────────────────────────────────────────────

let bankCache = { at: 0, banks: [] };
const BANK_CACHE_MS = 24 * 60 * 60 * 1000;

/** Nigerian banks Pandascrow can pay out to, sorted by name. Cached for a day. */
async function listBanks() {
  if (bankCache.banks.length && Date.now() - bankCache.at < BANK_CACHE_MS) return bankCache.banks;
  const data = await call('get', '/bank/lists');
  const banks = (data?.banks || [])
    .map((b) => ({ name: String(b.bankName || '').trim(), code: String(b.bankCode || '').trim() }))
    .filter((b) => b.name && b.code)
    .sort((a, b) => a.name.localeCompare(b.name));
  bankCache = { at: Date.now(), banks };
  return banks;
}

/** The name on a bank account, straight from the bank — or a PandascrowError. */
async function resolveAccount({ bankCode, accountNumber }) {
  const data = await call('post', '/bank/validate', {
    body: { uuid: config().uuid, bank_code: bankCode, account_number: accountNumber },
  });
  const name = data?.account?.name;
  if (!name) throw new PandascrowError('That account could not be found.');
  return { accountName: String(name).trim(), accountNumber: String(data.account.number || accountNumber) };
}

// ── Traveller escrow ────────────────────────────────────────────────────────

/** Shape the virtual-account part of an escrow (or DVA) response. */
function shapeAccount(va) {
  if (!va) return null;
  return {
    accountNumber: String(va.account_number || ''),
    accountName:   va.account_name || null,
    bankName:      va.bank_name || va.bank || '9PSB',
    bankCode:      va.bank_code || null,
    amount:        Number(va.amount) || 0,
    expiresAt:     va.expiry_date || va.expiry?.date || null,
  };
}

/**
 * Open one traveller's escrow for their place on a trip.
 *
 * gateway "virtual_account" returns a bank account to transfer to;
 * "payment_link" returns a card checkout URL. `attempt` makes the idempotency
 * key unique per account issued, so asking for a fresh account after one has
 * expired opens a new escrow instead of replaying the old one.
 */
async function createTravellerEscrow({
  tripId, participantId, attempt = 1, amount, title, description, deliveryDate,
  buyer, seller, payout, callbackUrl, gateway = 'virtual_account',
}) {
  const c = config();
  const body = {
    uuid:                   c.uuid,
    idempotency_key:        `karije-${participantId}-${attempt}`,
    escrow_type:            'onetime',
    initiator_role:         'broker',
    initiator_id:           c.uuid,
    receiver_id:            null,
    title:                  String(title || 'Karije trip').slice(0, 120),
    currency:               'NGN',
    description:            String(description || title || 'Trip booking').slice(0, 500),
    acceptance_criteria:    'The traveller takes their place on the trip as planned.',
    inspection_period:      '1',
    no_reviews:             '1',
    delivery_date:          deliveryDate,
    how_dispute_is_handled: 'platform',
    who_pay_fees:           c.feesBy,
    amount:                 Math.round(amount),
    dispute_window:         '3',
    buyer_details:          { name: buyer.name || 'Traveller', email: buyer.email, phone: buyer.phone || '' },
    seller_details:         { name: seller.name, email: seller.email, phone: seller.phone || '' },
    payout: {
      payout_type:    'bank',
      bank_name:      payout.bankName || '',
      bank_code:      payout.bankCode,
      account_number: payout.accountNumber,
      account_name:   payout.accountName,
    },
    callback_url:    callbackUrl,
    payment_gateway: gateway,
    expiry_hours:    '24',
  };
  const data = await call('post', '/escrow/initialize', { body });
  return {
    escrowId:   Number(data.escrow_id),
    reference:  data.transaction_ref || null,
    status:     data.status || 'pending',
    gateway:    data.payment_method || gateway,
    account:    shapeAccount(data.virtual_account),
    paymentUrl: data.payment_url || null,
    meta:       { tripId, participantId },
  };
}

/** One escrow, as Pandascrow sees it now. */
async function getEscrow(escrowId) {
  const data = await call('get', '/escrow/single', { query: { uuid: config().uuid, escrow_id: escrowId } });
  const e = data?.escrow || {};
  return {
    escrowId:      Number(e._id ?? escrowId),
    status:        String(e.status || 'pending'),
    amount:        Number(e.amount) || 0,
    amountPay:     Number(e.amount_pay) || 0,
    amountReceive: Number(e.amount_receive) || 0,
    raw:           data,
  };
}

/** Escrow states that mean the traveller's money has arrived. */
const FUNDED_STATES = new Set(['funded', 'paid', 'in_progress', 'delivered', 'completed', 'released']);

// ── Karije's own fees (friend-trip options) ─────────────────────────────────

/** A bank account that collects exactly `amount` into Karije's wallet. */
async function createFeeAccount({ amount, payerName }) {
  const data = await call('post', '/dva/create', {
    body: {
      uuid:     config().uuid,
      order:    { amount: String(Math.round(amount)), amount_type: 'EXACT', currency: 'NGN', expiry_hours: 24 },
      customer: { account: { name: String(payerName || 'Karije customer').slice(0, 60) } },
    },
  });
  return { reference: data.reference, recordUuid: data.record_uuid || null, account: shapeAccount(data) };
}

// ── Webhooks ────────────────────────────────────────────────────────────────

const WEBHOOK_TOLERANCE_S = 5 * 60;

/**
 * Pandascrow signs the raw body with HMAC-SHA256 (hex, no prefix) and sends a
 * Unix timestamp. Both must check out; a stale timestamp is a replay.
 */
function verifyWebhook(rawBody, signature, timestamp) {
  const { secret } = config();
  if (!secret || !signature || !rawBody) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > WEBHOOK_TOLERANCE_S) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(String(signature).trim().toLowerCase(), 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = {
  available, configured, config, probeKeys, BASE_URLS, PandascrowError, tokenKeyName, refusedKey,
  listBanks, resolveAccount,
  createTravellerEscrow, getEscrow, FUNDED_STATES,
  createFeeAccount,
  verifyWebhook,
};
