const { createClient } = require('@libsql/client');
const path = require('path');
const fs = require('fs');
const { SEED_DATA } = require('../services/attractions');
const { LAGOS_EXPERIENCES_SEED } = require('../services/experiencesSeed');
const { CURATED_TRIPS_SEED } = require('../services/curatedTripsSeed');

const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// Local dev: file:./data/mysquadgo.db
// Production (Turso): set DATABASE_URL + DATABASE_AUTH_TOKEN env vars
const dbUrl = process.env.DATABASE_URL || `file:${path.join(dataDir, 'mysquadgo.db')}`;
const client = createClient(
  process.env.DATABASE_AUTH_TOKEN
    ? { url: dbUrl, authToken: process.env.DATABASE_AUTH_TOKEN }
    : { url: dbUrl }
);

// Initialize schema — runs once at startup before the server accepts requests
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS agents (
    id          TEXT PRIMARY KEY,
    phone       TEXT UNIQUE NOT NULL,
    agency_name TEXT NOT NULL,
    wa_number   TEXT,
    service_fee INTEGER NOT NULL DEFAULT 10000,
    color       TEXT NOT NULL DEFAULT '#6366f1',
    plan_type   TEXT NOT NULL DEFAULT 'starter',
    tagline     TEXT,
    created_at  INTEGER NOT NULL DEFAULT (unixepoch())
  )`,
  `CREATE TABLE IF NOT EXISTS waitlist (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    phone       TEXT NOT NULL,
    source      TEXT NOT NULL DEFAULT 'unknown',
    created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
    UNIQUE(phone, source)
  )`,
  `CREATE TABLE IF NOT EXISTS conversations (
    phone       TEXT PRIMARY KEY,
    name        TEXT,
    state       TEXT NOT NULL DEFAULT 'idle',
    trip_id     TEXT,
    temp        TEXT NOT NULL DEFAULT '{}',
    updated_at  INTEGER NOT NULL DEFAULT (unixepoch())
  )`,
  `CREATE TABLE IF NOT EXISTS trips (
    id                TEXT PRIMARY KEY,
    organiser_phone   TEXT NOT NULL,
    group_id          TEXT,
    origin            TEXT,
    destination       TEXT,
    budget            INTEGER,
    days              INTEGER,
    squad_size        INTEGER,
    accommodation     TEXT,
    date_flexibility  TEXT,
    specific_dates    TEXT,
    dealbreakers      TEXT,
    plan              TEXT,
    selected_date     TEXT,
    selected_hotel    TEXT,
    status            TEXT NOT NULL DEFAULT 'intake',
    platform_fee      INTEGER NOT NULL DEFAULT 5000,
    created_at        INTEGER NOT NULL DEFAULT (unixepoch())
  )`,
  `CREATE TABLE IF NOT EXISTS attractions (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    state    TEXT NOT NULL,
    name     TEXT NOT NULL,
    fee_min  INTEGER NOT NULL DEFAULT 0,
    fee_max  INTEGER NOT NULL DEFAULT 0,
    fee_note TEXT,
    UNIQUE(state, name)
  )`,
  `CREATE TABLE IF NOT EXISTS push_subscriptions (
    id           TEXT PRIMARY KEY,
    trip_id      TEXT NOT NULL,
    subscription TEXT NOT NULL,
    created_at   INTEGER NOT NULL DEFAULT (unixepoch())
  )`,
  `CREATE TABLE IF NOT EXISTS users (
    id          TEXT PRIMARY KEY,
    email       TEXT UNIQUE NOT NULL,
    name        TEXT,
    photo_url   TEXT,
    created_at  INTEGER NOT NULL DEFAULT (unixepoch())
  )`,
  `CREATE TABLE IF NOT EXISTS magic_links (
    token      TEXT PRIMARY KEY,
    email      TEXT NOT NULL,
    trip_id    TEXT,
    redirect   TEXT,
    expires_at INTEGER NOT NULL,
    used       INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  )`,
  `CREATE TABLE IF NOT EXISTS agency_leads (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    agency_name TEXT,
    phone       TEXT NOT NULL,
    email       TEXT NOT NULL,
    source      TEXT NOT NULL DEFAULT 'web',
    created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
    UNIQUE(email)
  )`,
  `CREATE TABLE IF NOT EXISTS experiences (
    id                       TEXT PRIMARY KEY,
    name                     TEXT NOT NULL,
    tagline                  TEXT NOT NULL DEFAULT '',
    description              TEXT NOT NULL DEFAULT '',
    price_per_person_per_day INTEGER NOT NULL DEFAULT 0,
    max_days                 INTEGER NOT NULL DEFAULT 1,
    category                 TEXT NOT NULL DEFAULT 'leisure',
    location                 TEXT NOT NULL DEFAULT '',
    image_id                 TEXT NOT NULL DEFAULT '',
    color_fallback           TEXT NOT NULL DEFAULT '#2F4A33',
    included                 TEXT NOT NULL DEFAULT '[]',
    schedule                 TEXT NOT NULL DEFAULT '[]',
    schedule_overrides       TEXT NOT NULL DEFAULT '{}',
    highlights               TEXT NOT NULL DEFAULT '[]',
    group_min                INTEGER NOT NULL DEFAULT 2,
    group_max                INTEGER NOT NULL DEFAULT 40,
    notes                    TEXT,
    state                    TEXT NOT NULL DEFAULT 'Lagos',
    published                INTEGER NOT NULL DEFAULT 1,
    sort_order               INTEGER NOT NULL DEFAULT 0,
    created_at               INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at               INTEGER NOT NULL DEFAULT (unixepoch())
  )`,
  `CREATE TABLE IF NOT EXISTS curated_trips (
    id             TEXT PRIMARY KEY,
    name           TEXT NOT NULL,
    tagline        TEXT NOT NULL DEFAULT '',
    description    TEXT NOT NULL DEFAULT '',
    origin         TEXT NOT NULL DEFAULT 'Lagos',
    state          TEXT NOT NULL DEFAULT 'Lagos',
    location       TEXT NOT NULL DEFAULT '',
    days           INTEGER NOT NULL DEFAULT 2,
    price_from     INTEGER NOT NULL DEFAULT 0,
    tag            TEXT NOT NULL DEFAULT '',
    emoji          TEXT NOT NULL DEFAULT '🧳',
    image_id       TEXT NOT NULL DEFAULT '',
    color_fallback TEXT NOT NULL DEFAULT '#2F4A33',
    included       TEXT NOT NULL DEFAULT '[]',
    highlights     TEXT NOT NULL DEFAULT '[]',
    itinerary      TEXT NOT NULL DEFAULT '[]',
    group_min      INTEGER NOT NULL DEFAULT 2,
    group_max      INTEGER NOT NULL DEFAULT 40,
    notes          TEXT,
    published      INTEGER NOT NULL DEFAULT 0,
    sort_order     INTEGER NOT NULL DEFAULT 0,
    created_at     INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at     INTEGER NOT NULL DEFAULT (unixepoch())
  )`,
  `CREATE TABLE IF NOT EXISTS members (
    id            TEXT PRIMARY KEY,
    trip_id       TEXT NOT NULL,
    phone         TEXT NOT NULL,
    name          TEXT,
    paid          INTEGER NOT NULL DEFAULT 0,
    amount        INTEGER,
    paystack_ref  TEXT,
    paystack_url  TEXT,
    paid_at       INTEGER,
    added_at      INTEGER NOT NULL DEFAULT (unixepoch()),
    UNIQUE(trip_id, phone)
  )`,
  `CREATE TABLE IF NOT EXISTS participants (
    id         TEXT PRIMARY KEY,
    trip_id    TEXT NOT NULL,
    name       TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  )`,
];

// Safe schema migrations — new columns added after initial release.
// Each statement is run once; duplicate-column errors are swallowed.
const MIGRATIONS = [
  `ALTER TABLE trips ADD COLUMN scraped       TEXT`,
  `ALTER TABLE trips ADD COLUMN intake_json   TEXT`,
  `ALTER TABLE trips ADD COLUMN user_id       TEXT`,
  `ALTER TABLE trips ADD COLUMN notify_email  TEXT`,
  // Phase C — link agents to JWT users
  `ALTER TABLE agents ADD COLUMN user_id TEXT`,
  `ALTER TABLE agents ADD COLUMN email   TEXT`,
  // Phase 6 — payment columns on participants
  `ALTER TABLE participants ADD COLUMN email        TEXT`,
  `ALTER TABLE participants ADD COLUMN paid         INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE participants ADD COLUMN amount       INTEGER`,
  `ALTER TABLE participants ADD COLUMN paystack_ref TEXT`,
  `ALTER TABLE participants ADD COLUMN paystack_url TEXT`,
  `ALTER TABLE participants ADD COLUMN paid_at      INTEGER`,
  // Phase 7 — email + password auth
  `ALTER TABLE users ADD COLUMN password_hash   TEXT`,
  `ALTER TABLE users ADD COLUMN email_verified  INTEGER NOT NULL DEFAULT 0`,
  // Phase 8 — the web intake asks for a hotel ceiling per night instead of a
  // whole-trip budget. The WhatsApp bot still collects `budget`, so both live
  // side by side and planGenerator falls back when this is null.
  `ALTER TABLE trips ADD COLUMN hotel_budget_per_night INTEGER`,
];

const ready = (async () => {
  for (const sql of SCHEMA) await client.execute(sql);
  for (const sql of MIGRATIONS) {
    try { await client.execute(sql); } catch (_) { /* column already exists — safe to ignore */ }
  }
  // Seed attractions once — INSERT OR IGNORE is idempotent
  const existing = await client.execute('SELECT COUNT(*) as n FROM attractions');
  if ((existing.rows[0]?.n ?? 0) === 0) {
    console.log('[db] Seeding attractions table…');
    for (const [state, name, fee_min, fee_max, fee_note] of SEED_DATA) {
      await client.execute({
        sql: 'INSERT OR IGNORE INTO attractions (state, name, fee_min, fee_max, fee_note) VALUES (?, ?, ?, ?, ?)',
        args: [state, name, fee_min, fee_max, fee_note],
      });
    }
    console.log(`[db] Seeded ${SEED_DATA.length} attractions`);
  }
  // Seed experiences once — INSERT OR IGNORE is idempotent
  const expExisting = await client.execute('SELECT COUNT(*) as n FROM experiences');
  if ((expExisting.rows[0]?.n ?? 0) === 0) {
    console.log('[db] Seeding experiences table…');
    for (const exp of LAGOS_EXPERIENCES_SEED) {
      await client.execute({
        sql: `INSERT OR IGNORE INTO experiences
              (id, name, tagline, description, price_per_person_per_day, max_days, category,
               location, image_id, color_fallback, included, schedule, schedule_overrides,
               highlights, group_min, group_max, notes, state)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        args: [
          exp.id, exp.name, exp.tagline, exp.description,
          exp.pricePerPersonPerDay, exp.maxDays, exp.category, exp.location,
          exp.imageId, exp.colorFallback,
          JSON.stringify(exp.included  || []),
          JSON.stringify(exp.schedule  || []),
          JSON.stringify(exp.scheduleOverrides || {}),
          JSON.stringify(exp.highlights || []),
          exp.groupMin, exp.groupMax, exp.notes || null, 'Lagos',
        ],
      });
    }
    console.log(`[db] Seeded ${LAGOS_EXPERIENCES_SEED.length} experiences`);
  }
  // Seed curated trips once — they land as drafts for the admin to review
  const tripExisting = await client.execute('SELECT COUNT(*) as n FROM curated_trips');
  if ((tripExisting.rows[0]?.n ?? 0) === 0) {
    console.log('[db] Seeding curated_trips table…');
    for (const t of CURATED_TRIPS_SEED) {
      await client.execute({
        sql: `INSERT OR IGNORE INTO curated_trips
              (id, name, tagline, description, origin, state, location, days, price_from,
               tag, emoji, image_id, color_fallback, included, highlights, itinerary,
               group_min, group_max, notes, published, sort_order)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        args: [
          t.id, t.name, t.tagline, t.description, t.origin, t.state, t.location,
          t.days, t.priceFrom, t.tag, t.emoji, t.imageId || '', t.colorFallback,
          JSON.stringify(t.included   || []),
          JSON.stringify(t.highlights || []),
          JSON.stringify(t.itinerary  || []),
          t.groupMin, t.groupMax, t.notes || null, 0, t.sortOrder || 0,
        ],
      });
    }
    console.log(`[db] Seeded ${CURATED_TRIPS_SEED.length} curated trips (as drafts)`);
  }
})().catch((err) => {
  console.error('[db] schema init failed:', err.message);
  process.exit(1);
});

// ── Generic raw queries ────────────────────────────────────────────────────

/** Returns the first row, or null. */
async function raw(sql, args) {
  const res = await client.execute(args !== undefined ? { sql, args } : sql);
  return res.rows?.[0] ?? null;
}

/** Returns all rows as an array. */
async function rawAll(sql, args) {
  const res = await client.execute(args !== undefined ? { sql, args } : sql);
  return res.rows ?? [];
}

// ── Conversation helpers ───────────────────────────────────────────────────

async function getConv(phone) {
  const res = await client.execute({
    sql: 'SELECT * FROM conversations WHERE phone = ?',
    args: [phone],
  });
  return res.rows[0] ?? null;
}

async function upsertConv({ phone, name, state, trip_id, temp }) {
  await client.execute({
    sql: `INSERT INTO conversations (phone, name, state, trip_id, temp)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(phone) DO UPDATE SET
            name       = COALESCE(?, name),
            state      = ?,
            trip_id    = ?,
            temp       = ?,
            updated_at = unixepoch()`,
    args: [phone, name, state, trip_id, temp, name, state, trip_id, temp],
  });
}

async function resetConv(phone) {
  await client.execute({
    sql: `UPDATE conversations SET state = 'idle', trip_id = NULL, temp = '{}', updated_at = unixepoch() WHERE phone = ?`,
    args: [phone],
  });
}

// ── Trip helpers ───────────────────────────────────────────────────────────

async function insertTrip({ id, organiser_phone }) {
  await client.execute({
    sql: 'INSERT INTO trips (id, organiser_phone) VALUES (?, ?)',
    args: [id, organiser_phone],
  });
}

async function getTrip(id) {
  const res = await client.execute({
    sql: 'SELECT * FROM trips WHERE id = ?',
    args: [id],
  });
  return res.rows[0] ?? null;
}

async function getTripByOrganiser(phone) {
  const res = await client.execute({
    sql: 'SELECT * FROM trips WHERE organiser_phone = ? ORDER BY created_at DESC LIMIT 1',
    args: [phone],
  });
  return res.rows[0] ?? null;
}

async function getTripByGroup(groupId) {
  const res = await client.execute({
    sql: 'SELECT * FROM trips WHERE group_id = ? ORDER BY created_at DESC LIMIT 1',
    args: [groupId],
  });
  return res.rows[0] ?? null;
}

async function updateTrip({
  id, origin, destination, budget, days, squad_size, accommodation,
  date_flexibility, specific_dates, dealbreakers, plan,
  selected_date, selected_hotel, group_id, status,
}) {
  await client.execute({
    sql: `UPDATE trips SET
      origin           = COALESCE(?, origin),
      destination      = COALESCE(?, destination),
      budget           = COALESCE(?, budget),
      days             = COALESCE(?, days),
      squad_size       = COALESCE(?, squad_size),
      accommodation    = COALESCE(?, accommodation),
      date_flexibility = COALESCE(?, date_flexibility),
      specific_dates   = COALESCE(?, specific_dates),
      dealbreakers     = COALESCE(?, dealbreakers),
      plan             = COALESCE(?, plan),
      selected_date    = COALESCE(?, selected_date),
      selected_hotel   = COALESCE(?, selected_hotel),
      group_id         = COALESCE(?, group_id),
      status           = COALESCE(?, status)
    WHERE id = ?`,
    args: [
      origin, destination, budget, days, squad_size, accommodation,
      date_flexibility, specific_dates, dealbreakers, plan,
      selected_date, selected_hotel, group_id, status,
      id,
    ],
  });
}

// ── Member helpers ─────────────────────────────────────────────────────────

async function insertMember({ id, trip_id, phone, name, amount }) {
  await client.execute({
    sql: 'INSERT OR IGNORE INTO members (id, trip_id, phone, name, amount) VALUES (?, ?, ?, ?, ?)',
    args: [id, trip_id, phone, name, amount],
  });
}

async function getMember(tripId, phone) {
  const res = await client.execute({
    sql: 'SELECT * FROM members WHERE trip_id = ? AND phone = ?',
    args: [tripId, phone],
  });
  return res.rows[0] ?? null;
}

async function getMembersByTrip(tripId) {
  const res = await client.execute({
    sql: 'SELECT * FROM members WHERE trip_id = ?',
    args: [tripId],
  });
  return res.rows;
}

async function markPaid({ ref, trip_id, phone }) {
  await client.execute({
    sql: 'UPDATE members SET paid = 1, paid_at = unixepoch(), paystack_ref = ? WHERE trip_id = ? AND phone = ?',
    args: [ref, trip_id, phone],
  });
}

async function updatePaystackUrl({ ref, url, trip_id, phone }) {
  await client.execute({
    sql: 'UPDATE members SET paystack_ref = ?, paystack_url = ? WHERE trip_id = ? AND phone = ?',
    args: [ref, url, trip_id, phone],
  });
}

// ── Waitlist helpers ───────────────────────────────────────────────────────

async function insertWaitlist({ phone, source }) {
  await client.execute({
    sql: 'INSERT OR IGNORE INTO waitlist (phone, source) VALUES (?, ?)',
    args: [phone, source],
  });
}

async function listWaitlist() {
  const res = await client.execute('SELECT * FROM waitlist ORDER BY created_at DESC');
  return res.rows;
}

// ── Agency leads helpers ───────────────────────────────────────────────────

async function insertAgencyLead({ name, agency_name, phone, email, source = 'web' }) {
  await client.execute({
    sql: `INSERT INTO agency_leads (name, agency_name, phone, email, source)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(email) DO UPDATE SET
            name        = excluded.name,
            agency_name = excluded.agency_name,
            phone       = excluded.phone,
            source      = excluded.source`,
    args: [name, agency_name || null, phone, email, source],
  });
}

async function listAgencyLeads() {
  const res = await client.execute('SELECT * FROM agency_leads ORDER BY created_at DESC');
  return res.rows;
}

// ── Attractions helpers ────────────────────────────────────────────────────

async function getAttractionsByState(state) {
  const res = await client.execute({
    sql: 'SELECT * FROM attractions WHERE state = ? ORDER BY name',
    args: [state],
  });
  return res.rows;
}

/** Row count + how many still have no price set, per state — drives the admin coverage view. */
async function getAttractionStateCounts() {
  const rows = await rawAll(
    `SELECT state,
            COUNT(*) AS total,
            SUM(CASE WHEN fee_min = 0 AND fee_max = 0 THEN 1 ELSE 0 END) AS unpriced
     FROM attractions
     GROUP BY state
     ORDER BY state`
  );
  return rows.map(r => ({
    state:    r.state,
    total:    Number(r.total),
    unpriced: Number(r.unpriced),
  }));
}

async function getAttraction(id) {
  return raw('SELECT * FROM attractions WHERE id = ?', [id]);
}

/** Insert when `id` is absent, update in place when present. */
async function upsertAttraction({ id, state, name, fee_min, fee_max, fee_note }) {
  const args = [state, name, Number(fee_min) || 0, Number(fee_max) || 0, fee_note || null];
  if (id) {
    await client.execute({
      sql: `UPDATE attractions SET state=?, name=?, fee_min=?, fee_max=?, fee_note=? WHERE id=?`,
      args: [...args, id],
    });
    return getAttraction(id);
  }
  const res = await client.execute({
    sql: 'INSERT INTO attractions (state, name, fee_min, fee_max, fee_note) VALUES (?, ?, ?, ?, ?)',
    args,
  });
  return getAttraction(Number(res.lastInsertRowid));
}

async function deleteAttraction(id) {
  await client.execute({ sql: 'DELETE FROM attractions WHERE id = ?', args: [id] });
}

// ── Agent helpers ──────────────────────────────────────────────────────────

async function upsertAgent({ id, phone, agency_name, wa_number, service_fee, color, plan_type, tagline }) {
  await client.execute({
    sql: `INSERT INTO agents (id, phone, agency_name, wa_number, service_fee, color, plan_type, tagline)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(phone) DO UPDATE SET
            agency_name = ?,
            wa_number   = ?,
            service_fee = ?,
            color       = ?,
            plan_type   = ?,
            tagline     = ?`,
    args: [
      id, phone, agency_name, wa_number, service_fee, color, plan_type, tagline,
      agency_name, wa_number, service_fee, color, plan_type, tagline,
    ],
  });
}

async function getAgent(phone) {
  const res = await client.execute({
    sql: 'SELECT * FROM agents WHERE phone = ?',
    args: [phone],
  });
  return res.rows[0] ?? null;
}

async function getAgentDashboard(phone) {
  const res = await client.execute({
    sql: `SELECT
      t.id, t.origin, t.destination, t.days, t.squad_size, t.status, t.created_at,
      COUNT(m.id)                                                AS total_members,
      COALESCE(SUM(CASE WHEN m.paid = 1 THEN 1 ELSE 0 END), 0) AS paid_count,
      COALESCE(SUM(CASE WHEN m.paid = 1 THEN m.amount ELSE 0 END), 0) AS total_collected
    FROM trips t
    LEFT JOIN members m ON m.trip_id = t.id
    WHERE t.organiser_phone = ?
    GROUP BY t.id
    ORDER BY t.created_at DESC`,
    args: [phone],
  });
  return res.rows;
}

/** Link an existing agent record to a JWT user (by phone as key). */
async function linkAgentToUser({ phone, user_id, email }) {
  await client.execute({
    sql: `UPDATE agents SET user_id = ?, email = ? WHERE phone = ?`,
    args: [user_id, email ? email.toLowerCase() : null, phone],
  });
}

/** Look up an agent by their JWT user_id. */
async function getAgentByUser(userId) {
  const res = await client.execute({
    sql: 'SELECT * FROM agents WHERE user_id = ?',
    args: [userId],
  });
  return res.rows[0] ?? null;
}

/** Look up an agent by email (fallback when user_id not set yet). */
async function getAgentByEmail(email) {
  const res = await client.execute({
    sql: 'SELECT * FROM agents WHERE email = ?',
    args: [email.toLowerCase()],
  });
  return res.rows[0] ?? null;
}

/**
 * Dashboard trips for an authenticated Pro user.
 * Matches trips by user_id (web-created) OR organiser_phone (WhatsApp-created).
 */
async function getAgentDashboardByUser(userId, phone) {
  const res = await client.execute({
    sql: `SELECT
      t.id, t.origin, t.destination, t.days, t.squad_size, t.status, t.created_at,
      COUNT(m.id)                                                     AS total_members,
      COALESCE(SUM(CASE WHEN m.paid = 1 THEN 1 ELSE 0 END), 0)      AS paid_count,
      COALESCE(SUM(CASE WHEN m.paid = 1 THEN m.amount ELSE 0 END),0) AS total_collected
    FROM trips t
    LEFT JOIN members m ON m.trip_id = t.id
    WHERE t.user_id = ? OR (? IS NOT NULL AND t.organiser_phone = ?)
    GROUP BY t.id
    ORDER BY t.created_at DESC`,
    args: [userId, phone || null, phone || null],
  });
  return res.rows;
}

// ── User helpers ───────────────────────────────────────────────────────────

async function upsertUser({ id, email, name, photo_url }) {
  await client.execute({
    sql: `INSERT INTO users (id, email, name, photo_url)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            email     = ?,
            name      = COALESCE(?, name),
            photo_url = COALESCE(?, photo_url)`,
    args: [id, email, name ?? null, photo_url ?? null, email, name ?? null, photo_url ?? null],
  });
}

async function getUser(id) {
  const res = await client.execute({ sql: 'SELECT * FROM users WHERE id = ?', args: [id] });
  return res.rows[0] ?? null;
}

async function getUserPlans(userId) {
  const res = await client.execute({
    sql: `SELECT t.id, t.origin, t.destination, t.days, t.squad_size, t.status, t.plan, t.created_at,
          (SELECT COUNT(*)                          FROM participants p WHERE p.trip_id = t.id             ) AS participant_count,
          (SELECT COUNT(*)                          FROM participants p WHERE p.trip_id = t.id AND p.paid=1) AS paid_count,
          (SELECT COALESCE(SUM(p.amount),0)         FROM participants p WHERE p.trip_id = t.id AND p.paid=1) AS total_collected
          FROM trips t WHERE t.user_id = ? ORDER BY t.created_at DESC`,
    args: [userId],
  });
  return res.rows;
}

// ── Participant helpers ────────────────────────────────────────────────────

async function insertParticipant({ id, trip_id, name }) {
  await client.execute({
    sql: 'INSERT INTO participants (id, trip_id, name) VALUES (?, ?, ?)',
    args: [id, trip_id, name ?? null],
  });
}

async function getParticipants(tripId) {
  const res = await client.execute({
    sql: 'SELECT id, name, paid, amount, created_at FROM participants WHERE trip_id = ? ORDER BY created_at ASC',
    args: [tripId],
  });
  return res.rows;
}

async function getParticipantByRef(paystackRef) {
  const res = await client.execute({
    sql: 'SELECT * FROM participants WHERE paystack_ref = ?',
    args: [paystackRef],
  });
  return res.rows[0] ?? null;
}

async function updateParticipantPayment({ id, email, amount, paystack_ref, paystack_url }) {
  await client.execute({
    sql: `UPDATE participants SET email=?, amount=?, paystack_ref=?, paystack_url=? WHERE id=?`,
    args: [email, amount, paystack_ref, paystack_url, id],
  });
}

async function markParticipantPaid({ paystack_ref }) {
  await client.execute({
    sql: `UPDATE participants SET paid=1, paid_at=unixepoch() WHERE paystack_ref=?`,
    args: [paystack_ref],
  });
}

/** Returns { paidCount, totalCollected } for a trip's participants. */
async function getParticipantStats(tripId) {
  const res = await client.execute({
    sql: `SELECT COUNT(*) AS paid_count, COALESCE(SUM(amount), 0) AS total_collected
          FROM participants WHERE trip_id = ? AND paid = 1`,
    args: [tripId],
  });
  const row = res.rows[0];
  return { paidCount: Number(row?.paid_count ?? 0), totalCollected: Number(row?.total_collected ?? 0) };
}

// ── Experience helpers ─────────────────────────────────────────────────────

/** Parse a raw DB row into a camelCase experience object. */
function parseExpRow(row) {
  if (!row) return null;
  return {
    id:                   row.id,
    name:                 row.name,
    tagline:              row.tagline,
    description:          row.description,
    pricePerPersonPerDay: Number(row.price_per_person_per_day),
    maxDays:              Number(row.max_days),
    category:             row.category,
    location:             row.location,
    imageId:              row.image_id,
    colorFallback:        row.color_fallback,
    included:             JSON.parse(row.included            || '[]'),
    schedule:             JSON.parse(row.schedule            || '[]'),
    scheduleOverrides:    JSON.parse(row.schedule_overrides  || '{}'),
    highlights:           JSON.parse(row.highlights          || '[]'),
    groupMin:             Number(row.group_min),
    groupMax:             Number(row.group_max),
    notes:                row.notes || null,
    state:                row.state,
    published:            Boolean(row.published),
    sortOrder:            Number(row.sort_order || 0),
    createdAt:            Number(row.created_at),
    updatedAt:            Number(row.updated_at),
  };
}

async function getExperiences({ state = 'Lagos', all = false } = {}) {
  const rows = await rawAll(
    all
      ? 'SELECT * FROM experiences WHERE state = ? ORDER BY sort_order, created_at'
      : 'SELECT * FROM experiences WHERE state = ? AND published = 1 ORDER BY sort_order, created_at',
    [state]
  );
  return rows.map(parseExpRow);
}

async function upsertExperience(exp) {
  const existing = await raw('SELECT id FROM experiences WHERE id = ?', [exp.id]);
  if (existing) {
    await client.execute({
      sql: `UPDATE experiences SET
              name=?, tagline=?, description=?, price_per_person_per_day=?, max_days=?,
              category=?, location=?, image_id=?, color_fallback=?,
              included=?, schedule=?, schedule_overrides=?, highlights=?,
              group_min=?, group_max=?, notes=?, state=?, published=?, sort_order=?,
              updated_at=unixepoch()
            WHERE id=?`,
      args: [
        exp.name, exp.tagline || '', exp.description || '',
        exp.pricePerPersonPerDay || 0, exp.maxDays || 1,
        exp.category || 'leisure', exp.location || '', exp.imageId || '', exp.colorFallback || '#2F4A33',
        JSON.stringify(exp.included            || []),
        JSON.stringify(exp.schedule            || []),
        JSON.stringify(exp.scheduleOverrides   || {}),
        JSON.stringify(exp.highlights          || []),
        exp.groupMin || 2, exp.groupMax || 40,
        exp.notes || null, exp.state || 'Lagos',
        exp.published !== false ? 1 : 0, exp.sortOrder || 0,
        exp.id,
      ],
    });
  } else {
    await client.execute({
      sql: `INSERT INTO experiences
              (id, name, tagline, description, price_per_person_per_day, max_days, category,
               location, image_id, color_fallback, included, schedule, schedule_overrides,
               highlights, group_min, group_max, notes, state, published, sort_order)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      args: [
        exp.id, exp.name, exp.tagline || '', exp.description || '',
        exp.pricePerPersonPerDay || 0, exp.maxDays || 1,
        exp.category || 'leisure', exp.location || '', exp.imageId || '', exp.colorFallback || '#2F4A33',
        JSON.stringify(exp.included            || []),
        JSON.stringify(exp.schedule            || []),
        JSON.stringify(exp.scheduleOverrides   || {}),
        JSON.stringify(exp.highlights          || []),
        exp.groupMin || 2, exp.groupMax || 40,
        exp.notes || null, exp.state || 'Lagos',
        exp.published !== false ? 1 : 0, exp.sortOrder || 0,
      ],
    });
  }
  return raw('SELECT * FROM experiences WHERE id = ?', [exp.id]).then(parseExpRow);
}

