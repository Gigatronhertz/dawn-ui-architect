/**
 * GIGM bus scraper — scrapes gigm.com for real bus schedules and prices.
 *
 * Strategy:
 *   1. Open the booking page and intercept the JSON API call GIGM's SPA
 *      makes when you search (most reliable — structured data, no parsing needed).
 *   2. If the API call isn't caught, fall back to parsing the rendered page text.
 *
 * Returns an array of departure objects:
 *   [{ departureTime, arrivalTime, price, class, seatsAvailable, terminal, operator }]
 */

const puppeteer = require('puppeteer-extra');
const Stealth   = require('puppeteer-extra-plugin-stealth');
puppeteer.use(Stealth());

const fs   = require('fs');
const path = require('path');

// ── Chrome / Browserless ───────────────────────────────────────────────────────

function findChrome() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH;
  try {
    const saved = fs.readFileSync(path.join(__dirname, '../.chrome-path'), 'utf8').trim();
    if (saved && fs.existsSync(saved)) return saved;
  } catch {}
  return null;
}

const CHROME = findChrome();

let _browser = null;

async function getBrowser() {
  if (_browser && _browser.isConnected()) return _browser;

  const wsEndpoint = process.env.BROWSERLESS_WS_ENDPOINT;
  if (wsEndpoint) {
    try {
      console.log('[gigm] Connecting to Browserless...');
      _browser = await puppeteer.connect({ browserWSEndpoint: wsEndpoint, defaultViewport: null });
      console.log('[gigm] Browserless connected');
      return _browser;
    } catch (e) {
      console.warn('[gigm] Browserless failed:', e.message, '— falling back to local Chrome');
      _browser = null;
    }
  }

  if (!CHROME) throw new Error('[gigm] No Chrome and BROWSERLESS_WS_ENDPOINT not set');
  console.log('[gigm] Launching local Chrome...');
  _browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    protocolTimeout: 120000,
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu',
      '--disable-extensions','--disable-background-networking','--mute-audio','--no-first-run'],
  });
  console.log('[gigm] Local Chrome launched');
  return _browser;
}

// ── Terminal name map (GIGM uses terminal names in its search) ────────────────
// Keys are the city names users type; values are what GIGM expects.
const TERMINAL_MAP = {
  'lagos':          'Lagos',
  'abuja':          'Abuja',
  'ibadan':         'Ibadan',
  'port harcourt':  'Port Harcourt',
  'benin':          'Benin',
  'enugu':          'Enugu',
  'kano':           'Kano',
  'kaduna':         'Kaduna',
  'owerri':         'Owerri',
  'warri':          'Warri',
  'calabar':        'Calabar',
  'abeokuta':       'Abeokuta',
  'ilorin':         'Ilorin',
  'asaba':          'Asaba',
  'onitsha':        'Onitsha',
  'akure':          'Akure',
  'jos':            'Jos',
  'maiduguri':      'Maiduguri',
};

function resolveTerminal(city) {
  return TERMINAL_MAP[city.toLowerCase().trim()] || city.trim();
}

// ── API response parser ────────────────────────────────────────────────────────
// GIGM's internal API returns a payload like { data: { availableTrips: [...] } }
// We normalise that into our format.
function parseApiResponse(json) {
  // Try common shapes GIGM has used
  const trips =
    json?.data?.availableTrips ||
    json?.Data?.AvailableTrips ||
    json?.availableTrips       ||
    json?.trips                ||
    json?.data                 ||
    null;

  if (!Array.isArray(trips) || trips.length === 0) return [];

  return trips.map(t => ({
    operator:         'GIGM',
    departureTime:    t.departureTime   || t.DepartureTime   || t.departure_time || null,
    arrivalTime:      t.arrivalTime     || t.ArrivalTime     || t.arrival_time   || null,
    price:            Number(t.fare || t.Fare || t.price || t.Price || 0),
    class:            t.vehicleClass   || t.VehicleClass   || t.busClass || t.class || 'Economy',
    seatsAvailable:   Number(t.availableSeats || t.AvailableSeats || t.seats || 0),
    terminal:         t.departureTerminal || t.DepartureTerminal || t.terminal || null,
  })).filter(t => t.price > 0);
}

