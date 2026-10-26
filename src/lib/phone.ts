/**
 * Mirrors backend/services/phone.js: Nigerian numbers typed as 0803…, 803…,
 * 234803… or +234803… all become +234803…. Null when it can't be a number.
 */
export function normalisePhone(raw: string): string | null {
  const s = raw.trim();
  const d = s.replace(/\D/g, "");
  if (!d) return null;
  if (s.startsWith("+")) return d.length >= 10 && d.length <= 15 ? `+${d}` : null;
  if (d.startsWith("234") && d.length === 13) return `+${d}`;
  if (d.startsWith("0") && d.length === 11) return `+234${d.slice(1)}`;
  if (d.length === 10 && /^[789]/.test(d)) return `+234${d}`;
  return d.length >= 10 && d.length <= 15 ? `+${d}` : null;
}
