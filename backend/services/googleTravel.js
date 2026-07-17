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

  // 3. Scan Puppeteer cache dirs.
  //    Priority: explicit env var → project-local cache (Render build artifact) →
  //    HOME-relative defaults → known Render home paths.
  //    The project-local path (/opt/render/project/src/backend/.puppeteer-cache)
  //    is what gets bundled in the Render build upload — unlike HOME/.cache which
  //    lives outside the project directory and is NOT included in the build artifact.
  const cacheDirs = [
    process.env.PUPPETEER_CACHE_DIR,
    path.join(__dirname, '../.puppeteer-cache'),                          // project-local (Render build artifact)
    path.join(process.env.HOME || '', '.cache', 'puppeteer'),
    path.join(process.env.USERPROFILE || '', '.cache', 'puppeteer'),
    '/opt/render/project/src/backend/.puppeteer-cache',                   // absolute project-local fallback
    '/root/.cache/puppeteer',
    '/opt/render/.cache/puppeteer',
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
  if (_browser && _browser.isConnected()) return _browser;

  const wsEndpoint = process.env.BROWSERLESS_WS_ENDPOINT;
  if (wsEndpoint) {
    try {
      console.log('[googleTravel] Connecting to Browserless remote Chrome...');
      _browser = await puppeteer.connect({
        browserWSEndpoint: wsEndpoint,
        defaultViewport: null,
      });
      console.log('[googleTravel] Browserless connected OK');
      return _browser;
    } catch (e) {
      console.warn('[googleTravel] Browserless failed:', e.message, '— falling back to local Chrome');
      _browser = null;
    }
  }

  // Fallback: local Chrome (dev, or if Browserless is down)
  if (!CHROME) throw new Error('No Chrome executable and BROWSERLESS_WS_ENDPOINT not set');
  console.log('[googleTravel] Launching local Chrome...');
  _browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    protocolTimeout: 120000,
    args: [
      '--no-sandbox', '--disable-setuid-sandbox',
      '--disable-dev-shm-usage', '--disable-gpu',
      '--disable-extensions',
      '--disable-background-networking',
      '--disable-default-apps',
      '--disable-sync',
      '--mute-audio',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-renderer-backgrounding',
      '--disable-background-timer-throttling',
      '--js-flags=--max-old-space-size=256',
    ],
  });
  console.log('[googleTravel] Local Chrome launched OK');
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

const BADGE_WORDS = new Set(['GREAT DEAL', 'DEAL', 'GREAT PRICE', 'SPONSORED', 'SALE', 'NEW', 'VACATION RENTAL']);
// Render servers are US-based so Google ignores curr=NGN and serves USD prices.
const USD_TO_NGN = 1600;

function parsePrice(line) {
  const ngn = line.match(/^(?:Avg\s+)?₦([\d,]+)$/);
  if (ngn) return parseInt(ngn[1].replace(/,/g, ''), 10);
  const usd = line.match(/^\$([\d,]+(?:\.\d{1,2})?)$/);
  if (usd) return Math.round(parseFloat(usd[1].replace(/,/g, '')) * USD_TO_NGN);
  return null;
}

