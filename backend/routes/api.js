const { Router } = require('express');
const { v4: uuid } = require('uuid');
const db = require('../db/client');
const { generateTripPlan } = require('../services/gemini');
const { sendText } = require('../services/whatsapp');
const M = require('../bot/messages');
const GT = require('../services/googleTravel');
const { getLines } = require('../utils/logger');

const router = Router();

// POST /api/plan
// Called by the web form after intake. Returns tripId + full Gemini plan.
router.post('/plan', async (req, res) => {
  const { origin, destination, budget, days, squadSize, accommodationType, dateFlexibility, dealbreakers } = req.body;

  if (!origin || !destination || !budget || !days || !squadSize) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  const tripId = uuid();

  await db.trips.insert({ id: tripId, organiser_phone: `web_${tripId}` });
  await db.trips.update({
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
    const intake = await db.trips.get(tripId);
    const { plan, scraped } = await generateTripPlan(intake);

    await db.trips.update({
      id: tripId, plan: JSON.stringify(plan), status: 'plan_review',
      origin: null, destination: null, budget: null, days: null, squad_size: null,
      accommodation: null, date_flexibility: null, specific_dates: null,
      dealbreakers: null, selected_date: null, selected_hotel: null, group_id: null,
    });

    return res.json({ tripId, plan, scraped });
  } catch (err) {
    console.error('[api/plan]', err.message);
    await db.trips.update({
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

  const trip = await db.trips.get(tripId);
  if (!trip) return res.status(404).json({ error: 'Trip not found.' });

  const botNumber = process.env.WA_DISPLAY_NUMBER || '234XXXXXXXXXX';

  await db.trips.update({
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
    await db.raw('UPDATE trips SET organiser_phone = ? WHERE id = ?', [sanitisedPhone, tripId]);
    await db.conv.upsert({ phone: sanitisedPhone, name: null, state: 'awaiting_group', trip_id: tripId, temp: '{}' });
    sendText(sanitisedPhone, M.WEB_PLAN_CONFIRMED(trip.destination, botNumber))
      .catch((err) => console.warn('[confirm/dm]', err.message));
  } else {
    const webKey = `web_${tripId}`;
    await db.conv.upsert({ phone: webKey, name: null, state: 'awaiting_group', trip_id: tripId, temp: '{}' });
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
router.get('/plan/:tripId', async (req, res) => {
  const trip = await db.trips.get(req.params.tripId);
  if (!trip || !trip.plan) return res.status(404).json({ error: 'Not found.' });
  res.json({ tripId: trip.id, plan: JSON.parse(trip.plan), status: trip.status });
});

// POST /api/agents
// Upsert a Pro agent profile. Phone is the unique identifier.
router.post('/agents', async (req, res) => {
  const { phone, agencyName, waNumber, serviceFee, color, planType, tagline } = req.body;
  if (!phone || typeof phone !== 'string' || phone.trim().length < 5)
    return res.status(400).json({ error: 'A valid phone number is required.' });
  if (!agencyName || typeof agencyName !== 'string' || !agencyName.trim())
    return res.status(400).json({ error: 'Agency name is required.' });

  const sanitisedPhone = phone.trim().replace(/\s+/g, '');
  const id = uuid();

  await db.agents.upsert({
    id,
    phone: sanitisedPhone,
    agency_name: agencyName.trim(),
    wa_number: (waNumber || sanitisedPhone).trim(),
    service_fee: Number(serviceFee) || 10000,
    color: color || '#6366f1',
    plan_type: planType || 'starter',
    tagline: tagline?.trim() || null,
  });

  const agent = await db.agents.get(sanitisedPhone);
  return res.json({ ok: true, agent });
});

// GET /api/agents/:phone
router.get('/agents/:phone', async (req, res) => {
  const agent = await db.agents.get(req.params.phone.replace(/\s+/g, ''));
  if (!agent) return res.status(404).json({ error: 'Agent not found.' });
  return res.json({ agent });
});

// GET /api/dashboard/:phone
// Returns all trips for an agent with payment summaries.
router.get('/dashboard/:phone', async (req, res) => {
  const phone = req.params.phone.replace(/\s+/g, '');
  const agent = await db.agents.get(phone);
  if (!agent) return res.status(404).json({ error: 'Agent not found.' });

  const trips = await db.agents.dashboard(phone);

  const activeStatuses = new Set(['awaiting_group', 'voting_dates', 'voting_hotel', 'payment']);
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

// GET /api/scraper-test?from=Lagos&to=Ibadan
// Quick diagnostic: runs the three scrapers and returns raw results.
// Hit this in the browser to see what Google Travel actually returns.
router.get('/scraper-test', async (req, res) => {
  const from = req.query.from || 'Lagos';
  const to   = req.query.to   || 'Ibadan';
  console.log(`[scraper-test] Testing scrapers sequentially: ${from} → ${to}`);
  const t0 = Date.now();

  let hotels, rentals, flights;
  try { hotels  = await GT.scrapeHotels(to); }            catch(e) { hotels  = { error: e.message }; }
  try { rentals = await GT.scrapeVacationRentals(to); }   catch(e) { rentals = { error: e.message }; }
  try { flights = await GT.scrapeFlights(from, to); }     catch(e) { flights = { error: e.message }; }

  res.json({
    chromeAvailable: GT.available,
    elapsedMs: Date.now() - t0,
    hotels,
    rentals,
    flights,
  });
});

// GET /api/scraper-debug?url=...
// Returns the raw innerText of a URL loaded by headless Chrome — used to diagnose what
// Google actually serves to our scraper (consent wall, CAPTCHA, real listings, etc.).
router.get('/scraper-debug', async (req, res) => {
  const url = req.query.url || 'https://www.google.com/travel/hotels?q=hotels+in+Ibadan+Nigeria&hl=en&curr=NGN';
  console.log(`[scraper-debug] Fetching: ${url}`);
  const puppeteer = require('puppeteer-extra');
  const Stealth   = require('puppeteer-extra-plugin-stealth');
  puppeteer.use(Stealth());
  const fs   = require('fs');
  const path = require('path');
  let browser, page;
  try {
    const chromePath = (() => {
      try { return fs.readFileSync(path.join(__dirname, '../.chrome-path'), 'utf8').trim(); } catch { return null; }
    })() || process.env.PUPPETEER_EXECUTABLE_PATH;
    if (!chromePath) return res.status(503).json({ error: 'No Chrome found' });
    browser = await puppeteer.launch({
      executablePath: chromePath, headless: true, protocolTimeout: 120000,
      args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu'],
    });
    page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 7000));
    const text = await page.evaluate(() => document.body.innerText);
    res.json({ url, textLength: text.length, preview: text.slice(0, 5000) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  } finally {
    if (page) await page.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
  }
});

// GET /api/logs?n=200&level=ERROR
// Returns the last N log lines captured since the process started.
// Optional ?level=ERROR|WARN filters to that level and above.
router.get('/logs', (req, res) => {
  const n     = Math.min(parseInt(req.query.n) || 200, 600);
  const level = (req.query.level || '').toUpperCase();
  const LEVELS = { LOG: 0, INFO: 0, WARN: 1, ERROR: 2 };
  const minLevel = LEVELS[level] ?? 0;
  const all = getLines();
  const filtered = level
    ? all.filter(l => (LEVELS[l.level] ?? 0) >= minLevel)
    : all;
  const slice = filtered.slice(-n);
  res.json({
    total: all.length,
    returned: slice.length,
    filter: level || 'ALL',
    lines: slice,
  });
});

// POST /api/waitlist
// Captures a phone number + source tag from any conversion surface.
// Silently deduplicates (phone, source) pairs.
router.post('/waitlist', async (req, res) => {
  const { phone, source } = req.body;
  if (!phone || typeof phone !== 'string' || phone.trim().length < 5) {
    return res.status(400).json({ error: 'A valid phone number is required.' });
  }
  const sanitised = phone.trim().replace(/\s+/g, '');
  const src = (typeof source === 'string' && source.trim()) ? source.trim() : 'unknown';
  await db.waitlist.insert({ phone: sanitised, source: src });
  return res.json({ ok: true });
});

module.exports = router;
