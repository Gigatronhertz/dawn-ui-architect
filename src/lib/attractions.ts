/**
 * Shared helpers for turning a raw attraction row into something presentable.
 *
 * Both planners work off the same 272-venue table, so the emoji, the vibe and
 * the price note are derived here rather than in each page — otherwise the same
 * place shows up as Cultural on one screen and Chill on the other.
 */
import type { Attraction } from "@/lib/api";

export function attractionEmoji(name: string): string {
  const n = name.toLowerCase();
  if (/waterfall|spring|lake|river|beach|bay|creek/.test(n)) return '🌊';
  if (/park|garden|reserve|forest|wildlife|nature/.test(n)) return '🌿';
  if (/hill|mountain|plateau|peak|rock|summit/.test(n)) return '⛰️';
  if (/museum|palace|castle|bunker|wall|tomb|heritage|moat|fort|monument/.test(n)) return '🏛️';
  if (/market|craft|village|cultural centre/.test(n)) return '🏪';
  if (/zoo|safari|ranch|game/.test(n)) return '🦁';
  if (/cave/.test(n)) return '🪨';
  if (/festival/.test(n)) return '🎉';
  if (/dam/.test(n)) return '💧';
  if (/beach club|nightlife|bar|strip/.test(n)) return '🌙';
  if (/stadium|arena/.test(n)) return '🏟️';
  if (/resort|spa/.test(n)) return '🏖️';
  return '📍';
}

/** The vibe chips filter on this. Matches the labels used across both planners. */
export function attractionVibe(name: string): string {
  const n = name.toLowerCase();
  if (/market|craft|palace|museum|fort|wall|heritage|tomb|cultural|monument|moat|emir|shrine/.test(n)) return 'Cultural';
  if (/waterfall|beach|lake|park|garden|reserve|nature|wildlife|hill|mountain|plateau|rock|cave|dam|spring|river/.test(n)) return 'Adventure';
  if (/bar|club|strip|night|entertainment|amusement|resort/.test(n)) return 'Nightlife';
  if (/food|restaurant|cuisine|bukka/.test(n)) return 'Foodie';
  return 'Chill';
}

export const VENUE_VIBES = ['All', 'Cultural', 'Adventure', 'Chill', 'Foodie', 'Nightlife'] as const;

export const VIBE_EMOJI: Record<string, string> = {
  All: '🌍', Cultural: '🏛️', Adventure: '⛰️', Chill: '🌿', Foodie: '🍲', Nightlife: '🌙',
};

export type VenueItem = {
  id: string;
  name: string;
  emoji: string;
  vibe: string;
  /** Midpoint of the fee range — what gets added to the per-person cost. */
  cost: number;
  /** Human-readable price, e.g. "₦1,000–₦2,000" or "Free". */
  feeNote: string;
  /** Real photo when the venue was imported with one — run through imageUrl(). */
  imageUrl?: string | null;
  address?: string | null;
};

/** Shape a raw attraction row for the venue pickers. */
export function toVenue(a: Attraction): VenueItem {
  return {
    id:      `attr-${a.id}`,
    name:    a.name,
    emoji:   attractionEmoji(a.name),
    vibe:    attractionVibe(a.name),
    cost:    a.fee_max > 0 ? Math.round((a.fee_min + a.fee_max) / 2) : 0,
    feeNote: a.fee_note
      || (a.fee_max > 0 ? `₦${a.fee_min.toLocaleString()}–₦${a.fee_max.toLocaleString()}` : 'Free'),
    imageUrl: a.imageUrl ?? null,
    address:  a.address ?? null,
  };
}
