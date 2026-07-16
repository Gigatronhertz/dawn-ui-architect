const { Router } = require('express');
const { v4: uuid } = require('uuid');
const db = require('../db/client');
const { generateTripPlan } = require('../services/gemini');
const { sendText } = require('../services/whatsapp');
const M = require('../bot/messages');

const router = Router();

// POST /api/plan
// Called by the web form after intake. Returns tripId + full Gemini plan.
router.post('/plan', async (req, res) => {
  const { origin, destination, budget, days, squadSize, accommodationType, dateFlexibility, dealbreakers } = req.body;

  if (!origin || !destination || !budget || !days || !squadSize) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  const tripId = uuid();

  // Persist skeleton trip so we can reference it later
  db.trips.insert.run({ id: tripId, organiser_phone: `web_${tripId}` });
  db.trips.update.run({
    id: tripId,
    origin,
    destination,
    budget: Number(budget),
    days: Number(days),
    squad_size: Number(squadSize),
    accommodation: accommodationType || 'Hotel',
    date_flexibility: dateFlexibility || 'Flexible',
    specific_dates: null,
    dealbreakers: dealbreakers || null,
    plan: null,
    selected_date: null,
    selected_hotel: null,
    group_id: null,
    status: 'generating',
  });

  try {
    const intake = db.trips.get.get(tripId);
    const plan = await generateTripPlan(intake);

    db.trips.update.run({
      id: tripId, plan: JSON.stringify(plan), status: 'plan_review',
      origin: null, destination: null, budget: null, days: null, squad_size: null,
      accommodation: null, date_flexibility: null, specific_dates: null,
      dealbreakers: null, selected_date: null, selected_hotel: null, group_id: null,
    });

    return res.json({ tripId, plan });
  } catch (err) {
    console.error('[api/plan]', err.message);
    db.trips.update.run({
      id: tripId, status: 'error', plan: null, origin: null, destination: null,
      budget: null, days: null, squad_size: null, accommodation: null,
      date_flexibility: null, specific_dates: null, dealbreakers: null,
      selected_date: null, selected_hotel: null, group_id: null,
    });
    return res.status(500).json({ error: 'Plan generation failed. Please try again.' });
  }
});

// POST /api/confirm
// Organiser has reviewed/edited the plan and confirmed it.
// Saves final plan, DMss the organiser immediately, returns bot number and instructions.
router.post('/confirm', async (req, res) => {
  const { tripId, plan, phone } = req.body;
  if (!tripId || !plan) return res.status(400).json({ error: 'Missing tripId or plan.' });

  const trip = db.trips.get.get(tripId);
  if (!trip) return res.status(404).json({ error: 'Trip not found.' });

  const botNumber = process.env.WA_DISPLAY_NUMBER || '234XXXXXXXXXX';

  db.trips.update.run({
    id: tripId,
    plan: JSON.stringify(plan),
    status: 'awaiting_group',
    origin: null, destination: null, budget: null, days: null, squad_size: null,
    accommodation: null, date_flexibility: null, specific_dates: null,
    dealbreakers: null, selected_date: null, selected_hotel: null, group_id: null,
  });

  // If the organiser gave us their WhatsApp number, wire the trip to them directly
  // so the dashboard and bot can reference them, then DM the add-to-group instructions.
  if (phone && typeof phone === 'string' && phone.trim().length >= 7) {
    const sanitisedPhone = phone.trim().replace(/\s+/g, '').replace(/^\+/, '');
    // Re-key the trip's organiser to their real phone (was web_{tripId})
    db.db.prepare('UPDATE trips SET organiser_phone = ? WHERE id = ?').run(sanitisedPhone, tripId);
    // Track their conversation state so the router can match group events
    db.conv.upsert.run({ phone: sanitisedPhone, name: null, state: 'awaiting_group', trip_id: tripId, temp: '{}' });
    // Fire the DM — errors are non-fatal (WA creds may not be live yet)
    sendText(sanitisedPhone, M.WEB_PLAN_CONFIRMED(trip.destination, botNumber))
      .catch((err) => console.warn('[confirm/dm]', err.message));
  } else {
    // No phone: fall back to the anonymous web key so the trip can still be tracked
    const webKey = `web_${tripId}`;
    db.conv.upsert.run({ phone: webKey, name: null, state: 'awaiting_group', trip_id: tripId, temp: '{}' });
  }

  return res.json({
    tripId,
    botNumber,
    destination: trip.destination,
    squadSize: trip.squad_size,
    dmSent: !!(phone && phone.trim().length >= 7),
    instructions: [
      `Open your squad's WhatsApp group (or create one).`,
      `Tap Group Info → Add Participants.`,
      `Add: +${botNumber}`,
      `The bot will reveal the plan the moment it joins.`,
    ],
  });
});

