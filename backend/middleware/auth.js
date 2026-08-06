const { verifyIdToken } = require('../services/firebaseAdmin');
const jwt               = require('../services/jwt');

/**
 * Resolve a Bearer token to a normalized user object { uid, email, name, picture }.
 * Accepts two token formats:
 *  • Our own HS256 JWT (issued by /auth/google/callback)
 *  • Firebase ID token (issued by Firebase Auth client SDK)
 * Returns null when no valid token is present.
 */
async function resolveUser(authHeader) {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const raw = authHeader.slice(7);

  // Try our own JWT first — fast, no network call
  const own = jwt.verify(raw);
  if (own) {
    return { uid: own.uid, email: own.email, name: own.name || null, picture: own.picture || null };
  }

  // Fall back to Firebase ID token (requires Firebase Admin SDK + FIREBASE_SERVICE_ACCOUNT)
  const firebase = await verifyIdToken(raw);
  if (firebase) {
    return {
      uid:     firebase.uid,
      email:   firebase.email   || null,
      name:    firebase.name    || null,
      picture: firebase.picture || null,
    };
  }

  return null;
}

/**
 * Attaches req.user if a valid Bearer token is present (either format).
 * Never rejects — sets req.user = null on failure.
 */
async function optionalAuth(req, _res, next) {
  req.user = await resolveUser(req.headers.authorization);
  next();
}

/**
 * Same as optionalAuth but returns 401 if no valid token is found.
 */
async function requireAuth(req, res, next) {
  req.user = await resolveUser(req.headers.authorization);
  if (!req.user) return res.status(401).json({ error: 'Authentication required.' });
  next();
}

module.exports = { optionalAuth, requireAuth };
