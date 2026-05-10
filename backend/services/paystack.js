const axios = require('axios');

const BASE = 'https://api.paystack.co';

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
  };
}

const fmtNGN = (n) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(n);

module.exports = { initializePayment, verifyPayment, fmtNGN };
