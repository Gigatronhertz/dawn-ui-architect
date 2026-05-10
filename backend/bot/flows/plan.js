const { v4: uuid } = require('uuid');
const db = require('../../db/client');
const { sendText, sendList } = require('../../services/whatsapp');
const { formatPlanSummary } = require('../../services/gemini');
const { initializePayment, fmtNGN } = require('../../services/paystack');
const M = require('../messages');

// Organiser confirms the plan and gets the group link
async function handlePlanReview(conv, message) {
  const { phone, trip_id: tripId } = conv;
  const text = (message.text?.body || '').trim().toLowerCase();
  const trip = db.trips.get.get(tripId);

  if (!trip) return sendText(phone, M.UNKNOWN);

  if (text === 'reset') {
    db.conv.reset.run(phone);
    return sendText(phone, M.RESET_CONFIRM);
  }

  if (text === 'confirm') {
    db.trips.update.run({ id: tripId, status: 'awaiting_group', origin: null, destination: null, budget: null, days: null, squad_size: null, accommodation: null, date_flexibility: null, specific_dates: null, dealbreakers: null, plan: null, selected_date: null, selected_hotel: null, group_id: null });
    db.conv.upsert.run({ phone, name: conv.name, state: 'awaiting_group', trip_id: tripId, temp: '{}' });
    return sendText(phone, M.PLAN_CONFIRMED(trip.destination));
  }

  if (text === 'retry') {
    // Re-show the plan summary
    const plan = JSON.parse(trip.plan || '{}');
    return sendText(phone, formatPlanSummary(plan, trip) + M.PLAN_CONFIRM_PROMPT);
  }

  // Any other text treated as an edit request — re-show plan + prompt
  const plan = JSON.parse(trip.plan || '{}');
  return sendText(
    phone,
    `Got it. (Edit support coming soon — for now, type *confirm* to go ahead or *reset* to start over.)\n\n` +
    formatPlanSummary(plan, trip) + M.PLAN_CONFIRM_PROMPT
  );
}

// Bot has been added to the group — reveal the plan
async function revealPlanToGroup(groupId, trip) {
  const plan = JSON.parse(trip.plan || '{}');
  const { hotel, cost_breakdown: cost, date_options: dates } = plan;

  // Reveal message
  await sendText(
    groupId,
    M.GROUP_REVEAL(
      trip.destination,
      trip.origin,
      trip.days,
      trip.squad_size,
      hotel.name,
      cost.per_person
    )
  );

  // Post date options as a list
  if (dates && dates.length > 0) {
    await sendList(
      groupId,
      M.VOTE_DATES_PROMPT,
      'Pick a date',
      [{ title: 'Available weekends', rows: dates.map((d) => ({ id: d.id, title: d.label, description: d.sub })) }]
    );
  }

  // Update trip status
  db.trips.update.run({ id: trip.id, status: 'voting_dates', group_id: groupId, origin: null, destination: null, budget: null, days: null, squad_size: null, accommodation: null, date_flexibility: null, specific_dates: null, dealbreakers: null, plan: null, selected_date: null, selected_hotel: null });
}

// Organiser confirmed — generate payment links and DM every member
async function sendPaymentLinks(trip, memberPhones) {
  const plan = JSON.parse(trip.plan || '{}');
  const { cost_breakdown: cost } = plan;

  // Platform fee split: ₦5,000 / squad_size, added to per_person
  const platformFeePerPerson = Math.round(trip.platform_fee / trip.squad_size);
  const totalPerPerson = cost.per_person + platformFeePerPerson;

  const links = [];

  for (const phone of memberPhones) {
    const memberId = uuid();
    db.members.insert.run({ id: memberId, trip_id: trip.id, phone, name: null, amount: totalPerPerson });

    try {
      const { reference, url } = await initializePayment({
        tripId: trip.id,
        phone,
        name: null,
        amountNGN: totalPerPerson,
      });
      db.members.updateUrl.run({ ref: reference, url, trip_id: trip.id, phone });
      links.push({ phone, url, amount: totalPerPerson });
    } catch (err) {
      console.error('[paystack] link generation failed for', phone, err.message);
    }
  }

  return links;
}

module.exports = { handlePlanReview, revealPlanToGroup, sendPaymentLinks };
