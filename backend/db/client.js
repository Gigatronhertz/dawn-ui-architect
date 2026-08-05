const { createClient } = require('@libsql/client');
const path = require('path');
const fs = require('fs');
const { SEED_DATA } = require('../services/attractions');

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
  // Phase 6 — payment columns on participants
  `ALTER TABLE participants ADD COLUMN email        TEXT`,
  `ALTER TABLE participants ADD COLUMN paid         INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE participants ADD COLUMN amount       INTEGER`,
  `ALTER TABLE participants ADD COLUMN paystack_ref TEXT`,
  `ALTER TABLE participants ADD COLUMN paystack_url TEXT`,
  `ALTER TABLE participants ADD COLUMN paid_at      INTEGER`,
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

// ── Attractions helpers ────────────────────────────────────────────────────

async function getAttractionsByState(state) {
  const res = await client.execute({
    sql: 'SELECT * FROM attractions WHERE state = ? ORDER BY name',
    args: [state],
  });
  return res.rows;
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

module.exports = {
  ready,
  raw,
  rawAll,
  conv:        { get: getConv, upsert: upsertConv, reset: resetConv },
  trips:       { insert: insertTrip, get: getTrip, byOrganiser: getTripByOrganiser, byGroup: getTripByGroup, update: updateTrip },
  members:     { insert: insertMember, get: getMember, byTrip: getMembersByTrip, markPaid, updateUrl: updatePaystackUrl },
  waitlist:    { insert: insertWaitlist, list: listWaitlist },
  agents:      { upsert: upsertAgent, get: getAgent, dashboard: getAgentDashboard },
  attractions: { byState: getAttractionsByState },
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
