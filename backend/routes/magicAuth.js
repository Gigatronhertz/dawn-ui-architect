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
const db         = require('../db/client');
const jwt        = require('../services/jwt');

const router = Router();

const BACKEND  = () => (process.env.BACKEND_URL  || 'https://dawn-ui-architect.onrender.com').replace(/\/$/, '');
const FRONTEND = () => (process.env.FRONTEND_URL || 'https://mysquadgo.vercel.app').replace(/\/$/, '');
const FROM     = () =>  process.env.EMAIL_FROM   || 'MySquadGo <onboarding@resend.dev>';
const TTL_MS   = 15 * 60 * 1000; // 15 minutes

// ── POST /auth/magic ───────────────────────────────────────────────────────
router.post('/magic', async (req, res) => {
  const { email, tripId, redirect } = req.body || {};
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }

  const token     = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + TTL_MS;

  // Store token in DB
  await db.raw(
    `INSERT INTO magic_links (token, email, trip_id, redirect, expires_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(token) DO NOTHING`,
    [token, email.trim().toLowerCase(), tripId || null, redirect || null, expiresAt]
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
        subject: 'Sign in to MySquadGo',
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
router.get('/verify', async (req, res) => {
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
  const uid = `ml_${crypto.createHash('sha256').update(email).digest('hex').slice(0, 24)}`;

  // Upsert user
  await db.users.upsert({ id: uid, email, name: null, photo_url: null });

  // Link trip server-side (if provided)
  if (tripId) {
    await db.raw(
      `UPDATE trips SET user_id = ? WHERE id = ? AND (user_id IS NULL OR user_id = ?)`,
      [uid, tripId, uid]
    ).catch(err => console.warn('[auth/verify] linkPlan failed:', err.message));
  }

  // Issue JWT
  const jwtToken = jwt.sign({ uid, email, name: null, picture: null });

  // Redirect to frontend
  const dest = redirect || `${fe}/my-plans`;
  const sep  = dest.includes('?') ? '&' : '?';
  const linked = tripId ? `&linked=1` : '';
  res.redirect(`${dest}${sep}token=${encodeURIComponent(jwtToken)}${linked}`);
});

// ── Email template ─────────────────────────────────────────────────────────
function magicLinkEmail(url) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sign in to MySquadGo</title></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111827">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08)">
        <tr><td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px;text-align:center">
          <div style="font-size:32px;margin-bottom:8px">✈️</div>
          <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700">Sign in to MySquadGo</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,.8);font-size:14px">Click the button below — link expires in 15 minutes</p>
        </td></tr>
        <tr><td style="padding:36px 32px;text-align:center">
          <a href="${url}"
             style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;padding:15px 40px;border-radius:100px;font-weight:700;font-size:16px;box-shadow:0 4px 14px rgba(99,102,241,.4)">
            Sign in →
          </a>
          <p style="margin:24px 0 0;font-size:13px;color:#6b7280">Or copy this link into your browser:</p>
          <p style="margin:8px 0 0;font-size:12px;word-break:break-all"><a href="${url}" style="color:#6366f1">${url}</a></p>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #f3f4f6;text-align:center">
          <p style="margin:0;font-size:11px;color:#d1d5db">If you didn't request this, ignore this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

module.exports = { router };
