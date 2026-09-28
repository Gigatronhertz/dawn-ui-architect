/**
 * Karije admin API — key-protected CRUD for everything the single admin curates.
 *
 * All routes require the X-Admin-Key header to match ADMIN_KEY env var.
 * Default dev key: "karije-admin-dev" (override in production via ADMIN_KEY).
 *
 * Routes:
 *   POST /admin/auth/verify              — check admin key
 *   GET  /admin/experiences?state=Lagos  — list all (incl. unpublished)
 *   POST /admin/experiences              — create
 *   PUT  /admin/experiences/:id          — update
 *   DELETE /admin/experiences/:id        — delete
 *   POST /admin/seed                     — re-seed Lagos defaults (idempotent)
 *   GET  /admin/attractions/states       — per-state row + unpriced counts
 *   GET  /admin/attractions?state=Lagos  — attractions for one state
 *   POST /admin/attractions              — create
 *   PUT  /admin/attractions/:id          — update (prices)
 *   DELETE /admin/attractions/:id        — delete
 *   GET/POST/PUT/DELETE /admin/nightlife — curated venues for Explore's Nightlife section
 *   GET/POST/PUT/DELETE /admin/events    — curated events for Explore's Events section
 */
const express    = require('express');
const { Router } = require('express');
const crypto     = require('crypto');
const db         = require('../db/client');
const { LAGOS_EXPERIENCES_SEED } = require('../services/experiencesSeed');
const ledger = require('../services/ledger');
const revenue = require('../services/revenue');
const { hashPassword } = require('./emailAuth');
const { sendPayoutReleasedEmail } = require('../services/email');

const router = Router();

// ── Auth middleware ────────────────────────────────────────────────────────────

/**
 * The expected admin key, or null when the panel should be sealed.
 *
 * The dev default is public — it lives in this file, in a public repo — so it
 * is only ever honoured outside production. If ADMIN_KEY is missing in
 * production we fail closed rather than fall back to a key anyone can read.
 */
function expectedAdminKey() {
  if (process.env.ADMIN_KEY) return process.env.ADMIN_KEY;
  if (process.env.NODE_ENV === 'production') return null;
  return 'karije-admin-dev';
}

function checkAdminKey(key) {
  const expected = expectedAdminKey();
  if (!expected) {
    console.error('[admin] ADMIN_KEY is not set in production — admin panel is disabled.');
    return false;
  }
  if (!key || key.length !== expected.length) return false;
  // Constant-time compare so a wrong key can't be recovered by timing the response.
  return crypto.timingSafeEqual(Buffer.from(key), Buffer.from(expected));
}

function requireAdmin(req, res, next) {
  const key = req.headers['x-admin-key'] || req.query.adminKey;
  if (!checkAdminKey(key)) {
    return res.status(401).json({ error: 'Invalid or missing admin key.' });
  }
  next();
}

// ── POST /admin/auth/verify ────────────────────────────────────────────────────
router.post('/auth/verify', (req, res) => {
  const { key } = req.body || {};
  if (checkAdminKey(key)) return res.json({ ok: true });
  return res.status(401).json({ error: 'Invalid admin key.' });
});

// ── POST /admin/trip-images ────────────────────────────────────────────────────
// Accepts raw image bytes and stores them in the DB, returning the path to save
// on the trip. The browser shrinks the photo before sending, so the cap here is
// a backstop against a bad client rather than the expected size.
//
// express.raw is applied on this route only — the global JSON parser keeps its
// small default limit so no other endpoint accepts multi-megabyte bodies.
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const ALLOWED_MIME    = ['image/jpeg', 'image/png', 'image/webp'];

router.post(
  '/trip-images',
  requireAdmin,
  express.raw({ type: ALLOWED_MIME, limit: MAX_IMAGE_BYTES }),
  async (req, res) => {
    try {
      const mime = (req.headers['content-type'] || '').split(';')[0].trim();
      if (!ALLOWED_MIME.includes(mime)) {
        return res.status(415).json({ error: 'Upload a JPEG, PNG or WebP image.' });
      }
      if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
        return res.status(400).json({ error: 'No image data received.' });
      }

      const id = `img_${crypto.randomBytes(12).toString('hex')}`;
      await db.tripImages.insert({ id, mime, bytes: req.body });

      // Stored on the trip as-is; tripImageUrl() passes through leading-slash
      // paths untouched, so no other code needs to know where photos live.
      res.json({ ok: true, id, url: `/api/trip-image/${id}`, bytes: req.body.length });
    } catch (err) {
      console.error('[admin] image upload failed:', err.message);
      res.status(500).json({ error: err.message });
    }
  }
);

