/**
 * Resolve a curated trip's stored image reference to a displayable URL.
 *
 * The field holds one of two things:
 *  • a full URL — a photo of the actual place, hosted anywhere
 *  • a bare Unsplash photo ID — what the original seed data used
 *
 * Sizing params are only appended to Unsplash IDs, since we can't resize an
 * arbitrary host's image by URL.
 */
export function tripImageUrl(ref: string | null | undefined, w: number, h: number): string {
  if (!ref) return "";
  const trimmed = ref.trim();
  if (/^(https?:\/\/|data:|\/)/i.test(trimmed)) return trimmed;
  return `https://images.unsplash.com/photo-${trimmed}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;
}
