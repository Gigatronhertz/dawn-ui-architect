/**
 * Monthly nudges for travellers paying a pro-agency trip off in installments,
 * plus a periodic digest to the agency of how its subscribers are tracking.
 *
 * Kept separate from services/reminders.js on purpose — that file's daily
 * 1/3/5-day escalation for someone who hasn't paid at all yet is already
 * verified, and an installment's due date is a fundamentally different shape
 * (recurring, resets every time a payment lands) rather than a one-shot
 * countdown. Both are driven from the same hourly tick in index.js.
 */
const db = require('../db/client');
const { sendInstallmentReminderEmail, sendInstallmentDigestEmail, available: emailAvailable } = require('./email');
const whisper360 = require('./whisper360');

const WHISPER360_TEMPLATES = {
  nudge:   process.env.WHISPER360_TEMPLATE_INSTALLMENT_NUDGE   || 'karije_installment_reminder',
  overdue: process.env.WHISPER360_TEMPLATE_INSTALLMENT_OVERDUE || 'karije_installment_overdue',
  final:   process.env.WHISPER360_TEMPLATE_INSTALLMENT_OVERDUE || 'karije_installment_overdue',
};
const WHISPER360_DIGEST_TEMPLATE = process.env.WHISPER360_TEMPLATE_INSTALLMENT_DIGEST || 'karije_installment_digest';

const CHANNEL_ORDER = (process.env.REMINDER_CHANNELS || 'email')
  .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);

const HOUR = 3600;
const DAY  = 24 * HOUR;

/**
 * How the reminder tone escalates within one due-cycle (reset to step 0 every
 * time a payment lands — see db.participants.recordPayment). Capped at 6
 * attempts so a subscriber who's gone quiet for months doesn't get chased
 * forever; the agency's own dashboard is the fallback for that.
 */
const CYCLE_STEPS = [
  { after: 0,       tone: 'nudge'   },
  { after: 5 * DAY, tone: 'overdue' },
  { after: 10 * DAY, tone: 'final'  },
];
const MAX_ATTEMPTS = 6;

const fmtNGN = (n) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(n);

/** Everyone whose next installment/reminder is due right now, filtered to
 *  the same backoff schedule reminders.js uses for one-time payments. */
async function findDue(now = Math.floor(Date.now() / 1000)) {
  const rows = await db.participants.dueInstallments();
  return rows.filter((r) => {
    const sent = Number(r.reminders_sent || 0);
    if (sent >= MAX_ATTEMPTS) return false;
    const step  = CYCLE_STEPS[Math.min(sent, CYCLE_STEPS.length - 1)];
    const since = Number(r.last_reminded_at || r.next_due_at);
    return now - since >= step.after;
  });
}

/** Figures every installment reminder needs, computed fresh each send. */
async function installmentFigures(row) {
  const plan   = row.plan ? JSON.parse(row.plan) : null;
  const target = Number(row.amount) || 0;
  const months = Number(row.installment_months) || 1;
  const installmentAmount = Math.ceil(target / months);
  const paidSoFar = await db.participants.paidTotal(row.id);
  const remaining = Math.max(0, target - paidSoFar);
  const amountDue = Math.min(installmentAmount, remaining);
  const monthNumber = Math.min(months, Math.round(paidSoFar / installmentAmount) + 1);

  let monthsUntilTrip = null;
  if (row.selected_date) {
    const d = new Date(row.selected_date);
    if (!isNaN(d)) monthsUntilTrip = Math.max(0, Math.ceil((d.getTime() - Date.now()) / (30 * DAY * 1000)));
  }

  const tripName = plan?.curated?.name || row.title || row.destination || 'your trip';

  return { target, months, installmentAmount, paidSoFar, remaining, amountDue, monthNumber, monthsUntilTrip, tripName };
}

/** Send one subscriber their next installment reminder. Returns the channel
 *  used, or null when there was no way to reach them — same contract as
 *  reminders.js's remindOne(). */
