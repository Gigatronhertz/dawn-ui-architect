/**
 * Google Travel scraper — hotels, vacation rentals, flights
 * Uses puppeteer-extra + stealth plugin to bypass bot detection.
 *
 * Gracefully non-fatal: if Chrome isn't available every function returns []/null
 * so the rest of the Gemini pipeline still works.
 *
 * Env vars:
 *   PUPPETEER_EXECUTABLE_PATH  — path to Chrome/Chromium binary (required on Render)
 *
 * Local Windows dev: chrome-headless-shell is auto-detected from the Puppeteer cache.
 * Render / Linux: set PUPPETEER_EXECUTABLE_PATH to the Chrome binary path.
 */

const puppeteer = require('puppeteer-extra');
const Stealth = require('puppeteer-extra-plugin-stealth');
puppeteer.use(Stealth());

const fs = require('fs');
const path = require('path');

// ── Chrome path resolution ────────────────────────────────────────────────────

function findChrome() {
  // 1. Explicit env var always wins
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH;

  // 2. Path saved by the postinstall script (most reliable on Render)
  try {
    const saved = fs.readFileSync(path.join(__dirname, '../.chrome-path'), 'utf8').trim();
    if (saved && fs.existsSync(saved)) return saved;
  } catch {}

  // 3. Ask puppeteer directly where it put Chrome
  try {
    const pup = require('puppeteer');
    const exe = typeof pup.executablePath === 'function' ? pup.executablePath() : null;
    if (exe && fs.existsSync(exe)) return exe;
  } catch {}

  // 3. Scan Puppeteer cache dirs — check PUPPETEER_CACHE_DIR first (Render sets this),
  //    then fall back to the default ~/.cache/puppeteer (local dev).
  const cacheDirs = [
    process.env.PUPPETEER_CACHE_DIR,
    path.join(process.env.USERPROFILE || process.env.HOME || '', '.cache', 'puppeteer'),
  ].filter(Boolean);

  for (const cacheBase of cacheDirs) {
    for (const shell of ['chrome-headless-shell', 'chrome']) {
      const shellDir = path.join(cacheBase, shell);
      if (!fs.existsSync(shellDir)) continue;
      const versions = fs.readdirSync(shellDir).sort().reverse();
      for (const ver of versions) {
        const candidates = [
          path.join(shellDir, ver, `${shell}-win64`, `${shell}.exe`),
          path.join(shellDir, ver, `${shell}-win64`, 'chrome.exe'),
          path.join(shellDir, ver, `${shell}-linux64`, shell),
          path.join(shellDir, ver, `${shell}-linux64`, 'chrome'),
        ];
        const found = candidates.find(p => fs.existsSync(p));
        if (found) return found;
      }
    }
  }

  // 4. System Chrome on Linux (Render / Ubuntu fallback)
  for (const p of ['/usr/bin/google-chrome-stable', '/usr/bin/google-chrome', '/usr/bin/chromium-browser', '/usr/bin/chromium']) {
    if (fs.existsSync(p)) return p;
  }

  return null;
}

const CHROME = findChrome();
if (CHROME) {
  console.log('[googleTravel] Chrome found:', CHROME);
} else {
  console.warn('[googleTravel] No Chrome found — Google Travel scraping disabled.');
  console.warn('  PUPPETEER_CACHE_DIR:', process.env.PUPPETEER_CACHE_DIR || '(not set)');
  console.warn('  HOME:', process.env.HOME || '(not set)');
  console.warn('  Set PUPPETEER_EXECUTABLE_PATH to the Chrome binary path to enable scraping.');
}

// ── Browser singleton ─────────────────────────────────────────────────────────

let _browser = null;
let _consentAccepted = false;

async function getBrowser() {
  if (!CHROME) throw new Error('No Chrome executable');
  if (!_browser || !_browser.isConnected()) {
    _browser = await puppeteer.launch({
      executablePath: CHROME,
      headless: true,
      args: [
        '--no-sandbox', '--disable-setuid-sandbox',
        '--disable-dev-shm-usage', '--disable-gpu',
        '--disable-extensions',
      ],
    });
  }
  return _browser;
}