// ── Page-text parser (fallback) ────────────────────────────────────────────────
// GIGM renders price cards that look like:
//   "07:00 AM\nJibowu Terminal\nExecutive\n₦8,500\n12 seats left"
function parsePageText(text) {
  const lines  = text.split('\n').map(l => l.trim()).filter(Boolean);
  const trips  = [];

  for (let i = 0; i < lines.length; i++) {
    const priceMatch = lines[i].match(/^₦\s*([\d,]+)$/);
    if (!priceMatch) continue;
    const price = parseInt(priceMatch[1].replace(/,/g, ''), 10);
    if (price < 1000 || price > 500000) continue;

    // Scan backward for time (HH:MM AM/PM or HH:MM)
    let departureTime = null, busClass = null, terminal = null, seatsAvailable = null;
    for (let j = i - 1; j >= Math.max(0, i - 6); j--) {
      const l = lines[j];
      if (!departureTime && /^\d{1,2}:\d{2}(\s*(AM|PM))?$/i.test(l)) { departureTime = l; continue; }
      if (!busClass && /^(Executive|Economy|Business|VIP|Standard|Luxury)/i.test(l)) { busClass = l; continue; }
      if (!terminal && /Terminal/i.test(l)) { terminal = l; continue; }
    }
    // Scan forward for seats
    for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
      const sm = lines[j].match(/(\d+)\s*seat/i);
      if (sm) { seatsAvailable = parseInt(sm[1]); break; }
    }

    trips.push({ operator: 'GIGM', departureTime, arrivalTime: null, price, class: busClass || 'Economy', seatsAvailable, terminal });
  }

  return trips.sort((a, b) => a.price - b.price).slice(0, 8);
}

