/**
 * Email notifications via Resend.
 * Lazy-init — a missing RESEND_API_KEY disables sending without crashing startup.
 */
const { Resend } = require('resend');

let _resend = null;

function getResend() {
  if (_resend) return _resend;
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY not set — email notifications disabled');
    return null;
  }
  _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

const FRONTEND = process.env.FRONTEND_URL || 'https://mysquadgo.vercel.app';
const FROM     = process.env.EMAIL_FROM    || 'MySquadGo <onboarding@resend.dev>';

/**
 * Sends a "plan is ready" email.
 * @param {{ to: string, destination: string, origin: string, days: number, squadSize: number, perPerson: number, tripId: string }} opts
 */
async function sendPlanReadyEmail({ to, destination, origin, days, squadSize, perPerson, tripId }) {
  const resend = getResend();
  if (!resend || !to) return;

  const planUrl = `${FRONTEND}/start?job=${tripId}`;
  const fmtNGN  = (n) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(n);

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Your squad plan is ready</title></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111827">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08)">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px 32px 24px;text-align:center">
          <div style="font-size:28px;margin-bottom:8px">🎉</div>
          <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;letter-spacing:-0.3px">Your squad plan is ready!</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:14px">${origin} → ${destination}</p>
        </td></tr>

        <!-- Trip summary -->
        <tr><td style="padding:28px 32px 20px">
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
            <tr style="background:#f9fafb">
              <td style="padding:14px 20px;border-right:1px solid #e5e7eb">
                <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#6b7280;margin-bottom:4px">Duration</div>
                <div style="font-size:18px;font-weight:700;color:#111827">${days} day${days === 1 ? '' : 's'}</div>
              </td>
              <td style="padding:14px 20px;border-right:1px solid #e5e7eb">
                <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#6b7280;margin-bottom:4px">Squad</div>
                <div style="font-size:18px;font-weight:700;color:#111827">${squadSize} people</div>
              </td>
              <td style="padding:14px 20px">
                <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#6366f1;margin-bottom:4px">Per person</div>
                <div style="font-size:18px;font-weight:700;color:#6366f1">${fmtNGN(perPerson)}</div>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- CTA -->
        <tr><td style="padding:0 32px 32px;text-align:center">
          <a href="${planUrl}"
             style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;padding:14px 36px;border-radius:100px;font-weight:600;font-size:15px;letter-spacing:-0.1px;box-shadow:0 4px 12px rgba(99,102,241,0.35)">
            View &amp; share your plan →
          </a>
          <p style="margin:16px 0 0;font-size:12px;color:#9ca3af">
            Or paste this link: <a href="${planUrl}" style="color:#6366f1">${planUrl}</a>
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 32px;border-top:1px solid #f3f4f6;text-align:center">
          <p style="margin:0;font-size:11px;color:#d1d5db">MySquadGo · Group travel, made easy.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `Your squad plan for ${destination} is ready! 🎉`,
      html,
    });
    console.log(`[email] plan-ready sent to ${to}`);
  } catch (err) {
    console.warn('[email] send failed:', err.message);
  }
}

/** True when email can actually be sent — callers use this to pick a channel. */
function available() {
  return !!process.env.RESEND_API_KEY;
}

const fmtNGN = (n) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(n);

