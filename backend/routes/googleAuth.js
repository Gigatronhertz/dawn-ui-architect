/**
 * Server-side Google OAuth 2.0 — completely bypasses Firebase client SDK.
 * Avoids auth/network-request-failed caused by ad blockers / Brave shields
 * intercepting identitytoolkit.googleapis.com calls in the browser.
 *
 * Flow:
 *   1. Frontend links to GET /auth/google?tripId=xxx
 *   2. Backend redirects to Google consent screen
 *   3. Google calls GET /auth/google/callback?code=xxx&state=xxx
 *   4. Backend exchanges code → gets user info → upserts user → signs JWT
 *   5. Backend redirects to frontend with ?token=JWT (+ ?linked=1 if tripId given)
 *   6. Frontend stores JWT in localStorage; treats it as the session token
 */
const { Router } = require('express');
const axios      = require('axios');
const db         = require('../db/client');
const jwt        = require('../services/jwt');

const router = Router();

const GOOGLE_AUTH_URL  = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_INFO_URL  = 'https://www.googleapis.com/oauth2/v3/userinfo';

function clientId()     { return process.env.GOOGLE_CLIENT_ID; }
function clientSecret() { return process.env.GOOGLE_CLIENT_SECRET; }
function backendUrl()   { return (process.env.BACKEND_URL  || 'https://dawn-ui-architect.onrender.com').replace(/\/$/, ''); }
function frontendUrl()  { return (process.env.FRONTEND_URL || 'https://mysquadgo.vercel.app').replace(/\/$/, ''); }
function callbackUrl()  { return `${backendUrl()}/auth/google/callback`; }

function available() { return !!(clientId() && clientSecret()); }

// ── GET /auth/google ───────────────────────────────────────────────────────
// Entry point — redirect browser to Google's consent screen.
// Query params:
//   tripId   optional — if provided, plan will be linked after sign-in
//   redirect optional — URL to send the user after sign-in (defaults to /my-plans)
router.get('/google', (req, res) => {
  if (!available()) {
    return res.status(503).send(`
      <h2>Google OAuth not configured</h2>
      <p>Add <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code> to Render environment variables.</p>
    `);
  }

  const state = Buffer.from(JSON.stringify({
    tripId:   req.query.tripId   || null,
    redirect: req.query.redirect || null,
    ts:       Date.now(),
  })).toString('base64url');

  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set('client_id',     clientId());
  url.searchParams.set('redirect_uri',  callbackUrl());
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope',         'openid email profile');
  url.searchParams.set('state',         state);
  url.searchParams.set('access_type',   'offline');
  url.searchParams.set('prompt',        'select_account');

  res.redirect(url.toString());
});

// ── GET /auth/google/callback ──────────────────────────────────────────────
// Google redirects here after the user approves (or denies).
router.get('/google/callback', async (req, res) => {
  const { code, state: rawState, error } = req.query;
  const fe = frontendUrl();

  if (error) {
    console.warn('[auth/google] OAuth error:', error);
    return res.redirect(`${fe}/?auth_error=${encodeURIComponent(error)}`);
  }
  if (!code) {
    return res.redirect(`${fe}/?auth_error=no_code`);
  }

  // Parse state
  let stateData = {};
  try {
    stateData = JSON.parse(Buffer.from(rawState || '', 'base64url').toString('utf8'));
  } catch { /* non-critical */ }

  try {
    // 1. Exchange authorization code for tokens
    const tokenRes = await axios.post(GOOGLE_TOKEN_URL, {
      client_id:     clientId(),
      client_secret: clientSecret(),
      code,
      grant_type:    'authorization_code',
      redirect_uri:  callbackUrl(),
    });
    const { access_token } = tokenRes.data;

    // 2. Fetch user profile
    const infoRes = await axios.get(GOOGLE_INFO_URL, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const { sub: googleId, email, name, picture } = infoRes.data;

    // 3. Upsert user in Turso — ID format matches Firebase UID shape (opaque string)
    const uid = `g_${googleId}`;
    await db.users.upsert({ id: uid, email, name: name || null, photo_url: picture || null });

    // 4. Link trip if one was provided (server-side — no client call needed)
    if (stateData.tripId) {
      await db.raw(
        `UPDATE trips SET user_id = ? WHERE id = ? AND (user_id IS NULL OR user_id = ?)`,
        [uid, stateData.tripId, uid]
      ).catch(err => console.warn('[auth/google] linkPlan failed:', err.message));
    }

    // 5. Issue our own JWT
    const token = jwt.sign({ uid, email, name: name || null, picture: picture || null });

    // 6. Redirect to frontend with token in URL
    const dest = stateData.redirect || `${fe}/my-plans`;
    const sep  = dest.includes('?') ? '&' : '?';
    const linked = stateData.tripId ? `&linked=1` : '';
    res.redirect(`${dest}${sep}token=${encodeURIComponent(token)}${linked}`);

  } catch (err) {
    console.error('[auth/google/callback] error:', err?.response?.data || err.message);
    res.redirect(`${fe}/?auth_error=sign_in_failed`);
  }
});

module.exports = { router, available };
