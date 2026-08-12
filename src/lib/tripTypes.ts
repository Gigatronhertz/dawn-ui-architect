// Shared CuratedTrip types — used by api.ts, Admin.tsx, and Trips.tsx.
// Mirrors the `curated_trips` table in backend/db/client.js.

export interface TripDayActivity {
  time: string;
  activity: string;
  details?: string;
}

export interface TripDay {
  day: number;
  title: string;
  activities: TripDayActivity[];
}

export interface CuratedTrip {
  id: string;
  name: string;
  tagline: string;
  description: string;
  /** Departure city the price is quoted from. */
  origin: string;
  /** Destination state — what the trips page groups by. */
  state: string;
  /** Display subtitle, e.g. "Cross River · Calabar". */
  location: string;
  days: number;
  /** "From" price per person, in naira. */
  priceFrom: number;
  /** Short display chip, e.g. "Beach & chill". */
  tag: string;
  emoji: string;
  imageId: string;
  colorFallback: string;
  included: string[];
  highlights: string[];
  itinerary: TripDay[];
  groupMin: number;
  groupMax: number;
  notes: string | null;
  published: boolean;
  sortOrder: number;
  createdAt?: number;
  updatedAt?: number;
}

export const EMPTY_TRIP: Omit<CuratedTrip, 'id' | 'createdAt' | 'updatedAt'> = {
  name:          '',
  tagline:       '',
  description:   '',
  origin:        'Lagos',
  state:         'Lagos',
  location:      '',
  days:          2,
  priceFrom:     0,
  tag:           '',
  emoji:         '🧳',
  imageId:       '',
  colorFallback: '#2F4A33',
  included:      [],
  highlights:    [],
  itinerary:     [],
  groupMin:      2,
  groupMax:      40,
  notes:         null,
  published:     false,
  sortOrder:     0,
};
