/**
 * Runs after `npm install` to locate the Chrome binary Puppeteer just downloaded
 * and save its absolute path to .chrome-path so findChrome() can read it at runtime.
 *
 * Key reason this is a separate file rather than a node -e inline script:
 * __dirname gives us the absolute backend directory, which is stable across
 * Render's build vs runtime containers.
 */
const fs   = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '.chrome-path');

console.log('[postinstall] HOME:', process.env.HOME || '(not set)');
console.log('[postinstall] PUPPETEER_CACHE_DIR:', process.env.PUPPETEER_CACHE_DIR || '(not set)');
console.log('[postinstall] __dirname:', __dirname);

function trySave(exe) {
  if (!exe) return false;
  if (!fs.existsSync(exe)) {
    console.log('[postinstall] path does not exist:', exe);
    return false;
  }
  fs.writeFileSync(OUT, exe, 'utf8');
  console.log('[postinstall] ✓ Chrome saved to .chrome-path →', exe);
  return true;
}

try {
  // 1. Try the installed puppeteer package directly
  const pup = require('puppeteer');
  const exe = typeof pup.executablePath === 'function' ? pup.executablePath() : null;
  console.log('[postinstall] puppeteer.executablePath():', exe);
  if (trySave(exe)) process.exit(0);

  // 2. Scan common cache dirs — covers cases where PUPPETEER_CACHE_DIR isn't set
  //    and executablePath() returns a path that hasn't been written yet.
  const cacheDirs = [
    process.env.PUPPETEER_CACHE_DIR,
    path.join(__dirname, '.puppeteer-cache'),   // project-local (gets bundled in Render build artifact)
    path.join(process.env.HOME || '', '.cache', 'puppeteer'),
    '/root/.cache/puppeteer',
    '/opt/render/.cache/puppeteer',
    '/home/render/.cache/puppeteer',
  ].filter(Boolean);

  for (const base of cacheDirs) {
    for (const shell of ['chrome', 'chrome-headless-shell']) {
      const shellDir = path.join(base, shell);
      if (!fs.existsSync(shellDir)) continue;
      const versions = fs.readdirSync(shellDir).sort().reverse();
      for (const ver of versions) {
        const candidates = [
          path.join(shellDir, ver, `${shell}-linux64`, shell),
          path.join(shellDir, ver, `${shell}-linux64`, 'chrome'),
          path.join(shellDir, ver, `${shell}-win64`, `${shell}.exe`),
          path.join(shellDir, ver, `${shell}-win64`, 'chrome.exe'),
        ];
        const found = candidates.find(p => fs.existsSync(p));
        if (found && trySave(found)) process.exit(0);
      }
    }
  }

  console.log('[postinstall] Could not locate Chrome. Set PUPPETEER_EXECUTABLE_PATH in Render env vars.');
} catch (err) {
  console.log('[postinstall] error:', err.message);
}
