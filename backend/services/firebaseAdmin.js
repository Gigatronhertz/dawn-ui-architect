/**
 * Firebase Admin SDK — lazy-initialised so a missing env var doesn't crash startup.
 * Set FIREBASE_SERVICE_ACCOUNT to the JSON string of a service-account key file.
 */
let _admin = null;

function getAdmin() {
  if (_admin) return _admin;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    console.warn('[firebase-admin] FIREBASE_SERVICE_ACCOUNT not set — token verification disabled');
    return null;
  }

  _admin = require('firebase-admin');
  if (!_admin.apps.length) {
    const serviceAccount = JSON.parse(raw);
    _admin.initializeApp({ credential: _admin.credential.cert(serviceAccount) });
    console.log('[firebase-admin] initialised');
  }
  return _admin;
}

/**
 * Verifies a Firebase ID token and returns the decoded claims, or null on failure.
 * @param {string} token
 * @returns {Promise<import('firebase-admin').auth.DecodedIdToken | null>}
 */
async function verifyIdToken(token) {
  const admin = getAdmin();
  if (!admin) return null;
  try {
    return await admin.auth().verifyIdToken(token);
  } catch (err) {
    console.warn('[firebase-admin] verifyIdToken failed:', err.message);
    return null;
  }
}

module.exports = { verifyIdToken };