async function newPage() {
  const browser = await getBrowser();
  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  );
  return page;
}

async function handleConsent(page) {
  if (_consentAccepted) return;
  await new Promise(r => setTimeout(r, 2000));
  const btn = await page.$('button[aria-label="Accept all"], form[action*="consent"] button:last-child');
  if (btn) {
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {}),
      btn.click(),
    ]);
    await new Promise(r => setTimeout(r, 3000));
    _consentAccepted = true;
  }
}

// ── Hotel parser ──────────────────────────────────────────────────────────────

const BADGE_WORDS = new Set(['GREAT DEAL', 'DEAL', 'GREAT PRICE', 'SPONSORED', 'SALE', 'NEW']);

function parseHotelLines(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const hotels = [];

  for (let i = 1; i < lines.length; i++) {
    // Price line: "₦268,000" or "Avg ₦268,000"
    const priceMatch = lines[i].match(/^(?:Avg\s+)?₦([\d,]+)$/);
    if (!priceMatch) continue;

    const price = parseInt(priceMatch[1].replace(/,/g, ''), 10);
    if (price < 1000 || price > 50000000) continue;

    // Walk back to find name — skip badge lines
    let nameIdx = i - 1;
    let deal = null;
    while (nameIdx >= 0 && BADGE_WORDS.has(lines[nameIdx])) {
      if (!deal && (lines[nameIdx] === 'GREAT DEAL' || lines[nameIdx] === 'DEAL' || lines[nameIdx] === 'GREAT PRICE')) {
        deal = lines[nameIdx];
      }
      nameIdx--;
    }
    const name = lines[nameIdx];
    if (!name || name.length < 3 || /₦|NGN|\d{4,}|Skip|Sign in|Filter|Sort|All filter/.test(name)) continue;
    if (BADGE_WORDS.has(name)) continue;

    // Scan forward for metadata
    let rating = null, reviews = null, stars = null, amenities = [], location = null;
    for (let j = i + 1; j < Math.min(i + 20, lines.length); j++) {
      const l = lines[j];
      if (!rating && /^\d\.\d$/.test(l)) { rating = parseFloat(l); continue; }
      if (!reviews && /^\([\d,.]+[KM]?\)$/.test(l)) { reviews = l.replace(/[()]/g, ''); continue; }
      // "4-star hotel" or "4 stars"
      if (!stars) {
        const sm = l.match(/^(\d)[- ]star/i);
        if (sm) { stars = parseInt(sm[1]); continue; }
      }
      if (!location && l.startsWith('·')) { location = l.replace(/^·\s*/, ''); continue; }
      const amenMatch = l.match(/^Amenities for .+?\.: (.+)$/);
      if (amenMatch) {
        amenities = amenMatch[1].split(', ').map(a => a.replace(/,$/, '')).filter(Boolean);
        break;
      }
      if (/^₦[\d,]+$/.test(lines[j + 1])) break;
    }

    if (!hotels.find(h => h.name === name)) {
      hotels.push({ name, pricePerNight: price, rating, reviews, stars, deal, amenities, location });
    }
  }

  return hotels.slice(0, 8);
}

// ── Vacation rental parser ────────────────────────────────────────────────────

