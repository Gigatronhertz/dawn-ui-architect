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
