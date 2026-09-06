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
  // GIGM v2 API shape (confirmed): { code, shortDescription, data: { departures: [...] } }
  const trips =
    json?.data?.departures        ||   // actual GIGM v2 shape
    json?.data?.availableTrips    ||
    json?.Data?.AvailableTrips    ||
    json?.availableTrips          ||
    json?.trips                   ||
    (Array.isArray(json?.data) ? json.data : null) ||
    null;

  if (!Array.isArray(trips) || trips.length === 0) return [];

  return trips.map(t => ({
    operator:       'GIGM',
    departureTime:  t.departureTime || t.DepartureTime || null,
    arrivalTime:    t.arrivalTime   || t.ArrivalTime   || null,
    price:          Number(t.discountedFarePrice ?? t.farePrice ?? t.fare ?? t.Fare ?? t.price ?? 0),
    class:          t.vehicleModel  || t.vehicleClass  || t.busClass || 'Economy',
    seatsAvailable: Number(t.availableNumberOfSeats ?? t.availableSeats?.length ?? 0),
    terminal:       (t.routeName || '').split(/==?>+/)[0].trim() || t.departureTerminal || null,
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
  // Catch ANY JSON response from gigmobility2.com — we'll parse all and keep
  // the one that has trip/price data.
  let apiData = null;
  page.on('response', async (response) => {
    try {
      const url = response.url();
      const ct  = response.headers()['content-type'] || '';
      if (!ct.includes('json')) return;
      if (response.status() !== 200) return;
      // Only look at GIGM's own API domain
      if (!url.includes('gigmobility') && !url.includes('gigm.com/api')) return;
      const json = await response.json().catch(() => null);
      if (!json) return;
      const trips = parseApiResponse(json);
      if (trips.length > 0) {
        console.log(`[gigm] Trips API found: ${url.slice(0, 90)} → ${trips.length} trips`);
        apiData = trips;
      } else {
        console.log(`[gigm] API (no trips): ${url.slice(0, 70)} keys:${Object.keys(json).join(',')}`);
      }
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
      // React needs ~2s to re-render auth wall after cookie overlay dismisses
      await new Promise(r => setTimeout(r, 2500));
    }

    // 1b. Click through the guest-checkout wall — use evaluateHandle to get a
    // real ElementHandle so Puppeteer dispatches proper mouse events (React
    // ignores element.click() in evaluate).
    //
    // GIGM has worded this wall differently across redesigns ("Continue as a
    // guest", "Continue without an account", "Book as a guest" have all been
    // seen) — match any button/h2 whose text is about proceeding without an
    // account, rather than pinning one exact phrase that silently breaks the
    // whole scrape the next time it's reworded.
    let guestClicked = false;
    const GUEST_WALL_RE = /continue (as a guest|without an account)|book as a guest/i;
    const guestTarget = await page.evaluateHandle((reSource) => {
      const re = new RegExp(reSource, 'i');
      const btn = Array.from(document.querySelectorAll('button'))
        .find(b => re.test(b.textContent || ''));
      if (btn) return btn;
      const h2 = Array.from(document.querySelectorAll('h2'))
        .find(e => re.test(e.textContent || ''));
      if (!h2) return null;
      let node = h2.parentElement;
      while (node && node !== document.body) {
        if (node.className?.includes('cursor-pointer') || node.tagName === 'BUTTON') return node;
        node = node.parentElement;
      }
      return h2;
    }, GUEST_WALL_RE.source);
    const guestEl = guestTarget.asElement();
    if (guestEl) {
      await guestEl.click();
      guestClicked = true;
      console.log('[gigm] Clicked past the guest-checkout wall');
      await new Promise(r => setTimeout(r, 3000));
    } else {
      console.log('[gigm] No guest-wall button found — assuming booking form is already visible');
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

    // GIGM uses React Select for From/To. These inputs have IDs like "react-select-13-input".
    // React Select ignores direct value injection — must click to focus, type to filter,
    // then click the dropdown option that appears.

    // Helper: fill one React Select. Throws if no option appears (route doesn't exist).
    //
    // `getInput` re-queries the live DOM for the input handle rather than being
    // handed one — a retry that reused the original handle from the first
    // attempt hit "Node is detached from document" here, because GIGM's form
    // can re-render the field between attempts (the retry's longer pause gives
    // it time to). Re-querying by position every attempt, including the
    // first, means a retry always acts on whatever's actually in the DOM now.
    async function fillReactSelect(getInput, searchText, label, attempt = 1) {
      const inputHandle = await getInput();
      if (!inputHandle) throw new Error(`${label} input not found in the form`);
      const inputId = await inputHandle.evaluate(el => el.id);
      const selectBase = inputId.replace('-input', '');
      console.log(`[gigm] Filling ${label} via ${inputId} (attempt ${attempt})`);
      try {
        await inputHandle.click();
        // Clear first — a retry re-types into a field that may already hold the
        // previous attempt's text, which would otherwise search for "LagosLagos".
        await inputHandle.evaluate(el => { el.value = ''; });
        await inputHandle.type(searchText, { delay: 80 });
      } catch (err) {
        if (attempt === 1 && /detached from document/i.test(err.message || '')) {
          console.log(`[gigm] ${label} input went stale mid-fill — retrying once`);
          await new Promise(r => setTimeout(r, 1000));
          return fillReactSelect(getInput, searchText, label, 2);
        }
        throw err;
      }
      await new Promise(r => setTimeout(r, 1500));
      const optSel = `[id^="${selectBase}-option"]`;
      const opt = await page.waitForSelector(optSel, { timeout: 9000 }).catch(() => null);
      if (!opt) {
        // Both "From" and "To" fetch their terminal list from a live API as
        // you type (GetDeparture/DestinationTerminalsByX) — either can still
        // be loading when the option-list wait times out, whether or not
        // GIGM's widget has rendered an explicit "No options" empty-state
        // yet. Retry once after a longer pause on ANY missing option, not
        // just the cases where that empty-state marker happened to show —
        // a route that's genuinely unserved just fails the same way one
        // retry later, so this costs nothing in the common case.
        if (attempt === 1) {
          console.log(`[gigm] ${label} dropdown had no option after the wait — retrying once`);
          await new Promise(r => setTimeout(r, 3000));
          return fillReactSelect(getInput, searchText, label, 2);
        }
        throw new Error(`No "${searchText}" option in ${label} dropdown — route may not be served by GIGM`);
      }
      const optText = await opt.evaluate(el => el.innerText).catch(() => searchText);
      await opt.click();
      console.log(`[gigm] ${label} selected: "${optText}"`);
      await new Promise(r => setTimeout(r, 800));
    }

    // Get all visible React Select inputs in DOM order.
    // GIGM form order: [0]=Trip Type, [1]=Travelling From, [2]=Travelling To,
    //                  [3]=Adults, [4]=Children
    const getReactSelects = () => page.$$('input[id^="react-select"]');
    const rsHandles = await getReactSelects();
    console.log(`[gigm] Found ${rsHandles.length} react-select inputs`);

    if (rsHandles.length < 3) {
      console.log('[gigm] Not enough react-select inputs — form may not have loaded');
    }

    // 3. From = index 1 (index 0 is Trip Type — leave as default "One Way")
    if (rsHandles[1]) {
      await fillReactSelect(async () => (await getReactSelects())[1], from, 'From');
    } else if (rsHandles[0]) {
      // Safety: if only 1 input, try it anyway
      await fillReactSelect(async () => (await getReactSelects())[0], from, 'From (fallback)');
    }

    // 4. To = index 2 (re-query after options close and DOM updates)
    const rsHandles2 = await getReactSelects();
    if (rsHandles2[2]) {
      await fillReactSelect(async () => (await getReactSelects())[2], to, 'To');
    } else if (rsHandles2[1]) {
      await fillReactSelect(async () => (await getReactSelects())[1], to, 'To (fallback)');
    }

    // 5. Fill date — use Puppeteer click+type to properly trigger React's datepicker
    console.log('[gigm] Setting date:', travelDate);
    const [yyyy, mm, dd] = travelDate.split('-');
    const dateFormatted = `${dd}/${mm}/${yyyy}`;
    const dateHandle = await page.$('input[name="date"]') ||
                       await page.$('input[type="date"]');
    if (dateHandle) {
      await dateHandle.click({ clickCount: 3 }); // triple-click selects all
      await dateHandle.type(dateFormatted, { delay: 80 });
      // Also fire change via evaluate for React state
      await page.evaluate(val => {
        const el = document.querySelector('input[name="date"]');
        if (el) { el.value = val; el.dispatchEvent(new Event('change', { bubbles: true })); }
      }, dateFormatted);
      const dateVal = await dateHandle.evaluate(el => el.value);
      console.log(`[gigm] Date field value after set: "${dateVal}"`);
    } else {
      console.log('[gigm] Date input not found');
    }
    await new Promise(r => setTimeout(r, 800));

    // 6. Submit / Search
    console.log('[gigm] Submitting search...');
    const submitted = await page.evaluate(() => {
      // Excludes the guest-checkout wall's own wording — that button also
      // matches /continue/i, and clicking it a second time here is what
      // silently turned "search" into "dismiss the wall and go nowhere".
      const isGuestWall = (t) => /without an account|book as a guest/i.test(t);
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => /search|find|proceed|continue/i.test(b.innerText) && !isGuestWall(b.innerText)) ||
                  btns.find(b => b.type === 'submit');
      if (btn) { btn.click(); return btn.innerText.trim(); }
      return null;
    });
    console.log('[gigm] Clicked button:', submitted || 'none — pressing Enter');
    if (!submitted) await page.keyboard.press('Enter').catch(() => {});

    // 7. Wait for results — GIGM navigates away from /book-a-seat to a results page
    console.log('[gigm] Waiting for results page...');
    await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 })
      .catch(() => console.log('[gigm] No navigation detected — checking page content'));
    const postNavUrl = page.url();
    console.log('[gigm] URL after submit:', postNavUrl);

    // If GIGM bounced us to homepage the search was rejected (invalid route)
    if (/^https?:\/\/(?:www\.)?gigm\.com\/?$/.test(postNavUrl)) {
      console.log('[gigm] Redirected to homepage — route not served or form fill failed, returning []');
      return [];
    }

    // Wait for the API interception to fire (API response arrives before DOM renders)
    await new Promise(r => setTimeout(r, 8000));

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
    // Stale Browserless connection — force reconnect on next call
    if (/detached|disconnected|Protocol error|Target closed|Session closed/i.test(err.message)) {
      console.warn('[gigm] Resetting browser connection due to stale session');
      _browser = null;
    }
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
