/**
 * What Karije holds, what it keeps, and what it owes.
 *
 * Karije is the payment rail for every trip planned on the platform: it
 * collects each person's share, keeps a service fee for processing and
 * chasing, and disburses the rest to whoever is running the trip. Money spent
 * at the venue on the day is not Karije's — the ledger stops at the payout.
 *
 * Every figure here is derived from rows in the database rather than stored as
 * a running total, so a balance can't silently drift out of step with the
 * payments and payouts that produced it.
 */
const db = require('../db/client');

/**
 * Karije's cut, per person, per trip. Flat rather than a percentage: Paystack
 * already takes a percentage, and stacking two makes a big squad's fee feel
 * punitive for work that costs us the same either way.
 */
const DEFAULT_SERVICE_FEE = Number(process.env.SERVICE_FEE_PER_PERSON || 500);

/** The fee a trip was created under. Snapshotted, so rate changes aren't retroactive. */
function feeForTrip(trip) {
  const stored = Number(trip?.service_fee_per_person);
  return Number.isFinite(stored) && stored >= 0 ? stored : DEFAULT_SERVICE_FEE;
}

/**
 * Full money position for one trip.
 *
 * collected      — actually received from squad members
 * serviceFee     — Karije's share of that
 * dueToOrganiser — collected minus fee
 * paidOut        — released so far (staged payouts included)
 * outstanding    — still to release
 */
async function forTrip(tripId) {
  const trip = await db.trips.get(tripId);
  if (!trip) return null;

  const paidRows = await db.rawAll(
    `SELECT COUNT(*) AS n, COALESCE(SUM(amount), 0) AS total
       FROM participants WHERE trip_id = ? AND paid = 1`,
    [tripId]
  );
  const paidCount = Number(paidRows[0]?.n     ?? 0);
  const collected = Number(paidRows[0]?.total ?? 0);

  const payoutRows = await db.rawAll(
    `SELECT COALESCE(SUM(amount), 0) AS total
       FROM payouts WHERE trip_id = ? AND status = 'paid'`,
    [tripId]
  );
  const paidOut = Number(payoutRows[0]?.total ?? 0);

  const fee            = feeForTrip(trip);
  const serviceFee     = fee * paidCount;
  const dueToOrganiser = Math.max(0, collected - serviceFee);

  return {
    tripId,
    paidCount,
    collected,
    feePerPerson: fee,
    serviceFee,
    dueToOrganiser,
    paidOut,
    outstanding: Math.max(0, dueToOrganiser - paidOut),
    payoutAccount: trip.payout_account_no ? {
      bankCode:    trip.payout_bank_code,
      accountNo:   trip.payout_account_no,
      accountName: trip.payout_account_name,
    } : null,
  };
}

/** Every trip holding money, worst-first by what's still owed. */
async function outstandingTrips() {
  const rows = await db.rawAll(
    `SELECT t.id, t.destination, t.status, t.selected_date, t.plan,
            t.service_fee_per_person, t.payout_account_name,
            (SELECT COUNT(*)                  FROM participants p WHERE p.trip_id = t.id AND p.paid = 1) AS paid_count,
            (SELECT COALESCE(SUM(p.amount),0) FROM participants p WHERE p.trip_id = t.id AND p.paid = 1) AS collected,
            (SELECT COALESCE(SUM(o.amount),0) FROM payouts o      WHERE o.trip_id = t.id AND o.status = 'paid') AS paid_out
       FROM trips t
      WHERE t.status IN ('curated', 'custom', 'awaiting_group', 'active')
      ORDER BY t.created_at DESC`
  );

  return rows
    .map((r) => {
      const plan       = r.plan ? JSON.parse(r.plan) : null;
      const fee        = Number.isFinite(Number(r.service_fee_per_person))
        ? Number(r.service_fee_per_person) : DEFAULT_SERVICE_FEE;
      const paidCount  = Number(r.paid_count ?? 0);
      const collected  = Number(r.collected ?? 0);
      const serviceFee = fee * paidCount;
      const due        = Math.max(0, collected - serviceFee);
      const paidOut    = Number(r.paid_out ?? 0);
      return {
        tripId:      r.id,
        name:        plan?.curated?.name || r.destination || 'Trip',
        destination: r.destination,
        tripDate:    r.selected_date || null,
        paidCount,
        collected,
        serviceFee,
        dueToOrganiser: due,
        paidOut,
        outstanding: Math.max(0, due - paidOut),
        payoutAccountName: r.payout_account_name || null,
      };
    })
    .filter((t) => t.collected > 0)
    .sort((a, b) => b.outstanding - a.outstanding);
}

module.exports = { forTrip, outstandingTrips, feeForTrip, DEFAULT_SERVICE_FEE };
