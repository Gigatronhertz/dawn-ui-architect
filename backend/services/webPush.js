/**
 * Web Push notifications via VAPID.
 * Lazy-configured — missing env vars disable push without crashing startup.
 */
const webpush = require('web-push');

let _configured = false;

function configure() {
  if (_configured) return true;
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_EMAIL } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn('[webpush] VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY not set — push disabled');
    return false;
  }
  webpush.setVapidDetails(
    `mailto:${VAPID_EMAIL || 'hello@mysquadgo.com'}`,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
  _configured = true;
  console.log('[webpush] VAPID configured');
  return true;
}

const FRONTEND = process.env.FRONTEND_URL || 'https://mysquadgo.vercel.app';

/**
 * Send a push notification to a stored subscription object.
 * @param {{ subscription: object, destination: string, tripId: string }} opts
 */
async function sendPlanReadyPush({ subscription, destination, tripId }) {
  if (!configure()) return;

  const payload = JSON.stringify({
    title: 'Your squad plan is ready! 🎉',
    body:  `Trip to ${destination} is all mapped out. Tap to view.`,
    url:   `${FRONTEND}/start?job=${tripId}`,
  });

  try {
    await webpush.sendNotification(subscription, payload);
    console.log('[webpush] push delivered');
  } catch (err) {
    // 410 = subscription expired/unsubscribed — not a real error
    if (err.statusCode === 410) {
      console.log('[webpush] subscription gone (410) — ignoring');
    } else {
      console.warn('[webpush] push failed:', err.message);
    }
  }
}

module.exports = { sendPlanReadyPush };