function parseRentalLines(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const rentals = [];

  for (let i = 1; i < lines.length; i++) {
    const priceMatch = lines[i].match(/^(?:Avg\s+)?₦([\d,]+)$/);
    if (!priceMatch) continue;

    const price = parseInt(priceMatch[1].replace(/,/g, ''), 10);
    if (price < 1000) continue;

    const name = lines[i - 1];
    if (!name || name.length < 3 || /₦|Skip|Sign in/.test(name)) continue;

    let type = null, sleeps = null, bedrooms = null, bathrooms = null, amenities = [];
    const amenLine = lines[i + 1] || '';
    const amenMatch = amenLine.match(/^Amenities for .+?\.: (.+)$/);
    if (amenMatch) {
      const parts = amenMatch[1].split(', ').map(a => a.replace(/,$/, ''));
      type = parts.find(p => /Apartment|House|Villa|Condo|Studio|Loft/i.test(p)) || null;
      const s = parts.find(p => /^Sleeps/i.test(p));
      if (s) sleeps = parseInt(s.replace(/\D/g, ''));
      const b = parts.find(p => /bedroom/i.test(p));
      if (b) bedrooms = parseInt(b.replace(/\D/g, ''));
      const ba = parts.find(p => /bathroom/i.test(p));
      if (ba) bathrooms = parseInt(ba.replace(/\D/g, ''));
      amenities = parts.filter(p =>
        !/^(Sleeps|Apartment|House|Villa|Condo|Studio|\d+ bed|\d+ bath)/i.test(p)
      ).slice(0, 5);
    }

    if (!rentals.find(r => r.name === name)) {
      rentals.push({ name, pricePerNight: price, type, sleeps, bedrooms, bathrooms, amenities });
    }
  }

  return rentals.slice(0, 6);
}

// ── Flight parser ─────────────────────────────────────────────────────────────
// Google Flight text dumps the detail line as a single concatenated string:
//   "Nonstop1 hr 20 minAir Peace"   or   "1 stop6 hr 35 minAfrica World Airlines"
// (sometimes separated by " · " but often not). We match both forms.

function parseFlightLines(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const flights = [];
  const isRT = text.includes('round trip');

  for (let i = 0; i < lines.length; i++) {
    const priceMatch = lines[i].match(/^NGN ([\d,]+)$/);
    if (!priceMatch) continue;

    const price = parseInt(priceMatch[1].replace(/,/g, ''), 10);
    if (price < 5000) continue;

    let airline = null, stops = null, duration = null;

    // Scan the next 4 lines for the combined stops/duration/airline line
    for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
      const l = lines[j];

      // "Nonstop1 hr 20 minAir Peace"  or  "Nonstop · 1 hr 20 min · Air Peace"
      const nonstop = l.match(/^Nonstop(?:\s*·?\s*)([\d]+ hr [\d]+ min)(?:\s*·?\s*)(.+)$/i);
      if (nonstop) {
        stops = 0;
        duration = nonstop[1].trim();
        airline = nonstop[2].trim();
        break;
      }

      // "1 stop6 hr 35 minAfrica World Airlines"  or  "1 stop · 6 hr 35 min · Africa World Airlines"
      const withStops = l.match(/^(\d+)\s*stops?(?:\s*·?\s*)([\d]+ hr [\d]+ min)(?:\s*·?\s*)(.+)$/i);
      if (withStops) {
        stops = parseInt(withStops[1]);
        duration = withStops[2].trim();
        airline = withStops[3].trim();
        break;
      }
    }

    const key = `${price}-${airline}`;
    if (!flights.find(f => `${f.price}-${f.airline}` === key)) {
      flights.push({ price, airline, stops, duration, roundTrip: isRT });
    }
  }

  return flights.sort((a, b) => a.price - b.price).slice(0, 5);
}

// ── Public scraping functions ─────────────────────────────────────────────────

async function scrapeHotels(destination, checkin, checkout, adults = 1) {
  if (!CHROME) return [];
  const page = await newPage();
  try {
    const dates = checkin && checkout ? `&dates=${checkin},${checkout}` : '';
    const url = `https://www.google.com/travel/hotels?q=hotels+in+${encodeURIComponent(destination + ' Nigeria')}&hl=en&curr=NGN${dates}`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await handleConsent(page);
    await new Promise(r => setTimeout(r, 5000));
    const text = await page.evaluate(() => document.body.innerText);
    return parseHotelLines(text);
  } catch (err) {
    console.warn('[googleTravel/hotels]', err.message);
    return [];
  } finally {
    await page.close().catch(() => {});
  }
}

