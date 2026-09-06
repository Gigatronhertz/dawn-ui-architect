#!/usr/bin/env node
/**
 * Import real Lagos places (italawa.com.ng scrape) into the `attractions`
 * table — the general venue library the AI planner and the "Build your own"
 * city planner both draw from.
 *
 * What this does, and deliberately does NOT do:
 *  - Adds new venues, and enriches already-existing ones (by name match)
 *    with a real photo/address/phone/maps-link/description. It never
 *    overwrites a fee_min/fee_max an admin has already set — this dataset
 *    has no price data at all, so touching fees here would only ever make
 *    things worse, not better. Pricing stays a manual admin task.
 *  - Skips editorial "best of" / listicle pages from the same scrape (their
 *    URL has no /place/ segment) — those are blog posts, not a real place
 *    with an address.
 *  - Skips exact-duplicate places (the scrape has a couple, e.g. two
 *    "Abeke Rooftop" rows) — keeps whichever copy has more data.
 *
 * Usage (run from project root):
 *   node backend/scripts/import-lagos-places.js [path/to/listings.json]
 *
 * Defaults to the path the data actually lives at on this machine. Images
 * referenced by local_image_filename are read from the same folder's
 * images/ subdirectory and uploaded into the trip_images blob store, the
 * same store every other admin-uploaded photo in this app already uses.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const fs   = require('fs');
const path = require('path');
const db   = require('../db/client');

const DEFAULT_JSON = 'C:\\Users\\richm\\.gemini\\antigravity\\scratch\\italawa_scraper\\output\\listings.json';
const jsonPath   = process.argv[2] || DEFAULT_JSON;
const imagesDir  = path.join(path.dirname(jsonPath), 'images');

const MIME_BY_EXT = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
};

/** GIGM-style "...NigeriaGet Directions" scrape artifact, always stuck on
 *  with no separating space — strip it wherever it lands. */
function cleanAddress(raw) {
  if (!raw) return null;
  const cleaned = raw.replace(/Get Directions\s*$/i, '').trim();
  return cleaned || null;
}

function cleanField(raw) {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  return (!trimmed || trimmed.toUpperCase() === 'N/A') ? null : trimmed;
}

/** Pick the richer of two scrape rows for the same place name. */
function richerOf(a, b) {
  const score = (r) => (r.image_url ? 2 : 0) + (r.description?.length > 40 ? 1 : 0) + (cleanField(r.phone_number) ? 1 : 0);
  return score(b) > score(a) ? b : a;
}

async function uploadImage(filename) {
  if (!filename || filename === 'no_image.jpg') return null;
  const filePath = path.join(imagesDir, filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`  ⚠ image file missing on disk: ${filename}`);
    return null;
  }
  const ext  = path.extname(filename).toLowerCase();
  const mime = MIME_BY_EXT[ext];
  if (!mime) {
    console.warn(`  ⚠ unrecognised image type, skipping: ${filename}`);
    return null;
  }
  const bytes = fs.readFileSync(filePath);
  const id = `img_${require('crypto').randomBytes(12).toString('hex')}`;
  await db.tripImages.insert({ id, mime, bytes });
  return id;
}

async function run() {
  await db.ready;
  console.log('\n── Karije Lagos places import ──────────────────────────────────');
  console.log(`Source: ${jsonPath}`);
  console.log(`Images: ${imagesDir}`);

  const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  console.log(`Loaded ${raw.length} scraped rows.`);

  // ── Filter to real venue pages, dedupe by name ──────────────────────────
  const byName = new Map();
  let skippedArticles = 0;
  for (const row of raw) {
    if (!row.url || !row.url.includes('/place/')) { skippedArticles++; continue; }
    const key = (row.title || '').trim().toLowerCase();
    if (!key) continue;
    byName.set(key, byName.has(key) ? richerOf(byName.get(key), row) : row);
  }
  const places = [...byName.values()];
  console.log(`Skipped ${skippedArticles} editorial/listicle pages.`);
  console.log(`${raw.length - skippedArticles - places.length} duplicate place rows merged.`);
  console.log(`${places.length} distinct places to import.`);

  // ── Existing Lagos attractions, so we enrich rather than double-insert ──
  const existing = await db.attractions.byState('Lagos');
  const existingByName = new Map(existing.map(r => [r.name.trim().toLowerCase(), r]));

  let inserted = 0, enriched = 0, imagesUploaded = 0, imagesMissing = 0;

  for (const p of places) {
    const imageId = await uploadImage(p.local_image_filename);
    if (imageId) imagesUploaded++; else if (p.image_url) imagesMissing++;

    const fields = {
      image_id:         imageId,
      address:          cleanAddress(p.location_address),
      phone:             cleanField(p.phone_number),
      google_maps_link: cleanField(p.google_maps_link),
      description:      cleanField(p.description),
      source_url:       cleanField(p.url),
    };

    const key = p.title.trim().toLowerCase();
    const match = existingByName.get(key);
    if (match) {
      await db.attractions.enrich(match.id, fields);
      enriched++;
    } else {
      await db.attractions.upsert({
        state: 'Lagos', name: p.title.trim(),
        fee_min: 0, fee_max: 0, fee_note: null,
        ...fields,
      });
      inserted++;
    }
  }

  console.log('\n✅  Done.');
  console.log(`  Inserted new: ${inserted}`);
  console.log(`  Enriched existing: ${enriched}`);
  console.log(`  Images uploaded: ${imagesUploaded}`);
  console.log(`  Images referenced but missing on disk: ${imagesMissing}`);
  console.log(`  Places with no fee data (all of them — set prices in /admin as needed): ${inserted + enriched}\n`);
  process.exit(0);
}

run().catch(err => {
  console.error('\n❌  Import failed:', err);
  process.exit(1);
});
