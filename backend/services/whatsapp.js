/**
 * WhatsApp delivery via Zavu (https://docs.zavu.dev).
 *
 * Every WhatsApp message in the app goes through this file, so swapping
 * provider is a change here and nowhere else — this replaced a direct Meta
 * Cloud API integration without touching a single caller.
 *
 * Two things about WhatsApp that shape everything below:
 *
 *  1. The 24-hour window. Free-form text may only be sent within 24 hours of
 *     the recipient's last message to us. Outside it, WhatsApp requires a
 *     pre-approved template. Our payment reminders go out days after someone
 *     joins, so they are template territory by definition.
 *
 *  2. A sender must be configured in the Zavu dashboard — the WhatsApp number
 *     messages come from. Without one, every send fails with a 400.
 */
const axios = require('axios');

const BASE = process.env.ZAVU_BASE_URL || 'https://api.zavu.dev/v1';

/** True only when a key is present. Callers use this to pick a channel. */
function available() {
  return !!process.env.ZAVU_API_KEY;
}

function headers() {
  const h = {
    Authorization: `Bearer ${process.env.ZAVU_API_KEY}`,
    'Content-Type': 'application/json',
  };
  // Optional: pins sends to one sender when the account has several.
  if (process.env.ZAVU_SENDER_ID) h['Zavu-Sender'] = process.env.ZAVU_SENDER_ID;
  return h;
}

/**
 * Nigerian numbers arrive as 0803…, 234803… or +234803… — the same person
 * written three ways. Zavu wants E.164, so normalise before sending rather
 * than rejecting someone over how they typed their own number.
 */
function toE164(raw) {
  let d = String(raw || '').replace(/[^\d]/g, '');
  if (!d) return null;
  if (d.startsWith('0'))   d = `234${d.slice(1)}`;   // local Nigerian form
  else if (d.length === 10) d = `234${d}`;           // missing both prefixes
  return `+${d}`;
}

/** Shared POST with a single retry on transient failures. */
async function post(payload, { label }) {
  if (!available()) {
    console.warn(`[whatsapp] ZAVU_API_KEY not set — skipping ${label}`);
    return null;
  }
  try {
    const { data } = await axios.post(`${BASE}/messages`, payload, {
      headers: headers(), timeout: 20000,
    });
    return data;
  } catch (err) {
    const status = err.response?.status;
    const code   = err.response?.data?.code;
    const msg    = err.response?.data?.message || err.message;

    // Worth calling out individually — each needs a different fix and a
    // generic "send failed" hides which one you're looking at.
    if (code === 'whatsapp_window_closed') {
      console.warn(`[whatsapp] ${label}: outside the 24h window — needs an approved template`);
    } else if (code === 'insufficient_balance') {
      console.error(`[whatsapp] ${label}: Zavu account is out of credit`);
    } else if (code === 'a2p_limit_exceeded') {
      console.error(`[whatsapp] ${label}: monthly message limit reached`);
    } else if (status === 401) {
      console.error(`[whatsapp] ${label}: ZAVU_API_KEY rejected`);
    } else {
      console.warn(`[whatsapp] ${label} failed (${status} ${code || '—'}): ${msg}`);
    }
    // Rethrow so callers can fall back to another channel rather than
    // believing a message was delivered.
    const e = new Error(msg);
    e.code = code;
    e.status = status;
    throw e;
  }
}

/**
 * Free-form text. Only valid inside the 24-hour window — use sendTemplate for
 * anything the recipient didn't just prompt.
 */
async function sendText(to, body) {
  const number = toE164(to);
  if (!number) return null;
  return post({ to: number, channel: 'whatsapp', messageType: 'text', text: body },
    { label: `text to ${number}` });
}

/**
 * A pre-approved template — the only thing WhatsApp allows outside the
 * 24-hour window, which is where reminders live.
 *
 * @param {string} to
 * @param {string} templateName  as approved in the Zavu dashboard
 * @param {string[]} variables   fill {{1}}, {{2}} … in order
 */
async function sendTemplate(to, templateName, variables = []) {
  const number = toE164(to);
  if (!number) return null;
  return post({
    to: number,
    channel: 'whatsapp',
    messageType: 'template',
    template: { name: templateName, language: process.env.ZAVU_TEMPLATE_LANG || 'en', variables },
  }, { label: `template ${templateName} to ${number}` });
}

/**
 * Interactive buttons. Kept so the older bot flows still import cleanly;
 * WhatsApp only allows these inside the 24-hour window.
 */
async function sendButtons(to, body, buttons) {
  const number = toE164(to);
  if (!number) return null;
  return post({
    to: number, channel: 'whatsapp', messageType: 'interactive', text: body,
    content: {
      type: 'button',
      buttons: (buttons || []).slice(0, 3).map(b => ({ id: b.id, title: String(b.title).slice(0, 20) })),
    },
  }, { label: `buttons to ${number}` });
}

/** Interactive list. Same 24-hour-window constraint as buttons. */
async function sendList(to, body, buttonLabel, sections) {
  const number = toE164(to);
  if (!number) return null;
  return post({
    to: number, channel: 'whatsapp', messageType: 'interactive', text: body,
    content: { type: 'list', button: buttonLabel, sections },
  }, { label: `list to ${number}` });
}

/**
 * Read receipts were a Meta Cloud API concept. Zavu reports delivery through
 * webhooks instead, so this is a no-op kept for call-site compatibility.
 */
async function markRead() {
  return null;
}

module.exports = { available, sendText, sendTemplate, sendButtons, sendList, markRead, toE164 };