async function scrapeVacationRentals(destination, checkin, checkout) {
  if (!CHROME) return [];
  const page = await newPage();
  try {
    const dates = checkin && checkout ? `&dates=${checkin},${checkout}` : '';
    const url = `https://www.google.com/travel/hotels?q=vacation+rentals+shortlets+apartments+in+${encodeURIComponent(destination)}&hl=en&curr=NGN${dates}`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await handleConsent(page);
    await new Promise(r => setTimeout(r, 5000));
    const text = await page.evaluate(() => document.body.innerText);
    return parseRentalLines(text);
  } catch (err) {
    console.warn('[googleTravel/rentals]', err.message);
    return [];
  } finally {
    await page.close().catch(() => {});
  }
}

// Flights: scrape using city names (e.g. "Lagos", "Abuja").
// The confirmed-working URL format is ?q=flights+from+{origin}+to+{destination}
// — no IATA codes needed, and Google understands Nigerian city names natively.
async function scrapeFlights(originCity, destCity, date) {
  if (!CHROME || !originCity || !destCity) return null;

  const q = `flights from ${originCity} to ${destCity}`;
  const url = `https://www.google.com/travel/flights?hl=en&curr=NGN&q=${encodeURIComponent(q)}`;

  const page = await newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await handleConsent(page);
    await new Promise(r => setTimeout(r, 6000));
    const text = await page.evaluate(() => document.body.innerText);
    const flights = parseFlightLines(text);
    if (!flights.length) return null;
    return {
      available: true,
      cheapestNGN: flights[0].price,
      averageNGN: Math.round(flights.reduce((s, f) => s + f.price, 0) / flights.length),
      cheapestAirline: flights[0].airline || 'Unknown',
      directAvailable: flights.some(f => f.stops === 0),
      offers: flights.slice(0, 3),
      source: 'google_travel',
    };
  } catch (err) {
    console.warn('[googleTravel/flights]', err.message);
    return null;
  } finally {
    await page.close().catch(() => {});
  }
}

// ── Prompt formatters ─────────────────────────────────────────────────────────

function formatHotelsForPrompt(hotels) {
  if (!hotels.length) return null;
  const fmt = n => `₦${Number(n).toLocaleString('en-NG')}`;
  return hotels.map(h => {
    const parts = [`- ${h.name}`];
    if (h.stars) parts.push(`${h.stars}★`);
    if (h.rating) parts.push(`${h.rating}/5`);
    parts.push(fmt(h.pricePerNight) + '/night');
    if (h.deal) parts.push(h.deal);
    if (h.location) parts.push(h.location);
    if (h.amenities.length) parts.push(h.amenities.slice(0, 4).join(', '));
    return parts.join(' | ');
  }).join('\n');
}

function formatRentalsForPrompt(rentals) {
  if (!rentals.length) return null;
  const fmt = n => `₦${Number(n).toLocaleString('en-NG')}`;
  return rentals.map(r => {
    const parts = [`- ${r.name}`];
    if (r.type) parts.push(r.type);
    if (r.sleeps) parts.push(`sleeps ${r.sleeps}`);
    if (r.bedrooms) parts.push(`${r.bedrooms} bed`);
    parts.push(fmt(r.pricePerNight) + '/night avg');
    if (r.amenities.length) parts.push(r.amenities.slice(0, 3).join(', '));
    return parts.join(' | ');
  }).join('\n');
}

function formatFlightsForPrompt(result) {
  if (!result) return null;
  const fmt = n => `₦${Number(n).toLocaleString('en-NG')}`;
  return [
    `✈️  Flights (Google Travel):`,
    `   Cheapest: ${fmt(result.cheapestNGN)}/person via ${result.cheapestAirline}`,
    `   Average:  ${fmt(result.averageNGN)}/person`,
    `   Direct:   ${result.directAvailable ? 'Yes' : 'No'}`,
  ].join('\n');
}

module.exports = {
  scrapeHotels,
  scrapeVacationRentals,
  scrapeFlights,
  formatHotelsForPrompt,
  formatRentalsForPrompt,
  formatFlightsForPrompt,
  available: !!CHROME,
};