// ── Curated trip helpers ───────────────────────────────────────────────────

/** Parse a raw DB row into a camelCase curated-trip object. */
function parseTripRow(row) {
  if (!row) return null;
  return {
    id:            row.id,
    name:          row.name,
    tagline:       row.tagline,
    description:   row.description,
    origin:        row.origin,
    state:         row.state,
    location:      row.location,
    days:          Number(row.days),
    priceFrom:     Number(row.price_from),
    tag:           row.tag,
    emoji:         row.emoji,
    imageId:       row.image_id,
    colorFallback: row.color_fallback,
    included:      JSON.parse(row.included   || '[]'),
    highlights:    JSON.parse(row.highlights || '[]'),
    itinerary:     JSON.parse(row.itinerary  || '[]'),
    groupMin:      Number(row.group_min),
    groupMax:      Number(row.group_max),
    notes:         row.notes || null,
    published:     Boolean(row.published),
    sortOrder:     Number(row.sort_order || 0),
    createdAt:     Number(row.created_at),
    updatedAt:     Number(row.updated_at),
  };
}

/**
 * List curated trips.
 * `all: true` includes drafts (admin); default returns published only (public).
 * `state` narrows to one destination state when given.
 */
async function getCuratedTrips({ state = null, all = false } = {}) {
  const where = [];
  const args  = [];
  if (!all)  where.push('published = 1');
  if (state) { where.push('state = ?'); args.push(state); }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const rows = await rawAll(
    `SELECT * FROM curated_trips ${clause} ORDER BY sort_order, created_at`,
    args
  );
  return rows.map(parseTripRow);
}

