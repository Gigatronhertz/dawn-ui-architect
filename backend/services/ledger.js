/**
 * What Karije holds, what it keeps, and what it owes.
 *
 * Karije is the payment rail for every trip planned on the platform: it
 * collects each person's share and disburses it to whoever is running the
 * trip. Karije takes no cut of what travellers pay: agencies pay a monthly
 * subscription, and Karije's own curated trips are Karije's to run. Money spent
 * at the venue on the day is not Karije's — the ledger stops at the payout.
 *
 * Every figure here is derived from rows in the database rather than stored as
 * a running total, so a balance can't silently drift out of step with the
 * payments and payouts that produced it.
 */
const db = require('../db/client');

/**
 * Full money position for one trip.
 *
 * collected      — actually received from squad members
 * dueToOrganiser — all of it; Karije takes no cut
 * paidOut        — released so far (staged payouts included)
 * outstanding    — still to release
 */
async function forTrip(tripId) {
  const trip = await db.trips.get(tripId);
  if (!trip) return null;

  const paidCountRows = await db.rawAll(
    `SELECT COUNT(*) AS n FROM participants WHERE trip_id = ? AND paid = 1`,
    [tripId]
  );
  const paidCount = Number(paidCountRows[0]?.n ?? 0);

  // Actual cash received — every charge, not just from participants who've
  // finished paying off their plan. An installment subscriber's first
  // payment is just as real and just as held as anyone else's full payment.
  const collectedRows = await db.rawAll(
    `SELECT COALESCE(SUM(amount), 0) AS total FROM participant_payments WHERE trip_id = ?`,
    [tripId]
  );
  const collected = Number(collectedRows[0]?.total ?? 0);

  const payoutRows = await db.rawAll(
    `SELECT COALESCE(SUM(amount), 0) AS total
       FROM payouts WHERE trip_id = ? AND status = 'paid'`,
    [tripId]
  );
  const paidOut = Number(payoutRows[0]?.total ?? 0);

  const dueToOrganiser = collected;
  const squadSize      = Number(trip.squad_size) || 0;

  return {
    tripId,
    paidCount,
    squadSize,
    collected,
    dueToOrganiser,
    paidOut,
    outstanding: Math.max(0, dueToOrganiser - paidOut),
    // The actual protection this whole system exists for: money only moves
    // to the agency once every seat is both filled AND paid — never before,
    // so a trip that doesn't fill still has Karije holding the funds to
    // refund from, instead of an agency that may not still have it.
    readyToDisburse: squadSize > 0 && paidCount >= squadSize,
    payoutAccount: trip.payout_account_no ? {
      bankCode:    trip.payout_bank_code,
      accountNo:   trip.payout_account_no,
      accountName: trip.payout_account_name,
    } : null,
  };
}

/**
 * Every trip holding money, worst-first by what's still owed.
 * @param {{ agentId?: string }} opts — pass agentId to scope this to one
 *   agency's own trips (the Pro dashboard's Money tab); omit for the admin
 *   panel's platform-wide view.
 */
async function outstandingTrips({ agentId } = {}) {
  const rows = await db.rawAll(
    `SELECT t.id, t.title, t.destination, t.status, t.selected_date, t.plan, t.squad_size,
            t.payout_account_name,
            (SELECT COUNT(*)                  FROM participants p       WHERE p.trip_id = t.id AND p.paid = 1) AS paid_count,
            (SELECT COALESCE(SUM(pp.amount),0) FROM participant_payments pp WHERE pp.trip_id = t.id)            AS collected,
            (SELECT COALESCE(SUM(o.amount),0) FROM payouts o      WHERE o.trip_id = t.id AND o.status = 'paid') AS paid_out
       FROM trips t
      WHERE t.status IN ('curated', 'custom', 'awaiting_group', 'active')
        AND (? IS NULL OR t.agent_id = ?)
      ORDER BY t.created_at DESC`,
    [agentId || null, agentId || null]
  );

  return rows
    .map((r) => {
      const plan       = r.plan ? JSON.parse(r.plan) : null;
      const paidCount   = Number(r.paid_count ?? 0);
      const squadSize   = Number(r.squad_size) || 0;
      const collected   = Number(r.collected ?? 0);
      const due         = collected;
      const paidOut    = Number(r.paid_out ?? 0);
      return {
        tripId:      r.id,
        name:        r.title || plan?.curated?.name || r.destination || 'Trip',
        destination: r.destination,
        tripDate:    r.selected_date || null,
        paidCount,
        squadSize,
        collected,
        dueToOrganiser: due,
        paidOut,
        outstanding: Math.max(0, due - paidOut),
        readyToDisburse: squadSize > 0 && paidCount >= squadSize,
        payoutAccountName: r.payout_account_name || null,
      };
    })
    .filter((t) => t.collected > 0)
    .sort((a, b) => b.outstanding - a.outstanding);
}

module.exports = { forTrip, outstandingTrips };