// ── Main scraper ───────────────────────────────────────────────────────────────
async function scrapeGIGM(origin, destination, date) {
  const t0 = Date.now();
  const from = resolveTerminal(origin);
  const to   = resolveTerminal(destination);
  const travelDate = date || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  console.log(`[gigm] Scraping: ${from} → ${to} on ${travelDate}`);

  const browser = await getBrowser();
  const page    = await browser.newPage();

  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  );

  // ── Intercept GIGM's internal API calls ──────────────────────────────────────
  let apiData = null;
  page.on('response', async (response) => {
    try {
      const url = response.url();
      const ct  = response.headers()['content-type'] || '';
      if (!ct.includes('json')) return;
      // GIGM API URLs typically contain these keywords
      if (!/availabl|trip|route|book|search|schedule/i.test(url)) return;
      if (response.status() !== 200) return;
      const json = await response.json().catch(() => null);
      if (!json) return;
      console.log(`[gigm] API response intercepted: ${url.slice(0, 80)}`);
      console.log('[gigm] API payload keys:', Object.keys(json).join(', '));
      const trips = parseApiResponse(json);
      if (trips.length > 0) { apiData = trips; }
    } catch {}
  });

  try {
    // 1. Load booking page
    console.log('[gigm] Loading booking page...');
    await page.goto('https://www.gigm.com/book-a-seat', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    // 2. Fill "From" field
    console.log('[gigm] Filling origin:', from);
    const fromSel = 'input[placeholder*="From"], input[placeholder*="Depart"], input[name*="from"], input[id*="from"]';
    await page.waitForSelector(fromSel, { timeout: 10000 }).catch(() => {});
    await page.click(fromSel).catch(() => {});
    await page.type(fromSel, from, { delay: 60 });
    await new Promise(r => setTimeout(r, 1500));

    // Select first dropdown suggestion
    const fromDrop = 'ul.dropdown-menu li, .autocomplete-results li, [class*="suggestion"] li, [class*="option"]:first-child';
    await page.waitForSelector(fromDrop, { timeout: 5000 }).catch(() => {});
    await page.click(fromDrop).catch(() => console.log('[gigm] No from-dropdown found, continuing'));
    await new Promise(r => setTimeout(r, 800));

    // 3. Fill "To" field
    console.log('[gigm] Filling destination:', to);
    const toSel = 'input[placeholder*="To"], input[placeholder*="Destination"], input[name*="to"], input[id*="to"]';
    await page.click(toSel).catch(() => {});
    await page.type(toSel, to, { delay: 60 });
    await new Promise(r => setTimeout(r, 1500));
    const toDrop = 'ul.dropdown-menu li:first-child, .autocomplete-results li:first-child, [class*="suggestion"] li:first-child';
    await page.waitForSelector(toDrop, { timeout: 5000 }).catch(() => {});
    await page.click(toDrop).catch(() => console.log('[gigm] No to-dropdown found, continuing'));
    await new Promise(r => setTimeout(r, 800));

    // 4. Fill date
    console.log('[gigm] Setting date:', travelDate);
    const dateSel = 'input[type="date"], input[placeholder*="date"], input[placeholder*="Date"], input[name*="date"]';
    await page.evaluate((sel, val) => {
      const el = document.querySelector(sel);
      if (el) { el.value = val; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }
    }, dateSel, travelDate).catch(() => {});
    await new Promise(r => setTimeout(r, 800));

    // 5. Submit / Search
    console.log('[gigm] Submitting search...');
    const submitSel = 'button[type="submit"], button:has-text("Search"), button:has-text("Find"), .search-btn, [class*="search"] button';
    await page.click(submitSel).catch(() => {
      // Try pressing Enter on the last filled field
      page.keyboard.press('Enter').catch(() => {});
    });

    // 6. Wait for results (either API interception or page render)
    console.log('[gigm] Waiting for results...');
    await page.waitForFunction(
      () => document.body.innerText.length > 1500,
      { timeout: 25000, polling: 1000 }
    ).catch(() => console.log('[gigm] waitForFunction timed out'));
    await new Promise(r => setTimeout(r, 2000));

    // 7. Return intercepted API data or fall back to page text
    if (apiData && apiData.length > 0) {
      console.log(`[gigm] API data: ${apiData.length} trips in ${Date.now() - t0}ms`);
      return apiData;
    }

    const text = await page.evaluate(() => document.body.innerText);
    console.log(`[gigm] Page text length: ${text.length} chars`);
    if (text.length < 500) console.log('[gigm] Short page text:', text.slice(0, 400));

    const trips = parsePageText(text);
    console.log(`[gigm] Page-text parse: ${trips.length} trips in ${Date.now() - t0}ms`);
    if (trips[0]) console.log('[gigm] Cheapest:', trips[0].departureTime, '₦' + trips[0].price);
    return trips;

  } catch (err) {
    console.error(`[gigm] Error after ${Date.now() - t0}ms:`, err.message);
    return [];
  } finally {
    await page.close().catch(() => {});
  }
}

// ── Prompt formatter ───────────────────────────────────────────────────────────
function formatGIGMForPrompt(trips) {
  if (!trips || trips.length === 0) return null;
  const fmt = n => `₦${Number(n).toLocaleString('en-NG')}`;
  const lines = trips.slice(0, 5).map(t =>
    `- ${t.departureTime || '?'} · ${t.class} · ${fmt(t.price)}/seat${t.seatsAvailable ? ` · ${t.seatsAvailable} seats left` : ''}${t.terminal ? ` · from ${t.terminal}` : ''}`
  );
  return `GIGM buses (live prices):\n${lines.join('\n')}`;
}

module.exports = {
  scrapeGIGM,
  formatGIGMForPrompt,
  available: !!(findChrome() || process.env.BROWSERLESS_WS_ENDPOINT),
};
