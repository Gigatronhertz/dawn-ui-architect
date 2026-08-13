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
 */
const { Router } = require('express');
const crypto     = require('crypto');
const db         = require('../db/client');
const { LAGOS_EXPERIENCES_SEED } = require('../services/experiencesSeed');

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

// ── GET /admin/attractions?state=Lagos ─────────────────────────────────────────
router.get('/attractions', requireAdmin, async (req, res) => {
  try {
    const { state } = req.query;
    if (!state) return res.status(400).json({ error: 'A state query param is required.' });
    res.json({ attractions: await db.attractions.byState(state) });
  } catch (err) {
    console.error('[admin] GET attractions failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /admin/attractions ────────────────────────────────────────────────────
router.post('/attractions', requireAdmin, async (req, res) => {
  try {
    const { state, name, fee_min = 0, fee_max = 0, fee_note = null } = req.body || {};
    if (!state || !name) return res.status(400).json({ error: 'state and name are required.' });

    const attraction = await db.attractions.upsert({ state, name, fee_min, fee_max, fee_note });
    res.json({ ok: true, attraction });
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
    });
    res.json({ ok: true, attraction });
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
