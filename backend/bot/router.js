const db = require('../db/client');
const { sendText, markRead } = require('../services/whatsapp');
const { startIntake, handleIntake } = require('./flows/intake');
const { handlePlanReview, revealPlanToGroup } = require('./flows/plan');
const { handleVote } = require('./flows/vote');
const M = require('./messages');

function normalizePhone(phone) {
  return phone.replace(/\D/g, '');
}

// Main entry point — called for every incoming message event
async function routeMessage(messageObj, contact, metadata) {
  const phone = normalizePhone(messageObj.from);
  const name = contact?.profile?.name || null;
  const msgType = messageObj.type;

  if (messageObj.id) markRead(messageObj.id);

  // ── System / group membership events ────────────────────────────────────
  if (msgType === 'system') {
    const body = messageObj.system?.body || '';
    if (body.includes('added') && metadata?.phone_number_id) {
      const groupId = messageObj.from;
      const allConvs = await db.raw(
        "SELECT * FROM conversations WHERE state = 'awaiting_group' ORDER BY updated_at DESC LIMIT 1"
      );
      if (allConvs) {
        const trip = await db.trips.get(allConvs.trip_id);
        if (trip && trip.status === 'awaiting_group') {
          await db.trips.update({
            id: trip.id, group_id: groupId, status: 'voting_dates',
            origin: null, destination: null, budget: null, days: null, squad_size: null,
            accommodation: null, date_flexibility: null, specific_dates: null,
            dealbreakers: null, plan: null, selected_date: null, selected_hotel: null,
          });
          await db.conv.upsert({ phone: allConvs.phone, name: allConvs.name, state: 'group_active', trip_id: trip.id, temp: '{}' });
          await revealPlanToGroup(groupId, { ...trip, group_id: groupId });
        }
      }
    }
    return;
  }

  // ── Interactive message (button/list reply = vote) ────────────────────
  if (msgType === 'interactive') {
    const interactive = messageObj.interactive;
    const trip = await findTripForPhone(phone);
    if (trip && (trip.status === 'voting_dates' || trip.status === 'voting_hotel') && trip.group_id) {
      await handleVote(trip.group_id, trip, phone, name, interactive);
    }
    return;
  }

  // ── Text messages ─────────────────────────────────────────────────────
  if (msgType !== 'text') return;

  const text = (messageObj.text?.body || '').trim().toLowerCase();

  let conv = await db.conv.get(phone);
  if (!conv) {
    conv = { phone, name, state: 'idle', trip_id: null, temp: '{}' };
  }

  const { state } = conv;

  // ── Global commands ───────────────────────────────────────────────────
  if (text === 'reset') {
    await db.conv.reset(phone);
    return sendText(phone, M.RESET_CONFIRM);
  }

  if (text === 'help') {
    return sendText(phone, M.HELP);
  }

  if (text === 'status') {
    const trip = conv.trip_id ? await db.trips.get(conv.trip_id) : null;
    if (!trip) return sendText(phone, `No active trip. Send anything to start planning. 🚀`);
    const members = await db.members.byTrip(trip.id);
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

// Find the most recent active trip for a phone across organiser or member roles
async function findTripForPhone(phone) {
  const conv = await db.conv.get(phone);
  if (conv?.trip_id) return db.trips.get(conv.trip_id);
  const membership = await db.raw(
    'SELECT trip_id FROM members WHERE phone = ? ORDER BY added_at DESC LIMIT 1',
    [phone]
  );
  if (membership) return db.trips.get(membership.trip_id);
  return null;
}

module.exports = { routeMessage };
