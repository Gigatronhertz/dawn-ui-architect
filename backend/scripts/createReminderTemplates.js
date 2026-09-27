#!/usr/bin/env node
/**
 * Creates every Whisper360 WhatsApp template the app sends: the three
 * payment-reminder tones (services/reminders.js) plus the "your plan is
 * ready" notification (routes/api.js). One template per distinct message
 * shape — a WhatsApp template can't branch on content the way the old
 * free-text messageFor() could.
 *
 * This only creates DRAFTS. Whisper360 states approval is deliberately a
 * human action in the console, not something an API key does unattended —
 * so after running this, open the Whisper360 console → Messages → Templates
 * and approve each one (self-approve, no Meta review, since the connected
 * number is a Compatibility/QR-linked one, not Official Cloud API).
 *
 * Safe to re-run: a template whose name already exists in the workspace just
 * reports "already exists" and moves on, rather than failing the whole run.
 *
 * Usage (run from repo root):
 *   node backend/scripts/createReminderTemplates.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const axios = require('axios');

const BASE = process.env.WHISPER360_BASE_URL || 'https://api.whisper360.io';
const KEY  = process.env.WHISPER360_API_KEY;

const TEMPLATES = [
  {
    name: process.env.WHISPER360_TEMPLATE_NUDGE || 'karije_reminder_nudge',
    body: 'Hi {{name}}! You\'re on the list for *{{trip_name}}* 🎉\n\nYour share is {{amount}}. Pay whenever you\'re ready:\n{{link}}\n\n— Karije',
  },
  {
    name: process.env.WHISPER360_TEMPLATE_CHASE || 'karije_reminder_chase',
    body: 'Hi {{name}} — still holding your spot on *{{trip_name}}*.\n\n{{amount}} for your share. Takes about a minute:\n{{link}}\n\n— Karije',
  },
  {
    name: process.env.WHISPER360_TEMPLATE_FINAL || 'karije_reminder_final',
    body: 'Hi {{name}} — last call for *{{trip_name}}*.\n\nYour share is {{amount}}. The squad is only confirmed once everyone has paid{{days_phrase}}.\n\nPay here: {{link}}\n\n— Karije',
  },
  {
    name: process.env.WHISPER360_TEMPLATE_PLAN_READY || 'karije_plan_ready',
    body: 'Your trip to *{{destination}}* is ready! 🎉\n\nFull itinerary, hotels and cost per person:\n{{link}}\n\n— Karije',
  },
];

async function run() {
  if (!KEY) {
    console.error('WHISPER360_API_KEY not set (checked backend/.env) — nothing to do.');
    process.exit(1);
  }

  console.log('\n── Creating Whisper360 templates ────────────────────────────────');
  for (const t of TEMPLATES) {
    try {
      const { data } = await axios.post(`${BASE}/v1/templates`, {
        channel: 'whatsapp',
        name: t.name,
        category: 'utility',
        language: 'en',
        body: t.body,
      }, {
        headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
        timeout: 20000,
      });
      console.log(`✓ ${t.name} — created as draft (id ${data.id}, provider ${data.provider}). Variables: ${data.variables.join(', ')}`);
    } catch (err) {
      const code = err.response?.data?.error?.code;
      const msg  = err.response?.data?.error?.message || err.message;
      if (/already (has|exists)|duplicate/i.test(msg)) {
        console.log(`· ${t.name} — already exists, skipping.`);
      } else {
        console.error(`✗ ${t.name} — failed (${code || err.response?.status}): ${msg}`);
      }
    }
  }
  console.log('\nNext: open the Whisper360 console → Messages → Templates and approve each one above.\n');
}

run();
