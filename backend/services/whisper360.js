/**
 * WhatsApp delivery via Whisper360 (https://whisper360.io) — the only
 * WhatsApp integration in the app, used by the payment-reminder chase-up
 * (services/reminders.js). The previous provider (Zavu) and the bot/
 * conversation flows it drove have been removed.
 *
 * Two things about Whisper360 that shape everything below:
 *
 *  1. A "blocked" send is a 202, not an HTTP error — e.g. the 24-hour window
 *     being closed comes back as `{ outcome: 'blocked', reason: 'outside_service_window' }`
 *     with status 202. Callers must check `outcome`, not just catch().
 *  2. Template variables are a named object (`{ name: 'Ada' }`), not the
 *     positional `{{1}}`/`{{2}}` array Zavu uses — keys must match exactly
 *     what the approved template declares.
 */
const axios = require('axios');
const crypto = require('crypto');

const BASE = process.env.WHISPER360_BASE_URL || 'https://api.whisper360.io';

/** True only when a key is present. Callers use this to pick a channel. */
function available() {
  return !!process.env.WHISPER360_API_KEY;
}

function headers() {
  return {
    Authorization: `Bearer ${process.env.WHISPER360_API_KEY}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Nigerian numbers arrive as 0803…, 234803… or +234803… — the same person
 * written three ways. Whisper360 wants E.164, so normalise before sending
 * rather than rejecting someone over how they typed their own number.
 */
function toE164(raw) {
  let d = String(raw || '').replace(/[^\d]/g, '');
  if (!d) return null;
  if (d.startsWith('0'))    d = `234${d.slice(1)}`;  // local Nigerian form
  else if (d.length === 10) d = `234${d}`;           // missing both prefixes
  return `+${d}`;
}

/**
 * Send an approved template — the only thing allowed outside the 24-hour
 * window, which is where reminders live.
 *
 * @param {string} to
 * @param {string} templateName   as approved in the Whisper360 console
 * @param {Record<string,string>} variables   named to match the template's own {{placeholders}}
 * @returns {Promise<{ ok: boolean, id?: string, reason?: string, remediation?: string }>}
 */
async function sendTemplate(to, templateName, variables = {}) {
  const number = toE164(to);
  if (!number || !available()) return { ok: false, reason: 'not_configured' };

  try {
    const { data } = await axios.post(`${BASE}/v1/messages`, {
      channel: 'whatsapp',
      to: number,
      template: { name: templateName, variables },
    }, {
      headers: { ...headers(), 'Idempotency-Key': crypto.randomUUID() },
      timeout: 20000,
    });

    // A policy refusal (closed window, no consent, unapproved template) is
    // still a 202 — `outcome`/`reason` carry the real answer, not the HTTP status.
    if (data.outcome !== 'sent') {
      console.warn(`[whisper360] template ${templateName} to ${number} blocked: ${data.reason} — ${data.remediation}`);
      return { ok: false, reason: data.reason, remediation: data.remediation };
    }
    return { ok: true, id: data.id };
  } catch (err) {
    const status = err.response?.status;
    const code   = err.response?.data?.error?.code;
    const msg    = err.response?.data?.error?.message || err.message;
    if (status === 401) {
      console.error(`[whisper360] template ${templateName} to ${number}: WHISPER360_API_KEY rejected`);
    } else if (status === 429) {
      console.warn(`[whisper360] template ${templateName} to ${number}: rate limited`);
    } else {
      console.warn(`[whisper360] template ${templateName} to ${number} failed (${status} ${code || '—'}): ${msg}`);
    }
    return { ok: false, reason: code || 'request_failed' };
  }
}

module.exports = { available, sendTemplate, toE164 };
