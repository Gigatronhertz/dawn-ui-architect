/**
 * Instalment auto-pay: charges a traveller's saved card on each due date.
 *
 * Only for travellers who opted in on their monthly plan, and only once their
 * first instalment has saved a reusable card. Three days before each charge
 * they get an email saying how much and when. A charge that fails is tried
 * again the next day, up to 3 attempts; meanwhile the ordinary instalment
 * reminders (installmentReminders.js) send their pay link, so a failed card
 * never stops anyone paying by transfer. After 3 failures auto-pay stops
 * trying until the traveller pays or switches it back on.
 *
 * Runs on the hourly tick, just before the instalment reminders, so a
 * successful charge moves the due date on before any reminder goes out.
 */
const db = require('../db/client');
const paystack = require('./paystack');
const { sendAutopayNoticeEmail } = require('./email');
const { collects } = require('./collection');

const DAY = 24 * 3600;
const NOTICE_DAYS = 3;
const MAX_FAILURES = 3;

const fe = () => (process.env.FRONTEND_URL || 'https://karije.com').replace(/\/$/, '');
const dateLabel = (unix) => new Date(unix * 1000).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Lagos' });

async function amountDue(p) {
  const { chargeAmount } = await db.participants.computeCharge(p, Number(p.amount) || 0);
  return chargeAmount;
}

/** Card-holders whose next charge is within the notice window and haven't been told yet. */
async function sendNotices(now = Math.floor(Date.now() / 1000)) {
  const rows = await db.rawAll(
    `SELECT p.*, t.destination, t.title, t.status AS trip_status FROM participants p JOIN trips t ON t.id = p.trip_id
      WHERE p.payment_plan = 'installment' AND p.paid = 0 AND p.autopay = 1 AND p.paystack_auth_code IS NOT NULL
        AND p.autopay_failures < ? AND p.next_due_at IS NOT NULL
        AND p.next_due_at > ? AND p.next_due_at <= ?
        AND (p.autopay_notice_for IS NULL OR p.autopay_notice_for <> p.next_due_at)`,
    [MAX_FAILURES, now, now + NOTICE_DAYS * DAY]);
  let sent = 0;
  for (const p of rows) {
    const amount = await amountDue(p);
    if (!(amount > 0)) continue;
    try {
      await sendAutopayNoticeEmail({
        to: p.email, name: p.name, tripName: p.title || p.destination || 'your trip', amount,
        card: p.autopay_card, dueDate: dateLabel(Number(p.next_due_at)), link: `${fe()}/plan/${p.trip_id}`,
      });
      sent++;
    } catch (err) {
      console.warn(`[autopay] notice failed for ${p.id}: ${err.message}`);
    }
    // Marked either way: one notice per due date, never a stream of them.
    await db.raw(`UPDATE participants SET autopay_notice_for = ? WHERE id = ?`, [p.next_due_at, p.id]);
  }
  return sent;
}

/** Charge everyone with auto-pay whose instalment is due, at most once a day each. */
async function chargeDue(now = Math.floor(Date.now() / 1000)) {
  if (!paystack.available()) return { charged: 0, failed: 0 };
  const rows = await db.rawAll(
    `SELECT p.*, t.id AS t_id, t.agent_id, t.status, t.plan, t.intake_json, t.collection_tier, t.managed_status, t.managed_price
       FROM participants p JOIN trips t ON t.id = p.trip_id
      WHERE p.payment_plan = 'installment' AND p.paid = 0 AND p.autopay = 1 AND p.paystack_auth_code IS NOT NULL
        AND p.autopay_failures < ? AND p.next_due_at IS NOT NULL AND p.next_due_at <= ?
        AND (p.autopay_last_attempt_at IS NULL OR p.autopay_last_attempt_at <= ?)
        AND t.status IN ('curated', 'custom', 'awaiting_group', 'active')`,
    [MAX_FAILURES, now, now - DAY + 3600]);

  let charged = 0, failed = 0;
  for (const p of rows) {
    if (!collects({ ...p, id: p.t_id, status: p.status })) continue;
    const amount = await amountDue(p);
    if (!(amount > 0)) continue;
    await db.raw(`UPDATE participants SET autopay_last_attempt_at = unixepoch() WHERE id = ?`, [p.id]);
    let ok = false;
    try {
      const r = await paystack.chargeInstalment({
        tripId: p.trip_id, participantId: p.id, authorizationCode: p.paystack_auth_code,
        email: p.paystack_auth_email || p.email, amountNGN: amount,
      });
      if (r.status === 'success') {
        // Same crediting as a checkout payment (and the webhook that will
        // also arrive); idempotent on the reference.
        const { processPayment } = require('../webhook');
        ok = await processPayment(r.reference);
      } else {
        console.warn(`[autopay] ${p.id}: ${r.status} ${r.gatewayResponse || ''}`);
      }
    } catch (err) {
      console.warn(`[autopay] charge failed for ${p.id}: ${err.response?.data?.message || err.message}`);
    }
    if (ok) {
      charged++;
      await db.raw(`UPDATE participants SET autopay_failures = 0 WHERE id = ?`, [p.id]);
    } else {
      failed++;
      await db.raw(`UPDATE participants SET autopay_failures = autopay_failures + 1 WHERE id = ?`, [p.id]);
    }
  }
  if (rows.length) console.log(`[autopay] ${rows.length} due — ${charged} charged, ${failed} failed`);
  return { charged, failed };
}

async function runOnce() {
  const result = await chargeDue();
  const notices = await sendNotices();
  return { ...result, notices };
}

module.exports = { runOnce, chargeDue, sendNotices, MAX_FAILURES, NOTICE_DAYS };
