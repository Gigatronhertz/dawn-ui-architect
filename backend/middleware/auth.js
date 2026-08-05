const { verifyIdToken } = require('../services/firebaseAdmin');

/**
 * Attaches req.user (decoded Firebase token) if a valid Bearer token is present.
 * Sets req.user = null when no token or invalid token — never rejects.
 */
async function optionalAuth(req, _res, next) {
  const header = req.headers.authorization;
  req.user = (header?.startsWith('Bearer '))
    ? await verifyIdToken(header.slice(7))
    : null;
  next();
}

/**
 * Same as optionalAuth but returns 401 if the token is missing or invalid.
 */
async function requireAuth(req, res, next) {
  await optionalAuth(req, res, () => {});
  if (!req.user) return res.status(401).json({ error: 'Authentication required.' });
  next();
}

module.exports = { optionalAuth, requireAuth };
