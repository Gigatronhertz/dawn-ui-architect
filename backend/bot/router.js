const db = require('../db/client');
const { sendText, markRead } = require('../services/whatsapp');
const { startIntake, handleIntake } = require('./flows/intake');
const { handlePlanReview, revealPlanToGroup } = require('./flows/plan');
const { handleVote } = require('./flows/vote');
const M = require('./messages');

// Normalize the "from" field — Meta sends plain numbers like "2348012345678"
function normalizePhone(phone) {
  return phone.replace(/\D/g, '');
}

// Detect if a phone ID looks like a group (Meta group IDs contain "@g.us" or are longer strings)
// In the Meta Cloud API webhook, group messages still come as individual message events
// but the conversation_id or metadata may differ. We detect groups via the 'context' field
// or by checking whether the phone is the same as the bot's phone number ID.
function isGroupMessage(messageObj, metadata) {
  // Meta Cloud API: group messages set the recipient to the group ID in some configurations.
  // The most reliable indicator in v19+ is the presence of a "group_id" in the context.
  // For now we use a simple heuristic: if the conversation appears in a group context,
  // the "from" is still an individual phone, but "context.from" may differ.
  // We'll track group association through the trip's group_id field set during plan reveal.
  return false; // handled separately when bot is added via group_membership events
}

// Main entry point — called for every incoming message event
async function routeMessage(messageObj, contact, metadata) {
  const phone = normalizePhone(messageObj.from);
  const name = contact?.profile?.name || null;
  const msgType = messageObj.type; // text | interactive | system | ...

  // Acknowledge read receipt immediately
  if (messageObj.id) markRead(messageObj.id);

  // ── System / group membership events ────────────────────────────────────
  if (msgType === 'system') {
    const body = messageObj.system?.body || '';
    // When our bot number is added to a group, look for a pending trip
    if (body.includes('added') && metadata?.phone_number_id) {
      const groupId = messageObj.from; // group JID when bot joins
      // Find the most recent trip in awaiting_group state (heuristic for MVP)
      // In production: cross-reference the organiser who initiated the group link
      const allConvs = db.db.prepare(
        "SELECT * FROM conversations WHERE state = 'awaiting_group' ORDER BY updated_at DESC LIMIT 1"
      ).get();
      if (allConvs) {
        const trip = db.trips.get.get(allConvs.trip_id);
        if (trip && trip.status === 'awaiting_group') {
          db.trips.update.run({ id: trip.id, group_id: groupId, status: 'voting_dates', origin: null, destination: null, budget: null, days: null, squad_size: null, accommodation: null, date_flexibility: null, specific_dates: null, dealbreakers: null, plan: null, selected_date: null, selected_hotel: null });
          db.conv.upsert.run({ phone: allConvs.phone, name: allConvs.name, state: 'group_active', trip_id: trip.id, temp: '{}' });
          await revealPlanToGroup(groupId, { ...trip, group_id: groupId });
        }
      }
    }
    return;
  }

  // ── Interactive message (button/list reply = vote) ────────────────────
  if (msgType === 'interactive') {
    const interactive = messageObj.interactive;
    // Check if this is coming from a group context
    const trip = findTripForPhone(phone);
    if (trip && (trip.status === 'voting_dates' || trip.status === 'voting_hotel') && trip.group_id) {
      await handleVote(trip.group_id, trip, phone, name, interactive);
    }
    return;
  }

  // ── Text messages ─────────────────────────────────────────────────────
  if (msgType !== 'text') return; // ignore images, documents, etc.

  const text = (messageObj.text?.body || '').trim().toLowerCase();

  // Get or bootstrap conversation
  let conv = db.conv.get.get(phone);
  if (!conv) {
    conv = { phone, name, state: 'idle', trip_id: null, temp: '{}' };
  }

  const { state } = conv;

  // ── Global commands ───────────────────────────────────────────────────
  if (text === 'reset') {
    db.conv.reset.run(phone);
    return sendText(phone, M.RESET_CONFIRM);
  }

  if (text === 'help') {
    return sendText(phone, M.HELP);
  }

  if (text === 'status') {
    const trip = conv.trip_id ? db.trips.get.get(conv.trip_id) : null;
    if (!trip) return sendText(phone, `No active trip. Send anything to start planning. 🚀`);
    const members = db.members.byTrip.all(trip.id);
    const paid = members.filter((m) => m.paid).length;
    return sendText(
      phone,
      `*Trip status: ${trip.status}*\n` +
      `${trip.origin || '?'} → ${trip.destination || '?'} · ${trip.days || '?'} days\n` +
      (members.length > 0 ? `💳 ${paid}/${members.length} paid` : '')
    );
  }

  // ── State routing ─────────────────────────────────────────────────────
  if (state === 'idle' || text === 'new trip') {
    return startIntake(phone, name);
  }

  if (state.startsWith('intake_') || state === 'generating') {
    return handleIntake(conv, messageObj);
  }

  if (state === 'plan_review') {
    return handlePlanReview(conv, messageObj);
  }

  if (state === 'awaiting_group') {
    if (text === 'ready') {
      return sendText(phone, `Got it! Waiting for you to add me to the group. As soon as I join, I'll reveal the plan to the squad. 👀`);
    }
    return sendText(phone, `Add me to your group first, then send *ready*. I'll handle the rest.`);
  }

  if (state === 'group_active' || state === 'payment') {
    return sendText(phone, `Your trip is in progress. Send *status* for an update.`);
  }

  return sendText(phone, M.UNKNOWN);
}

// Helper: find the most recent active trip for a phone number across organiser or member roles
function findTripForPhone(phone) {
  const conv = db.conv.get.get(phone);
  if (conv?.trip_id) return db.trips.get.get(conv.trip_id);
  // Check if they're a member of any active trip
  const membership = db.db.prepare(
    'SELECT trip_id FROM members WHERE phone = ? ORDER BY added_at DESC LIMIT 1'
  ).get(phone);
  if (membership) return db.trips.get.get(membership.trip_id);
  return null;
}

module.exports = { routeMessage };
