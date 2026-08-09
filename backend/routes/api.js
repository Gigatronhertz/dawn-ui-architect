const { Router } = require('express');
const { v4: uuid } = require('uuid');
const db = require('../db/client');
const { generateTripPlan } = require('../services/gemini');
const { sendText } = require('../services/whatsapp');
const M = require('../bot/messages');
const GT   = require('../services/googleTravel');
const GIGM = require('../services/gigm');
const { getLines } = require('../utils/logger');
const { requireAuth }        = require('../middleware/auth');
const { sendPlanReadyEmail } = require('../services/email');
const { sendPlanReadyPush  } = require('../services/webPush');
const paystack               = require('../services/paystack');

const router = Router();

// POST /api/plan
// Creates a trip job and returns tripId immediately.
// Actual AI + scraping runs in the background — client polls GET /api/plan/:tripId.
router.post('/plan', async (req, res) => {
  const { origin, destination, budget, days, squadSize, accommodationType, dateFlexibility, dealbreakers, transport, vibe, specificDates } = req.body;

  if (!origin || !destination || !budget || !days || !squadSize) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  const tripId = uuid();

  await db.trips.insert({ id: tripId, organiser_phone: `web_${tripId}` });
  await db.raw(
    `UPDATE trips SET
       origin=?, destination=?, budget=?, days=?, squad_size=?,
       accommodation=?, date_flexibility=?, specific_dates=?, dealbreakers=?,
       status=?, intake_json=?
     WHERE id=?`,
    [
      origin, destination, Number(budget), Number(days), Number(squadSize),
      accommodationType || 'Hotel', dateFlexibility || 'Flexible',
      specificDates || null, dealbreakers || null,
      'generating', JSON.stringify(req.body),
      tripId,
    ]
  );

  // Return the job ID immediately — the client will poll for completion
  res.json({ tripId, status: 'generating' });

  // ── Background work (response already sent — no await) ──────────────────────
  const roundTrip = req.body.roundTrip === true;

  ;(async () => {
    try {
      const intake = await db.trips.get(tripId);
      let { plan, scraped } = await generateTripPlan({
        ...intake,
        transport: transport || 'Charter bus',
        vibe: vibe || null,
      });

      // Round trip: double transport cost, recalculate totals
      if (roundTrip && plan?.cost_breakdown && plan?.transport) {
        const cb     = plan.cost_breakdown;
        const newTransportTotal = (cb.transport_total || 0) * 2;
        const perPersonDiff     = (cb.transport_total || 0) / Math.max(Number(squadSize), 1);
        plan = {
          ...plan,
          transport: { ...plan.transport, price_per_person: (plan.transport.price_per_person || 0) * 2 },
          cost_breakdown: {
            ...cb,
            transport_total: newTransportTotal,
            total:           (cb.total || 0) + (cb.transport_total || 0),
            per_person:      (cb.per_person || 0) + perPersonDiff,
          },
        };
      }

      await db.raw(
        `UPDATE trips SET plan=?, scraped=?, status=? WHERE id=?`,
        [JSON.stringify(plan), JSON.stringify(scraped), 'plan_review', tripId]
      );
      console.log(`[api/plan] ${tripId} done`);

      // ── Notify the user ────────────────────────────────────────────────────
      const trip = await db.trips.get(tripId);

      // Email
      if (trip?.notify_email) {
        sendPlanReadyEmail({
          to:          trip.notify_email,
          destination: destination,
          origin:      origin,
          days:        Number(days),
          squadSize:   Number(squadSize),
          perPerson:   plan.cost_breakdown?.per_person ?? 0,
          tripId,
        }).catch(() => {});
      }

      // Web push — find all subscriptions for this trip
      const pushRows = await db.rawAll(
        `SELECT subscription FROM push_subscriptions WHERE trip_id = ?`,
        [tripId]
      );
      for (const row of pushRows) {
        sendPlanReadyPush({
          subscription: JSON.parse(row.subscription),
          destination,
          tripId,
        }).catch(() => {});
      }
    } catch (err) {
      console.error('[api/plan/bg]', err.message);
      await db.raw(`UPDATE trips SET status=? WHERE id=?`, ['error', tripId]);
    }
  })();
});