async function remindInstallment(row, { payBase }) {
  const sent = Number(row.reminders_sent || 0);
  const step = CYCLE_STEPS[Math.min(sent, CYCLE_STEPS.length - 1)];
  const figures = await installmentFigures(row);
  const link = `${payBase}/pay/${row.id}`;

  const attempts = {
    async email() {
      if (!row.email || !emailAvailable()) return false;
      try {
        await sendInstallmentReminderEmail({
          to: row.email, name: row.name, tripName: figures.tripName,
          monthNumber: figures.monthNumber, totalMonths: figures.months,
          amountDue: figures.amountDue, paidSoFar: figures.paidSoFar,
          targetAmount: figures.target, remaining: figures.remaining,
          monthsUntilTrip: figures.monthsUntilTrip, link,
          tone: step.tone === 'nudge' ? 'nudge' : 'overdue',
        });
        return true;
      } catch (err) {
        console.warn(`[installmentReminders] email failed for ${row.id}: ${err.message}`);
        return false;
      }
    },
    async whatsapp() {
      if (!row.wa_number || !whisper360.available()) return false;
      const templateName = WHISPER360_TEMPLATES[step.tone];
      const variables = {
        name: row.name || 'there',
        trip_name: figures.tripName,
        month_number: String(figures.monthNumber),
        total_months: String(figures.months),
        amount_due: fmtNGN(figures.amountDue),
        remaining: fmtNGN(figures.remaining),
        months_until_trip: figures.monthsUntilTrip != null ? String(figures.monthsUntilTrip) : '',
        link,
      };
      const result = await whisper360.sendTemplate(row.wa_number, templateName, variables);
      if (!result.ok) {
        console.warn(`[installmentReminders] whatsapp failed for ${row.id}: ${result.reason}`);
      }
      return result.ok;
    },
  };

  let channel = null;
  for (const name of CHANNEL_ORDER) {
    const attempt = attempts[name];
    if (!attempt) continue;
    if (await attempt()) { channel = name; break; }
  }

  await db.raw(
    `UPDATE participants SET reminders_sent = reminders_sent + 1, last_reminded_at = unixepoch() WHERE id = ?`,
    [row.id]
  );

  return channel;
}

/** One pass over due installment reminders. Safe to call repeatedly. */
async function runOnce() {
  const payBase = (process.env.BACKEND_URL || 'https://dawn-ui-architect.onrender.com').replace(/\/$/, '');
  const due = await findDue();
  if (due.length === 0) return { checked: 0, sent: 0, unreachable: 0 };

  let sent = 0, unreachable = 0;
  for (const row of due) {
    const channel = await remindInstallment(row, { payBase });
    if (channel) sent++; else unreachable++;
  }

  console.log(`[installmentReminders] ${due.length} due — ${sent} sent, ${unreachable} unreachable`);
  return { checked: due.length, sent, unreachable };
}

/**
 * One periodic digest per agency, covering every installment subscriber
 * across all of that agency's trips — not one message per subscriber, which
 * would make an agency dread opening it.
 */
async function sendInstallmentDigests() {
  const agents = await db.installmentDigests.dueAgents();
  if (agents.length === 0) return { agenciesNotified: 0 };

  const dashboardUrl = `${(process.env.FRONTEND_URL || 'https://karije.com').replace(/\/$/, '')}/pro/dashboard?tab=money`;
  let agenciesNotified = 0;

  for (const agent of agents) {
    const subs = await db.installmentDigests.subscribers(agent.id);
    if (subs.length === 0) { await db.installmentDigests.markSent(agent.id); continue; }

    // Group subscribers by trip for the email's per-trip breakdown.
    const byTrip = new Map();
    for (const s of subs) {
      const key = s.trip_id;
      if (!byTrip.has(key)) byTrip.set(key, { name: s.title || s.destination || 'Trip', subscribers: [] });
      const paidAmount = await db.participants.paidTotal(s.id);
      byTrip.get(key).subscribers.push({ name: s.name, paidAmount, targetAmount: Number(s.amount) || 0 });
    }
    const trips = Array.from(byTrip.values());

    try {
      if (agent.email) {
        await sendInstallmentDigestEmail({ to: agent.email, agencyName: agent.agency_name, link: dashboardUrl, trips });
      }
      if (agent.wa_number && whisper360.available()) {
        await whisper360.sendTemplate(agent.wa_number, WHISPER360_DIGEST_TEMPLATE, {
          agency_name: agent.agency_name || 'there',
          trip_count: String(trips.length),
          subscriber_count: String(subs.length),
          link: dashboardUrl,
        });
      }
    } catch (err) {
      console.warn(`[installmentReminders] digest failed for agent ${agent.id}: ${err.message}`);
    }

    await db.installmentDigests.markSent(agent.id);
    agenciesNotified++;
  }

  console.log(`[installmentReminders] digest sent to ${agenciesNotified} agenc${agenciesNotified === 1 ? 'y' : 'ies'}`);
  return { agenciesNotified };
}

async function tick() {
  try { await runOnce(); } catch (err) { console.error('[installmentReminders]', err.message); }
  try { await sendInstallmentDigests(); } catch (err) { console.error('[installmentReminders digest]', err.message); }
}

/** Start the background loop — same hourly cadence as services/reminders.js,
 *  just a separate timer so one module's failure can't stall the other. */
function start({ intervalMs = HOUR * 1000 } = {}) {
  setTimeout(tick, 45_000).unref?.();   // stagger slightly behind reminders.js's own 30s startup delay
  const timer = setInterval(tick, intervalMs);
  timer.unref?.();
  console.log(`[installmentReminders] running every ${Math.round(intervalMs / 60000)} min`);
  return timer;
}

module.exports = { start, tick, runOnce, findDue, remindInstallment, sendInstallmentDigests, CYCLE_STEPS, MAX_ATTEMPTS };
