/**
 * Email + password authentication for Karije.
 *
 * Routes:
 *   POST /auth/signup        { email, password, tripId? }
 *   POST /auth/login         { email, password }
 *   GET  /auth/verify-email  ?token=xxx
 */
const { Router } = require('express');
const crypto     = require('crypto');
const util       = require('util');
const db         = require('../db/client');
const jwt        = require('../services/jwt');

const scryptAsync = util.promisify(crypto.scrypt);
const router      = Router();

const BACKEND  = () => (process.env.BACKEND_URL  || 'https://dawn-ui-architect.onrender.com').replace(/\/$/, '');
const FRONTEND = () => (process.env.FRONTEND_URL || 'https://mysquadgo.vercel.app').replace(/\/$/, '');
const FROM     = () =>  process.env.EMAIL_FROM   || 'Karije <onboarding@resend.dev>';
const TTL_MS   = 24 * 60 * 60 * 1000; // 24 hours

// ── Password helpers (scrypt — Node.js built-in, memory-hard) ─────────────

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const dk   = await scryptAsync(password, salt, 64);
  return `${salt}:${dk.toString('hex')}`;
}

async function checkPassword(password, stored) {
  try {
    const [salt, hash] = stored.split(':');
    const hashBuf = Buffer.from(hash, 'hex');
    const dk      = await scryptAsync(password, salt, 64);
    return crypto.timingSafeEqual(dk, hashBuf);
  } catch {
    return false;
  }
}

// ── POST /auth/signup ──────────────────────────────────────────────────────
router.post('/signup', async (req, res) => {
  const { email, password, tripId } = req.body || {};

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }
  if (!password || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  const emailNorm    = email.trim().toLowerCase();
  const passwordHash = await hashPassword(password);

  // Look up any existing record (could have been created via magic link)
  const existing = await db.raw('SELECT * FROM users WHERE email = ?', [emailNorm]);

  if (existing?.password_hash) {
    return res.status(409).json({
      error: 'An account already exists for this email. Please sign in.',
    });
  }

  let uid;
  if (existing) {
    // Magic-link user upgrading to password account
    uid = existing.id;
    await db.raw(
      `UPDATE users SET password_hash = ?, email_verified = 0 WHERE id = ?`,
      [passwordHash, uid]
    );
  } else {
    // Brand-new user
    uid = `ep_${crypto.randomBytes(12).toString('hex')}`;
    await db.raw(
      `INSERT INTO users (id, email, name, photo_url, password_hash, email_verified)
       VALUES (?, ?, NULL, NULL, ?, 0)`,
      [uid, emailNorm, passwordHash]
    );
  }

  // Optimistically link a trip if the user just planned one before signing up
  if (tripId) {
    await db.raw(
      `UPDATE trips SET user_id = ? WHERE id = ? AND (user_id IS NULL OR user_id = ?)`,
      [uid, tripId, uid]
    ).catch(err => console.warn('[auth/signup] trip link failed:', err.message));
  }

  // Create a 24-hour email-verification token (reuses magic_links table)
  const verifyToken = crypto.randomBytes(32).toString('hex');
  await db.raw(
    `INSERT INTO magic_links (token, email, trip_id, redirect, expires_at, used)
     VALUES (?, ?, ?, ?, ?, 0)
     ON CONFLICT(token) DO NOTHING`,
    [verifyToken, emailNorm, null, null, Date.now() + TTL_MS]
  );

  const verifyUrl = `${BACKEND()}/auth/verify-email?token=${verifyToken}`;

  // Send email
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    try {
      const { Resend } = require('resend');
      const resend = new Resend(apiKey);
      await resend.emails.send({
        from: FROM(),
        to:   email.trim(),
        subject: 'Verify your Karije account',
        html: verifyEmailTemplate(verifyUrl),
      });
      console.log(`[auth/signup] verification sent to ${email}`);
      return res.json({ ok: true });
    } catch (err) {
      console.warn('[auth/signup] email send failed:', err.message);
    }
  } else {
    console.warn('[auth/signup] RESEND_API_KEY not set — verification link:', verifyUrl);
  }

  // Dev mode — surface the link so local testing works without Resend
  return res.json({ ok: true, preview: verifyUrl });
});

