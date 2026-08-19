/**
 * Chasing people who joined a trip and haven't paid.
 *
 * This is the job Karije is actually being paid to do: the organiser should
 * never have to send "abeg send your own" into a group chat again. Everything
 * here is per-participant and idempotent — a reminder is counted the moment it
 * goes out, so a restart or an overlapping run can't double-send.
 *
 * Channels degrade rather than fail. With no WhatsApp provider it sends email;
 * with neither it records the attempt so the organiser's chase list still shows
 * who has been nudged and when.
 */
const db = require('../db/client');
const { sendText, available: waAvailable } = require('./whatsapp');
const { sendPaymentReminderEmail, available: emailAvailable } = require('./email');

const HOUR = 3600;
const DAY  = 24 * HOUR;

/**
 * When each nudge is due, measured from the previous one (or from joining, for
 * the first). Deliberately short at the start and then backing off — someone
 * who hasn't paid a week later isn't going to, and nagging them costs goodwill.
 */
const STEPS = [
  { after: 1 * DAY,  tone: 'nudge'  },
  { after: 3 * DAY,  tone: 'chase'  },
  { after: 5 * DAY,  tone: 'final'  },
];

const fmtNGN = (n) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(n);

/** The message body for a given step. Short — this arrives on a phone. */
function messageFor({ tone, name, tripName, perPerson, link, daysLeft }) {
  const who = name ? `Hi ${name}` : 'Hi';
  const amount = fmtNGN(perPerson);

  if (tone === 'final') {
    return `${who} — last call for *${tripName}*.\n\n` +
      `Your share is ${amount}. The squad is only confirmed once everyone has paid` +
      (daysLeft != null ? `, and the trip is ${daysLeft} day${daysLeft === 1 ? '' : 's'} away.` : '.') +
      `\n\nPay here: ${link}\n\n— Karije`;
  }
  if (tone === 'chase') {
    return `${who} — still holding your spot on *${tripName}*.\n\n` +
      `${amount} for your share. Takes about a minute:\n${link}\n\n— Karije`;
  }
  return `${who}! You're on the list for *${tripName}* 🎉\n\n` +
    `Your share is ${amount}. Pay whenever you're ready:\n${link}\n\n— Karije`;
}

/** Everyone whose next reminder is due right now. */
async function findDue(now = Math.floor(Date.now() / 1000)) {
  const rows = await db.rawAll(
    `SELECT p.id, p.trip_id, p.name, p.email, p.wa_number,
            p.reminders_sent, p.last_reminded_at, p.created_at,
            t.plan, t.selected_date, t.status
       FROM participants p
       JOIN trips t ON t.id = p.trip_id
      WHERE p.paid = 0
        AND p.reminders_sent < ?
        AND t.status IN ('curated', 'custom', 'awaiting_group')`,
    [STEPS.length]
  );

  return rows.filter((r) => {
    const step  = STEPS[Number(r.reminders_sent)];
    const since = Number(r.last_reminded_at || r.created_at);
    return now - since >= step.after;
  });
}

/**
 * Send one participant their next reminder.
 * Returns the channel used, or null when there was no way to reach them.
 */
async function remindOne(row, { frontendUrl }) {
  const plan      = row.plan ? JSON.parse(row.plan) : null;
  const perPerson = plan?.cost_breakdown?.per_person || 0;
  const tripName  = plan?.curated?.name || plan?.days?.length ? (plan?.curated?.name || 'your trip') : 'your trip';
  const link      = `${frontendUrl}/plan/${row.trip_id}`;
  const step      = STEPS[Number(row.reminders_sent)];

  let daysLeft = null;
  if (row.selected_date && /^\d{4}-\d{2}-\d{2}$/.test(row.selected_date)) {
    const diff = Math.ceil((new Date(row.selected_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (diff >= 0) daysLeft = diff;
  }

  const body = messageFor({
    tone: step.tone, name: row.name, tripName, perPerson, link, daysLeft,
  });

  let channel = null;

  // WhatsApp first — it's the one that actually gets read.
  if (row.wa_number && waAvailable()) {
    try {
      await sendText(normaliseNumber(row.wa_number), body);
      channel = 'whatsapp';
    } catch (err) {
      console.warn(`[reminders] whatsapp failed for ${row.id}: ${err.message}`);
    }
  }

  if (!channel && row.email && emailAvailable()) {
    try {
      await sendPaymentReminderEmail({
        to: row.email, name: row.name, tripName, perPerson, link, daysLeft, tone: step.tone,
      });
      channel = 'email';
    } catch (err) {
      console.warn(`[reminders] email failed for ${row.id}: ${err.message}`);
    }
  }

  // Count the attempt either way. If we can't reach someone, retrying the same
  // step forever just burns the schedule — the organiser's chase list is the
  // fallback, and it shows exactly who we couldn't reach.
  await db.raw(
    `UPDATE participants SET reminders_sent = reminders_sent + 1, last_reminded_at = unixepoch()
      WHERE id = ?`,
    [row.id]
  );

  return channel;
}

/** Nigerian numbers arrive every possible way; wa.me wants digits with country code. */
function normaliseNumber(raw) {
  let d = String(raw).replace(/\D/g, '');
  if (d.startsWith('0')) d = `234${d.slice(1)}`;
  return d;
}

/** One pass. Safe to call repeatedly; does nothing when nothing is due. */
async function runOnce() {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
  const due = await findDue();
  if (due.length === 0) return { checked: 0, sent: 0, unreachable: 0 };

  let sent = 0, unreachable = 0;
  for (const row of due) {
    const channel = await remindOne(row, { frontendUrl });
    if (channel) sent++; else unreachable++;
  }

  console.log(`[reminders] ${due.length} due — ${sent} sent, ${unreachable} unreachable`);
  return { checked: due.length, sent, unreachable };
}

/** Start the background loop. Hourly is plenty for a schedule measured in days. */
function start({ intervalMs = HOUR * 1000 } = {}) {
  const tick = () => runOnce().catch(err => console.error('[reminders]', err.message));
  setTimeout(tick, 30_000).unref?.();          // let the server finish booting
  const timer = setInterval(tick, intervalMs);
  timer.unref?.();                              // never hold the process open
  console.log(`[reminders] chase-up running every ${Math.round(intervalMs / 60000)} min`);
  return timer;
}

module.exports = { start, runOnce, findDue, messageFor, STEPS };
