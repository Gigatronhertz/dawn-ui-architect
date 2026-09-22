// The single source of truth for Karije's trip/experience categories.
// `value` matches the `category` column on a curated trip (see
// backend/services/experiencesSeed.js). Shared by Explore's vibe chips and
// the landing page's category cards so the two can never drift apart.
export const TRIP_CATEGORIES: { value: string; emoji: string; label: string }[] = [
  { value: "all",       emoji: "🌍", label: "Everything" },
  { value: "adventure", emoji: "⛵", label: "Adventure" },
  { value: "culture",   emoji: "🎭", label: "Culture" },
  { value: "nature",    emoji: "🌿", label: "Nature" },
  { value: "leisure",   emoji: "🌊", label: "Chill" },
  { value: "food",      emoji: "🍽️", label: "Food" },
  { value: "nightlife", emoji: "🎉", label: "Nightlife" },
];
