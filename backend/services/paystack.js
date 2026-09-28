const axios = require('axios');

const BASE = 'https://api.paystack.co';

/** True when PAYSTACK_SECRET_KEY is configured. Use to gate the /pay endpoint gracefully. */
const available = () => !!process.env.PAYSTACK_SECRET_KEY;

function headers() {
  return { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, 'Content-Type': 'application/json' };
}

// Initialize a payment transaction and return the payment URL
async function initializePayment({ tripId, phone, name, amountNGN }) {
  const amountKobo = Math.round(amountNGN * 100);
  const reference = `SQUAD-${tripId}-${phone}-${Date.now()}`;

  const res = await axios.post(
    `${BASE}/transaction/initialize`,
    {
      email: `${phone}@mysquadgo.app`,
      amount: amountKobo,
      reference,
      callback_url: process.env.PAYSTACK_CALLBACK_URL,
      metadata: {
        trip_id: tripId,
        phone,
        name: name || 'Squad member',
        custom_fields: [
          { display_name: 'Squad member', variable_name: 'name', value: name || phone },
          { display_name: 'Trip ID', variable_name: 'trip_id', value: tripId },
        ],
      },
    },
    { headers: headers() }
  );

  return { reference, url: res.data.data.authorization_url };
}

// Verify a payment by reference — call this in the Paystack webhook/callback
async function verifyPayment(reference) {
  const res = await axios.get(`${BASE}/transaction/verify/${reference}`, { headers: headers() });
  const { status, amount, metadata, authorization } = res.data.data;
  return {
    success: status === 'success',
    amountNGN: amount / 100,
    tripId: metadata?.trip_id,
    phone: metadata?.phone,
    // Web squad payments carry the participant. The reference alone isn't
    // enough to find them — a new one is raised each time they open a pay
    // link, so an older link's reference won't match the row.
    participantId: metadata?.participant_id,
    agentId: metadata?.agent_id,
    userId: metadata?.user_id,
    credits: Number(metadata?.credits) || 0,
    customerEmail: res.data.data.customer?.email || null,
    // Present only when the charge came off a card Paystack has marked
    // reusable — this is what recurring subscription billing charges again
    // later. A bank-transfer/USSD payment never carries one.
    authorizationCode: authorization?.reusable ? authorization.authorization_code : null,
  };
}

const fmtNGN = (n) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(n);

/**
 * Initialize a payment for a web squad member (participants table).
 * Uses a reference prefixed WEBSQ- so the webhook can identify it.
 */
async function initializeWebPayment({ tripId, participantId, email, name, amountNGN, callbackUrl }) {
  const amountKobo = Math.round(amountNGN * 100);
  const reference  = `WEBSQ-${tripId.slice(0, 8)}-${participantId.slice(0, 8)}-${Date.now()}`;

  const res = await axios.post(
    `${BASE}/transaction/initialize`,
    {
      email,
      amount:       amountKobo,
      reference,
      callback_url: callbackUrl,
      currency:     'NGN',
      metadata: {
        payment_type:   'web_squad',
        participant_id: participantId,
        trip_id:        tripId,
        name:           name || null,
        custom_fields: [
          { display_name: 'Name',    variable_name: 'name',    value: name || '—' },
          { display_name: 'Trip ID', variable_name: 'trip_id', value: tripId },
        ],
      },
    },
    { headers: headers() }
  );

  return { reference, authorization_url: res.data.data.authorization_url };
}

/**
 * Mints the one-time ₦10k checkout an agency completes to start subscription
 * billing. Card-only (`channels: ['card']`) — the reusable-authorization
 * charging the monthly billing cron depends on only works reliably off a
 * card, not bank transfer/USSD. Reference prefixed PROSUB- so the shared
 * webhook (webhook.js processPayment) can route it separately from a
 * traveller's WEBSQ- trip payment.
 */
async function initializeSubscriptionSetup({ agentId, email, amountNGN, callbackUrl }) {
  const amountKobo = Math.round(amountNGN * 100);
  const reference  = `PROSUB-${agentId.slice(0, 20)}-${Date.now()}`;

  const res = await axios.post(
    `${BASE}/transaction/initialize`,
    {
      email,
      amount:       amountKobo,
      reference,
      callback_url: callbackUrl,
      currency:     'NGN',
      channels:     ['card'],
      metadata: {
        payment_type: 'pro_subscription_setup',
        agent_id:     agentId,
      },
    },
    { headers: headers() }
  );

  return { reference, authorization_url: res.data.data.authorization_url };
}

/**
 * Charges a previously-captured reusable card authorization again — no
 * redirect, no checkout page; the card is already on file. This is the one
 * call the monthly billing cron (services/subscriptionBilling.js) makes.
 */
async function chargeAuthorization({ agentId, authorizationCode, email, amountNGN }) {
  const amountKobo = Math.round(amountNGN * 100);
  const reference  = `PROSUB-${agentId.slice(0, 20)}-${Date.now()}`;

  const res = await axios.post(
    `${BASE}/transaction/charge_authorization`,
    {
      authorization_code: authorizationCode,
      email,
      amount:   amountKobo,
      reference,
      metadata: { payment_type: 'pro_subscription_recurring', agent_id: agentId },
    },
    { headers: headers() }
  );

  const { status, gateway_response } = res.data.data;
  return { success: status === 'success', reference, gatewayResponse: gateway_response };
}

/**
 * Checkout for a one-off pack of AI trip plans. Reference prefixed AIPLAN- so
 * the shared webhook can route it.
 */
async function initializeAiCreditsPayment({ userId, email, amountNGN, credits, callbackUrl }) {
  const reference = `AIPLAN-${String(userId).slice(0, 20)}-${Date.now()}`;
  const res = await axios.post(
    `${BASE}/transaction/initialize`,
    {
      email,
      amount:       Math.round(amountNGN * 100),
      reference,
      callback_url: callbackUrl,
      currency:     'NGN',
      metadata: { payment_type: 'ai_credits', user_id: userId, credits },
    },
    { headers: headers() }
  );
  return { reference, authorization_url: res.data.data.authorization_url };
}

module.exports = {
  available, initializeAiCreditsPayment, initializePayment, initializeWebPayment, verifyPayment, fmtNGN,
  initializeSubscriptionSetup, chargeAuthorization,
};