// ── GET /admin/revenue ─────────────────────────────────────────────────────────
// Karije's own income: Pro subscriptions, 10% of curated trips, AI plan packs.
router.get('/revenue', requireAdmin, async (req, res) => {
  try {
    res.json(await revenue.report());
  } catch (err) {
    console.error('[admin] GET revenue failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /admin/money ───────────────────────────────────────────────────────────
// Every trip holding money: what came in, Karije's fee, what's owed to whoever
// is running it, and what's already been released.
router.get('/money', requireAdmin, async (req, res) => {
  try {
    const trips = await ledger.outstandingTrips();
    const totals = trips.reduce((t, x) => ({
      collected:   t.collected   + x.collected,
      karijeShare: t.karijeShare + x.karijeShare,
      paidOut:     t.paidOut     + x.paidOut,
      outstanding: t.outstanding + x.outstanding,
    }), { collected: 0, karijeShare: 0, paidOut: 0, outstanding: 0 });
    res.json({ trips, totals, curatedFeePct: ledger.CURATED_FEE_PCT });
  } catch (err) {
    console.error('[admin] GET money failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /admin/money/:tripId ───────────────────────────────────────────────────
// One trip's position, plus every payout recorded against it.
router.get('/money/:tripId', requireAdmin, async (req, res) => {
  try {
    const position = await ledger.forTrip(req.params.tripId);
    if (!position) return res.status(404).json({ error: 'Trip not found.' });
    const payouts = await db.rawAll(
      `SELECT id, amount, note, status, reference, created_at, paid_at
         FROM payouts WHERE trip_id = ? ORDER BY created_at DESC`,
      [req.params.tripId]
    );
    res.json({ ...position, payouts });
  } catch (err) {
    console.error('[admin] GET money/:tripId failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /admin/money/:tripId/payout ───────────────────────────────────────────
// Record money released to the trip's organiser. Payouts are made by bank
// transfer and recorded here — deliberately not automated, so nothing leaves
// an account without a person deciding it should.
router.post('/money/:tripId/payout', requireAdmin, async (req, res) => {
  try {
    const amount = Math.round(Number(req.body?.amount) || 0);
    if (amount <= 0) return res.status(400).json({ error: 'Enter an amount greater than zero.' });

    const position = await ledger.forTrip(req.params.tripId);
    if (!position) return res.status(404).json({ error: 'Trip not found.' });
    // Guard against releasing more than the squad actually paid in.
    if (amount > position.outstanding) {
      return res.status(400).json({
        error: `That's more than is owed. Outstanding is ₦${position.outstanding.toLocaleString()}.`,
      });
    }

    const id = `po_${crypto.randomBytes(8).toString('hex')}`;
    await db.raw(
      `INSERT INTO payouts (id, trip_id, amount, note, status, reference, paid_at)
       VALUES (?, ?, ?, ?, 'paid', ?, unixepoch())`,
      [id, req.params.tripId, amount, req.body?.note || null, req.body?.reference || null]
    );

    const newPosition = await ledger.forTrip(req.params.tripId);

    // Tell every paid traveller once the balance actually clears to zero —
    // not on a partial/staged release (e.g. a bus deposit before the trip
    // is even full), only when the agency has been paid in full.
    if (newPosition && newPosition.outstanding === 0) {
      const trip = await db.trips.get(req.params.tripId);
      const agent = trip?.agent_id ? await db.agents.getById(trip.agent_id) : null;
      const tripName = trip?.title || trip?.destination || 'your trip';
      const paidTravellers = await db.rawAll(
        `SELECT name, email FROM participants WHERE trip_id = ? AND paid = 1 AND email IS NOT NULL`,
        [req.params.tripId]
      );
      for (const t of paidTravellers) {
        sendPayoutReleasedEmail({
          to: t.email, name: t.name, tripName,
          agencyName: agent?.agency_name || 'the organiser',
        }).catch((err) => console.warn('[admin] payout-released email failed:', err.message));
      }
    }

    res.json({ ok: true, payoutId: id, position: newPosition });
  } catch (err) {
    console.error('[admin] POST payout failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /admin/money/:tripId/account ───────────────────────────────────────────
// Where this trip's payouts should go.
router.put('/money/:tripId/account', requireAdmin, async (req, res) => {
  try {
    const { bankCode, accountNo, accountName } = req.body || {};
    await db.raw(
      `UPDATE trips SET payout_bank_code=?, payout_account_no=?, payout_account_name=? WHERE id=?`,
      [bankCode || null, accountNo || null, accountName || null, req.params.tripId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[admin] PUT payout account failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Agencies (verified onboarding) ──────────────────────────────────────────────
//
// Self-signup exists (/pro/login?mode=signup) but requires the agency's own
// email to click a verification link before it can log in at all — no good
// when the plan is "I create the account and hand over the login." These
// routes create a working, pre-verified login directly, and record the KYC
// outcome (NIN + a photo of their ID or passport, plus business registration
// documentation) that gates whether their trips can show up publicly.
//
// An agency's trips only surface in /api/listings once verification_status
// is 'verified' — see that route. Nothing here disables their dashboard;
// they can still build trips and share the link while pending, it just
// won't appear in the public catalog yet.

// GET /admin/agents — every agency, newest first.
router.get('/agents', requireAdmin, async (req, res) => {
  try {
    const rows = await db.agents.list();
    res.json({ agents: rows });
  } catch (err) {
    console.error('[admin] GET agents failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /admin/agents/:id — one agency's full record.
router.get('/agents/:id', requireAdmin, async (req, res) => {
  try {
    const agent = await db.agents.getById(req.params.id);
    if (!agent) return res.status(404).json({ error: 'Agency not found.' });
    res.json({ agent });
  } catch (err) {
    console.error('[admin] GET agents/:id failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /admin/agents — create the login and the agency profile together.
// Returns the password once, in the response, so it can be handed to the
// agency directly — it is never retrievable again after this (only its hash
// is stored), same as any other account.
router.post('/agents', requireAdmin, async (req, res) => {
  try {
    const { email, password, agencyName, phone, waNumber, tagline, color } = req.body || {};

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'A valid email address is required.' });
    }
    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }
    if (!agencyName || !agencyName.trim()) {
      return res.status(400).json({ error: 'Agency name is required.' });
    }
    if (!phone || phone.trim().length < 5) {
      return res.status(400).json({ error: 'A valid phone number is required.' });
    }

    const emailNorm = email.trim().toLowerCase();
    const existing  = await db.raw('SELECT id FROM users WHERE email = ?', [emailNorm]);
    if (existing) {
      return res.status(409).json({ error: 'An account already exists for this email.' });
    }

    const cleanPhone = phone.trim().replace(/\s+/g, '');
    const uid        = `ep_${crypto.randomBytes(12).toString('hex')}`;
    const passwordHash = await hashPassword(password);

    // Pre-verified — no email click needed, this login works immediately.
    await db.raw(
      `INSERT INTO users (id, email, name, photo_url, password_hash, email_verified)
       VALUES (?, ?, NULL, NULL, ?, 1)`,
      [uid, emailNorm, passwordHash]
    );

    const agentId = `agent_${cleanPhone}`;
    await db.agents.upsert({
      id:          agentId,
      phone:       cleanPhone,
      agency_name: agencyName.trim(),
      wa_number:   waNumber?.trim()?.replace(/\s+/g, '') || cleanPhone,
      service_fee: 0,
      color:       typeof color === 'string' && color ? color : '#0B0B0B',
      plan_type:   'starter',
      tagline:     typeof tagline === 'string' ? tagline.trim() : '',
    });
    await db.agents.linkToUser({ phone: cleanPhone, user_id: uid, email: emailNorm });

    const agent = await db.agents.getById(agentId);
    res.json({ ok: true, agent, credentials: { email: emailNorm, password } });
  } catch (err) {
    console.error('[admin] POST agents failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PUT /admin/agents/:id/verification — record the KYC outcome. Documents are
// uploaded separately (POST .../documents/:kind) since they're binary;
// this route only ever carries JSON.
router.put('/agents/:id/verification', requireAdmin, async (req, res) => {
  try {
    const { status, nin, socialLinks } = req.body || {};
    if (!['pending', 'verified', 'rejected'].includes(status)) {
      return res.status(400).json({ error: "status must be 'pending', 'verified' or 'rejected'." });
    }
    const agent = await db.agents.getById(req.params.id);
    if (!agent) return res.status(404).json({ error: 'Agency not found.' });

    await db.agents.updateVerification({
      id: req.params.id,
      status,
      nin: typeof nin === 'string' ? nin.trim() : null,
      socialLinks: socialLinks && typeof socialLinks === 'object' ? JSON.stringify(socialLinks) : null,
    });
    res.json({ ok: true, agent: await db.agents.getById(req.params.id) });
  } catch (err) {
    console.error('[admin] PUT agents verification failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PUT /admin/agents/:id/subscription — the grandfather-clause lever. Every
// currently-onboarded agency lands on 'exempt' by default (never billed);
// this is how you flip one to 'active' when it's time to actually start
// charging them, or manually reset a 'suspended' one back after they've
// sorted their card out. Never sets subscription_next_charge_at itself —
// that only ever comes from a real successful card-capture charge, so
// flipping to 'active' here doesn't start billing on its own; the agency
// still has to complete their own "Add billing" flow.
router.put('/agents/:id/subscription', requireAdmin, async (req, res) => {
  try {
    const { status } = req.body || {};
    if (!['exempt', 'active', 'past_due', 'suspended'].includes(status)) {
      return res.status(400).json({ error: "status must be 'exempt', 'active', 'past_due' or 'suspended'." });
    }
    const agent = await db.agents.getById(req.params.id);
    if (!agent) return res.status(404).json({ error: 'Agency not found.' });

    await db.agents.setSubscriptionStatus({ id: req.params.id, status });
    res.json({ ok: true, agent: await db.agents.getById(req.params.id) });
  } catch (err) {
    console.error('[admin] PUT agents subscription failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /admin/agents/:id/documents/:kind — kind is 'id' or 'business'.
// Same raw-upload shape as /admin/trip-images, but stored under a field that
// is never exposed through the public /api/trip-image/:id route — see
// GET /admin/agent-document/:id below.
router.post(
  '/agents/:id/documents/:kind',
  requireAdmin,
  express.raw({ type: ALLOWED_MIME, limit: MAX_IMAGE_BYTES }),
  async (req, res) => {
    try {
      const { id, kind } = req.params;
      if (!['id', 'business'].includes(kind)) {
        return res.status(400).json({ error: "kind must be 'id' or 'business'." });
      }
      const agent = await db.agents.getById(id);
      if (!agent) return res.status(404).json({ error: 'Agency not found.' });

      const mime = (req.headers['content-type'] || '').split(';')[0].trim();
      if (!ALLOWED_MIME.includes(mime)) {
        return res.status(415).json({ error: 'Upload a JPEG, PNG or WebP image.' });
      }
      if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
        return res.status(400).json({ error: 'No image data received.' });
      }

      const imageId = `doc_${crypto.randomBytes(12).toString('hex')}`;
      await db.tripImages.insert({ id: imageId, mime, bytes: req.body });
      await db.agents.updateVerification({
        id,
        status: agent.verification_status || 'pending',
        idDocumentImageId:  kind === 'id'       ? imageId : null,
        businessDocImageId: kind === 'business' ? imageId : null,
      });

      res.json({ ok: true, imageId });
    } catch (err) {
      console.error('[admin] POST agent document failed:', err.message);
      res.status(500).json({ error: err.message });
    }
  }
);

// GET /admin/agent-document/:id — serves a stored KYC image. Admin-key-gated,
// deliberately separate from the public, unauthenticated /api/trip-image/:id
// route: an ID or passport photo is not meant to be fetchable by anyone who
// guesses the id.
router.get('/agent-document/:id', requireAdmin, async (req, res) => {
  try {
    const img = await db.tripImages.get(req.params.id);
    if (!img) return res.status(404).json({ error: 'Not found.' });
    res.set({ 'Content-Type': img.mime, 'Cache-Control': 'private, no-store' });
    res.send(Buffer.isBuffer(img.bytes) ? img.bytes : Buffer.from(img.bytes));
  } catch (err) {
    console.error('[admin] GET agent-document failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /admin/experiences ─────────────────────────────────────────────────────
router.get('/experiences', requireAdmin, async (req, res) => {
  try {
    const { state } = req.query;
    const rows = state
      ? await db.rawAll('SELECT * FROM experiences WHERE state = ? ORDER BY sort_order, created_at', [state])
      : await db.rawAll('SELECT * FROM experiences ORDER BY state, sort_order, created_at');
    res.json({ experiences: rows.map(db.parseExpRow) });
  } catch (err) {
    console.error('[admin] GET experiences failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /admin/experiences ────────────────────────────────────────────────────
router.post('/experiences', requireAdmin, async (req, res) => {
  try {
    const body = req.body || {};
    const id   = body.id || `exp_${crypto.randomBytes(6).toString('hex')}`;
    const exp  = { id, ...body };
    const created = await db.experiences.upsert(exp);
    res.json({ ok: true, experience: created });
  } catch (err) {
    console.error('[admin] POST experience failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /admin/experiences/:id ─────────────────────────────────────────────────
router.put('/experiences/:id', requireAdmin, async (req, res) => {
  try {
    const exp = { id: req.params.id, ...req.body };
    const updated = await db.experiences.upsert(exp);
    res.json({ ok: true, experience: updated });
  } catch (err) {
    console.error('[admin] PUT experience failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /admin/experiences/:id ──────────────────────────────────────────────
router.delete('/experiences/:id', requireAdmin, async (req, res) => {
  try {
    await db.raw('DELETE FROM experiences WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('[admin] DELETE experience failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /admin/seed — re-seed Lagos defaults (idempotent INSERT OR IGNORE) ─────
router.post('/seed', requireAdmin, async (req, res) => {
  try {
    let count = 0;
    for (const exp of LAGOS_EXPERIENCES_SEED) {
      await db.raw(
        `INSERT OR IGNORE INTO experiences
         (id, name, tagline, description, price_per_person_per_day, max_days, category,
          location, image_id, color_fallback, included, schedule, schedule_overrides,
          highlights, group_min, group_max, notes, state)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          exp.id, exp.name, exp.tagline, exp.description,
          exp.pricePerPersonPerDay, exp.maxDays, exp.category, exp.location,
          exp.imageId, exp.colorFallback,
          JSON.stringify(exp.included            || []),
          JSON.stringify(exp.schedule            || []),
          JSON.stringify(exp.scheduleOverrides   || {}),
          JSON.stringify(exp.highlights          || []),
          exp.groupMin, exp.groupMax, exp.notes || null, 'Lagos',
        ]
      );
      count++;
    }
    res.json({ ok: true, seeded: count });
  } catch (err) {
    console.error('[admin] seed failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /admin/nightlife ────────────────────────────────────────────────────────
router.get('/nightlife', requireAdmin, async (req, res) => {
  try {
    const { state } = req.query;
    const venues = await db.nightlifeVenues.list({ state: state || null, all: true });
    res.json({ venues });
  } catch (err) {
    console.error('[admin] GET nightlife failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /admin/nightlife ───────────────────────────────────────────────────────
router.post('/nightlife', requireAdmin, async (req, res) => {
  try {
    const body = req.body || {};
    const id = body.id || `night_${crypto.randomBytes(6).toString('hex')}`;
    const venue = await db.nightlifeVenues.upsert({ id, ...body });
    res.json({ ok: true, venue });
  } catch (err) {
    console.error('[admin] POST nightlife failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /admin/nightlife/:id ─────────────────────────────────────────────────────
router.put('/nightlife/:id', requireAdmin, async (req, res) => {
  try {
    const venue = await db.nightlifeVenues.upsert({ id: req.params.id, ...req.body });
    res.json({ ok: true, venue });
  } catch (err) {
    console.error('[admin] PUT nightlife failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /admin/nightlife/:id ──────────────────────────────────────────────────
router.delete('/nightlife/:id', requireAdmin, async (req, res) => {
  try {
    await db.nightlifeVenues.remove(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error('[admin] DELETE nightlife failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /admin/events ────────────────────────────────────────────────────────────
router.get('/events', requireAdmin, async (req, res) => {
  try {
    const { state } = req.query;
    const events = await db.events.list({ state: state || null, all: true });
    res.json({ events });
  } catch (err) {
    console.error('[admin] GET events failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /admin/events ────────────────────────────────────────────────────────────
router.post('/events', requireAdmin, async (req, res) => {
  try {
    const body = req.body || {};
    const id = body.id || `evt_${crypto.randomBytes(6).toString('hex')}`;
    const event = await db.events.upsert({ id, ...body });
    res.json({ ok: true, event });
  } catch (err) {
    console.error('[admin] POST event failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /admin/events/:id ──────────────────────────────────────────────────────────
router.put('/events/:id', requireAdmin, async (req, res) => {
  try {
    const event = await db.events.upsert({ id: req.params.id, ...req.body });
    res.json({ ok: true, event });
  } catch (err) {
    console.error('[admin] PUT event failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /admin/events/:id ─────────────────────────────────────────────────────────
router.delete('/events/:id', requireAdmin, async (req, res) => {
  try {
    await db.events.remove(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error('[admin] DELETE event failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /admin/events/:id/registrations ──────────────────────────────────────────────
// WhatsApp numbers captured on the standalone event page's "notify me" form —
// stored in the generic waitlist table under source `event:<id>`.
router.get('/events/:id/registrations', requireAdmin, async (req, res) => {
  try {
    const registrations = await db.waitlist.list({ source: `event:${req.params.id}` });
    res.json({ registrations });
  } catch (err) {
    console.error('[admin] GET event registrations failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Ready-made trips ───────────────────────────────────────────────────────────

/** Slugify a trip name into a stable, URL-safe id. */
function slugify(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

// ── Attractions (the price table the AI planner quotes from) ───────────────────

// ── GET /admin/attractions/states ──────────────────────────────────────────────
// Coverage overview: how many rows per state, and how many still have no price.
// Declared before /attractions/:id-style routes so "states" is never read as an id.
router.get('/attractions/states', requireAdmin, async (req, res) => {
  try {
    res.json({ states: await db.attractions.stateCounts() });
  } catch (err) {
    console.error('[admin] GET attraction states failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// A PhotoField's value is a full `/api/trip-image/<id>` path (or an absolute
// URL, or empty) — the attractions column stores the bare blob id, so strip
// the known prefix rather than double it up in the exposed imageUrl.
function toImageId(value) {
  if (!value) return null;
  const m = /\/api\/trip-image\/(.+)$/.exec(value);
  return m ? m[1] : value;
}
function withImageUrl(a) {
  return { ...a, imageUrl: a.image_id ? `/api/trip-image/${a.image_id}` : null };
}

// ── GET /admin/attractions?state=Lagos ─────────────────────────────────────────
router.get('/attractions', requireAdmin, async (req, res) => {
  try {
    const { state } = req.query;
    if (!state) return res.status(400).json({ error: 'A state query param is required.' });
    const rows = await db.attractions.byState(state);
    res.json({ attractions: rows.map(withImageUrl) });
  } catch (err) {
    console.error('[admin] GET attractions failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /admin/attractions ────────────────────────────────────────────────────
router.post('/attractions', requireAdmin, async (req, res) => {
  try {
    const {
      state, name, fee_min = 0, fee_max = 0, fee_note = null,
      imageUrl, address = null, phone = null, google_maps_link = null,
      description = null, source_url = null,
    } = req.body || {};
    if (!state || !name) return res.status(400).json({ error: 'state and name are required.' });

    const attraction = await db.attractions.upsert({
      state, name, fee_min, fee_max, fee_note,
      image_id: toImageId(imageUrl), address, phone, google_maps_link, description, source_url,
    });
    res.json({ ok: true, attraction: withImageUrl(attraction) });
  } catch (err) {
    // UNIQUE(state, name) — surface the clash rather than a raw SQLite error
    if (/UNIQUE/i.test(err.message)) {
      return res.status(409).json({ error: 'That attraction already exists in this state.' });
    }
    console.error('[admin] POST attraction failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /admin/attractions/:id ─────────────────────────────────────────────────
router.put('/attractions/:id', requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await db.attractions.get(id);
    if (!existing) return res.status(404).json({ error: 'Attraction not found.' });

    const attraction = await db.attractions.upsert({
      id,
      state:    req.body.state    ?? existing.state,
      name:     req.body.name     ?? existing.name,
      fee_min:  req.body.fee_min  ?? existing.fee_min,
      fee_max:  req.body.fee_max  ?? existing.fee_max,
      fee_note: req.body.fee_note ?? existing.fee_note,
      image_id:         req.body.imageUrl !== undefined ? toImageId(req.body.imageUrl) : existing.image_id,
      address:          req.body.address          ?? existing.address,
      phone:            req.body.phone            ?? existing.phone,
      google_maps_link: req.body.google_maps_link ?? existing.google_maps_link,
      description:      req.body.description      ?? existing.description,
      source_url:       req.body.source_url       ?? existing.source_url,
    });
    res.json({ ok: true, attraction: withImageUrl(attraction) });
  } catch (err) {
    if (/UNIQUE/i.test(err.message)) {
      return res.status(409).json({ error: 'Another attraction in this state already has that name.' });
    }
    console.error('[admin] PUT attraction failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /admin/attractions/:id ──────────────────────────────────────────────
router.delete('/attractions/:id', requireAdmin, async (req, res) => {
  try {
    await db.attractions.remove(Number(req.params.id));
    res.json({ ok: true });
  } catch (err) {
    console.error('[admin] DELETE attraction failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = { router };
