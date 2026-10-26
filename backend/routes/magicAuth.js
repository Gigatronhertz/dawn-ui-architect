/**
 * Magic-link authentication — no Google OAuth, no Firebase client SDK.
 *
 * Flow:
 *  1. POST /auth/magic  { email, tripId?, redirect? }
 *     → generates a 1-time token, stores it (15 min TTL), sends sign-in email
 *     → returns { ok: true, preview? } (preview = link shown when Resend not configured)
 *
 *  2. GET  /auth/verify?token=xxx
 *     → verifies token, upserts user, links trip (if any), issues JWT
 *     → redirects browser to frontend with ?token=JWT
 */
const { Router } = require('express');
const crypto     = require('crypto');
const { Resend } = require('resend');
const { linkTrip, safeRedirect } = require('../services/ownership');
const db         = require('../db/client');
const jwt        = require('../services/jwt');
const { limit }  = require('../services/rateLimit');

const router = Router();

const BACKEND  = () => (process.env.BACKEND_URL  || 'https://dawn-ui-architect.onrender.com').replace(/\/$/, '');
const FRONTEND = () => (process.env.FRONTEND_URL || 'https://karije.com').replace(/\/$/, '');
const FROM     = () =>  process.env.EMAIL_FROM   || 'Karije <hello@karije.com>';
const TTL_MS   = 15 * 60 * 1000; // 15 minutes

// ── POST /auth/magic ───────────────────────────────────────────────────────
// Each request sends an email — keep it from being used to flood an inbox.
const magicLimit = limit({ name: 'magic', max: 10, windowMs: 15 * 60 * 1000, by: (req) => typeof req.body?.email === 'string' ? req.body.email.trim() : null });

router.post('/magic', magicLimit, async (req, res) => {
  const { email, tripId, redirect, ownerKey } = req.body || {};
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }

  const token     = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + TTL_MS;

  // Store token in DB
  await db.raw(
    `INSERT INTO magic_links (token, email, trip_id, redirect, expires_at, owner_key)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(token) DO NOTHING`,
    // The redirect is checked here and again when it's used: the session
    // token is appended to it, so it may only ever point at Karije itself.
    [token, email.trim().toLowerCase(), tripId || null, safeRedirect(redirect, FRONTEND()), expiresAt,
     typeof ownerKey === 'string' ? ownerKey : null]
  );

  const verifyUrl = `${BACKEND()}/auth/verify?token=${token}`;

  // Send email if Resend is configured
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    try {
      const resend = new Resend(apiKey);
      await resend.emails.send({
        from: FROM(),
        to:   email.trim(),
        subject: 'Sign in to Karije',
        html: magicLinkEmail(verifyUrl),
      });
      console.log(`[auth/magic] sign-in link sent to ${email}`);
      return res.json({ ok: true });
    } catch (err) {
      console.warn('[auth/magic] email send failed:', err.message);
      // Fall through — return the link so the frontend can show it
    }
  } else {
    console.warn('[auth/magic] RESEND_API_KEY not set — returning link in response');
  }

  // Fallback: return the link directly (dev mode or Resend not configured)
  return res.json({ ok: true, preview: verifyUrl });
});

// ── GET /auth/verify ───────────────────────────────────────────────────────
router.get('/verify', limit({ name: 'magic-verify', max: 30, windowMs: 15 * 60 * 1000 }), async (req, res) => {
  const { token } = req.query;
  const fe = FRONTEND();

  if (!token) return res.redirect(`${fe}/?auth_error=missing_token`);

  const row = await db.raw(
    `SELECT * FROM magic_links WHERE token = ?`,
    [token]
  );

  if (!row)                         return res.redirect(`${fe}/?auth_error=invalid_token`);
  if (row.used)                     return res.redirect(`${fe}/?auth_error=token_used`);
  if (row.expires_at < Date.now())  return res.redirect(`${fe}/?auth_error=token_expired`);

  // Mark used (1-time only)
  await db.raw(`UPDATE magic_links SET used = 1 WHERE token = ?`, [token]);

  const { email, trip_id: tripId, redirect } = row;
  // Reuse the account this email already has (signed up with a password or
  // Google); only a first-time email gets a magic-link id of its own.
  const uid = (await db.users.idForEmail(email))
    || `ml_${crypto.createHash('sha256').update(email).digest('hex').slice(0, 24)}`;

  // Upsert user
  await db.users.upsert({ id: uid, email, name: null, photo_url: null });

  // Link the trip — only for the holder of its owner key.
  if (tripId) {
    await linkTrip({ tripId, uid, ownerKey: row.owner_key })
      .catch(err => console.warn('[auth/verify] linkPlan failed:', err.message));
  }

  // Issue JWT
  const jwtToken = jwt.sign({ uid, email, name: null, picture: null });

  // Redirect to frontend
  const dest = safeRedirect(redirect, fe);
  const sep  = dest.includes('?') ? '&' : '?';
  const linked = tripId ? `&linked=1` : '';
  res.redirect(`${dest}${sep}token=${encodeURIComponent(jwtToken)}${linked}`);
});

// ── Email template ─────────────────────────────────────────────────────────
function magicLinkEmail(url) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sign in to Karije</title></head>
<body style="margin:0;padding:0;background:#f5f2ec;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1a1a">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#fff">
        <tr><td style="background:#2F4A33;padding:32px;text-align:center">
          <h1 style="margin:0;color:#F7F1E7;font-size:20px;font-weight:400;letter-spacing:0.18em;font-family:Georgia,'Times New Roman',serif">KARIJE</h1>
          <p style="margin:10px 0 0;color:rgba(247,241,231,.65);font-size:13px;font-weight:300">Your sign-in link — expires in 15 minutes</p>
        </td></tr>
        <tr><td style="padding:40px 36px;text-align:center">
          <a href="${url}"
             style="display:inline-block;background:#2F4A33;color:#F7F1E7;text-decoration:none;padding:15px 44px;font-size:14px;letter-spacing:0.1em;font-weight:400">
            Sign in →
          </a>
          <p style="margin:24px 0 0;font-size:12px;color:#9ca3af">Or copy into your browser:</p>
          <p style="margin:8px 0 0;font-size:11px;word-break:break-all"><a href="${url}" style="color:#B0682F">${url}</a></p>
        </td></tr>
        <tr><td style="padding:18px 36px;border-top:1px solid #f0ebe1;text-align:center">
          <p style="margin:0;font-size:11px;color:#d1d5db;font-weight:300">If you didn't request this, ignore this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

module.exports = { router };