// POST /api/confirm
// Organiser has reviewed/edited the plan and confirmed it.
// Saves final plan, DMss the organiser immediately, returns bot number and instructions.
router.post('/confirm', async (req, res) => {
  const { tripId, plan, phone, selectedDate } = req.body;
  if (!tripId || !plan) return res.status(400).json({ error: 'Missing tripId or plan.' });

  const trip = await db.trips.get(tripId);
  if (!trip) return res.status(404).json({ error: 'Trip not found.' });

  const botNumber = process.env.WA_DISPLAY_NUMBER || '234XXXXXXXXXX';

  // A valid YYYY-MM-DD date string; silently ignored if malformed
  const tripDate = /^\d{4}-\d{2}-\d{2}$/.test(selectedDate || '') ? selectedDate : null;

  await db.trips.update({
    id: tripId,
    plan: JSON.stringify(plan),
    status: 'awaiting_group',
    origin: null, destination: null, budget: null, days: null, squad_size: null,
    accommodation: null, date_flexibility: null, specific_dates: null,
    dealbreakers: null, selected_date: tripDate, selected_hotel: null, group_id: null,
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
    selectedDate: tripDate,
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
// Polled by the client every 3 s. Returns status and — when done — plan + scraped data.
// Also returns intake_json so the browser can restore state after a page refresh.
router.get('/plan/:tripId', async (req, res) => {
  const trip = await db.trips.get(req.params.tripId);
  if (!trip) return res.status(404).json({ error: 'Not found.' });

  const resp = {
    tripId: trip.id,
    status: trip.status,
    intake: trip.intake_json ? JSON.parse(trip.intake_json) : null,
  };

  if (trip.status === 'plan_review' && trip.plan) {
    resp.plan    = JSON.parse(trip.plan);
    resp.scraped = trip.scraped ? JSON.parse(trip.scraped) : null;
  } else if (trip.status === 'awaiting_group' && trip.plan) {
    // Trip already confirmed — return enough data to restore the confirm step
    const botNumber = process.env.WA_DISPLAY_NUMBER || '234XXXXXXXXXX';
    resp.plan         = JSON.parse(trip.plan);
    resp.confirmed    = true;
    resp.botNumber    = botNumber;
    resp.destination  = trip.destination;
    resp.squadSize    = trip.squad_size;
    resp.selectedDate = trip.selected_date || null;
    resp.instructions = [
      `Open your squad's WhatsApp group (or create one).`,
      `Tap Group Info → Add Participants.`,
      `Add: +${botNumber}`,
      `The bot will reveal the plan the moment it joins.`,
    ];
  } else if (trip.status === 'error') {
    resp.error = 'Plan generation failed. Please try again.';
  }

  return res.json(resp);
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

// GET /api/gigm-debug — loads gigm.com and returns DOM structure so we can find real selectors
router.get('/gigm-debug', async (req, res) => {
  const puppeteer = require('puppeteer-extra');
  const Stealth   = require('puppeteer-extra-plugin-stealth');
  puppeteer.use(Stealth());
  let browser, page;
  try {
    const ws = process.env.BROWSERLESS_WS_ENDPOINT;
    if (ws) {
      browser = await puppeteer.connect({ browserWSEndpoint: ws, defaultViewport: null });
    } else {
      const fs = require('fs'), path = require('path');
      const chrome = fs.readFileSync(path.join(__dirname, '../.chrome-path'), 'utf8').trim();
      browser = await puppeteer.launch({ executablePath: chrome, headless: true, protocolTimeout: 120000, args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu'] });
    }
    page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    await page.goto('https://www.gigm.com/book-a-seat', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    // Accept cookie consent
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const accept = btns.find(b => /accept/i.test(b.innerText));
      if (accept) accept.click();
    });
    await new Promise(r => setTimeout(r, 2500));

    // Click "Continue as a guest" via evaluateHandle + native Puppeteer click
    const guestTarget = await page.evaluateHandle(() => {
      const h2 = Array.from(document.querySelectorAll('h2'))
        .find(e => /continue as a guest/i.test(e.textContent));
      if (!h2) return null;
      let node = h2.parentElement;
      while (node && node !== document.body) {
        if (node.className?.includes('cursor-pointer') || node.tagName === 'BUTTON') return node;
        node = node.parentElement;
      }
      return h2;
    });
    const guestEl = guestTarget.asElement();
    if (guestEl) await guestEl.click();
    await new Promise(r => setTimeout(r, 3000));

    const info = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input, select, textarea')).map(el => ({
        tag: el.tagName, type: el.type, id: el.id, name: el.name,
        placeholder: el.placeholder, class: el.className?.slice(0, 60),
        value: el.value?.slice(0, 40),
      }));
      const buttons = Array.from(document.querySelectorAll('button, [role="button"]')).map(el => ({
        tag: el.tagName, type: el.type, id: el.id, class: el.className?.slice(0, 60),
        text: el.innerText?.trim().slice(0, 40),
      }));
      const htmlSnippet = document.body.innerHTML.slice(0, 6000);
      const text = document.body.innerText.slice(0, 2000);
      return { inputs, buttons, htmlSnippet, text };
    });

    res.json({ url: 'https://www.gigm.com/book-a-seat', ...info });
  } catch (e) {
    res.status(500).json({ error: e.message });
  } finally {
    if (page) await page.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
  }
});

// GET /api/gigm-test?from=Lagos&to=Abuja&date=2026-07-25
// Runs the GIGM scraper and returns raw results for inspection.
router.get('/gigm-test', async (req, res) => {
  const from = req.query.from || 'Lagos';
  const to   = req.query.to   || 'Abuja';
  const date = req.query.date || null;
  console.log(`[gigm-test] ${from} → ${to} on ${date || 'next week'}`);
  const t0 = Date.now();
  try {
    const trips = await GIGM.scrapeGIGM(from, to, date);
    res.json({ from, to, date, elapsedMs: Date.now() - t0, count: trips.length, trips });
  } catch (e) {
    res.status(500).json({ error: e.message, elapsedMs: Date.now() - t0 });
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

// POST /api/agency-leads
// Captures an agency / Pro plan early-access enquiry.
// Upserts on email — re-submitting updates the record.
router.post('/agency-leads', async (req, res) => {
  const { name, agencyName, phone, email } = req.body;
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return res.status(400).json({ error: 'Name is required.' });
  }
  if (!phone || typeof phone !== 'string' || phone.trim().length < 5) {
    return res.status(400).json({ error: 'A valid phone number is required.' });
  }
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }
  await db.agencyLeads.insert({
    name:        name.trim(),
    agency_name: typeof agencyName === 'string' ? agencyName.trim() : null,
    phone:       phone.trim().replace(/\s+/g, ''),
    email:       email.trim().toLowerCase(),
    source:      'web',
  });
  return res.json({ ok: true });
});

// ── Public plan routes (no auth — squad-facing) ───────────────────────────────

// GET /api/public/plan/:tripId
// Returns the public-safe subset of a confirmed plan for the squad share page.
// Only works after the organiser confirms (status = awaiting_group).
router.get('/public/plan/:tripId', async (req, res) => {
  const trip = await db.trips.get(req.params.tripId);
  if (!trip) return res.status(404).json({ error: 'Plan not found.' });
  if (trip.status !== 'awaiting_group') {
    return res.status(403).json({ error: 'This plan has not been shared yet — ask the organiser to confirm it first.' });
  }

  const plan = trip.plan ? JSON.parse(trip.plan) : null;
  if (!plan) return res.status(404).json({ error: 'Plan data is missing.' });

  const participants = await db.participants.get(trip.id);
  const stats = await db.participants.stats(trip.id);

  return res.json({
    tripId:           trip.id,
    origin:           trip.origin,
    destination:      trip.destination,
    days:             trip.days,
    squadSize:        trip.squad_size,
    hotel:            plan.hotel,
    transport:        plan.transport,
    highlights:       plan.highlights || [],
    days_plan:        plan.days || [],
    cost_breakdown:   plan.cost_breakdown,
    selectedDate:     trip.selected_date || null,
    participantCount: participants.length,
    paidCount:        stats.paidCount,
    totalCollected:   stats.totalCollected,
    participants:     participants.map(p => ({ name: p.name, paid: !!p.paid, createdAt: p.created_at })),
    paymentsEnabled:  paystack.available(),
  });
});

// POST /api/public/plan/:tripId/join
// Squad member taps "I'm in!" — no auth required.
router.post('/public/plan/:tripId/join', async (req, res) => {
  const trip = await db.trips.get(req.params.tripId);
  if (!trip) return res.status(404).json({ error: 'Plan not found.' });
  if (trip.status !== 'awaiting_group') {
    return res.status(403).json({ error: 'This plan has not been confirmed yet.' });
  }

  const { name } = req.body;
  const participantId = uuid();
  await db.participants.insert({ id: participantId, trip_id: trip.id, name: name?.trim() || null });
  const participants = await db.participants.get(trip.id);

  return res.json({ ok: true, count: participants.length, participantId });
});

// GET /api/public/plan/:tripId/participants
// Returns live participant count, names, and payment stats — polled every 20 s from PlanView.
router.get('/public/plan/:tripId/participants', async (req, res) => {
  const trip = await db.trips.get(req.params.tripId);
  if (!trip) return res.status(404).json({ error: 'Plan not found.' });

  const participants = await db.participants.get(trip.id);
  const stats = await db.participants.stats(trip.id);
  return res.json({
    count:          participants.length,
    paidCount:      stats.paidCount,
    totalCollected: stats.totalCollected,
    names:          participants.map(p => p.name).filter(Boolean),
  });
});

// POST /api/public/plan/:tripId/pay
// Squad member initiates Paystack payment for their share.
// Returns { authorization_url } — frontend redirects the browser there.
router.post('/public/plan/:tripId/pay', async (req, res) => {
  if (!paystack.available()) {
    return res.status(503).json({ error: 'Payments are not enabled yet. Check back soon!' });
  }

  const trip = await db.trips.get(req.params.tripId);
  if (!trip) return res.status(404).json({ error: 'Plan not found.' });
  if (trip.status !== 'awaiting_group') return res.status(403).json({ error: 'Plan is not yet confirmed.' });

  const { participantId, email, name } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'A valid email address is required to process payment.' });
  }
  if (!participantId) {
    return res.status(400).json({ error: 'participantId is required.' });
  }

  const plan = trip.plan ? JSON.parse(trip.plan) : null;
  const amount = plan?.cost_breakdown?.per_person;
  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Could not determine payment amount from this plan.' });
  }

  const frontendUrl = process.env.FRONTEND_URL || 'https://mysquadgo.vercel.app';
  const callbackUrl = `${frontendUrl}/plan/${trip.id}?paid=1`;

  try {
    const { reference, authorization_url } = await paystack.initializeWebPayment({
      tripId:        trip.id,
      participantId,
      email:         email.trim().toLowerCase(),
      name:          name?.trim() || null,
      amountNGN:     amount,
      callbackUrl,
    });

    await db.participants.updatePayment({
      id:            participantId,
      email:         email.trim().toLowerCase(),
      amount,
      paystack_ref:  reference,
      paystack_url:  authorization_url,
    });

    return res.json({ authorization_url, reference });
  } catch (err) {
    console.error('[api/public/pay]', err.message);
    return res.status(500).json({ error: 'Failed to create payment link. Please try again.' });
  }
});

