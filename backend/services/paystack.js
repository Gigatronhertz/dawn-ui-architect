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
  const { status, amount, metadata } = res.data.data;
  return {
    success: status === 'success',
    amountNGN: amount / 100,
    tripId: metadata?.trip_id,
    phone: metadata?.phone,
    // Web squad payments carry the participant. The reference alone isn't
    // enough to find them — a new one is raised each time they open a pay
    // link, so an older link's reference won't match the row.
    participantId: metadata?.participant_id,
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

module.exports = { available, initializePayment, initializeWebPayment, verifyPayment, fmtNGN };
