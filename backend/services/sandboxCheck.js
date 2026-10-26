/**
 * Check Karije's Pandascrow setup against the SANDBOX, step by step: bank
 * list, Karije's payout bank and account, a test escrow by transfer and by
 * card, reading it back, a fee account and the webhook signature.
 *
 * Run from the admin page (Payments check) or `node backend/scripts/pandascrowSandboxCheck.js`.
 * With PANDASCROW_ENV=live it only reads (keys, bank list, account name) and
 * never opens an escrow or account. Results carry shapes and statuses, never keys.
 */
const crypto = require('crypto');
const pandascrow = require('./pandascrow');
const { normalisePhone } = require('./phone');

const shape = (o) => (JSON.stringify(o, (k, v) => (/token|key|secret|uuid/i.test(k) ? '<hidden>' : v)) || '').slice(0, 600);

async function runSandboxCheck() {
  const results = [];
  const report = (step, ok, detail = '') => { results.push({ step, ok: !!ok, detail }); };
  const c = pandascrow.config();
  // Against live, only read: nothing is opened, created or paid.
  const readOnly = c.env === 'live';
  report(readOnly ? 'Live mode — read-only check' : 'Sandbox mode', true,
    `${c.base}; trip payments ${pandascrow.available() ? 'ARE switched on (PANDASCROW_ENABLED=true)' : 'are off until PANDASCROW_ENABLED=true'}`);
  const missing = [
    ...(c.keys.length ? [] : ['PANDASCROW_SECRET_KEY or PANDASCROW_PUBLIC_KEY']),
    ...(process.env.PANDASCROW_UUID ? [] : ['PANDASCROW_UUID']),
  ];
  const have = ['SECRET', 'PUBLIC', 'API'].filter((k) => process.env[`PANDASCROW_${k}_KEY`]).map((k) => k.toLowerCase());
  report('Keys and UUID are set', !missing.length, missing.length ? `missing: ${missing.join(', ')}` : `keys found: ${have.join(', ')}`);
  if (missing.length) return { results };
  report('Webhook secret is set', !!process.env.PANDASCROW_SECRET_KEY,
    process.env.PANDASCROW_SECRET_KEY ? '' : 'PANDASCROW_SECRET_KEY missing — webhooks would be checked with the API key instead');

  // 1. Auth + bank list
  let banks = [];
  try {
    banks = await pandascrow.listBanks();
    report('Pandascrow accepts a key (bank list)', banks.length > 0, `${banks.length} banks; the ${pandascrow.tokenKeyName()} key works in the Token header`);
  } catch (e) {
    report('Pandascrow accepts a key (bank list)', false, `${e.status || ''} ${e.message} ${shape(e.body)}`);
    if (pandascrow.refusedKey(e)) {
      // Ask the other environment, read-only, whether the keys belong there.
      const other = readOnly ? 'sandbox' : 'live';
      const works = await pandascrow.probeKeys(pandascrow.BASE_URLS[other]);
      report('Hint', false, works
        ? `These are ${other} keys: the ${other} server accepts the ${works} key. Set PANDASCROW_ENV=${other}${other === 'live' ? ' — the check stays read-only there, and payments stay off until PANDASCROW_ENABLED=true' : ''}.`
        : `Neither the sandbox nor the live server accepted the keys (${have.join(', ')}). Check they're copied in full, with no spaces.`);
    }
    return { results };
  }

  // 2. Karije's own payout bank, found by name
  const want = String(process.env.KARIJE_PAYOUT_BANK_NAME || '').trim().toLowerCase();
  const bank = process.env.KARIJE_PAYOUT_BANK_CODE
    ? banks.find((b) => b.code === process.env.KARIJE_PAYOUT_BANK_CODE.trim())
    : banks.find((b) => b.name.toLowerCase() === want)
      || banks.filter((b) => want && b.name.toLowerCase().includes(want)).sort((x, y) => x.name.length - y.name.length)[0];
  report('Karije payout bank found', !!bank, bank ? `${bank.name} → code ${bank.code}` :
    `no match for "${process.env.KARIJE_PAYOUT_BANK_NAME || ''}". Close matches: ${banks.filter((b) => /kuda/i.test(b.name)).map((b) => `${b.name} (${b.code})`).join(', ') || 'none'}`);

  // 3. Account check with the bank
  const acct = String(process.env.KARIJE_PAYOUT_ACCOUNT_NO || '').replace(/\D/g, '');
  let accountName = null;
  if (bank && acct.length === 10) {
    try {
      ({ accountName } = await pandascrow.resolveAccount({ bankCode: bank.code, accountNumber: acct }));
      report('Karije account checked with the bank', true, `name on account: ${accountName} (••••${acct.slice(-4)})`);
    } catch (e) {
      report('Karije account checked with the bank', false, `${e.message} ${shape(e.body)}`);
    }
  } else {
    report('Karije account checked with the bank', false, 'needs the bank above and a 10-digit KARIJE_PAYOUT_ACCOUNT_NO');
  }

  // 4. A test escrow paid by bank transfer, then by card
  const sellerPhone = normalisePhone(process.env.KARIJE_SELLER_PHONE);
  report('Karije seller phone set', !!sellerPhone, sellerPhone ? '' : 'KARIJE_SELLER_PHONE missing or not a valid number');
  if (readOnly) {
    signatureCheck(report, c);
    report('Escrow, card link and fee account', true, 'skipped on live — these open real accounts. Run them with sandbox keys from demo.pandascrow.io.');
    return { results };
  }
  const run = `sandbox-check-${Date.now()}`;
  const base = {
    tripId: run, participantId: 'tester', amount: 1000,
    title: 'Karije sandbox check', description: 'Test escrow from the sandbox check script.',
    deliveryDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    buyer: { name: 'Sandbox Traveller', email: 'sandbox-traveller@karije.com', phone: '+2348030000000' },
    seller: { name: 'Karije', email: process.env.KARIJE_SELLER_EMAIL || 'hello@karije.com', phone: sellerPhone || '+2348000000000' },
    payout: bank && acct ? { bankCode: bank.code, bankName: bank.name, accountNumber: acct, accountName: accountName || 'Karije' } : null,
    callbackUrl: 'https://karije.com/plan/sandbox-check?paid=1',
  };
  let escrowId = null;
  if (base.payout) {
    try {
      const va = await pandascrow.createTravellerEscrow({ ...base, attempt: 1, gateway: 'virtual_account' });
      escrowId = va.escrowId;
      const a = va.account || {};
      report('Escrow with a transfer account', !!(va.escrowId && a.accountNumber),
        `escrow ${va.escrowId}; account ${a.accountNumber ? '••••' + String(a.accountNumber).slice(-4) : 'MISSING'} at ${a.bankName || '?'}; pay ₦${a.amount ?? '?'} for ₦1,000 (fee ₦${a.amount ? a.amount - 1000 : '?'}); expires ${a.expiresAt || '?'}`);
    } catch (e) {
      report('Escrow with a transfer account', false, `${e.message} ${shape(e.body)}`);
    }
    try {
      const card = await pandascrow.createTravellerEscrow({ ...base, attempt: 2, gateway: 'payment_link' });
      report('Escrow with a card payment link', !!card.paymentUrl, card.paymentUrl ? `link host: ${new URL(card.paymentUrl).host}` : shape(card));
    } catch (e) {
      report('Escrow with a card payment link', false, `${e.message} ${shape(e.body)}`);
    }
  } else {
    report('Escrow with a transfer account', false, 'skipped — no payout account');
  }

  // 5. Reading the escrow back
  if (escrowId) {
    try {
      const e = await pandascrow.getEscrow(escrowId);
      report('Escrow read back', !!e.status, `status "${e.status}" (counted as paid: ${[...pandascrow.FUNDED_STATES].includes(e.status)})`);
    } catch (e) {
      report('Escrow read back', false, `${e.message} ${shape(e.body)}`);
    }
  }

  // 6. The one-off account for friend-trip fees
  try {
    const fee = await pandascrow.createFeeAccount({ amount: 1000, payerName: 'Sandbox Organiser' });
    const a = fee.account || {};
    report('Fee account (friend-trip upgrades)', !!a.accountNumber, `reference ${fee.reference}; account ${a.accountNumber ? '••••' + String(a.accountNumber).slice(-4) : 'MISSING'}; expires ${a.expiresAt || '?'}`);
  } catch (e) {
    report('Fee account (friend-trip upgrades)', false, `${e.message} ${shape(e.body)}`);
  }

  // 7. Webhook signature check, done locally with the configured secret
  signatureCheck(report, c, escrowId);
  return { results };
}

function signatureCheck(report, c, escrowId = 1) {
  const body = JSON.stringify({ event: 'escrow.paid', data: { escrow_id: escrowId || 1 } });
  const ts = String(Math.floor(Date.now() / 1000));
  const sig = crypto.createHmac('sha256', c.secret).update(body).digest('hex');
  report('Webhook signature: genuine accepted, forged refused',
    pandascrow.verifyWebhook(body, sig, ts) && !pandascrow.verifyWebhook(body, sig.replace(/.$/, (x) => (x === '0' ? '1' : '0')), ts));
}

module.exports = { runSandboxCheck };
