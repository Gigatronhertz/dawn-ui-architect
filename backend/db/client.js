const { createClient } = require('@libsql/client');
const { randomUUID } = require('crypto');
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
  // Every successful charge against a participant — the full share in one
  // shot, or a single monthly installment. Append-only and keyed unique on
  // Paystack's reference so a replayed webhook event is a no-op. "How much
  // has this person actually paid" is always SUM(amount) over this table,
  // never a separately-maintained counter that could drift — same philosophy
  // as ledger.js's own derived-not-stored balances.
  `CREATE TABLE IF NOT EXISTS participant_payments (
    id             TEXT PRIMARY KEY,
    participant_id TEXT NOT NULL,
    trip_id        TEXT NOT NULL,
    amount         INTEGER NOT NULL,
    reference      TEXT NOT NULL UNIQUE,
    created_at     INTEGER NOT NULL DEFAULT (unixepoch())
  )`,
  // Every charge attempt against an agency's ₦10k/month subscription —
  // success or failure. Append-only, same shape as payouts/participant_payments,
  // so an agency (and admin) gets a real billing history without anything
  // separately maintaining a running total.
  `CREATE TABLE IF NOT EXISTS subscription_charges (
    id         TEXT PRIMARY KEY,
    agent_id   TEXT NOT NULL,
    amount     INTEGER NOT NULL,
    reference  TEXT NOT NULL UNIQUE,
    status     TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
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
  // Phase 15 — the attractions table started as a bare name+fee price sheet
  // for the AI planner; a real Lagos places import (Sept 2026) needs it to
  // carry a photo and contact details too, same as any other venue.
  `ALTER TABLE attractions ADD COLUMN image_id         TEXT`,
  `ALTER TABLE attractions ADD COLUMN address          TEXT`,
  `ALTER TABLE attractions ADD COLUMN phone            TEXT`,
  `ALTER TABLE attractions ADD COLUMN google_maps_link TEXT`,
  `ALTER TABLE attractions ADD COLUMN description      TEXT`,
  `ALTER TABLE attractions ADD COLUMN source_url       TEXT`,
  // Phase 16 — the Pro dashboard needed a way to get a finished trip out of
  // the working list without touching `status` (which every join/pay/view
  // route gates on — repurposing it to mean "done" would have locked
  // travellers out of a plan they already paid into). completed_at is
  // deliberately a separate, purely organisational flag the agency sets
  // themselves; nothing else in the app reads it. view_count is a plain
  // counter bumped every time the public share link is opened, so "how many
  // people have even looked at this" stops being a guess.
  `ALTER TABLE trips ADD COLUMN completed_at INTEGER`,
  `ALTER TABLE trips ADD COLUMN view_count   INTEGER NOT NULL DEFAULT 0`,
  // Phase 17 — same "notify me when it's ready" opt-in as notify_email, for
  // WhatsApp. Separate column rather than reusing notify_email's slot since
  // someone may give one, the other, or both.
  `ALTER TABLE trips ADD COLUMN notify_wa TEXT`,
  // Phase 18 — agency verification. An agency's trips only surface publicly
  // once verification_status is 'verified' (checked in /api/listings) — the
  // actual document review happens off-platform, this just records the
  // outcome. id_document_image_id / business_doc_image_id point into
  // trip_images (the existing blob store) but are served through a separate,
  // admin-key-gated route rather than the public /api/trip-image/:id one —
  // unlike a logo or trip photo, an ID/passport scan is not meant to be public.
  `ALTER TABLE agents ADD COLUMN verification_status  TEXT NOT NULL DEFAULT 'pending'`,
  `ALTER TABLE agents ADD COLUMN nin                  TEXT`,
  `ALTER TABLE agents ADD COLUMN id_document_image_id TEXT`,
  `ALTER TABLE agents ADD COLUMN business_doc_image_id TEXT`,
  `ALTER TABLE agents ADD COLUMN social_links         TEXT`,
  `ALTER TABLE agents ADD COLUMN verified_at          INTEGER`,
  // Phase 19 — held-and-released payments. An agency's own saved bank
  // details, copied onto each new trip at creation time (see trips.payout_*
  // below) so a later bank-detail change never retroactively moves where an
  // in-flight trip's money goes — same snapshot pattern as
  // service_fee_per_person.
  `ALTER TABLE agents ADD COLUMN payout_bank_code    TEXT`,
  `ALTER TABLE agents ADD COLUMN payout_account_no   TEXT`,
  `ALTER TABLE agents ADD COLUMN payout_account_name TEXT`,
  // Phase 20 — monthly installment payments on pro trips. A participant can
  // commit to paying their share over several months instead of one lump
  // sum; next_due_at is when their next installment/reminder is due, reset
  // forward ~30 days each time recordParticipantPayment credits one.
  // "Money paid so far" is deliberately not a column here — it's always
  // SUM(participant_payments.amount), which can't drift out of sync.
  `ALTER TABLE participants ADD COLUMN payment_plan       TEXT NOT NULL DEFAULT 'full'`,
  `ALTER TABLE participants ADD COLUMN installment_months INTEGER`,
  `ALTER TABLE participants ADD COLUMN next_due_at        INTEGER`,
  // An agency's installment subscribers get one periodic digest rather than
  // a message per trip per subscriber — this is when that last went out.
  `ALTER TABLE agents ADD COLUMN last_installment_digest_at INTEGER`,
  // Phase 21 — not every agency trip supports installments; the trip's own
  // creator opts in and sets the guardrails. min_months is floored at 2 by
  // every route that reads it (one month can't be split monthly), and
  // min_amount protects an agency from a plan so long-dated the monthly
  // charge becomes too small to be worth collecting.
  `ALTER TABLE trips ADD COLUMN installments_enabled    INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE trips ADD COLUMN installment_min_months  INTEGER NOT NULL DEFAULT 2`,
  `ALTER TABLE trips ADD COLUMN installment_max_months  INTEGER NOT NULL DEFAULT 12`,
  `ALTER TABLE trips ADD COLUMN installment_min_amount  INTEGER`,
  // Phase 22 — ₦10,000/month agency subscription billing. DEFAULT 'exempt'
  // is deliberate, not just a placeholder: SQLite backfills it onto every
  // row that already exists the moment this column is added, which is
  // exactly the grandfather clause every currently-onboarded agency needs —
  // nobody gets surprise-billed. New agencies land here too; nothing flips
  // an agency to 'active' implicitly — only the agency's own "Add billing"
  // card-capture flow, or an explicit admin override, ever does that.
  `ALTER TABLE agents ADD COLUMN subscription_status TEXT NOT NULL DEFAULT 'exempt'`,
  `ALTER TABLE agents ADD COLUMN subscription_authorization_code TEXT`,
  `ALTER TABLE agents ADD COLUMN subscription_next_charge_at INTEGER`,
  `ALTER TABLE agents ADD COLUMN subscription_failed_attempts INTEGER NOT NULL DEFAULT 0`,
];

const ready = (async () => {
  for (const sql of SCHEMA) await client.execute(sql);
  for (const sql of MIGRATIONS) {
    try { await client.execute(sql); } catch (_) { /* column already exists — safe to ignore */ }
  }
  // Backfill participant_payments for anyone who paid before this table
  // existed — ledger.js's `collected` now reads from here exclusively, so
  // without this, every already-paid trip would suddenly show ₦0 collected.
  // Synthetic, deterministic reference per participant, so this is safe to
  // run on every boot — INSERT OR IGNORE just no-ops once backfilled.
  {
    const unbacked = await client.execute(
      `SELECT id, trip_id, amount, paid_at, created_at FROM participants
        WHERE paid = 1 AND amount IS NOT NULL AND amount > 0
          AND id NOT IN (SELECT DISTINCT participant_id FROM participant_payments)`
    );
    for (const p of unbacked.rows) {
      await client.execute({
        sql: `INSERT OR IGNORE INTO participant_payments (id, participant_id, trip_id, amount, reference, created_at)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [
          randomUUID(), p.id, p.trip_id, p.amount, `BACKFILL-${p.id}`,
          p.paid_at || p.created_at || Math.floor(Date.now() / 1000),
        ],
      });
    }
    if (unbacked.rows.length) {
      console.log(`[db] Backfilled ${unbacked.rows.length} participant_payments row(s) from already-paid participants`);
    }
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
    // Backfill photos onto rows seeded before imageId was added to this file.
    // INSERT OR IGNORE above only fires for a row that doesn't exist yet, so
    // an install that already had these demo rows never picked up the photos
    // added later. Scoped to "still has no photo" so an admin's own edit —
    // including deliberately clearing a photo — is never overwritten.
    for (const v of NIGHTLIFE_SEED) {
      if (!v.imageId) continue;
      await client.execute({
        sql: `UPDATE nightlife_venues SET image_id = ? WHERE id = ? AND (image_id IS NULL OR image_id = '')`,
        args: [v.imageId, v.id],
      });
    }
    for (const e of EVENTS_SEED) {
      if (!e.imageId) continue;
      await client.execute({
        sql: `UPDATE events SET image_id = ? WHERE id = ? AND (image_id IS NULL OR image_id = '')`,
        args: [e.imageId, e.id],
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

/**
 * `source` is a free-text tag set by whoever calls POST /api/waitlist — the
 * event registration page passes `event:<eventId>`, so filtering by exact
 * source doubles as "who registered interest for this one event" with no
 * extra table.
 */
async function listWaitlist({ source } = {}) {
  if (source) {
    const res = await client.execute({
      sql: 'SELECT * FROM waitlist WHERE source = ? ORDER BY created_at DESC',
      args: [source],
    });
    return res.rows;
  }
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
async function upsertAttraction({
  id, state, name, fee_min, fee_max, fee_note,
  image_id, address, phone, google_maps_link, description, source_url,
}) {
  const args = [
    state, name, Number(fee_min) || 0, Number(fee_max) || 0, fee_note || null,
    image_id || null, address || null, phone || null, google_maps_link || null,
    description || null, source_url || null,
  ];
  if (id) {
    await client.execute({
      sql: `UPDATE attractions SET
              state=?, name=?, fee_min=?, fee_max=?, fee_note=?,
              image_id=?, address=?, phone=?, google_maps_link=?, description=?, source_url=?
            WHERE id=?`,
      args: [...args, id],
    });
    return getAttraction(id);
  }
  const res = await client.execute({
    sql: `INSERT INTO attractions
            (state, name, fee_min, fee_max, fee_note,
             image_id, address, phone, google_maps_link, description, source_url)
          VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    args,
  });
  return getAttraction(Number(res.lastInsertRowid));
}

/**
 * Add the new fields (image/address/phone/etc.) onto an existing attraction
 * without touching its price — used by the bulk places import so re-running
 * it never clobbers a fee an admin already researched and set by hand.
 */
async function enrichAttraction(id, { image_id, address, phone, google_maps_link, description, source_url }) {
  await client.execute({
    sql: `UPDATE attractions SET
            image_id         = COALESCE(?, image_id),
            address          = COALESCE(?, address),
            phone            = COALESCE(?, phone),
            google_maps_link = COALESCE(?, google_maps_link),
            description      = COALESCE(?, description),
            source_url       = COALESCE(?, source_url)
          WHERE id = ?`,
    args: [image_id || null, address || null, phone || null, google_maps_link || null, description || null, source_url || null, id],
  });
  return getAttraction(id);
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

/** Look up an agent by its own id (agent_<phone>). */
async function getAgentById(id) {
  const res = await client.execute({ sql: 'SELECT * FROM agents WHERE id = ?', args: [id] });
  return res.rows[0] ?? null;
}

/** Every agency, newest first — the admin "Agencies" panel's list. */
async function listAgents() {
  const res = await client.execute('SELECT * FROM agents ORDER BY created_at DESC');
  return res.rows;
}

/** Sets an agency's verification outcome and the documents it was checked
 *  against. Called from the admin panel only — see adminRoutes.js. */
async function updateAgentVerification({ id, status, nin, idDocumentImageId, businessDocImageId, socialLinks }) {
  await client.execute({
    sql: `UPDATE agents SET
            verification_status   = ?,
            nin                   = COALESCE(?, nin),
            id_document_image_id  = COALESCE(?, id_document_image_id),
            business_doc_image_id = COALESCE(?, business_doc_image_id),
            social_links          = COALESCE(?, social_links),
            verified_at           = CASE WHEN ? = 'verified' THEN unixepoch() ELSE verified_at END
          WHERE id = ?`,
    args: [status, nin ?? null, idDocumentImageId ?? null, businessDocImageId ?? null, socialLinks ?? null, status, id],
  });
}

/** An agency submitting or updating its own KYC info — NIN, social links,
 *  and (separately, per document) the uploaded images. Deliberately never
 *  touches verification_status except the one case where a rejected agency
 *  re-submits a document, which reopens it to 'pending' — an agency can
 *  never set itself to 'verified'; only the admin route does that. */
async function updateAgentSelfVerification({ id, nin, idDocumentImageId, businessDocImageId, socialLinks, resetIfRejected }) {
  await client.execute({
    sql: `UPDATE agents SET
            nin                   = COALESCE(?, nin),
            id_document_image_id  = COALESCE(?, id_document_image_id),
            business_doc_image_id = COALESCE(?, business_doc_image_id),
            social_links          = COALESCE(?, social_links),
            verification_status   = CASE WHEN ? = 1 AND verification_status = 'rejected' THEN 'pending' ELSE verification_status END
          WHERE id = ?`,
    args: [nin ?? null, idDocumentImageId ?? null, businessDocImageId ?? null, socialLinks ?? null, resetIfRejected ? 1 : 0, id],
  });
}

/** An agency's own saved payout account — the default copied onto each new
 *  trip at creation time (see routes/api.js createAgencyTrip). */
async function updateAgentPayout({ id, bankCode, accountNo, accountName }) {
  await client.execute({
    sql: `UPDATE agents SET payout_bank_code = ?, payout_account_no = ?, payout_account_name = ? WHERE id = ?`,
    args: [bankCode || null, accountNo || null, accountName || null, id],
  });
}

// ── Subscription billing ───────────────────────────────────────────────────

const SUBSCRIPTION_INTERVAL_SECONDS = 30 * 24 * 60 * 60;

/** Called once a card-capture charge succeeds — the agency's first ever
 *  subscription payment. Starts the monthly clock from here. */
async function activateAgentSubscription({ id, authorizationCode }) {
  await client.execute({
    sql: `UPDATE agents SET
            subscription_status              = 'active',
            subscription_authorization_code  = ?,
            subscription_next_charge_at      = unixepoch() + ${SUBSCRIPTION_INTERVAL_SECONDS},
            subscription_failed_attempts     = 0
          WHERE id = ?`,
    args: [authorizationCode, id],
  });
}

/** Records one successful charge attempt against the running billing
 *  history. Idempotent on reference, same as participant_payments — a
 *  replayed webhook event for a charge already recorded is a no-op. */
async function recordSubscriptionCharge({ agentId, amount, reference, status }) {
  const insert = await client.execute({
    sql: `INSERT OR IGNORE INTO subscription_charges (id, agent_id, amount, reference, status, created_at)
          VALUES (?, ?, ?, ?, ?, unixepoch())`,
    args: [randomUUID(), agentId, amount, reference, status],
  });
  return !!insert.rowsAffected;
}

/**
 * Credits one successful charge — the first-ever card-capture charge and
 * every later recurring one are handled identically here. Reuses
 * `activateAgentSubscription` for both: re-storing the same authorization
 * code on a recurring charge is harmless (it's always the same code being
 * charged again), and either way the effect wanted is the same — active,
 * clock advanced a month, failure streak cleared.
 *
 * A recurring charge can be confirmed from two directions — the cron's own
 * synchronous `charge_authorization` response, and Paystack's async
 * `charge.success` webhook for the same event — so this has to tolerate
 * being called twice for one real charge. The reference-keyed insert above
 * is what makes that safe: only a genuinely new reference advances the
 * clock, a replay is a no-op.
 */
async function creditSubscriptionCharge({ agentId, authorizationCode, amount, reference }) {
  const credited = await recordSubscriptionCharge({ agentId, amount, reference, status: 'success' });
  if (credited) await activateAgentSubscription({ id: agentId, authorizationCode });
  return credited;
}

/**
 * A recurring charge failed. First failure moves the agency to `past_due`
 * and schedules a retry a few days out (matching the escalating cadence
 * `reminders.js` already uses for one-time payments); the third failure
 * gives up and suspends — which is the only status that actually delists a
 * trip (see GET /api/listings, GET /api/agencies). Nothing here ever
 * touches a trip's collected money or its payout — that's a fully separate
 * system.
 */
const SUBSCRIPTION_RETRY_STEPS = [3 * 24 * 60 * 60, 7 * 24 * 60 * 60]; // +3d, +7d after the first failure
async function markSubscriptionFailed(agentId) {
  const agent = await getAgentById(agentId);
  const attempts = Number(agent?.subscription_failed_attempts || 0) + 1;
  const suspended = attempts > SUBSCRIPTION_RETRY_STEPS.length;
  // Bound parameters are literal values, not SQL — the retry offset has to
  // be resolved to an actual timestamp in JS before it goes in args.
  const nextChargeAt = suspended
    ? null
    : Math.floor(Date.now() / 1000) + SUBSCRIPTION_RETRY_STEPS[attempts - 1];

  await client.execute({
    sql: `UPDATE agents SET
            subscription_status          = ?,
            subscription_failed_attempts = ?,
            subscription_next_charge_at  = ?
          WHERE id = ?`,
    args: [suspended ? 'suspended' : 'past_due', attempts, nextChargeAt, agentId],
  });
  return { attempts, suspended };
}

/** Agencies whose next subscription charge is due right now. `exempt` and
 *  `suspended` agencies are never picked up — exempt because they're not
 *  billed at all, suspended because retries are already exhausted and the
 *  agency needs to re-run billing setup with a new card to restart. */
async function findDueSubscriptions() {
  const res = await client.execute(
    `SELECT * FROM agents
      WHERE subscription_status IN ('active', 'past_due')
        AND subscription_next_charge_at IS NOT NULL
        AND subscription_next_charge_at <= unixepoch()`
  );
  return res.rows;
}

/** One agency's billing history, most recent first. */
async function getSubscriptionCharges(agentId) {
  const res = await client.execute({
    sql: `SELECT amount, reference, status, created_at FROM subscription_charges
           WHERE agent_id = ? ORDER BY created_at DESC`,
    args: [agentId],
  });
  return res.rows;
}

/** Admin override — the grandfather-clause lever: flip a pilot agency to
 *  `active` when it's time to actually start billing them, or manually
 *  reset a suspended one back to exempt/active after they've sorted their
 *  card out some other way. Never sets a next_charge_at itself; that only
 *  ever comes from a real successful card-capture charge. */
async function setAgentSubscriptionStatus({ id, status }) {
  await client.execute({
    sql: `UPDATE agents SET subscription_status = ? WHERE id = ?`,
    args: [status, id],
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
      t.completed_at, t.view_count,
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

// ── Installment payments ───────────────────────────────────────────────────

const INSTALLMENT_INTERVAL_SECONDS = 30 * 24 * 60 * 60;

/** Puts a participant on a monthly installment plan instead of a one-shot
 *  payment. `amount` is the full target (their share, read live off the
 *  trip's plan at subscribe time); the per-month figure is computed by the
 *  caller and charged by whatever route mints the next Paystack link — it is
 *  not stored separately. First installment is due immediately. */
async function subscribeParticipantInstallment({ id, amount, months }) {
  await client.execute({
    sql: `UPDATE participants SET
            payment_plan       = 'installment',
            amount              = ?,
            installment_months  = ?,
            next_due_at         = unixepoch(),
            reminders_sent      = 0,
            last_reminded_at    = NULL
          WHERE id = ?`,
    args: [amount, months, id],
  });
}

/** Total actually received from a participant, across every charge —
 *  one lump sum, or however many installments have landed so far. */
async function getParticipantPaidTotal(id) {
  const res = await client.execute({
    sql: 'SELECT COALESCE(SUM(amount), 0) AS total FROM participant_payments WHERE participant_id = ?',
    args: [id],
  });
  return Number(res.rows[0]?.total ?? 0);
}

/** Every charge on record for a participant, most recent first — the
 *  "breakdown" a subscriber or their agency actually wants to see. */
async function getParticipantPayments(id) {
  const res = await client.execute({
    sql: 'SELECT amount, reference, created_at FROM participant_payments WHERE participant_id = ? ORDER BY created_at DESC',
    args: [id],
  });
  return res.rows;
}

/**
 * Records one successful charge — the full share in one go, or a single
 * monthly installment; the two are indistinguishable to this function. Keyed
 * unique on Paystack's reference, so a replayed webhook event is a no-op
 * (returns `credited: false`). Flips `paid=1` the moment the running total
 * reaches the participant's target, whichever plan got them there; otherwise,
 * for an installment participant, pushes their next due date forward ~30
 * days and resets the reminder-escalation counters for the new cycle.
 */
async function recordParticipantPayment({ id, tripId, amount, reference }) {
  const insert = await client.execute({
    sql: `INSERT OR IGNORE INTO participant_payments (id, participant_id, trip_id, amount, reference, created_at)
          VALUES (?, ?, ?, ?, ?, unixepoch())`,
    args: [randomUUID(), id, tripId, amount, reference],
  });
  if (!insert.rowsAffected) return { credited: false, paid: false, paidTotal: null };

  const participant = await getParticipantById(id);
  const paidTotal    = await getParticipantPaidTotal(id);
  const target       = Number(participant?.amount ?? 0);
  const fullyPaid     = target > 0 && paidTotal >= target;

  if (fullyPaid) {
    await client.execute({
      sql: 'UPDATE participants SET paid=1, paid_at=unixepoch() WHERE id=?',
      args: [id],
    });
  } else if (participant?.payment_plan === 'installment') {
    await client.execute({
      sql: `UPDATE participants SET
              next_due_at      = unixepoch() + ${INSTALLMENT_INTERVAL_SECONDS},
              reminders_sent   = 0,
              last_reminded_at = NULL
            WHERE id = ?`,
      args: [id],
    });
  }

  return { credited: true, paid: fullyPaid, paidTotal };
}

/** What a freshly-minted Paystack transaction should charge this participant
 *  right now — the full share for a one-shot payer, or the next installment
 *  (or whatever's left, if that's smaller) for someone on a monthly plan.
 *  Also returns the target `amount` that belongs on the participant row —
 *  for a one-shot payer that isn't known until now either, since `amount`
 *  is otherwise only ever set at payment-mint time. Shared by both places
 *  that mint a checkout link (`GET /pay/:id` and `POST .../pay`) so the two
 *  never drift apart on how a charge is sized. */
async function computeParticipantCharge(participant, fallbackFullAmount, { payInFull = false } = {}) {
  if (participant.payment_plan === 'installment') {
    const target     = Number(participant.amount) || 0;
    const months     = Number(participant.installment_months) || 1;
    const paidSoFar  = await getParticipantPaidTotal(participant.id);
    const remaining  = Math.max(0, target - paidSoFar);
    // Someone on a plan can always choose to settle the rest in one go
    // instead of waiting out the remaining months.
    if (payInFull) return { targetAmount: target, chargeAmount: remaining };
    const installment = Math.ceil(target / months);
    return { targetAmount: target, chargeAmount: Math.min(installment, remaining) };
  }
  const target = Number(fallbackFullAmount) || 0;
  return { targetAmount: target, chargeAmount: target };
}

/** Installment participants whose next payment/reminder is due — joined with
 *  enough trip info to compose the reminder copy. Mirrors the status filter
 *  reminders.js already uses for one-time payments. */
async function findDueInstallments() {
  const res = await client.execute(
    `SELECT p.*, t.title, t.destination, t.selected_date, t.agent_id, t.status AS trip_status, t.plan
       FROM participants p
       JOIN trips t ON t.id = p.trip_id
      WHERE p.payment_plan = 'installment'
        AND p.paid = 0
        AND p.next_due_at IS NOT NULL
        AND p.next_due_at <= unixepoch()
        AND t.status IN ('curated', 'custom', 'awaiting_group', 'active')`
  );
  return res.rows;
}

/** Agencies with at least one installment subscriber whose digest is due —
 *  more than ~30 days since the last one, or never sent. */
async function listAgentsDueInstallmentDigest() {
  const res = await client.execute(
    `SELECT DISTINCT a.*
       FROM agents a
       JOIN trips t ON t.agent_id = a.id
       JOIN participants p ON p.trip_id = t.id
      WHERE p.payment_plan = 'installment'
        AND (a.last_installment_digest_at IS NULL
             OR a.last_installment_digest_at <= unixepoch() - ${INSTALLMENT_INTERVAL_SECONDS})`
  );
  return res.rows;
}

/** Every installment subscriber on a given agency's trips, with trip context
 *  — what sendInstallmentDigests() groups per trip for the agency email. */
async function getAgentInstallmentSubscribers(agentId) {
  const res = await client.execute({
    sql: `SELECT p.id, p.name, p.amount, p.installment_months, p.next_due_at,
                 t.id AS trip_id, t.title, t.destination
            FROM participants p
            JOIN trips t ON t.id = p.trip_id
           WHERE t.agent_id = ? AND p.payment_plan = 'installment'
        ORDER BY t.id, p.created_at ASC`,
    args: [agentId],
  });
  return res.rows;
}

async function markInstallmentDigestSent(agentId) {
  await client.execute({
    sql: 'UPDATE agents SET last_installment_digest_at = unixepoch() WHERE id = ?',
    args: [agentId],
  });
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

/** Single event by id, any state — the standalone event page doesn't know
 *  the state up front, only the id from the URL. */
async function getEventById(id) {
  const row = await raw('SELECT * FROM events WHERE id = ?', [id]);
  return row ? parseEventRow(row) : null;
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
    getById:       getAgentById,
    list:          listAgents,
    dashboard:     getAgentDashboard,
    linkToUser:    linkAgentToUser,
    getByUser:     getAgentByUser,
    getByEmail:    getAgentByEmail,
    dashboardByUser: getAgentDashboardByUser,
    updateVerification: updateAgentVerification,
    updateSelfVerification: updateAgentSelfVerification,
    updatePayout:       updateAgentPayout,
    creditSubscriptionCharge: creditSubscriptionCharge,
    markSubscriptionFailed:   markSubscriptionFailed,
    dueSubscriptions:         findDueSubscriptions,
    subscriptionCharges:      getSubscriptionCharges,
    setSubscriptionStatus:    setAgentSubscriptionStatus,
  },
  attractions:  {
    byState:     getAttractionsByState,
    stateCounts: getAttractionStateCounts,
    get:         getAttraction,
    upsert:      upsertAttraction,
    enrich:      enrichAttraction,
    remove:      deleteAttraction,
  },
  experiences:  { list: getExperiences, upsert: upsertExperience },
  nightlifeVenues: { list: getNightlifeVenues, upsert: upsertNightlifeVenue, remove: deleteNightlifeVenue },
  events:          { list: getEvents, get: getEventById, upsert: upsertEvent, remove: deleteEvent },
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
    subscribeInstallment: subscribeParticipantInstallment,
    recordPayment: recordParticipantPayment,
    paidTotal: getParticipantPaidTotal,
    payments: getParticipantPayments,
    dueInstallments: findDueInstallments,
    computeCharge: computeParticipantCharge,
  },
  installmentDigests: {
    dueAgents:   listAgentsDueInstallmentDigest,
    subscribers: getAgentInstallmentSubscribers,
    markSent:    markInstallmentDigestSent,
  },
};