/** Shared shell so every Karije email looks like the same company sent it. */
function shell({ heading, body, ctaLabel, ctaUrl, footnote }) {
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#f7f1e7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;">
    <div style="background:#2f4a33;padding:20px 24px;">
      <span style="color:#f7f1e7;font-size:18px;font-weight:600;letter-spacing:.02em;">Karije</span>
    </div>
    <div style="padding:28px 24px;">
      <h1 style="margin:0 0 14px;font-size:20px;line-height:1.3;color:#22321f;">${heading}</h1>
      <div style="font-size:15px;line-height:1.6;color:#5c6b5c;">${body}</div>
      ${ctaUrl ? `<a href="${ctaUrl}" style="display:inline-block;margin-top:22px;background:#b0682f;color:#fff;text-decoration:none;padding:13px 26px;border-radius:999px;font-size:15px;font-weight:600;">${ctaLabel}</a>` : ''}
      ${footnote ? `<p style="margin-top:22px;font-size:12px;line-height:1.5;color:#8b978a;">${footnote}</p>` : ''}
    </div>
  </div>
</body></html>`;
}

/**
 * Nudge someone who joined a trip and hasn't paid.
 * Tone escalates across the reminder schedule — see services/reminders.js.
 */
async function sendPaymentReminderEmail({ to, name, tripName, perPerson, link, daysLeft, tone }) {
  const resend = getResend();
  if (!resend || !to) return;

  const who = name ? `${name}, ` : '';
  const heading = tone === 'final'
    ? `Last call for ${tripName}`
    : tone === 'chase'
      ? `Still holding your spot on ${tripName}`
      : `You're on the list for ${tripName}`;

  const urgency = daysLeft != null
    ? ` The trip is <strong>${daysLeft} day${daysLeft === 1 ? '' : 's'}</strong> away.`
    : '';

  await resend.emails.send({
    from: FROM,
    to,
    subject: tone === 'final' ? `Last call — ${tripName}` : `Your share for ${tripName}`,
    html: shell({
      heading,
      body: `<p style="margin:0;">${who}your share is <strong style="color:#22321f;">${fmtNGN(perPerson)}</strong>.` +
            ` The squad is confirmed once everyone has paid.${urgency}</p>`,
      ctaLabel: 'Pay my share',
      ctaUrl: link,
      footnote: `Not going any more? Ignore this and we'll stop reminding you after a few tries.`,
    }),
  });
}

/**
 * Sent the moment an organiser confirms their interstate plan — this is the
 * email equivalent of the old "DM the organiser to add our bot to your
 * WhatsApp group" step. It just points them at the share link; there is no
 * group-bot mechanic to walk them through any more.
 */
async function sendPlanConfirmedEmail({ to, destination, tripId, squadSize, selectedDate }) {
  const resend = getResend();
  if (!resend || !to) return;

  const planUrl = `${FRONTEND}/plan/${tripId}`;
  const dateLine = selectedDate
    ? ` on <strong style="color:#22321f;">${new Date(selectedDate).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>`
    : '';

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Your ${destination} trip is confirmed 🎉`,
    html: shell({
      heading: `You're all set for ${destination}`,
      body: `<p style="margin:0 0 12px;">Your plan for <strong style="color:#22321f;">${squadSize} people</strong> is confirmed${dateLine}.</p>
             <p style="margin:0;">Share the link below with your squad so they can join and pay their share.</p>`,
      ctaLabel: 'View & share your plan',
      ctaUrl: planUrl,
      footnote: `Keep this email — it's how you get back to the plan.`,
    }),
  });
}

/** Confirmation that money was actually taken. People go looking for these. */
async function sendPaymentReceiptEmail({ to, name, tripName, amount, link, reference }) {
  const resend = getResend();
  if (!resend || !to) return;

  await resend.emails.send({
    from: FROM,
    to,
    subject: `You're paid up for ${tripName} ✓`,
    html: shell({
      heading: `You're in 🎉`,
      body: `<p style="margin:0 0 12px;">${name ? name + ', y' : 'Y'}our spot on <strong style="color:#22321f;">${tripName}</strong> is paid for.</p>
             <p style="margin:0;">Amount paid: <strong style="color:#22321f;">${fmtNGN(amount)}</strong></p>`,
      ctaLabel: 'See the trip',
      ctaUrl: link,
      footnote: `Reference: ${reference}. Keep this email — it's your receipt.`,
    }),
  });
}

module.exports = {
  sendPlanReadyEmail,
  sendPlanConfirmedEmail,
  sendPaymentReminderEmail,
  sendPaymentReceiptEmail,
  available,
};
