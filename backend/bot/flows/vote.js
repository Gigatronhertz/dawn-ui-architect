const db = require('../../db/client');
const { sendText, sendList } = require('../../services/whatsapp');
const { sendPaymentLinks } = require('./plan');
const M = require('../messages');

// Tally votes from a JSON string stored in the trip's temp/plan field
// We store vote tallies as a JSON object inside trip.plan under a "votes" key
function getVotes(trip) {
  try {
    const plan = JSON.parse(trip.plan || '{}');
    return plan._votes || { dates: {}, hotel: {} };
  } catch {
    return { dates: {}, hotel: {} };
  }
}

function saveVotes(trip, votes) {
  const plan = JSON.parse(trip.plan || '{}');
  plan._votes = votes;
  db.trips.update.run({
    id: trip.id, plan: JSON.stringify(plan),
    origin: null, destination: null, budget: null, days: null, squad_size: null,
    accommodation: null, date_flexibility: null, specific_dates: null,
    dealbreakers: null, selected_date: null, selected_hotel: null, group_id: null, status: null,
  });
}

// Handle a vote cast by a group member
async function handleVote(groupId, trip, phone, name, interactiveReply) {
  const replyId = interactiveReply?.button_reply?.id || interactiveReply?.list_reply?.id;
  const replyTitle = interactiveReply?.button_reply?.title || interactiveReply?.list_reply?.title;
  if (!replyId) return;

  const plan = JSON.parse(trip.plan || '{}');
  const votes = getVotes(trip);

  // ── Date vote ────────────────────────────────────────────────────────────
  if (trip.status === 'voting_dates') {
    const dateOption = (plan.date_options || []).find((d) => d.id === replyId);
    if (!dateOption) return;

    // Remove previous vote from this phone if any
    if (votes.dates[phone]) {
      const prev = votes.dates[phone];
      if (plan._dateTally) plan._dateTally[prev] = Math.max(0, (plan._dateTally[prev] || 1) - 1);
    }
    votes.dates[phone] = replyId;
    if (!plan._dateTally) plan._dateTally = {};
    plan._dateTally[replyId] = (plan._dateTally[replyId] || 0) + 1;

    saveVotes(trip, votes);
    await sendText(groupId, M.VOTE_DATE_CAST(dateOption.label, name));

    // Check if enough votes to lock (>50% of squad voted for same option)
    const tally = plan._dateTally || {};
    const winner = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
    const totalVoters = Object.keys(votes.dates).length;
    if (winner && (winner[1] >= Math.ceil(trip.squad_size / 2) || totalVoters >= trip.squad_size)) {
      const winDate = (plan.date_options || []).find((d) => d.id === winner[0]);
      if (winDate) {
        db.trips.update.run({
          id: trip.id, selected_date: winDate.label, status: 'voting_hotel',
          origin: null, destination: null, budget: null, days: null, squad_size: null,
          accommodation: null, date_flexibility: null, specific_dates: null,
          dealbreakers: null, plan: null, selected_hotel: null, group_id: null,
        });
        await sendText(groupId, M.VOTE_DATES_LOCKED(winDate.label));
        // Post hotel vote
        await postHotelVote(groupId, trip.id);
      }
    }
    return;
  }

  // ── Hotel vote ───────────────────────────────────────────────────────────
  if (trip.status === 'voting_hotel') {
    const hotels = plan.hotel ? [plan.hotel] : [];
    // The plan has a single AI-recommended hotel; additional hotels may be in plan.hotel_options
    const hotelOptions = plan.hotel_options || [plan.hotel];
    const chosen = hotelOptions.find((h, i) => `h${i}` === replyId || h.name === replyTitle);

    if (!chosen) return;
    votes.hotel[phone] = replyId;
    if (!plan._hotelTally) plan._hotelTally = {};
    plan._hotelTally[replyId] = (plan._hotelTally[replyId] || 0) + 1;
    saveVotes(trip, votes);
    await sendText(groupId, M.VOTE_HOTEL_CAST(chosen.name, name));

    const totalVoters = Object.keys(votes.hotel).length;
    const hotelTally = plan._hotelTally || {};
    const hotelWinner = Object.entries(hotelTally).sort((a, b) => b[1] - a[1])[0];
    if (hotelWinner && (hotelWinner[1] >= Math.ceil(trip.squad_size / 2) || totalVoters >= trip.squad_size)) {
      const winHotel = hotelOptions.find((h, i) => `h${i}` === hotelWinner[0]) || plan.hotel;
      const updatedTrip = db.trips.get.get(trip.id);
      db.trips.update.run({
        id: trip.id, selected_hotel: winHotel.name, status: 'payment',
        origin: null, destination: null, budget: null, days: null, squad_size: null,
        accommodation: null, date_flexibility: null, specific_dates: null,
        dealbreakers: null, plan: null, selected_date: null, group_id: null,
      });
      await sendText(groupId, M.VOTE_HOTEL_LOCKED(winHotel.name, updatedTrip.selected_date || 'TBC'));

      // Generate payment links for everyone who has been in the group chat
      // In a real deployment, you'd collect member phones from group join events.
      // For now we use the organiser's phone as a proxy — expand as members DM the bot.
      const memberPhones = Object.keys(votes.dates);
      if (memberPhones.length > 0) {
        const links = await sendPaymentLinks(updatedTrip, memberPhones);
        // DM each member their individual link
        for (const { phone: mPhone, url, amount } of links) {
          await sendText(mPhone, M.PAYMENT_LINK_PRIVATE(null, trip.id, amount, url));
        }
        // Post group status
        const paidCount = db.members.byTrip.all(trip.id).filter((m) => m.paid).length;
        await sendText(groupId, M.PAYMENT_GROUP_STATUS(paidCount, updatedTrip.squad_size, plan.cost_breakdown.per_person));
      }
    }
  }
}

async function postHotelVote(groupId, tripId) {
  const trip = db.trips.get.get(tripId);
  const plan = JSON.parse(trip.plan || '{}');
  const hotelOptions = plan.hotel_options || [plan.hotel];
  const rows = hotelOptions.map((h, i) => ({
    id: `h${i}`,
    title: h.name.slice(0, 24),
    description: `${new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(h.price_per_night)}/night · ⭐ ${h.rating}`,
  }));

  await sendList(groupId, M.VOTE_HOTEL_PROMPT, 'Pick a hotel', [{ title: 'Hotel options', rows }]);
}

module.exports = { handleVote, postHotelVote };