// GET /api/plan/:tripId
// Returns the stored plan for a given trip — used if the organiser refreshes mid-flow.
router.get('/plan/:tripId', (req, res) => {
  const trip = db.trips.get.get(req.params.tripId);
  if (!trip || !trip.plan) return res.status(404).json({ error: 'Not found.' });
  res.json({ tripId: trip.id, plan: JSON.parse(trip.plan), status: trip.status });
});

// POST /api/agents
// Upsert a Pro agent profile. Phone is the unique identifier.
router.post('/agents', (req, res) => {
  const { phone, agencyName, waNumber, serviceFee, color, planType, tagline } = req.body;
  if (!phone || typeof phone !== 'string' || phone.trim().length < 5)
    return res.status(400).json({ error: 'A valid phone number is required.' });
  if (!agencyName || typeof agencyName !== 'string' || !agencyName.trim())
    return res.status(400).json({ error: 'Agency name is required.' });

  const sanitisedPhone = phone.trim().replace(/\s+/g, '');
  const id = uuid();

  db.agents.upsert.run({
    id,
    phone: sanitisedPhone,
    agency_name: agencyName.trim(),
    wa_number: (waNumber || sanitisedPhone).trim(),
    service_fee: Number(serviceFee) || 10000,
    color: color || '#6366f1',
    plan_type: planType || 'starter',
    tagline: tagline?.trim() || null,
  });

  const agent = db.agents.get.get(sanitisedPhone);
  return res.json({ ok: true, agent });
});

// GET /api/agents/:phone
router.get('/agents/:phone', (req, res) => {
  const agent = db.agents.get.get(req.params.phone.replace(/\s+/g, ''));
  if (!agent) return res.status(404).json({ error: 'Agent not found.' });
  return res.json({ agent });
});

// GET /api/dashboard/:phone
// Returns all trips for an agent with payment summaries.
router.get('/dashboard/:phone', (req, res) => {
  const phone = req.params.phone.replace(/\s+/g, '');
  const agent = db.agents.get.get(phone);
  if (!agent) return res.status(404).json({ error: 'Agent not found.' });

  const trips = db.agents.dashboard.all(phone);

  const activeStatuses = new Set(['awaiting_group', 'voting_dates', 'voting_hotel', 'payment']);
  const now = Math.floor(Date.now() / 1000);
  const monthStart = Math.floor(new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime() / 1000);

  const summary = {
    active_trips: trips.filter(t => activeStatuses.has(t.status)).length,
    trips_completed: trips.filter(t => t.status === 'active').length,
    total_collected: trips.reduce((s, t) => s + (t.total_collected || 0), 0),
    pending_payments: trips.filter(t => t.status === 'payment').reduce((s, t) => s + Math.max(0, (t.squad_size || 0) - t.paid_count), 0),
    revenue_mtd: trips.filter(t => t.created_at >= monthStart).reduce((s, t) => s + (t.total_collected || 0), 0),
  };

  return res.json({ agent, trips, summary });
});

// POST /api/waitlist
// Captures a phone number + source tag from any conversion surface.
// Silently deduplicates (phone, source) pairs.
router.post('/waitlist', (req, res) => {
  const { phone, source } = req.body;
  if (!phone || typeof phone !== 'string' || phone.trim().length < 5) {
    return res.status(400).json({ error: 'A valid phone number is required.' });
  }
  const sanitised = phone.trim().replace(/\s+/g, '');
  const src = (typeof source === 'string' && source.trim()) ? source.trim() : 'unknown';
  db.waitlist.insert.run({ phone: sanitised, source: src });
  return res.json({ ok: true });
});

module.exports = router;
