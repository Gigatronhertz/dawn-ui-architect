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

    // 1a. Accept cookie consent if present
    const accepted = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const accept = btns.find(b => /accept/i.test(b.innerText));
      if (accept) { accept.click(); return true; }
      return false;
    });
    if (accepted) {
      console.log('[gigm] Cookie consent accepted');
      await new Promise(r => setTimeout(r, 1000));
    }

    // 1b. Click "Continue as a guest" if auth-wall is present
    const guestClicked = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('*'));
      // Find the leaf text node matching "Continue as a guest" then click its card parent
      const leaf = all.find(e => e.children.length === 0 && /continue as a guest/i.test(e.innerText?.trim()));
      if (!leaf) return false;
      // Walk up to find a clickable container (div or button with cursor-pointer)
      let node = leaf.parentElement;
      while (node && node !== document.body) {
        if (node.tagName === 'BUTTON' || (node.tagName === 'DIV' && node.className?.includes('cursor-pointer'))) {
          node.click(); return true;
        }
        node = node.parentElement;
      }
      leaf.click();
      return true;
    });
    if (guestClicked) {
      console.log('[gigm] Clicked "Continue as a guest"');
      await new Promise(r => setTimeout(r, 3000));
    } else {
      console.log('[gigm] No guest button found — assuming booking form is already visible');
    }

    // 2. Wait for booking form inputs to appear (after guest click)
    console.log('[gigm] Waiting for booking form...');
    const ANY_INPUT = 'input[type="text"], input[type="search"], input:not([type="hidden"]):not([type="submit"])';
    await page.waitForSelector(ANY_INPUT, { timeout: 12000 }).catch(() => {});

    // Dump visible inputs so we can see real selectors in logs
    const inputSummary = await page.evaluate(() =>
      Array.from(document.querySelectorAll('input, select'))
        .filter(el => el.offsetParent !== null)
        .map(el => `${el.tagName}[type=${el.type}][id=${el.id}][name=${el.name}][placeholder="${el.placeholder}"]`)
    );
    console.log('[gigm] Visible inputs after auth:', JSON.stringify(inputSummary));

    // 3. Fill "From" field — try common GIGM selector patterns
    console.log('[gigm] Filling origin:', from);
    const fromSel = [
      'input[placeholder*="From" i]',
      'input[placeholder*="Depart" i]',
      'input[placeholder*="Origin" i]',
      'input[name*="from" i]',
      'input[id*="from" i]',
      'input[id*="departure" i]',
    ].join(', ');

    const fromFound = await page.$(fromSel);
    if (fromFound) {
      await fromFound.click();
      await fromFound.type(from, { delay: 60 });
    } else {
      // Last resort: click first visible text input
      await page.evaluate((city) => {
        const inputs = Array.from(document.querySelectorAll('input[type="text"], input:not([type])'));
        const vis = inputs.find(el => el.offsetParent !== null);
        if (vis) { vis.focus(); vis.value = city; vis.dispatchEvent(new Event('input', { bubbles: true })); }
      }, from);
      console.log('[gigm] Used fallback for From input');
    }
    await new Promise(r => setTimeout(r, 1500));

    // Select first autocomplete suggestion for "From"
    const dropSels = 'ul li, [class*="suggestion"], [class*="option"], [role="option"], [class*="dropdown"] li';
    await page.waitForSelector(dropSels, { timeout: 5000 }).catch(() => {});
    await page.click(dropSels).catch(() => console.log('[gigm] No from-dropdown found, continuing'));
    await new Promise(r => setTimeout(r, 800));

    // 4. Fill "To" field
    console.log('[gigm] Filling destination:', to);
    const toSel = [
      'input[placeholder*="To" i]',
      'input[placeholder*="Destination" i]',
      'input[placeholder*="Arrival" i]',
      'input[name*="to" i]',
      'input[id*="to" i]',
      'input[id*="arrival" i]',
      'input[id*="destination" i]',
    ].join(', ');

    const toFound = await page.$(toSel);
    if (toFound) {
      await toFound.click();
      await toFound.type(to, { delay: 60 });
    } else {
      // Last resort: click second visible text input
      await page.evaluate((city) => {
        const inputs = Array.from(document.querySelectorAll('input[type="text"], input:not([type])'))
          .filter(el => el.offsetParent !== null);
        const el = inputs[1] || inputs[0];
        if (el) { el.focus(); el.value = city; el.dispatchEvent(new Event('input', { bubbles: true })); }
      }, to);
      console.log('[gigm] Used fallback for To input');
    }
    await new Promise(r => setTimeout(r, 1500));
    await page.waitForSelector(dropSels, { timeout: 5000 }).catch(() => {});
    await page.click(dropSels).catch(() => console.log('[gigm] No to-dropdown found, continuing'));
    await new Promise(r => setTimeout(r, 800));

    // 5. Fill date
    console.log('[gigm] Setting date:', travelDate);
    const dateSel = 'input[type="date"], input[placeholder*="date" i], input[name*="date" i]';
    const dateSet = await page.evaluate((sel, val) => {
      const el = document.querySelector(sel);
      if (!el) return false;
      el.value = val;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }, dateSel, travelDate);
    console.log('[gigm] Date set:', dateSet);
    await new Promise(r => setTimeout(r, 800));

    // 6. Submit / Search
    console.log('[gigm] Submitting search...');
    const submitted = await page.evaluate(() => {
      // Try submit button
      const btns = Array.from(document.querySelectorAll('button'));
      const search = btns.find(b => /search|find|book|proceed/i.test(b.innerText));
      const submit = btns.find(b => b.type === 'submit');
      const btn = search || submit;
      if (btn) { btn.click(); return true; }
      return false;
    });
    if (!submitted) {
      console.log('[gigm] No submit button found — pressing Enter');
      await page.keyboard.press('Enter').catch(() => {});
    }

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
