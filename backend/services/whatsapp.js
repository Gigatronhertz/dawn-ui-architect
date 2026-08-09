const axios = require('axios');

const BASE = 'https://graph.facebook.com/v19.0';

/** Returns true only when the required env vars are present. */
function available() {
  return !!(process.env.WA_TOKEN && process.env.WA_PHONE_ID);
}

function headers() {
  return { Authorization: `Bearer ${process.env.WA_TOKEN}`, 'Content-Type': 'application/json' };
}

// Send a plain text message
async function sendText(to, body) {
  if (!available()) {
    console.warn(`[whatsapp] WA not configured — skipping sendText to ${to}`);
    return;
  }
  return axios.post(
    `${BASE}/${process.env.WA_PHONE_ID}/messages`,
    { messaging_product: 'whatsapp', to, type: 'text', text: { body, preview_url: false } },
    { headers: headers() }
  );
}

// Send an interactive list/button message (used for polls)
async function sendButtons(to, body, buttons) {
  if (!available()) {
    console.warn(`[whatsapp] WA not configured — skipping sendButtons to ${to}`);
    return;
  }
  // buttons: [{ id: string, title: string }] — max 3
  return axios.post(
    `${BASE}/${process.env.WA_PHONE_ID}/messages`,
    {
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: body },
        action: {
          buttons: buttons.map((b) => ({ type: 'reply', reply: { id: b.id, title: b.title.slice(0, 20) } })),
        },
      },
    },
    { headers: headers() }
  );
}

// Send an interactive list message (used for hotel/date options — max 10 rows)
async function sendList(to, body, buttonLabel, sections) {
  if (!available()) {
    console.warn(`[whatsapp] WA not configured — skipping sendList to ${to}`);
    return;
  }
  // sections: [{ title: string, rows: [{ id, title, description? }] }]
  return axios.post(
    `${BASE}/${process.env.WA_PHONE_ID}/messages`,
    {
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive: {
        type: 'list',
        body: { text: body },
        action: { button: buttonLabel, sections },
      },
    },
    { headers: headers() }
  );
}

// Mark a message as read (keeps read receipts tidy)
async function markRead(message_id) {
  if (!available()) return;
  return axios.post(
    `${BASE}/${process.env.WA_PHONE_ID}/messages`,
    { messaging_product: 'whatsapp', status: 'read', message_id },
    { headers: headers() }
  ).catch(() => {}); // non-critical — swallow errors silently
}

module.exports = { available, sendText, sendButtons, sendList, markRead };
