const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'mysquadgo.db'));

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS waitlist (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    phone       TEXT NOT NULL,
    source      TEXT NOT NULL DEFAULT 'unknown',
    created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
    UNIQUE(phone, source)
  );

  CREATE TABLE IF NOT EXISTS conversations (
    phone       TEXT PRIMARY KEY,
    name        TEXT,
    state       TEXT NOT NULL DEFAULT 'idle',
    trip_id     TEXT,
    temp        TEXT NOT NULL DEFAULT '{}',
    updated_at  INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS trips (
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
  );

  CREATE TABLE IF NOT EXISTS members (
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
  );
`);

// ── Conversation helpers ───────────────────────────────────────────────────

const getConv = db.prepare('SELECT * FROM conversations WHERE phone = ?');
const upsertConv = db.prepare(`
  INSERT INTO conversations (phone, name, state, trip_id, temp)
  VALUES (@phone, @name, @state, @trip_id, @temp)
  ON CONFLICT(phone) DO UPDATE SET
    name       = COALESCE(@name, name),
    state      = @state,
    trip_id    = @trip_id,
    temp       = @temp,
    updated_at = unixepoch()
`);
const resetConv = db.prepare(`
  UPDATE conversations SET state = 'idle', trip_id = NULL, temp = '{}', updated_at = unixepoch()
  WHERE phone = ?
`);

// ── Trip helpers ───────────────────────────────────────────────────────────

const insertTrip = db.prepare(`
  INSERT INTO trips (id, organiser_phone) VALUES (@id, @organiser_phone)
`);
const getTrip = db.prepare('SELECT * FROM trips WHERE id = ?');
const getTripByOrganiser = db.prepare(
  'SELECT * FROM trips WHERE organiser_phone = ? ORDER BY created_at DESC LIMIT 1'
);
const getTripByGroup = db.prepare(
  'SELECT * FROM trips WHERE group_id = ? ORDER BY created_at DESC LIMIT 1'
);
const updateTrip = db.prepare(`
  UPDATE trips SET
    origin           = COALESCE(@origin, origin),
    destination      = COALESCE(@destination, destination),
    budget           = COALESCE(@budget, budget),
    days             = COALESCE(@days, days),
    squad_size       = COALESCE(@squad_size, squad_size),
    accommodation    = COALESCE(@accommodation, accommodation),
    date_flexibility = COALESCE(@date_flexibility, date_flexibility),
    specific_dates   = COALESCE(@specific_dates, specific_dates),
    dealbreakers     = COALESCE(@dealbreakers, dealbreakers),
    plan             = COALESCE(@plan, plan),
    selected_date    = COALESCE(@selected_date, selected_date),
    selected_hotel   = COALESCE(@selected_hotel, selected_hotel),
    group_id         = COALESCE(@group_id, group_id),
    status           = COALESCE(@status, status)
  WHERE id = @id
`);

// ── Member helpers ─────────────────────────────────────────────────────────

const insertMember = db.prepare(`
  INSERT OR IGNORE INTO members (id, trip_id, phone, name, amount)
  VALUES (@id, @trip_id, @phone, @name, @amount)
`);
const getMembersByTrip = db.prepare('SELECT * FROM members WHERE trip_id = ?');
const markPaid = db.prepare(`
  UPDATE members SET paid = 1, paid_at = unixepoch(), paystack_ref = @ref
  WHERE trip_id = @trip_id AND phone = @phone
`);
const updatePaystackUrl = db.prepare(`
  UPDATE members SET paystack_ref = @ref, paystack_url = @url
  WHERE trip_id = @trip_id AND phone = @phone
`);

// ── Waitlist helpers ───────────────────────────────────────────────────────

const insertWaitlist = db.prepare(`
  INSERT OR IGNORE INTO waitlist (phone, source) VALUES (@phone, @source)
`);
const listWaitlist = db.prepare('SELECT * FROM waitlist ORDER BY created_at DESC');

module.exports = {
  db,
  conv: { get: getConv, upsert: upsertConv, reset: resetConv },
  trips: { insert: insertTrip, get: getTrip, byOrganiser: getTripByOrganiser, byGroup: getTripByGroup, update: updateTrip },
  members: { insert: insertMember, byTrip: getMembersByTrip, markPaid, updateUrl: updatePaystackUrl },
  waitlist: { insert: insertWaitlist, list: listWaitlist },
};
