/**
 * Check Karije's Pandascrow setup against the sandbox (see services/sandboxCheck.js).
 *
 *   node backend/scripts/pandascrowSandboxCheck.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { runSandboxCheck } = require('../services/sandboxCheck');

runSandboxCheck().then(({ refused, results }) => {
  if (refused) { console.error(`Refusing: ${refused}`); process.exit(2); }
  for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.step}${r.detail ? `\n      ${r.detail}` : ''}`);
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} passed.`);
  process.exit(failed ? 1 : 0);
}).catch((e) => { console.error('Unexpected error:', e.message); process.exit(1); });