async function getCuratedTrip(id) {
  return parseTripRow(await raw('SELECT * FROM curated_trips WHERE id = ?', [id]));
}

async function upsertCuratedTrip(t) {
  const args = [
    t.name, t.tagline || '', t.description || '',
    t.origin || 'Lagos', t.state || 'Lagos', t.location || '',
    t.days || 2, t.priceFrom || 0, t.tag || '', t.emoji || '🧳',
    t.imageId || '', t.colorFallback || '#2F4A33',
    JSON.stringify(t.included   || []),
    JSON.stringify(t.highlights || []),
    JSON.stringify(t.itinerary  || []),
    t.groupMin || 2, t.groupMax || 40,
    t.notes || null,
    t.published ? 1 : 0,
    t.sortOrder || 0,
  ];
  const existing = await raw('SELECT id FROM curated_trips WHERE id = ?', [t.id]);
  if (existing) {
    await client.execute({
      sql: `UPDATE curated_trips SET
              name=?, tagline=?, description=?, origin=?, state=?, location=?,
              days=?, price_from=?, tag=?, emoji=?, image_id=?, color_fallback=?,
              included=?, highlights=?, itinerary=?, group_min=?, group_max=?,
              notes=?, published=?, sort_order=?, updated_at=unixepoch()
            WHERE id=?`,
      args: [...args, t.id],
    });
  } else {
    await client.execute({
      sql: `INSERT INTO curated_trips
              (name, tagline, description, origin, state, location, days, price_from,
               tag, emoji, image_id, color_fallback, included, highlights, itinerary,
               group_min, group_max, notes, published, sort_order, id)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      args: [...args, t.id],
    });
  }
  return getCuratedTrip(t.id);
}

async function deleteCuratedTrip(id) {
  await client.execute({ sql: 'DELETE FROM curated_trips WHERE id = ?', args: [id] });
}

module.exports = {
  ready,
  raw,
  rawAll,
  parseExpRow,
  parseTripRow,
  conv:        { get: getConv, upsert: upsertConv, reset: resetConv },
  trips:       { insert: insertTrip, get: getTrip, byOrganiser: getTripByOrganiser, byGroup: getTripByGroup, update: updateTrip },
  members:     { insert: insertMember, get: getMember, byTrip: getMembersByTrip, markPaid, updateUrl: updatePaystackUrl },
  waitlist:    { insert: insertWaitlist, list: listWaitlist },
  agencyLeads: { insert: insertAgencyLead, list: listAgencyLeads },
  agents:      {
    upsert:        upsertAgent,
    get:           getAgent,
    dashboard:     getAgentDashboard,
    linkToUser:    linkAgentToUser,
    getByUser:     getAgentByUser,
    getByEmail:    getAgentByEmail,
    dashboardByUser: getAgentDashboardByUser,
  },
  attractions:  {
    byState:     getAttractionsByState,
    stateCounts: getAttractionStateCounts,
    get:         getAttraction,
    upsert:      upsertAttraction,
    remove:      deleteAttraction,
  },
  experiences:  { list: getExperiences, upsert: upsertExperience },
  curatedTrips: {
    list:   getCuratedTrips,
    get:    getCuratedTrip,
    upsert: upsertCuratedTrip,
    remove: deleteCuratedTrip,
  },
  users:        { upsert: upsertUser, get: getUser, plans: getUserPlans },
  participants: {
    insert: insertParticipant,
    get: getParticipants,
    getByRef: getParticipantByRef,
    updatePayment: updateParticipantPayment,
    markPaid: markParticipantPaid,
    stats: getParticipantStats,
  },
};