function parseHotelLines(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const hotels = [];

  for (let i = 1; i < lines.length; i++) {
    const price = parsePrice(lines[i]);
    if (!price || price < 3000 || price > 50000000) continue;

    // Walk back to find name — skip badge lines
    let nameIdx = i - 1;
    let deal = null;
    while (nameIdx >= 0 && BADGE_WORDS.has(lines[nameIdx])) {
      if (!deal && ['GREAT DEAL', 'DEAL', 'GREAT PRICE'].includes(lines[nameIdx])) deal = lines[nameIdx];
      nameIdx--;
    }
    const name = lines[nameIdx];
    if (!name || name.length < 3 || /[₦$]|NGN|\d{4,}|Skip|Sign in|Filter|Sort|All filter/.test(name)) continue;
    if (BADGE_WORDS.has(name)) continue;

    // Scan forward for metadata
    let rating = null, reviews = null, stars = null, amenities = [], location = null;
    for (let j = i + 1; j < Math.min(i + 20, lines.length); j++) {
      const l = lines[j];
      if (!rating && /^\d\.\d(?:\/5)?$/.test(l)) { rating = parseFloat(l); continue; }
      if (!reviews && /^\([\d,.]+[KM]?\)$/.test(l)) { reviews = l.replace(/[()]/g, ''); continue; }
      if (!stars) { const sm = l.match(/(?:^|·\s*)(\d)[- ]star/i); if (sm) { stars = parseInt(sm[1]); continue; } }
      if (!location && l.startsWith('·') && !/star/i.test(l)) { location = l.replace(/^·\s*/, ''); continue; }
      const amenMatch = l.match(/^Amenities for .+?[:.]\s*(.+)$/);
      if (amenMatch) {
        amenities = amenMatch[1].split(',').map(a => a.trim()).filter(a => a && !/^View/i.test(a));
        break;
      }
      if (parsePrice(l)) break; // next hotel's price line — stop
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
    const price = parsePrice(lines[i]);
    if (!price || price < 3000) continue;

    const name = lines[i - 1];
    if (!name || name.length < 3 || /[₦$]|Skip|Sign in/.test(name)) continue;
    if (BADGE_WORDS.has(name)) continue;

    let type = null, sleeps = null, bedrooms = null, bathrooms = null, amenities = [];
    const amenLine = lines[i + 1] || '';
    const amenMatch = amenLine.match(/^Amenities for .+?[:.]\s*(.+)$/);
    if (amenMatch) {
      const parts = amenMatch[1].split(',').map(a => a.trim()).filter(Boolean);
      type = parts.find(p => /Apartment|House|Villa|Condo|Studio|Loft|Cottage/i.test(p)) || null;
      const s = parts.find(p => /^Sleeps/i.test(p));
      if (s) sleeps = parseInt(s.replace(/\D/g, ''));
      const b = parts.find(p => /bedroom/i.test(p) && !/bathroom/i.test(p));
      if (b) bedrooms = parseInt(b.replace(/\D/g, ''));
      const ba = parts.find(p => /bathroom/i.test(p));
      if (ba) bathrooms = parseInt(ba.replace(/\D/g, ''));
      amenities = parts.filter(p =>
        !/^(Sleeps|Apartment|House|Villa|Condo|Studio|Cottage|\d+ bed|\d+ bath)/i.test(p)
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
  const isRT = /round.?trip/i.test(text);

  for (let i = 0; i < lines.length; i++) {
    // Price: "NGN 78,000" (currency loaded) or "$48" (US-server fallback)
    let price = null;
    const ngnMatch = lines[i].match(/^NGN\s*([\d,]+)$/);
    const usdMatch = lines[i].match(/^\$([\d,]+(?:\.\d{1,2})?)$/);
    if (ngnMatch) price = parseInt(ngnMatch[1].replace(/,/g, ''), 10);
    else if (usdMatch) price = Math.round(parseFloat(usdMatch[1].replace(/,/g, '')) * USD_TO_NGN);
    if (!price || price < 5000) continue;

    let airline = null, stops = null, duration = null;

    // Primary: scan BACKWARD — Google Flights card order is airline → time → route → duration → price
    for (let j = i - 1; j >= Math.max(0, i - 8); j--) {
      const l = lines[j];
      if (stops === null) {
        const ns = l.match(/Nonstop[·\s]*([\d]+ hr(?:\s+[\d]+ min)?)/i);
        if (ns) { stops = 0; duration = ns[1].trim(); continue; }
        const st = l.match(/(\d+)\s*stops?[·\s]*([\d]+ hr(?:\s+[\d]+ min)?)/i);
        if (st) { stops = parseInt(st[1]); duration = st[2].trim(); continue; }
      }
      // Airline name: plain text, not a time, route, badge, or price
      if (!airline && stops !== null &&
          !l.includes('–') && !/^\d{1,2}:\d{2}/.test(l) &&
          /^[A-Za-z]/.test(l) && l.length >= 3 && l.length <= 60 &&
          !/^(NGN|USD|\$|Economy|Business|Nonstop|\d+ stop|Round|One.way)/i.test(l)) {
        airline = l;
      }
    }

    // Fallback: scan FORWARD for older concatenated format
    // "Nonstop1 hr 20 minAir Peace" or "1 stop · 6 hr 35 min · Airline"
    if (stops === null) {
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        const l = lines[j];
        const ns = l.match(/^Nonstop(?:\s*·?\s*)([\d]+ hr[\d\s]*min)(?:\s*·?\s*)(.+)$/i);
        if (ns) { stops = 0; duration = ns[1].trim(); airline = ns[2].trim(); break; }
        const st = l.match(/^(\d+)\s*stops?(?:\s*·?\s*)([\d]+ hr[\d\s]*min)(?:\s*·?\s*)(.+)$/i);
        if (st) { stops = parseInt(st[1]); duration = st[2].trim(); airline = st[3].trim(); break; }
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
  const t0 = Date.now();
  console.log(`[googleTravel/hotels] Scraping hotels: ${destination}`);
  const page = await newPage();
  try {
    const dates = checkin && checkout ? `&dates=${checkin},${checkout}` : '';
    const url = `https://www.google.com/travel/hotels?q=hotels+in+${encodeURIComponent(destination + ' Nigeria')}&hl=en&curr=NGN${dates}`;
    console.log('[googleTravel/hotels] URL:', url);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await handleConsent(page);
    await new Promise(r => setTimeout(r, 5000));
    const text = await page.evaluate(() => document.body.innerText);
    console.log(`[googleTravel/hotels] Page text length: ${text.length} chars`);
    if (text.length < 500) console.log('[googleTravel/hotels] Short page text:', text.slice(0, 300));
    const hotels = parseHotelLines(text);
    console.log(`[googleTravel/hotels] Found ${hotels.length} hotels in ${Date.now() - t0}ms`);
    if (hotels.length) console.log('[googleTravel/hotels] First result:', hotels[0].name, '·', hotels[0].pricePerNight);
    return hotels;
  } catch (err) {
    console.error(`[googleTravel/hotels] Error after ${Date.now() - t0}ms:`, err.message);
    return [];
  } finally {
    await page.close().catch(() => {});
  }
}

async function scrapeVacationRentals(destination, checkin, checkout) {
  if (!CHROME) return [];
  const t0 = Date.now();
  console.log(`[googleTravel/rentals] Scraping rentals: ${destination}`);
  const page = await newPage();
  try {
    const dates = checkin && checkout ? `&dates=${checkin},${checkout}` : '';
    const url = `https://www.google.com/travel/hotels?q=vacation+rentals+shortlets+apartments+in+${encodeURIComponent(destination)}&hl=en&curr=NGN${dates}`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await handleConsent(page);
    await new Promise(r => setTimeout(r, 5000));
    const text = await page.evaluate(() => document.body.innerText);
    const rentals = parseRentalLines(text);
    console.log(`[googleTravel/rentals] Found ${rentals.length} rentals in ${Date.now() - t0}ms`);
    return rentals;
  } catch (err) {
    console.error(`[googleTravel/rentals] Error after ${Date.now() - t0}ms:`, err.message);
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
  const t0 = Date.now();
  console.log(`[googleTravel/flights] Scraping flights: ${originCity} → ${destCity}`);

  const q = `flights from ${originCity} to ${destCity}`;
  const url = `https://www.google.com/travel/flights?hl=en&curr=NGN&q=${encodeURIComponent(q)}`;
  console.log('[googleTravel/flights] URL:', url);

  const page = await newPage();
  try {
    // Google Flights is a pure SPA. domcontentloaded fires on the empty shell (~450 chars).
    // waitForFunction polls until actual flight results appear (page grows past 2000 chars).
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await handleConsent(page);
    await page.waitForFunction(
      () => document.body.innerText.length > 2000,
      { timeout: 35000, polling: 1500 }
    ).catch(() => console.log('[googleTravel/flights] waitForFunction timed out — using current state'));
    await new Promise(r => setTimeout(r, 2000));
    const text = await page.evaluate(() => document.body.innerText);
    console.log(`[googleTravel/flights] Page text length: ${text.length} chars`);
    if (text.length < 500) console.log('[googleTravel/flights] Short page text:', text.slice(0, 300));
    const flights = parseFlightLines(text);
    console.log(`[googleTravel/flights] Found ${flights.length} flights in ${Date.now() - t0}ms`);
    if (flights.length) console.log('[googleTravel/flights] Cheapest:', flights[0].airline, '·', flights[0].price);
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
    console.error(`[googleTravel/flights] Error after ${Date.now() - t0}ms:`, err.message);
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
  available: !!(CHROME || process.env.BROWSERLESS_WS_ENDPOINT),
};