// ── Notification routes ───────────────────────────────────────────────────────

// POST /api/notify/subscribe
// Stores a push subscription and/or email address for a trip.
// Called from the generating screen — unauthenticated (tripId is the secret).
router.post('/notify/subscribe', async (req, res) => {
  const { tripId, subscription, email } = req.body;
  if (!tripId) return res.status(400).json({ error: 'tripId required.' });

  // Store push subscription
  if (subscription && typeof subscription === 'object') {
    await db.raw(
      `INSERT OR REPLACE INTO push_subscriptions (id, trip_id, subscription) VALUES (?, ?, ?)`,
      [uuid(), tripId, JSON.stringify(subscription)]
    );
  }

  // Store notify email
  if (email && typeof email === 'string' && email.includes('@')) {
    await db.raw(
      `UPDATE trips SET notify_email = ? WHERE id = ?`,
      [email.trim().toLowerCase(), tripId]
    );
  }

  return res.json({ ok: true });
});

// ── Auth routes ───────────────────────────────────────────────────────────────

// POST /api/auth/link-plan
// Associates a trip with the authenticated Google user.
// Creates the user record on first sign-in; idempotent on subsequent calls.
router.post('/auth/link-plan', requireAuth, async (req, res) => {
  const { tripId } = req.body;
  if (!tripId) return res.status(400).json({ error: 'tripId required.' });

  const { uid, email, name, picture } = req.user;

  // Upsert user row
  await db.users.upsert({ id: uid, email, name: name || null, photo_url: picture || null });

  // Link the trip — only if it isn't already owned by a different user
  await db.raw(
    `UPDATE trips SET user_id = ? WHERE id = ? AND (user_id IS NULL OR user_id = ?)`,
    [uid, tripId, uid]
  );

  return res.json({ ok: true });
});

// GET /api/auth/plans
// Returns all saved plans belonging to the authenticated user, newest first.
router.get('/auth/plans', requireAuth, async (req, res) => {
  const { uid } = req.user;
  const rows = await db.users.plans(uid);
  const plans = rows.map(t => ({
    tripId:           t.id,
    origin:           t.origin,
    destination:      t.destination,
    days:             t.days,
    squadSize:        t.squad_size,
    status:           t.status,
    plan:             t.plan ? JSON.parse(t.plan) : null,
    createdAt:        t.created_at,
    participantCount: Number(t.participant_count  ?? 0),
    paidCount:        Number(t.paid_count         ?? 0),
    totalCollected:   Number(t.total_collected    ?? 0),
  }));
  return res.json({ plans });
});

// GET /api/auth/me
// Verifies the token and returns the user's profile + plan count.
router.get('/auth/me', requireAuth, async (req, res) => {
  const { uid, email, name, picture } = req.user;
  const user = await db.users.get(uid);
  const rows = await db.users.plans(uid);
  return res.json({
    uid, email,
    name:     name   || user?.name   || null,
    photoUrl: picture || user?.photo_url || null,
    planCount: rows.length,
  });
});

module.exports = router;
