const { v4: uuid } = require('uuid');
const db = require('../../db/client');
const { sendText } = require('../../services/whatsapp');
const { generateTripPlan, formatPlanSummary } = require('../../services/planGenerator');
const M = require('../messages');

const ACCOMMODATION_MAP = { '1': 'Hotel', '2': 'Shortlet', '3': 'Budget guesthouse', '4': 'Surprise me' };
const DATE_MAP = { '1': 'Flexible', '2': 'Specific dates' };

// State → question to ask on entry
const STATE_PROMPTS = {
  intake_q1: null, // asked in startIntake()
  intake_q2: M.Q2_DESTINATION,
  intake_q3: null, // dynamic — needs origin + destination
  intake_q4: M.Q4_DAYS,
  intake_q5: M.Q5_SQUAD,
  intake_q6: M.Q6_ACCOMMODATION,
  intake_q7: M.Q7_DATES,
  intake_q7b: M.Q7B_SPECIFIC_DATES,
  intake_q8: M.Q8_DEALBREAKERS,
};

// Start a fresh intake session
async function startIntake(phone, name) {
  const tripId = uuid();
  await db.trips.insert({ id: tripId, organiser_phone: phone });
  await db.conv.upsert({ phone, name, state: 'intake_q1', trip_id: tripId, temp: '{}' });
  await sendText(phone, M.WELCOME(name));
}

// Process an answer and advance to the next state
async function handleIntake(conv, message) {
  const { phone, state, trip_id: tripId } = conv;
  const temp = JSON.parse(conv.temp || '{}');
  const text = message.text?.body?.trim() || '';
  const lower = text.toLowerCase();

  // Global commands available at any point
  if (lower === 'reset') {
    await db.conv.reset(phone);
    return sendText(phone, M.RESET_CONFIRM);
  }

  switch (state) {
    case 'intake_q1': {
      if (!text) return sendText(phone, M.WELCOME(conv.name));
      temp.origin = text;
      await db.conv.upsert({ phone, name: conv.name, state: 'intake_q2', trip_id: tripId, temp: JSON.stringify(temp) });
      return sendText(phone, M.Q2_DESTINATION);
    }

    case 'intake_q2': {
      temp.destination = text;
      await db.conv.upsert({ phone, name: conv.name, state: 'intake_q3', trip_id: tripId, temp: JSON.stringify(temp) });
      return sendText(phone, M.Q3_BUDGET(temp.origin, temp.destination));
    }

    case 'intake_q3': {
      const budget = parseInt(text.replace(/[^0-9]/g, ''), 10);
      if (isNaN(budget) || budget < 5000) return sendText(phone, M.INVALID_NUMBER('budget'));
      temp.budget = budget;
      await db.conv.upsert({ phone, name: conv.name, state: 'intake_q4', trip_id: tripId, temp: JSON.stringify(temp) });
      return sendText(phone, M.Q4_DAYS);
    }

    case 'intake_q4': {
      const days = parseInt(text, 10);
      if (isNaN(days) || days < 1 || days > 14) return sendText(phone, M.INVALID_NUMBER('days (1–14)'));
      temp.days = days;
      await db.conv.upsert({ phone, name: conv.name, state: 'intake_q5', trip_id: tripId, temp: JSON.stringify(temp) });
      return sendText(phone, M.Q5_SQUAD);
    }

    case 'intake_q5': {
      const size = parseInt(text, 10);
      if (isNaN(size) || size < 2 || size > 50) return sendText(phone, M.INVALID_NUMBER('squad size (2–50)'));
      temp.squad_size = size;
      await db.conv.upsert({ phone, name: conv.name, state: 'intake_q6', trip_id: tripId, temp: JSON.stringify(temp) });
      return sendText(phone, M.Q6_ACCOMMODATION);
    }

    case 'intake_q6': {
      const acc = ACCOMMODATION_MAP[text] || text;
      temp.accommodation = acc;
      await db.conv.upsert({ phone, name: conv.name, state: 'intake_q7', trip_id: tripId, temp: JSON.stringify(temp) });
      return sendText(phone, M.Q7_DATES);
    }

    case 'intake_q7': {
      if (text === '2' || lower.includes('specific') || lower.includes('date')) {
        temp.date_flexibility = 'Specific dates';
        await db.conv.upsert({ phone, name: conv.name, state: 'intake_q7b', trip_id: tripId, temp: JSON.stringify(temp) });
        return sendText(phone, M.Q7B_SPECIFIC_DATES);
      }
      temp.date_flexibility = 'Flexible';
      await db.conv.upsert({ phone, name: conv.name, state: 'intake_q8', trip_id: tripId, temp: JSON.stringify(temp) });
      return sendText(phone, M.Q8_DEALBREAKERS);
    }

    case 'intake_q7b': {
      temp.specific_dates = text;
      await db.conv.upsert({ phone, name: conv.name, state: 'intake_q8', trip_id: tripId, temp: JSON.stringify(temp) });
      return sendText(phone, M.Q8_DEALBREAKERS);
    }

    case 'intake_q8': {
      temp.dealbreakers = lower === 'none' ? null : text;

      await db.trips.update({
        id: tripId,
        origin: temp.origin,
        destination: temp.destination,
        budget: temp.budget,
        days: temp.days,
        squad_size: temp.squad_size,
        accommodation: temp.accommodation,
        date_flexibility: temp.date_flexibility,
        specific_dates: temp.specific_dates || null,
        dealbreakers: temp.dealbreakers,
        plan: null,
        selected_date: null,
        selected_hotel: null,
        group_id: null,
        status: 'generating',
      });
      await db.conv.upsert({ phone, name: conv.name, state: 'generating', trip_id: tripId, temp: '{}' });

      await sendText(phone, M.GENERATING(temp.destination));

      try {
        const trip = await db.trips.get(tripId);
        const plan = await generateTripPlan(trip);
        await db.trips.update({
          id: tripId, plan: JSON.stringify(plan), status: 'plan_review',
          origin: null, destination: null, budget: null, days: null, squad_size: null,
          accommodation: null, date_flexibility: null, specific_dates: null,
          dealbreakers: null, selected_date: null, selected_hotel: null, group_id: null,
        });
        await db.conv.upsert({ phone, name: conv.name, state: 'plan_review', trip_id: tripId, temp: '{}' });
        return sendText(phone, formatPlanSummary(plan, trip) + M.PLAN_CONFIRM_PROMPT);
      } catch (err) {
        console.error('[planner]', err.message);
        await db.conv.upsert({ phone, name: conv.name, state: 'intake_q8', trip_id: tripId, temp: JSON.stringify(temp) });
        return sendText(phone, M.PLAN_ERROR);
      }
    }

    default:
      return sendText(phone, M.UNKNOWN);
  }
}

module.exports = { startIntake, handleIntake };
