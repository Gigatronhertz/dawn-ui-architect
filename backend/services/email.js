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

module.exports = { sendPlanReadyEmail };
