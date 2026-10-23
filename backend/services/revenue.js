/**
 * Karije's own income, for the admin Revenue tab. Two streams:
 *
 *   subscriptions — Pro agencies' ₦10,000/month (subscription_charges)
 *   aiPlans       — ₦500 packs of AI trip plans (ai_credit_purchases)
 *
 * Everything is derived from the payment rows themselves, same as ledger.js,
 * so no running total can drift. Months are bucketed in Lagos time (UTC+1).
 */
const db = require('../db/client');

const LAGOS_OFFSET = 3600;
const month = (col) => `strftime('%Y-%m', ${col} + ${LAGOS_OFFSET}, 'unixepoch')`;
const thisMonth = () => new Date(Date.now() + LAGOS_OFFSET * 1000).toISOString().slice(0, 7);
const num = (v) => Number(v ?? 0);

async function subscriptions() {
  const agencies = await db.rawAll(
    `SELECT a.id, a.agency_name, a.email, a.subscription_status AS status,
            a.subscription_next_charge_at AS next_charge_at,
            a.subscription_failed_attempts AS failed_attempts,
            (SELECT COALESCE(SUM(amount), 0) FROM subscription_charges c WHERE c.agent_id = a.id AND c.status = 'success') AS total_paid,
            (SELECT MAX(created_at) FROM subscription_charges c WHERE c.agent_id = a.id AND c.status = 'success') AS last_paid_at
       FROM agents a
      ORDER BY CASE a.subscription_status
                 WHEN 'suspended' THEN 0 WHEN 'past_due' THEN 1 WHEN 'active' THEN 2 ELSE 3 END,
               a.agency_name`
  );
  const charges = await db.rawAll(
    `SELECT c.id, c.agent_id, a.agency_name, c.amount, c.reference, c.status, c.created_at
       FROM subscription_charges c LEFT JOIN agents a ON a.id = c.agent_id
      ORDER BY c.created_at DESC LIMIT 200`
  );
  const counts = { active: 0, past_due: 0, suspended: 0, exempt: 0 };
  for (const a of agencies) if (a.status in counts) counts[a.status]++;
  return {
    counts,
    agencies: agencies.map((a) => ({
      ...a, total_paid: num(a.total_paid), failed_attempts: num(a.failed_attempts),
    })),
    charges: charges.map((c) => ({ ...c, amount: num(c.amount) })),
  };
}

async function aiPlans() {
  const [p] = await db.rawAll(
    `SELECT COUNT(*) AS packs, COALESCE(SUM(amount), 0) AS revenue, COALESCE(SUM(credits), 0) AS credits_sold
       FROM ai_credit_purchases`
  );
  const usage = await db.rawAll(`SELECT kind, COUNT(*) AS n FROM ai_plan_usage GROUP BY kind`);
  const used = Object.fromEntries(usage.map((u) => [u.kind, num(u.n)]));
  const recent = await db.rawAll(
    `SELECT id, user_id, email, amount, credits, reference, created_at
       FROM ai_credit_purchases ORDER BY created_at DESC LIMIT 100`
  );
  return {
    packs:        num(p?.packs),
    revenue:      num(p?.revenue),
    creditsSold:  num(p?.credits_sold),
    plansGenerated: { free: used.free || 0, credit: used.credit || 0, pro: used.pro || 0 },
    purchases:    recent.map((r) => ({ ...r, amount: num(r.amount) })),
  };
}

/** Revenue per stream per month, last 12 months. */
async function monthly() {
  const subs = await db.rawAll(
    `SELECT ${month('created_at')} AS m, SUM(amount) AS v FROM subscription_charges
      WHERE status = 'success' GROUP BY m`
  );
  const ai = await db.rawAll(`SELECT ${month('created_at')} AS m, SUM(amount) AS v FROM ai_credit_purchases GROUP BY m`);

  const months = [];
  const d = new Date(Date.now() + LAGOS_OFFSET * 1000);
  d.setUTCDate(1);
  for (let i = 0; i < 12; i++) {
    months.unshift(d.toISOString().slice(0, 7));
    d.setUTCMonth(d.getUTCMonth() - 1);
  }
  const pick = (rows, m) => Math.round(num(rows.find((r) => r.m === m)?.v));
  return months.map((m) => {
    const row = { month: m, subscriptions: pick(subs, m), aiPlans: pick(ai, m) };
    return { ...row, total: row.subscriptions + row.aiPlans };
  });
}

async function report() {
  const [s, a, m] = await Promise.all([subscriptions(), aiPlans(), monthly()]);
  const now = thisMonth();
  const current = m.find((x) => x.month === now) || { subscriptions: 0, aiPlans: 0, total: 0 };
  const allTime = {
    subscriptions: s.agencies.reduce((t, x) => t + x.total_paid, 0),
    aiPlans:       a.revenue,
  };
  allTime.total = allTime.subscriptions + allTime.aiPlans;
  return {
    thisMonth: current,
    allTime,
    subscriptions: s,
    aiPlans: a,
    monthly: m,
  };
}

module.exports = { report };
