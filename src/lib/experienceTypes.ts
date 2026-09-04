// Shared Experience types — used by api.ts, Admin.tsx, and Explore.tsx.
// The canonical schema lives in src/data/experiences.ts;
// this file exports the same types so API-sourced data matches.

export interface DaySchedule {
  time: string;
  activity: string;
  details?: string;
}

export interface Experience {
  id: string;
  name: string;
  tagline: string;
  description: string;
  pricePerPersonPerDay: number;
  maxDays: number;
  category: 'adventure' | 'culture' | 'nature' | 'leisure' | 'food' | 'nightlife';
  location: string;
  imageId: string;
  colorFallback: string;
  included: string[];
  schedule: DaySchedule[];
  scheduleOverrides: Record<number, DaySchedule[]>;
  highlights: string[];
  groupMin: number;
  groupMax: number;
  notes: string | null;
  state: string;
  published: boolean;
  sortOrder: number;
  createdAt?: number;
  updatedAt?: number;
}

export interface AIPlan {
  title: string;
  tagline: string;
  schedule: DaySchedule[];
  highlights: string[];
  estimatedCostPerPerson: number;
  included: string[];
  notes: string | null;
}

export const EMPTY_EXPERIENCE: Omit<Experience, 'id' | 'createdAt' | 'updatedAt'> = {
  name:                 '',
  tagline:              '',
  description:          '',
  pricePerPersonPerDay: 0,
  maxDays:              1,
  category:             'leisure',
  location:             '',
  imageId:              '',
  colorFallback:        '#2F4A33',
  included:             [],
  schedule:             [],
  scheduleOverrides:    {},
  highlights:           [],
  groupMin:             2,
  groupMax:             40,
  notes:                null,
  state:                'Lagos',
  published:            true,
  sortOrder:            0,
};

// ── Nightlife venues — curated for Explore's "Nightlife in {city}" section ──

export interface NightlifeVenue {
  id: string;
  name: string;
  tagline: string;
  vibe: string;       // e.g. "Bar", "Club", "Lounge", "Rooftop"
  location: string;
  imageId: string;
  colorFallback: string;
  feeMin: number;
  feeMax: number;
  feeNote: string | null;
  state: string;
  published: boolean;
  sortOrder: number;
  createdAt?: number;
  updatedAt?: number;
}

export const NIGHTLIFE_VIBES = ['Bar', 'Club', 'Lounge', 'Rooftop', 'Beach Club', 'Live Music'] as const;

export const EMPTY_NIGHTLIFE_VENUE: Omit<NightlifeVenue, 'id' | 'createdAt' | 'updatedAt'> = {
  name:          '',
  tagline:       '',
  vibe:          'Bar',
  location:      '',
  imageId:       '',
  colorFallback: '#1A1A1A',
  feeMin:        0,
  feeMax:        0,
  feeNote:       null,
  state:         'Lagos',
  published:     true,
  sortOrder:     0,
};

// ── Events — curated for Explore's "What's on" section ──────────────────────

export interface EventItem {
  id: string;
  name: string;
  tagline: string;
  description: string;
  category: string;   // e.g. "concert", "festival", "sports", "comedy", "other"
  location: string;
  eventDate: string | null; // ISO date, e.g. "2026-11-20"
  imageId: string;
  colorFallback: string;
  priceMin: number;
  priceMax: number;
  priceNote: string | null;
  ticketUrl: string | null;
  state: string;
  published: boolean;
  sortOrder: number;
  createdAt?: number;
  updatedAt?: number;
}

export const EVENT_CATEGORIES = ['concert', 'festival', 'sports', 'comedy', 'other'] as const;

export const EMPTY_EVENT: Omit<EventItem, 'id' | 'createdAt' | 'updatedAt'> = {
  name:          '',
  tagline:       '',
  description:   '',
  category:      'other',
  location:      '',
  eventDate:     null,
  imageId:       '',
  colorFallback: '#2F4A33',
  priceMin:      0,
  priceMax:      0,
  priceNote:     null,
  ticketUrl:     null,
  state:         'Lagos',
  published:     true,
  sortOrder:     0,
};
