/**
 * Chasing people who joined a trip and haven't paid.
 *
 * This is the job Karije is actually being paid to do: the organiser should
 * never have to send "abeg send your own" into a group chat again. Everything
 * here is per-participant and idempotent — a reminder is counted the moment it
 * goes out, so a restart or an overlapping run can't double-send.
 *
 * Channels degrade rather than fail: it tries each in CHANNEL_ORDER and stops
 * at the first that lands. With none of them reachable it still records the
 * attempt, so the organiser's chase list shows who has been nudged and when.
 */
const db = require('../db/client');
const { sendPaymentReminderEmail, available: emailAvailable } = require('./email');
const whisper360 = require('./whisper360');

/**
 * One Whisper360 template per tone — WhatsApp templates can't branch on
 * content, so "nudge"/"chase"/"final" are three separate approved templates
 * rather than one with an if/else. Names match what reminders.js creates as
 * drafts (see scripts/createReminderTemplates.js); approve each once in the
 * Whisper360 console before enabling the whatsapp channel below.
 */
const WHISPER360_TEMPLATES = {
  nudge: process.env.WHISPER360_TEMPLATE_NUDGE || 'karije_reminder_nudge',
  chase: process.env.WHISPER360_TEMPLATE_CHASE || 'karije_reminder_chase',
  final: process.env.WHISPER360_TEMPLATE_FINAL || 'karije_reminder_final',
};

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

/**
 * Which channels to try, in order, stopping at the first that lands.
 *
 * Email-only by default. Set REMINDER_CHANNELS=whatsapp,email once the three
 * templates in WHISPER360_TEMPLATES are approved in the Whisper360 console —
 * sending against an unapproved template just returns a blocked outcome
 * every time, so there's no harm in enabling it early, but nothing will
 * actually go out until approval lands.
 */
const CHANNEL_ORDER = (process.env.REMINDER_CHANNELS || 'email')
  .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);

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
async function remindOne(row, { payBase }) {
  const plan      = row.plan ? JSON.parse(row.plan) : null;
  const perPerson = plan?.cost_breakdown?.per_person || 0;
  const tripName  = plan?.curated?.name || plan?.days?.length ? (plan?.curated?.name || 'your trip') : 'your trip';
  // Straight to paying, not to the plan page with a Pay button on it. The
  // backend resolves this to a live Paystack checkout when it's clicked.
  const link      = `${payBase}/pay/${row.id}`;
  const step      = STEPS[Number(row.reminders_sent)];

  let daysLeft = null;
  if (row.selected_date && /^\d{4}-\d{2}-\d{2}$/.test(row.selected_date)) {
    const diff = Math.ceil((new Date(row.selected_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (diff >= 0) daysLeft = diff;
  }

  const attempts = {
    async email() {
      if (!row.email || !emailAvailable()) return false;
      try {
        await sendPaymentReminderEmail({
          to: row.email, name: row.name, tripName, perPerson, link, daysLeft, tone: step.tone,
        });
        return true;
      } catch (err) {
        console.warn(`[reminders] email failed for ${row.id}: ${err.message}`);
        return false;
      }
    },
    async whatsapp() {
      if (!row.wa_number || !whisper360.available()) return false;
      const templateName = WHISPER360_TEMPLATES[step.tone];
      const variables = {
        name: row.name || 'there',
        trip_name: tripName,
        amount: fmtNGN(perPerson),
        link,
        // Only the "final" template body uses this placeholder — sent for
        // all three tones anyway since a template only rejects a *missing*
        // declared variable, not an extra one it doesn't reference.
        days_phrase: daysLeft != null ? `, and the trip is ${daysLeft} day${daysLeft === 1 ? '' : 's'} away` : '',
      };
      const result = await whisper360.sendTemplate(row.wa_number, templateName, variables);
      if (!result.ok) {
        console.warn(`[reminders] whatsapp failed for ${row.id}: ${result.reason}`);
      }
      return result.ok;
    },
  };

  let channel = null;
  for (const name of CHANNEL_ORDER) {
    const attempt = attempts[name];
    if (!attempt) {
      console.warn(`[reminders] unknown channel in REMINDER_CHANNELS: ${name}`);
      continue;
    }
    if (await attempt()) { channel = name; break; }
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

/** How long an agency must wait before chasing the same person again. */
const MANUAL_COOLDOWN = 60 * 60;   // one hour, in seconds

/**
 * Send one participant a reminder right now, on an agency's say-so.
 *
 * Skips the findDue schedule — that is the whole point — but keeps the guards
 * that matter: never chase someone who has paid, and never let a dashboard
 * button turn into a spam cannon. Tone is clamped to the last step so a
 * participant who has already run out the schedule still gets a sane message
 * instead of an undefined step.
 *
 * Returns { ok, channel } on success, or { ok: false, reason } so the caller
 * can tell "already paid" apart from "we have no way to reach them".
 */
async function remindNow(participantId) {
  const row = await db.raw(
    `SELECT p.id, p.trip_id, p.name, p.email, p.wa_number, p.paid,
            p.reminders_sent, p.last_reminded_at, p.created_at,
            t.plan, t.selected_date, t.status
       FROM participants p
       JOIN trips t ON t.id = p.trip_id
      WHERE p.id = ?`,
    [participantId]
  );

  if (!row)      return { ok: false, reason: 'not_found' };
  if (row.paid)  return { ok: false, reason: 'already_paid' };

  const last = Number(row.last_reminded_at || 0);
  const now  = Math.floor(Date.now() / 1000);
  if (last && now - last < MANUAL_COOLDOWN) {
    return { ok: false, reason: 'too_soon', retryAfter: MANUAL_COOLDOWN - (now - last) };
  }

  const payBase = (process.env.BACKEND_URL || 'https://dawn-ui-architect.onrender.com').replace(/\/$/, '');

  // remindOne indexes STEPS by reminders_sent; past the end of the schedule
  // that is undefined, so hold at the final tone.
  const clamped = { ...row, reminders_sent: Math.min(Number(row.reminders_sent || 0), STEPS.length - 1) };

  const channel = await remindOne(clamped, { payBase });
  return channel ? { ok: true, channel } : { ok: false, reason: 'unreachable' };
}

/** One pass. Safe to call repeatedly; does nothing when nothing is due. */
async function runOnce() {
  // The pay link is a backend URL. Falling back to localhost here is what put
  // an unclickable "Pay now" button in front of real people — every other
  // module in the backend falls back to the deployed host, and so does this.
  const payBase = (process.env.BACKEND_URL || 'https://dawn-ui-architect.onrender.com').replace(/\/$/, '');
  const due = await findDue();
  if (due.length === 0) return { checked: 0, sent: 0, unreachable: 0 };

  let sent = 0, unreachable = 0;
  for (const row of due) {
    const channel = await remindOne(row, { payBase });
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

module.exports = { start, runOnce, findDue, remindNow, messageFor, STEPS, MANUAL_COOLDOWN };
