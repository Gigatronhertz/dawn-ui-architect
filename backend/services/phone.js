/**
 * Nigerian phone numbers arrive as 0803…, 803…, 234803… or +234803… — all the
 * same person. Pandascrow wants one form (+234…), and so does everything that
 * messages people, so every number is cleaned here on the way in.
 * Returns null when what was typed can't be a phone number.
 */
function normalisePhone(raw) {
  if (typeof raw !== 'string' && typeof raw !== 'number') return null;
  const s = String(raw).trim();
  let d = s.replace(/\D/g, '');
  if (!d) return null;
  if (s.startsWith('+')) return d.length >= 10 && d.length <= 15 ? `+${d}` : null;
  if (d.startsWith('234') && d.length === 13) return `+${d}`;
  if (d.startsWith('0') && d.length === 11) return `+234${d.slice(1)}`;
  if (d.length === 10 && /^[789]/.test(d)) return `+234${d}`;
  return d.length >= 10 && d.length <= 15 ? `+${d}` : null;
}

module.exports = { normalisePhone };
