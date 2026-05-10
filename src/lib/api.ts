const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export type IntakeData = {
  origin: string;
  destination: string;
  budget: number;
  days: number;
  squadSize: number;
  accommodationType: string;
  dateFlexibility: string;
  dealbreakers: string;
};

export type Activity = { time: string; title: string; cost_per_person: number };
export type PlanDay = { day: number; title: string; activities: Activity[] };

export type GeminiPlan = {
  hotel: { name: string; area: string; price_per_night: number; rating: number; perks: string[] };
  transport: { operator: string; type: string; price_per_person: number; depart_time: string; arrive_time: string; pickup: string };
  days: PlanDay[];
  date_options: { id: string; label: string; sub: string }[];
  cost_breakdown: { transport_total: number; lodging_total: number; food_total: number; activities_total: number; buffer: number; total: number; per_person: number };
  highlights: string[];
  offline_note: string;
};

export type PlanResponse = { tripId: string; plan: GeminiPlan };
export type ConfirmResponse = { tripId: string; botNumber: string; destination: string; squadSize: number; instructions: string[] };

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data as T;
}

export const api = {
  generatePlan: (intake: IntakeData) => post<PlanResponse>('/api/plan', intake),
  confirmPlan: (tripId: string, plan: GeminiPlan) => post<ConfirmResponse>('/api/confirm', { tripId, plan }),
};
