#!/usr/bin/env node
/**
 * Reseed the attractions table from the canonical SEED_DATA in attractions.js.
 *
 * This script DELETES all existing rows and re-inserts from the seed, so it
 * is safe to run any time the seed file is updated.
 *
 * Usage (run from project root):
 *   node backend/scripts/reseed-attractions.js
 *
 * Requires LIBSQL_URL and LIBSQL_AUTH_TOKEN in .env (or already set as env vars).
 * The script targets whatever DB those vars point to — local dev or Turso production.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const db = require('../db/client');
const { SEED_DATA } = require('../services/attractions');

async function run() {
  await db.ready;
  console.log('\n── Karije attractions reseed ──────────────────────────────────');

  // Count before
  const before = await db.raw('SELECT COUNT(*) AS n FROM attractions');
  console.log(`Rows before: ${before.n}`);

  // Wipe and re-insert
  await db.raw('DELETE FROM attractions');
  console.log('Deleted all existing rows.');

  let inserted = 0;
  const statesSeen = new Set();

  for (const [state, name, feeMin, feeMax, feeNote] of SEED_DATA) {
    await db.raw(
      `INSERT INTO attractions (state, name, fee_min, fee_max, fee_note)
       VALUES (?, ?, ?, ?, ?)`,
      [state, name, feeMin, feeMax, feeNote ?? null]
    );
    inserted++;
    statesSeen.add(state);
  }

  // Verify
  const after = await db.raw('SELECT COUNT(*) AS n FROM attractions');
  const byState = await db.rawAll(
    'SELECT state, COUNT(*) AS n FROM attractions GROUP BY state ORDER BY state'
  );

  console.log(`\nInserted: ${inserted} rows across ${statesSeen.size} states`);
  console.log(`Rows after: ${after.n}`);
  console.log('\nBreakdown per state:');
  byState.forEach(r => {
    const bar = '█'.repeat(r.n);
    console.log(`  ${r.state.padEnd(15)} ${String(r.n).padStart(2)}  ${bar}`);
  });

  console.log('\n✅  Done.\n');
  process.exit(0);
}

run().catch(err => {
  console.error('\n❌  Reseed failed:', err.message);
  process.exit(1);
});
