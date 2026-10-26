/**
 * Small in-memory rate limiter — enough for one Render instance. Counts per
 * key inside a fixed window and answers 429 once the limit is passed. A
 * restart clears the counts, which is fine: the point is to make guessing
 * passwords, keys and plan ids, or burning AI credits, slow and expensive.
 */
const crypto = require('crypto');

const buckets = new Map();

function hit(key, windowMs) {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || b.reset <= now) {
    b = { count: 0, reset: now + windowMs };
    buckets.set(key, b);
  }
  b.count++;
  // Sweep expired buckets now and then so the map can't grow without bound.
  if (buckets.size > 10000) {
    for (const [k, v] of buckets) if (v.reset <= now) buckets.delete(k);
  }
  return b;
}

function peek(key) {
  const b = buckets.get(key);
  return b && b.reset > Date.now() ? b : null;
}

function tooMany(res, b, message) {
  res.setHeader('Retry-After', Math.ceil((b.reset - Date.now()) / 1000));
  return res.status(429).json({ error: message || 'Too many attempts. Please wait a few minutes and try again.' });
}

/**
 * Express middleware. `by` picks extra keys beyond the caller's IP (e.g. the
 * email being signed in to), so spreading attempts over many IPs still hits
 * the per-account limit.
 */
function limit({ name, max, windowMs, by, message }) {
  return (req, res, next) => {
    const keys = [`${name}:ip:${req.ip}`];
    const extra = by ? by(req) : null;
    if (extra) keys.push(`${name}:by:${String(extra).toLowerCase()}`);
    for (const k of keys) {
      const b = hit(k, windowMs);
      if (b.count > max) return tooMany(res, b, message);
    }
    next();
  };
}

/**
 * For checks where only failures should count (the admin key): `blocked`
 * before checking, `fail` after a wrong guess.
 */
function failures({ name, max, windowMs }) {
  return {
    blocked: (req, res) => {
      const b = peek(`${name}:${req.ip}`);
      if (b && b.count >= max) { tooMany(res, b); return true; }
      return false;
    },
    fail: (req) => { hit(`${name}:${req.ip}`, windowMs); },
  };
}

/**
 * Constant-time string compare that never throws. Hashing both sides first
 * gives equal-length buffers whatever was sent (multi-byte characters
 * included) and doesn't reveal the secret's length.
 */
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || !a || !b) return false;
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

module.exports = { limit, failures, safeEqual };
