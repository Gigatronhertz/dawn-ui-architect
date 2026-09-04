const { createClient } = require('@libsql/client');
const path = require('path');
const fs = require('fs');
const { SEED_DATA } = require('../services/attractions');
const { LAGOS_EXPERIENCES_SEED } = require('../services/experiencesSeed');
const { IMPORTED_TRIP_EXPERIENCES } = require('../services/curatedTripsSeed');
const { NIGHTLIFE_SEED, EVENTS_SEED } = require('../services/nightlifeEventsSeed');

const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// Local dev: file:./data/mysquadgo.db
// Production (Turso): set DATABASE_URL + DATABASE_AUTH_TOKEN env vars
//
// The remote URL is only honoured in production, or when someone opts in with
// USE_REMOTE_DB=1. backend/.env carries the live Turso credentials, so without
// this guard simply running the server locally would read and write production
// data — seeding it, taking test bookings against it, and deleting from it.
const wantsRemote = process.env.NODE_ENV === 'production' || process.env.USE_REMOTE_DB === '1';
const dbUrl = (wantsRemote && process.env.DATABASE_URL)
  ? process.env.DATABASE_URL
  : `file:${path.join(dataDir, 'mysquadgo.db')}`;

if (!wantsRemote && process.env.DATABASE_URL) {
  console.log('[db] Using the local file database. Set USE_REMOTE_DB=1 to talk to Turso.');
}
const client = createClient(
  (wantsRemote && process.env.DATABASE_AUTH_TOKEN)
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
  // NOTE: `curated_trips` was merged into `experiences` — see curatedTripsSeed.js.
  // The table is no longer created or read; existing databases keep their rows
  // untouched so the old data is recoverable until it is deliberately dropped.
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
  // Money paid out to whoever is running a trip. A table rather than columns
  // because payouts happen in stages — a release to book the bus, then the
  // balance — and every one of them needs its own record and reference.
  `CREATE TABLE IF NOT EXISTS payouts (
    id          TEXT PRIMARY KEY,
    trip_id     TEXT NOT NULL,
    amount      INTEGER NOT NULL,
    note        TEXT,
    status      TEXT NOT NULL DEFAULT 'pending',
    reference   TEXT,
    created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
    paid_at     INTEGER
  )`,
  // Uploaded trip photos. Deliberately its own table: the Explore page does
  // SELECT * FROM experiences on every load, and image bytes must never ride
  // along with it. Trips reference a row here by URL path, not by join.
  `CREATE TABLE IF NOT EXISTS trip_images (
    id         TEXT PRIMARY KEY,
    mime       TEXT NOT NULL,
    bytes      BLOB NOT NULL,
    byte_size  INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  )`,
  // An agency runs the same shape of trip again and again — the same stops at
  // the same prices, with only the dates moving. A template stores that shape
  // so the next one starts from it instead of from an empty day.
  //
  // days_json holds the builder's own day/stop structure, so applying a
  // template is a straight restore rather than a lossy reconstruction.
  `CREATE TABLE IF NOT EXISTS trip_templates (
    id          TEXT PRIMARY KEY,
    agent_id    TEXT NOT NULL,
    name        TEXT NOT NULL,
    city        TEXT,
    squad_size  INTEGER NOT NULL DEFAULT 1,
    day_count   INTEGER NOT NULL DEFAULT 1,
    per_person  INTEGER NOT NULL DEFAULT 0,
    days_json   TEXT NOT NULL,
    created_at  INTEGER NOT NULL DEFAULT (unixepoch())
  )`,
  // Curated nightlife venues for Explore's "Nightlife in {city}" section.
  // Separate from `attractions` — that table is the AI planner's price sheet
  // and classifies "Nightlife" by name heuristic; this one is admin-picked,
  // with a photo and a tagline, the same way an experience is.
  `CREATE TABLE IF NOT EXISTS nightlife_venues (
    id             TEXT PRIMARY KEY,
    name           TEXT NOT NULL,
    tagline        TEXT NOT NULL DEFAULT '',
    vibe           TEXT NOT NULL DEFAULT 'Bar',
    location       TEXT NOT NULL DEFAULT '',
    image_id       TEXT NOT NULL DEFAULT '',
    color_fallback TEXT NOT NULL DEFAULT '#1A1A1A',
    fee_min        INTEGER NOT NULL DEFAULT 0,
    fee_max        INTEGER NOT NULL DEFAULT 0,
    fee_note       TEXT,
    weekly_program TEXT NOT NULL DEFAULT '[]',
    state          TEXT NOT NULL DEFAULT 'Lagos',
    published      INTEGER NOT NULL DEFAULT 1,
    sort_order     INTEGER NOT NULL DEFAULT 0,
    created_at     INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at     INTEGER NOT NULL DEFAULT (unixepoch())
  )`,
  // Curated events for Explore's "What's on" section — concerts, festivals,
  // pop-ups. Nothing generates these; an admin adds only events that are real.
  `CREATE TABLE IF NOT EXISTS events (
    id             TEXT PRIMARY KEY,
    name           TEXT NOT NULL,
    tagline        TEXT NOT NULL DEFAULT '',
    description    TEXT NOT NULL DEFAULT '',
    category       TEXT NOT NULL DEFAULT 'other',
    location       TEXT NOT NULL DEFAULT '',
    event_date     TEXT,
    image_id       TEXT NOT NULL DEFAULT '',
    color_fallback TEXT NOT NULL DEFAULT '#2F4A33',
    price_min      INTEGER NOT NULL DEFAULT 0,
    price_max      INTEGER NOT NULL DEFAULT 0,
    price_note     TEXT,
    ticket_url     TEXT,
    state          TEXT NOT NULL DEFAULT 'Lagos',
    published      INTEGER NOT NULL DEFAULT 1,
    sort_order     INTEGER NOT NULL DEFAULT 0,
    created_at     INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at     INTEGER NOT NULL DEFAULT (unixepoch())
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
  // Phase 9 — the shared link collects a way to follow someone up. Anyone who
  // isn't ready to pay yet can leave their details instead, so a "not now" is
  // a lead rather than a lost visitor.
  `ALTER TABLE participants ADD COLUMN wa_number      TEXT`,
  `ALTER TABLE participants ADD COLUMN wants_reminders INTEGER NOT NULL DEFAULT 0`,
  // Phase 10 — chasing unpaid squad members. Tracked per participant so a
  // reminder is never sent twice for the same step, even if the runner
  // restarts or two instances overlap.
  `ALTER TABLE participants ADD COLUMN reminders_sent  INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE participants ADD COLUMN last_reminded_at INTEGER`,
  // Phase 11 — Karije collects for the trip and disburses to whoever is
  // running it. The fee is snapshotted per trip so changing the platform rate
  // never re-prices a squad that is already collecting.
  `ALTER TABLE trips ADD COLUMN service_fee_per_person INTEGER`,
  `ALTER TABLE trips ADD COLUMN payout_bank_code    TEXT`,
  `ALTER TABLE trips ADD COLUMN payout_account_no   TEXT`,
  `ALTER TABLE trips ADD COLUMN payout_account_name TEXT`,
  // Phase 12 — agency-owned trips. A Pro agency authors the trip itself, owns
  // it, and chooses whether it shows in the Karije catalog or lives only at
  // its share link. agent_id is kept separate from user_id on purpose:
  // user_id is whoever clicked save, agent_id is the agency the trip belongs
  // to, so the trip survives a change of login behind the agency.
  `ALTER TABLE trips ADD COLUMN agent_id       TEXT`,
  `ALTER TABLE trips ADD COLUMN listed         INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE trips ADD COLUMN title          TEXT`,
  `ALTER TABLE trips ADD COLUMN summary        TEXT`,
  `ALTER TABLE trips ADD COLUMN cover_image_id TEXT`,
  // Phase 13 — agency branding. The id points into trip_images, which is a
  // generic blob store despite the name, so logos get the same immutable
  // caching the trip photos already have.
  `ALTER TABLE agents ADD COLUMN logo_image_id TEXT`,
  // Phase 14 — a nightlife venue's weekly line-up (Wednesday karaoke, Friday
  // party night, etc.), shown when someone opens the venue's detail view.
  `ALTER TABLE nightlife_venues ADD COLUMN weekly_program TEXT NOT NULL DEFAULT '[]'`,
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
  // Seed curated trips (stored in the `experiences` table). No COUNT guard —
  // INSERT OR IGNORE is idempotent and never overwrites an admin edit, so any
  // entry missing from an existing DB gets backfilled on the next boot. That
  // is how the six former curated_trips rows arrive.
  {
    const seed = [...LAGOS_EXPERIENCES_SEED, ...IMPORTED_TRIP_EXPERIENCES];
    for (const exp of seed) {
      await client.execute({
        sql: `INSERT OR IGNORE INTO experiences
              (id, name, tagline, description, price_per_person_per_day, max_days, category,
               location, image_id, color_fallback, included, schedule, schedule_overrides,
               highlights, group_min, group_max, notes, state, sort_order)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        args: [
          exp.id, exp.name, exp.tagline, exp.description,
          exp.pricePerPersonPerDay, exp.maxDays, exp.category, exp.location,
          exp.imageId, exp.colorFallback,
          JSON.stringify(exp.included  || []),
          JSON.stringify(exp.schedule  || []),
          JSON.stringify(exp.scheduleOverrides || {}),
          JSON.stringify(exp.highlights || []),
          exp.groupMin, exp.groupMax, exp.notes || null,
          exp.state || 'Lagos', exp.sortOrder || 0,
        ],
      });
    }
    console.log(`[db] Curated trips seed applied (${seed.length} entries)`);
  }
  // Demo content for the Nightlife and Events tabs. Same INSERT OR IGNORE
  // idempotency as the curated trips above — an admin edit or delete is
  // never overwritten by this running again.
  {
    for (const v of NIGHTLIFE_SEED) {
      await client.execute({
        sql: `INSERT OR IGNORE INTO nightlife_venues
              (id, name, tagline, vibe, location, image_id, color_fallback,
               fee_min, fee_max, fee_note, weekly_program, state, sort_order)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        args: [
          v.id, v.name, v.tagline || '', v.vibe || 'Bar', v.location || '',
          v.imageId || '', v.colorFallback || '#1A1A1A',
          v.feeMin || 0, v.feeMax || 0, v.feeNote || null,
          JSON.stringify(v.weeklyProgram || []),
          v.state || 'Lagos', v.sortOrder || 0,
        ],
      });
    }
    for (const e of EVENTS_SEED) {
      await client.execute({
        sql: `INSERT OR IGNORE INTO events
              (id, name, tagline, description, category, location, event_date,
               image_id, color_fallback, price_min, price_max, price_note, ticket_url,
               state, sort_order)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        args: [
          e.id, e.name, e.tagline || '', e.description || '', e.category || 'other',
          e.location || '', e.eventDate || null,
          e.imageId || '', e.colorFallback || '#2F4A33',
          e.priceMin || 0, e.priceMax || 0, e.priceNote || null, e.ticketUrl || null,
          e.state || 'Lagos', e.sortOrder || 0,
        ],
      });
    }
    console.log(`[db] Nightlife/events demo seed applied (${NIGHTLIFE_SEED.length} venues, ${EVENTS_SEED.length} events)`);
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
/**
 * Every trip an agency can see, with its live headcount and takings.
 *
 * Aggregates `participants`, not `members`. `members` is only ever written by
 * the retired WhatsApp group bot (backend/bot/, backend/webhook.js); everyone
 * who joins through a share link lands in `participants`. Joining the wrong
 * table is why this dashboard reported zero travellers and zero collected for
 * every trip.
 *
 * Matched three ways so nothing an agency owns falls out of view: trips it
 * authored (agent_id), trips saved under its login (user_id), and older trips
 * keyed only by the organiser phone.
 */
async function getAgentDashboardByUser(userId, phone, agentId = null) {
  const res = await client.execute({
    sql: `SELECT
      t.id, t.origin, t.destination, t.days, t.squad_size, t.status, t.created_at,
      t.title, t.summary, t.listed, t.agent_id, t.selected_date,
      COUNT(p.id)                                                      AS total_members,
      COALESCE(SUM(CASE WHEN p.paid = 1 THEN 1 ELSE 0 END), 0)         AS paid_count,
      COALESCE(SUM(CASE WHEN p.paid = 1 THEN p.amount ELSE 0 END), 0)  AS total_collected
    FROM trips t
    LEFT JOIN participants p ON p.trip_id = t.id
    WHERE (? IS NOT NULL AND t.agent_id = ?)
       OR t.user_id = ?
       OR (? IS NOT NULL AND t.organiser_phone = ?)
    GROUP BY t.id
    ORDER BY t.created_at DESC`,
    args: [agentId || null, agentId || null, userId, phone || null, phone || null],
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

async function insertParticipant({ id, trip_id, name, email, wa_number, wants_reminders }) {
  await client.execute({
    sql: `INSERT INTO participants (id, trip_id, name, email, wa_number, wants_reminders)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [
      id, trip_id, name ?? null, email ?? null, wa_number ?? null,
      wants_reminders ? 1 : 0,
    ],
  });
}

async function getParticipants(tripId) {
  const res = await client.execute({
    sql: 'SELECT id, name, paid, amount, created_at FROM participants WHERE trip_id = ? ORDER BY created_at ASC',
    args: [tripId],
  });
  return res.rows;
}

/** One participant by id — the pay link resolves against this. */
async function getParticipantById(id) {
  const r = await client.execute({
    sql: 'SELECT * FROM participants WHERE id = ?',
    args: [id],
  });
  return r.rows[0] || null;
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

/**
 * Mark paid by participant id rather than reference.
 *
 * Every click on a pay link raises a fresh Paystack reference, so the one that
 * comes back on a webhook is not necessarily the one stored on the row. Keying
 * on the id credits the right person whichever link they used.
 */
async function markParticipantPaidById(id) {
  await client.execute({
    sql: 'UPDATE participants SET paid=1, paid_at=unixepoch() WHERE id=?',
    args: [id],
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

// ── Nightlife venue helpers ─────────────────────────────────────────────────

function parseNightlifeRow(row) {
  if (!row) return null;
  return {
    id:            row.id,
    name:          row.name,
    tagline:       row.tagline,
    vibe:          row.vibe,
    location:      row.location,
    imageId:       row.image_id,
    colorFallback: row.color_fallback,
    feeMin:        Number(row.fee_min),
    feeMax:        Number(row.fee_max),
    feeNote:       row.fee_note || null,
    weeklyProgram: JSON.parse(row.weekly_program || '[]'),
    state:         row.state,
    published:     Boolean(row.published),
    sortOrder:     Number(row.sort_order || 0),
    createdAt:     Number(row.created_at),
    updatedAt:     Number(row.updated_at),
  };
}

/** List curated nightlife venues. `state: null` spans every state. */
async function getNightlifeVenues({ state = 'Lagos', all = false } = {}) {
  const where = [];
  const args  = [];
  if (state) { where.push('state = ?'); args.push(state); }
  if (!all)    where.push('published = 1');
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const rows = await rawAll(
    `SELECT * FROM nightlife_venues ${clause} ORDER BY sort_order, created_at`,
    args
  );
  return rows.map(parseNightlifeRow);
}

async function upsertNightlifeVenue(v) {
  const existing = await raw('SELECT id FROM nightlife_venues WHERE id = ?', [v.id]);
  if (existing) {
    await client.execute({
      sql: `UPDATE nightlife_venues SET
              name=?, tagline=?, vibe=?, location=?, image_id=?, color_fallback=?,
              fee_min=?, fee_max=?, fee_note=?, weekly_program=?, state=?, published=?, sort_order=?,
              updated_at=unixepoch()
            WHERE id=?`,
      args: [
        v.name, v.tagline || '', v.vibe || 'Bar', v.location || '',
        v.imageId || '', v.colorFallback || '#1A1A1A',
        v.feeMin || 0, v.feeMax || 0, v.feeNote || null,
        JSON.stringify(v.weeklyProgram || []),
        v.state || 'Lagos', v.published !== false ? 1 : 0, v.sortOrder || 0,
        v.id,
      ],
    });
  } else {
    await client.execute({
      sql: `INSERT INTO nightlife_venues
              (id, name, tagline, vibe, location, image_id, color_fallback,
               fee_min, fee_max, fee_note, weekly_program, state, published, sort_order)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      args: [
        v.id, v.name, v.tagline || '', v.vibe || 'Bar', v.location || '',
        v.imageId || '', v.colorFallback || '#1A1A1A',
        v.feeMin || 0, v.feeMax || 0, v.feeNote || null,
        JSON.stringify(v.weeklyProgram || []),
        v.state || 'Lagos', v.published !== false ? 1 : 0, v.sortOrder || 0,
      ],
    });
  }
  return raw('SELECT * FROM nightlife_venues WHERE id = ?', [v.id]).then(parseNightlifeRow);
}

async function deleteNightlifeVenue(id) {
  await client.execute({ sql: 'DELETE FROM nightlife_venues WHERE id = ?', args: [id] });
}

// ── Event helpers ────────────────────────────────────────────────────────────

function parseEventRow(row) {
  if (!row) return null;
  return {
    id:            row.id,
    name:          row.name,
    tagline:       row.tagline,
    description:   row.description,
    category:      row.category,
    location:      row.location,
    eventDate:     row.event_date || null,
    imageId:       row.image_id,
    colorFallback: row.color_fallback,
    priceMin:      Number(row.price_min),
    priceMax:      Number(row.price_max),
    priceNote:     row.price_note || null,
    ticketUrl:     row.ticket_url || null,
    state:         row.state,
    published:     Boolean(row.published),
    sortOrder:     Number(row.sort_order || 0),
    createdAt:     Number(row.created_at),
    updatedAt:     Number(row.updated_at),
  };
}

/** List curated events. `state: null` spans every state. */
async function getEvents({ state = 'Lagos', all = false } = {}) {
  const where = [];
  const args  = [];
  if (state) { where.push('state = ?'); args.push(state); }
  if (!all)    where.push('published = 1');
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const rows = await rawAll(
    `SELECT * FROM events ${clause} ORDER BY sort_order, created_at`,
    args
  );
  return rows.map(parseEventRow);
}

async function upsertEvent(e) {
  const existing = await raw('SELECT id FROM events WHERE id = ?', [e.id]);
  if (existing) {
    await client.execute({
      sql: `UPDATE events SET
              name=?, tagline=?, description=?, category=?, location=?, event_date=?,
              image_id=?, color_fallback=?, price_min=?, price_max=?, price_note=?,
              ticket_url=?, state=?, published=?, sort_order=?, updated_at=unixepoch()
            WHERE id=?`,
      args: [
        e.name, e.tagline || '', e.description || '', e.category || 'other',
        e.location || '', e.eventDate || null,
        e.imageId || '', e.colorFallback || '#2F4A33',
        e.priceMin || 0, e.priceMax || 0, e.priceNote || null, e.ticketUrl || null,
        e.state || 'Lagos', e.published !== false ? 1 : 0, e.sortOrder || 0,
        e.id,
      ],
    });
  } else {
    await client.execute({
      sql: `INSERT INTO events
              (id, name, tagline, description, category, location, event_date,
               image_id, color_fallback, price_min, price_max, price_note, ticket_url,
               state, published, sort_order)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      args: [
        e.id, e.name, e.tagline || '', e.description || '', e.category || 'other',
        e.location || '', e.eventDate || null,
        e.imageId || '', e.colorFallback || '#2F4A33',
        e.priceMin || 0, e.priceMax || 0, e.priceNote || null, e.ticketUrl || null,
        e.state || 'Lagos', e.published !== false ? 1 : 0, e.sortOrder || 0,
      ],
    });
  }
  return raw('SELECT * FROM events WHERE id = ?', [e.id]).then(parseEventRow);
}

async function deleteEvent(id) {
  await client.execute({ sql: 'DELETE FROM events WHERE id = ?', args: [id] });
}

// ── Trip photo helpers ─────────────────────────────────────────────────────

async function insertTripImage({ id, mime, bytes }) {
  await client.execute({
    sql: 'INSERT INTO trip_images (id, mime, bytes, byte_size) VALUES (?, ?, ?, ?)',
    args: [id, mime, bytes, bytes.byteLength ?? bytes.length],
  });
}

/** Returns { mime, bytes } or null. Only ever called by the image endpoint. */
async function getTripImage(id) {
  const row = await raw('SELECT mime, bytes FROM trip_images WHERE id = ?', [id]);
  return row ? { mime: row.mime, bytes: row.bytes } : null;
}

async function deleteTripImage(id) {
  await client.execute({ sql: 'DELETE FROM trip_images WHERE id = ?', args: [id] });
}

/**
 * List curated trips. `state: null` spans every state — the admin uses that to
 * see the whole catalogue; Explore always passes one state.
 */
async function getExperiences({ state = 'Lagos', all = false } = {}) {
  const where = [];
  const args  = [];
  if (state) { where.push('state = ?'); args.push(state); }
  if (!all)    where.push('published = 1');
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const rows = await rawAll(
    `SELECT * FROM experiences ${clause} ORDER BY sort_order, created_at`,
    args
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

module.exports = {
  ready,
  raw,
  rawAll,
  parseExpRow,
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
  nightlifeVenues: { list: getNightlifeVenues, upsert: upsertNightlifeVenue, remove: deleteNightlifeVenue },
  events:          { list: getEvents,          upsert: upsertEvent,          remove: deleteEvent },
  tripImages:   { insert: insertTripImage, get: getTripImage, remove: deleteTripImage },
  users:        { upsert: upsertUser, get: getUser, plans: getUserPlans },
  participants: {
    insert: insertParticipant,
    get: getParticipants,
    getById: getParticipantById,
    getByRef: getParticipantByRef,
    updatePayment: updateParticipantPayment,
    markPaid: markParticipantPaid,
    markPaidById: markParticipantPaidById,
    stats: getParticipantStats,
  },
};
