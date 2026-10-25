/**
 * Minimal JWT implementation using Node's built-in crypto.
 * No external dependencies — HS256 signing only.
 */
const crypto = require('crypto');

const DEV_SECRET = 'dev-secret-change-in-production';

/**
 * The signing key. The dev fallback is public (it's in this file), so in
 * production a missing JWT_SECRET disables sessions entirely — sign() throws
 * and verify() rejects everything — rather than letting anyone mint a token.
 */
function SECRET() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production') return null;
  return DEV_SECRET;
}
const TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

function b64url(str) {
  return Buffer.from(str).toString('base64url');
}

/** Sign a payload and return a JWT string. */
function sign(payload) {
  if (!SECRET()) throw new Error('JWT_SECRET is not set — sign-in is disabled until it is.');
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now    = Math.floor(Date.now() / 1000);
  const body   = b64url(JSON.stringify({ ...payload, iat: now, exp: now + TTL_SECONDS }));
  const sig    = crypto.createHmac('sha256', SECRET()).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

/**
 * Verify a JWT. Returns the decoded payload or null if invalid / expired.
 * @param {string} token
 * @returns {object|null}
 */
function verify(token) {
  try {
    if (!SECRET()) return null;
    const parts = (token || '').split('.');
    if (parts.length !== 3) return null;
    const [header, body, sig] = parts;
    const expected = crypto.createHmac('sha256', SECRET()).update(`${header}.${body}`).digest('base64url');
    if (sig !== expected) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

module.exports = { sign, verify };
