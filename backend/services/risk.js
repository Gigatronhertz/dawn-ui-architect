/**
 * Money-laundering / terrorist-financing risk flags (docs/AML_RISK_POLICY.md).
 *
 * Flags are worked out from what's already in the database each time the
 * admin Risk tab is opened, so a new rule applies to past activity too. Only
 * the reviews are stored: who looked at a flag, what they decided and why.
 *
 *   large_payment          one payment at or over RISK_LARGE_PAYMENT_NGN (default ₦500,000)
 *   rapid_bookings         one email or phone booking 3+ places within 7 days
 *   many_places_one_payer  one email or phone holding 3+ places on the same trip
 *   payout_change_after_paid  a payout account changed after travellers had paid
 *   unverified_supplier_paid  travellers paid for an agency trip before the agency was verified
 *
 * Levels: high needs review before any payout on that trip; medium is
 * reviewed within 2 business days (see the policy).
 */
const db = require('../db/client');

const DAY = 86400;

function largePaymentThreshold() {
  const n = Number(process.env.RISK_LARGE_PAYMENT_NGN);
  return Number.isFinite(n) && n > 0 ? n : 500000;
}

/** Record a payout account change, so a change after money came in can be flagged. */
async function logPayoutChange({ subject, subjectId, before, after }) {
  const was = before?.accountNo ? `${before.bankCode || ''}:${before.accountNo}` : null;
  const now = after?.accountNo ? `${after.bankCode || ''}:${after.accountNo}` : null;
  if (was === now) return;
  await db.raw(
    `INSERT INTO payout_changes (subject, subject_id, old_account, new_account, new_account_name) VALUES (?, ?, ?, ?, ?)`,
    [subject, subjectId, was, now, after?.accountName || null]
  );
}

const fmt = (n) => `₦${Math.round(Number(n) || 0).toLocaleString('en-NG')}`;
const who = (p) => [p.name, p.email, p.wa_number].filter(Boolean).join(' · ') || 'unnamed traveller';

