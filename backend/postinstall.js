/**
 * Runs after `npm install` — locates OR downloads Chrome, then saves the
 * absolute path to .chrome-path so findChrome() can read it at runtime.
 *
 * Key behaviours:
 *  1. Scans the local .puppeteer-cache dir first (fastest path, works after
 *     the first successful download even if executablePath() later throws).
 *  2. Falls back to puppeteer.executablePath() — works when Puppeteer's own
 *     postinstall already ran and put Chrome in the right place.
 *  3. Downloads Chrome via @puppeteer/browsers if still not found — this is
 *     the path taken on Render when node_modules is cached (npm install is a
 *     no-op) so Puppeteer's own postinstall was never re-run.
 */

const fs   = require('fs');
const path = require('path');

const CACHE_DIR = path.join(__dirname, '.puppeteer-cache');
const OUT       = path.join(__dirname, '.chrome-path');

console.log('[postinstall] HOME:', process.env.HOME || '(not set)');
console.log('[postinstall] PUPPETEER_CACHE_DIR:', process.env.PUPPETEER_CACHE_DIR || '(not set)');
console.log('[postinstall] cache target:', CACHE_DIR);

// ── helpers ───────────────────────────────────────────────────────────────────

function save(exe) {
  if (!exe || !fs.existsSync(exe)) return false;
  fs.writeFileSync(OUT, exe, 'utf8');
  console.log('[postinstall] ✓ Chrome saved to .chrome-path →', exe);
  return true;
}

/** Recursively scan a puppeteer cache directory for a Chrome binary. */
function scan(cacheDir) {
  if (!cacheDir || !fs.existsSync(cacheDir)) return null;
  for (const shell of ['chrome', 'chrome-headless-shell']) {
    const shellDir = path.join(cacheDir, shell);
    if (!fs.existsSync(shellDir)) continue;
    let versions;
    try { versions = fs.readdirSync(shellDir).sort().reverse(); } catch { continue; }
    for (const ver of versions) {
      const candidates = [
        path.join(shellDir, ver, `${shell}-linux64`, shell),
        path.join(shellDir, ver, `${shell}-linux64`, 'chrome'),
        path.join(shellDir, ver, `${shell}-win64`, `${shell}.exe`),
        path.join(shellDir, ver, `${shell}-win64`, 'chrome.exe'),
      ];
      const found = candidates.find(p => fs.existsSync(p));
      if (found) return found;
    }
  }
  return null;
}

/** Read the Chrome buildId that puppeteer was compiled against. */
function getExpectedBuildId() {
  const attempts = [
    // puppeteer v20+: revisions in puppeteer-core
    () => {
      const rev = path.join(__dirname, 'node_modules', 'puppeteer-core', 'lib', 'cjs', 'puppeteer', 'revisions.js');
      const m = fs.readFileSync(rev, 'utf8').match(/chrome['"]\s*:\s*['"]([0-9.]+)/i);
      return m?.[1];
    },
    // puppeteer v22+: revisions in puppeteer itself
    () => {
      const rev = path.join(__dirname, 'node_modules', 'puppeteer', 'lib', 'cjs', 'puppeteer', 'revisions.js');
      const m = fs.readFileSync(rev, 'utf8').match(/chrome['"]\s*:\s*['"]([0-9.]+)/i);
      return m?.[1];
    },
    // package.json config field (some versions)
    () => {
      const pkg = JSON.parse(fs.readFileSync(
        path.join(__dirname, 'node_modules', 'puppeteer', 'package.json'), 'utf8'
      ));
      return pkg?.puppeteer?.chrome || pkg?.config?.chrome;
    },
  ];

  for (const attempt of attempts) {
    try { const id = attempt(); if (id) return id; } catch {}
  }
  return null;
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  // 1. Already in our project-local cache?
  const cached = scan(CACHE_DIR);
  if (save(cached)) return;

  // 2. Ask puppeteer where it put Chrome (works when its own postinstall ran)
  try {
    const pup = require('puppeteer');
    const exe = typeof pup.executablePath === 'function' ? pup.executablePath() : null;
    if (save(exe)) return;
  } catch (e) {
    console.log('[postinstall] executablePath() error:', e.message.split('\n')[0]);
  }

  // 3. Chrome is missing — download it into .puppeteer-cache using @puppeteer/browsers.
  //    This happens on Render when node_modules is cached across builds so
  //    Puppeteer's own postinstall never re-ran with the new PUPPETEER_CACHE_DIR.
  console.log('[postinstall] Chrome not in cache — downloading via @puppeteer/browsers …');
  try {
    const { install, Browser } = require('@puppeteer/browsers');

    let buildId = getExpectedBuildId();
    if (!buildId) {
      // Last-resort hardcoded fallback (version bundled with puppeteer ^22)
      buildId = '127.0.6533.88';
      console.log('[postinstall] Could not detect buildId — using fallback:', buildId);
    } else {
      console.log('[postinstall] buildId from config:', buildId);
    }

    const result = await install({
      cacheDir: CACHE_DIR,
      browser:  Browser.CHROME,
      buildId,
      downloadProgressCallback: (downloaded, total) => {
        if (total) process.stdout.write(`\r[postinstall] downloading ${Math.round(downloaded / total * 100)}% `);
      },
    });
    process.stdout.write('\n');
    if (save(result.executablePath)) return;
  } catch (e) {
    console.log('\n[postinstall] @puppeteer/browsers install failed:', e.message);
  }

  // 4. Scan every known cache location as a last resort
  const fallbackDirs = [
    process.env.PUPPETEER_CACHE_DIR,
    path.join(process.env.HOME || '', '.cache', 'puppeteer'),
    '/root/.cache/puppeteer',
    '/opt/render/.cache/puppeteer',
  ].filter(Boolean);

  for (const dir of fallbackDirs) {
    const found = scan(dir);
    if (save(found)) return;
  }

  console.log('[postinstall] ✗ Chrome could not be located or downloaded.');
  console.log('[postinstall]   Set PUPPETEER_EXECUTABLE_PATH in Render env vars as a manual override.');
}

main().catch(e => console.error('[postinstall] fatal:', e.message));