// ── POST /auth/login ───────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const emailNorm = email.trim().toLowerCase();
  const user      = await db.raw('SELECT * FROM users WHERE email = ?', [emailNorm]);

  if (!user || !user.password_hash) {
    return res.status(401).json({
      error: 'No password account found for this email. Use "Email link" below.',
      code:  'no_password',
    });
  }

  const ok = await checkPassword(password, user.password_hash);
  if (!ok) {
    return res.status(401).json({ error: 'Incorrect password.' });
  }

  if (!user.email_verified) {
    return res.status(403).json({
      error: 'Email not verified yet. Check your inbox for the verification link.',
      code:  'unverified',
    });
  }

  const token = jwt.sign({
    uid:     user.id,
    email:   user.email,
    name:    user.name     || null,
    picture: user.photo_url || null,
  });

  res.json({ ok: true, token });
});

// ── GET /auth/verify-email ─────────────────────────────────────────────────
router.get('/verify-email', async (req, res) => {
  const { token } = req.query;
  const fe = FRONTEND();

  if (!token) return res.redirect(`${fe}/my-plans?auth_error=missing_token`);

  const row = await db.raw('SELECT * FROM magic_links WHERE token = ?', [token]);

  if (!row)                        return res.redirect(`${fe}/my-plans?auth_error=invalid_token`);
  if (row.used)                    return res.redirect(`${fe}/my-plans?auth_error=token_used`);
  if (row.expires_at < Date.now()) return res.redirect(`${fe}/my-plans?auth_error=token_expired`);

  await db.raw('UPDATE magic_links SET used = 1 WHERE token = ?', [token]);

  const user = await db.raw('SELECT * FROM users WHERE email = ?', [row.email]);
  if (!user) return res.redirect(`${fe}/my-plans?auth_error=user_not_found`);

  // Mark verified
  await db.raw('UPDATE users SET email_verified = 1 WHERE id = ?', [user.id]);

  const jwtToken = jwt.sign({
    uid:     user.id,
    email:   user.email,
    name:    user.name     || null,
    picture: user.photo_url || null,
  });

  // Redirect to my-plans — AuthContext will pick up the token from the URL
  res.redirect(`${fe}/my-plans?token=${encodeURIComponent(jwtToken)}&verified=1`);
});

// ── Email template ─────────────────────────────────────────────────────────
function verifyEmailTemplate(url) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Verify your Karije account</title></head>
<body style="margin:0;padding:0;background:#f5f2ec;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1a1a">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#fff">
        <tr><td style="background:#2F4A33;padding:32px;text-align:center">
          <h1 style="margin:0;color:#F7F1E7;font-size:20px;font-weight:400;letter-spacing:0.18em;font-family:Georgia,'Times New Roman',serif">KARIJE</h1>
          <p style="margin:10px 0 0;color:rgba(247,241,231,.65);font-size:13px;font-weight:300">One click to verify your email</p>
        </td></tr>
        <tr><td style="padding:40px 36px">
          <p style="margin:0 0 28px;color:#374151;font-size:15px;line-height:1.65;font-weight:300">
            You're almost there. Click the button below to verify your email and activate your Karije account.
            This link expires in <strong style="font-weight:500;color:#1a1a1a">24 hours</strong>.
          </p>
          <div style="text-align:center;margin-bottom:32px">
            <a href="${url}"
               style="display:inline-block;background:#2F4A33;color:#F7F1E7;text-decoration:none;padding:15px 44px;font-size:14px;letter-spacing:0.1em;font-weight:400">
              Verify email →
            </a>
          </div>
          <p style="margin:0;font-size:12px;color:#9ca3af;word-break:break-all">
            Or copy into your browser: <a href="${url}" style="color:#B0682F">${url}</a>
          </p>
        </td></tr>
        <tr><td style="padding:18px 36px;border-top:1px solid #f0ebe1;text-align:center">
          <p style="margin:0;font-size:11px;color:#d1d5db;font-weight:300">
            If you didn't create a Karije account, you can safely ignore this email.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

module.exports = { router };