async function computeFlags() {
  const flags = [];
  const limit = largePaymentThreshold();

  // 1. Large single payments
  const big = await db.rawAll(
    `SELECT pp.id, pp.amount, pp.reference, pp.created_at, pp.trip_id, p.name, p.email, p.wa_number
       FROM participant_payments pp LEFT JOIN participants p ON p.id = pp.participant_id
      WHERE pp.amount >= ?`, [limit]);
  for (const r of big) {
    flags.push({
      id: `large_payment:${r.id}`, type: 'large_payment', level: r.amount >= limit * 2 ? 'high' : 'medium',
      tripId: r.trip_id, at: Number(r.created_at),
      summary: `${fmt(r.amount)} paid in one payment`,
      detail: `${who(r)} · reference ${r.reference}. Threshold ${fmt(limit)}.`,
    });
  }

  // 2 & 3. The same email or phone across several places
  const people = await db.rawAll(
    `SELECT id, trip_id, name, email, wa_number, created_at FROM participants
      WHERE created_at >= unixepoch() - 90 * ${DAY} AND (email IS NOT NULL OR wa_number IS NOT NULL)`);
  const groups = new Map();
  for (const p of people) {
    for (const key of [p.email && `email:${p.email.toLowerCase()}`, p.wa_number && `phone:${p.wa_number}`].filter(Boolean)) {
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(p);
    }
  }
  // Email and phone usually point at the same bookings; flag each set of
  // bookings once.
  const seen = new Set();
  const sig = (type, ps) => `${type}:${ps.map((p) => p.id).sort().join(',')}`;
  for (const [key, list] of groups) {
    const contact = key.slice(key.indexOf(':') + 1);
    // Several places on one trip under one contact
    const byTrip = new Map();
    for (const p of list) byTrip.set(p.trip_id, [...(byTrip.get(p.trip_id) || []), p]);
    for (const [tripId, ps] of byTrip) {
      const id = `many_places_one_payer:${tripId}:${contact}`;
      if (ps.length >= 3 && !seen.has(sig('many', ps))) {
        seen.add(sig('many', ps));
        flags.push({
          id, type: 'many_places_one_payer', level: 'medium', tripId, at: Math.max(...ps.map((p) => Number(p.created_at))),
          summary: `${ps.length} places on one trip under ${contact}`,
          detail: `Names: ${ps.map((p) => p.name || '—').join(', ')}. Check the travellers are real people booking for themselves.`,
        });
      }
    }
    // Many bookings in a short time
    const times = list.map((p) => Number(p.created_at)).sort((a, b) => a - b);
    for (let i = 0; i + 2 < times.length; i++) {
      if (times[i + 2] - times[i] <= 7 * DAY) {
        const id = `rapid_bookings:${contact}`;
        if (!seen.has(sig('rapid', list))) {
          seen.add(sig('rapid', list));
          const trips = new Set(list.map((p) => p.trip_id)).size;
          flags.push({
            id, type: 'rapid_bookings', level: 'medium', tripId: null, at: times[times.length - 1],
            summary: `${list.length} bookings by ${contact} within 7 days`,
            detail: `Across ${trips} trip${trips === 1 ? '' : 's'} in the last 90 days.`,
          });
        }
        break;
      }
    }
  }

  // 4. Payout account changed after travellers had paid
  const changes = await db.rawAll(`SELECT * FROM payout_changes WHERE old_account IS NOT NULL ORDER BY created_at DESC`);
  for (const ch of changes) {
    const paid = ch.subject === 'agent'
      ? await db.raw(
        `SELECT COUNT(*) AS n, COALESCE(SUM(pp.amount), 0) AS total FROM participant_payments pp
           JOIN trips t ON t.id = pp.trip_id WHERE t.agent_id = ? AND pp.created_at <= ?`, [ch.subject_id, ch.created_at])
      : await db.raw(
        `SELECT COUNT(*) AS n, COALESCE(SUM(amount), 0) AS total FROM participant_payments WHERE trip_id = ? AND created_at <= ?`,
        [ch.subject_id, ch.created_at]);
    if (Number(paid?.n || 0) === 0) continue;
    const name = ch.subject === 'agent'
      ? (await db.agents.getById(ch.subject_id))?.agency_name || 'An agency'
      : 'A trip organiser';
    flags.push({
      id: `payout_change_after_paid:${ch.id}`, type: 'payout_change_after_paid', level: 'high',
      tripId: ch.subject === 'trip' ? ch.subject_id : null, at: Number(ch.created_at),
      summary: `${name} changed their payout account after ${fmt(paid.total)} had been paid`,
      detail: `Now pays to ${ch.new_account_name || 'unknown name'} (••••${String(ch.new_account || '').slice(-4)}). Confirm the change with the supplier by phone before any payout.`,
    });
  }

  // 5. Travellers paid on an agency trip before the agency was verified
  const unverified = await db.rawAll(
    `SELECT a.id, a.agency_name, a.verification_status, t.id AS trip_id, COUNT(pp.id) AS n, SUM(pp.amount) AS total
       FROM participant_payments pp JOIN trips t ON t.id = pp.trip_id JOIN agents a ON a.id = t.agent_id
      WHERE a.verification_status <> 'verified'
      GROUP BY a.id, t.id`);
  for (const r of unverified) {
    flags.push({
      id: `unverified_supplier_paid:${r.trip_id}`, type: 'unverified_supplier_paid', level: 'high', tripId: r.trip_id, at: null,
      summary: `${r.agency_name || 'An agency'} is ${r.verification_status}, but travellers paid ${fmt(r.total)}`,
      detail: `${r.n} payment${Number(r.n) === 1 ? '' : 's'}. Verify the agency before paying them anything.`,
    });
  }

  // Attach reviews
  const reviews = await db.rawAll(`SELECT * FROM risk_reviews`);
  const byId = new Map(reviews.map((r) => [r.flag_id, r]));
  for (const f of flags) {
    const r = byId.get(f.id);
    f.review = r ? { status: r.status, note: r.note, reviewer: r.reviewer, at: Number(r.reviewed_at) } : null;
  }
  const rank = { high: 0, medium: 1 };
  flags.sort((a, b) => (!!a.review - !!b.review) || (rank[a.level] - rank[b.level]) || ((b.at || 0) - (a.at || 0)));
  return { flags, thresholds: { largePayment: limit } };
}

const REVIEW_STATUSES = ['cleared', 'escalated', 'reported'];

async function review({ flagId, status, note, reviewer }) {
  if (!REVIEW_STATUSES.includes(status)) throw new Error('Status must be cleared, escalated or reported.');
  if (!note || !String(note).trim()) throw new Error('Add a note saying what you checked.');
  await db.raw(
    `INSERT INTO risk_reviews (flag_id, status, note, reviewer, reviewed_at) VALUES (?, ?, ?, ?, unixepoch())
     ON CONFLICT(flag_id) DO UPDATE SET status = excluded.status, note = excluded.note, reviewer = excluded.reviewer, reviewed_at = excluded.reviewed_at`,
    [flagId, status, String(note).trim().slice(0, 2000), reviewer ? String(reviewer).trim().slice(0, 100) : null]
  );
}

module.exports = { computeFlags, review, logPayoutChange, largePaymentThreshold, REVIEW_STATUSES };
