/**
 * Intercepts all console.log / warn / error calls, timestamps them,
 * and keeps the last MAX_LINES in memory so /api/logs can return them.
 *
 * Must be required ONCE at the very top of index.js before anything else.
 */

const MAX_LINES = 600;
const lines = [];

const _log   = console.log.bind(console);
const _warn  = console.warn.bind(console);
const _error = console.error.bind(console);

function capture(level, args) {
  const msg = args
    .map(a => (a instanceof Error ? `${a.message}\n${a.stack}` : typeof a === 'object' ? JSON.stringify(a) : String(a)))
    .join(' ');
  const entry = { ts: new Date().toISOString(), level, msg };
  lines.push(entry);
  if (lines.length > MAX_LINES) lines.shift();
  return entry;
}

console.log   = (...args) => { const e = capture('LOG',   args); _log(`${e.ts}  ${e.msg}`); };
console.warn  = (...args) => { const e = capture('WARN',  args); _warn(`${e.ts}  WARN  ${e.msg}`); };
console.error = (...args) => { const e = capture('ERROR', args); _error(`${e.ts}  ERROR ${e.msg}`); };
console.info  = console.log;

module.exports = { getLines: () => [...lines] };
