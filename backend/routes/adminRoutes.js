/**
 * Karije admin API — key-protected CRUD for curated experiences.
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
 */
const { Router } = require('express');
const crypto     = require('crypto');
const db         = require('../db/client');
const { LAGOS_EXPERIENCES_SEED } = require('../services/experiencesSeed');

const router = Router();

// ── Auth middleware ────────────────────────────────────────────────────────────
function requireAdmin(req, res, next) {
  const key      = req.headers['x-admin-key'] || req.query.adminKey;
  const adminKey = process.env.ADMIN_KEY || 'karije-admin-dev';
  if (!key || key !== adminKey) {
    return res.status(401).json({ error: 'Invalid or missing admin key.' });
  }
  next();
}

// ── POST /admin/auth/verify ────────────────────────────────────────────────────
router.post('/auth/verify', (req, res) => {
  const { key } = req.body || {};
  const adminKey = process.env.ADMIN_KEY || 'karije-admin-dev';
  if (key === adminKey) return res.json({ ok: true });
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

module.exports = { router };
