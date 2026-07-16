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
export type ConfirmResponse = { tripId: string; botNumber: string; destination: string; squadSize: number; dmSent: boolean; instructions: string[] };

export type AgentProfile = {
  phone: string;
  agencyName: string;
  waNumber?: string;
  serviceFee: number;
  color: string;
  planType: 'starter' | 'growth';
  tagline?: string;
};

export type TripRow = {
  id: string;
  origin: string | null;
  destination: string | null;
  days: number | null;
  squad_size: number | null;
  status: string;
  created_at: number;
  paid_count: number;
  total_members: number;
  total_collected: number;
};

export type DashboardSummary = {
  active_trips: number;
  trips_completed: number;
  total_collected: number;
  pending_payments: number;
  revenue_mtd: number;
};

export type DashboardData = {
  agent: AgentProfile & { agency_name: string; plan_type: string; service_fee: number };
  trips: TripRow[];
  summary: DashboardSummary;
};

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

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data as T;
}

export const api = {
  generatePlan: (intake: IntakeData) => post<PlanResponse>('/api/plan', intake),
  confirmPlan: (tripId: string, plan: GeminiPlan, phone?: string) => post<ConfirmResponse>('/api/confirm', { tripId, plan, phone }),
  joinWaitlist: (payload: { phone: string; source: string }) => post<{ ok: boolean }>('/api/waitlist', payload),
  registerAgent: (payload: AgentProfile) => post<{ ok: boolean; agent: AgentProfile }>('/api/agents', payload),
  getAgent: (phone: string) => get<{ agent: AgentProfile }>(`/api/agents/${encodeURIComponent(phone)}`),
  getDashboard: (phone: string) => get<DashboardData>(`/api/dashboard/${encodeURIComponent(phone)}`),
};
