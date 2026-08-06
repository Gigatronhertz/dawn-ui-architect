const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
console.log('[api] Backend URL:', API_URL);

export type IntakeData = {
  origin: string;
  destination: string;
  budget: number;
  days: number;
  squadSize: number;
  accommodationType: string;
  dateFlexibility: string;
  dealbreakers: string;
  transport?: string;
  vibe?: string;
  specificDates?: string;
};

export type Attraction = { id: number; state: string; name: string; fee_min: number; fee_max: number; fee_note: string | null };

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

export type ScrapedFlightOffer = { price: number; airline: string | null; stops: number | null; duration: string | null; roundTrip: boolean };
export type ScrapedFlights = { available: boolean; cheapestNGN: number; averageNGN: number; cheapestAirline: string; directAvailable: boolean; offers: ScrapedFlightOffer[]; source: string };
export type GTHotel = { name: string; pricePerNight: number; rating: number | null; stars: number | null; deal: string | null; amenities: string[]; location: string | null };
export type GTRental = { name: string; pricePerNight: number; type: string | null; sleeps: number | null; bedrooms: number | null; amenities: string[] };
export type BHotel = { id: number; name: string; rating: number | null; address: string; pricePerNight: number | null; propertyType: string | null; stars: number | null; freeCancellation: boolean; url?: string | null };
export type GIGMTrip = { operator: string; departureTime: string | null; arrivalTime: string | null; price: number; class: string; seatsAvailable: number; terminal: string | null };
export type ScrapedData = { flights: ScrapedFlights | null; gtHotels: GTHotel[]; bHotels: BHotel[]; gtRentals: GTRental[]; bApartments: BHotel[]; gigmTrips: GIGMTrip[]; localAttractions?: Attraction[] };

export type PlanResponse = { tripId: string; plan: GeminiPlan; scraped?: ScrapedData };
export type ConfirmResponse = { tripId: string; botNumber: string; destination: string; squadSize: number; dmSent: boolean; instructions: string[]; selectedDate?: string | null };

export type UserPlan = {
  tripId:           string;
  origin:           string | null;
  destination:      string | null;
  days:             number | null;
  squadSize:        number | null;
  status:           string;
  plan:             GeminiPlan | null;
  createdAt:        number;
  participantCount: number;
  paidCount:        number;
  totalCollected:   number;
};

/** Returned by GET /api/public/plan/:tripId — safe to show without auth */
export type PublicPlanResponse = {
  tripId:           string;
  origin:           string | null;
  destination:      string | null;
  days:             number | null;
  squadSize:        number | null;
  hotel:            GeminiPlan['hotel'];
  transport:        GeminiPlan['transport'];
  highlights:       string[];
  days_plan:        PlanDay[];
  cost_breakdown:   GeminiPlan['cost_breakdown'];
  participantCount: number;
  selectedDate:     string | null;
  paidCount:        number;
  totalCollected:   number;
  paymentsEnabled:  boolean;
  participants:     { name: string | null; paid: boolean; createdAt: number }[];
};

export type ParticipantsResponse = {
  count:          number;
  paidCount:      number;
  totalCollected: number;
  names:          string[];
};

/** Returned by POST /api/plan — job is created, work runs in background */
export type CreatePlanResponse = { tripId: string; status: 'generating' };

/** Polled via GET /api/plan/:tripId */
export type PollPlanResponse = {
  tripId:  string;
  status:  'generating' | 'plan_review' | 'error';
  plan?:   GeminiPlan;
  scraped?: ScrapedData | null;
  intake?: IntakeData | null;
  error?:  string;
};

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

async function post<T>(path: string, body: unknown, headers?: Record<string, string>): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data as T;
}

async function get<T>(path: string, headers?: Record<string, string>): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data as T;

}

function bearer(token: string) { return { Authorization: `Bearer ${token}` }; }

// ── Session token helpers ──────────────────────────────────────────────────
const TOKEN_KEY = 'msgo_token';

export const session = {
  /** Store the JWT returned by /auth/google/callback */
  save:   (token: string) => localStorage.setItem(TOKEN_KEY, token),
  /** Retrieve the stored JWT (null if not signed in) */
  get:    ()              => localStorage.getItem(TOKEN_KEY),
  /** Remove the JWT (sign out) */
  clear:  ()              => localStorage.removeItem(TOKEN_KEY),
  /** Build the backend Google OAuth URL with an optional tripId to link */
  googleAuthUrl: (opts?: { tripId?: string; redirect?: string }) => {
    const base = `${API_URL}/auth/google`;
    const params = new URLSearchParams();
    if (opts?.tripId)   params.set('tripId',   opts.tripId);
    if (opts?.redirect) params.set('redirect', opts.redirect);
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  },
};

export const api = {
  /** Fire-and-forget: creates the job, returns tripId immediately. */
  createPlan:   (intake: IntakeData) => post<CreatePlanResponse>('/api/plan', intake),
  /** Poll until status is 'plan_review' or 'error'. */
  pollPlan:     (tripId: string)     => get<PollPlanResponse>(`/api/plan/${tripId}`),
  /** @deprecated Use createPlan + pollPlan instead. Kept for any legacy callers. */
  generatePlan: (intake: IntakeData) => post<PlanResponse>('/api/plan', intake),
  getGigmBuses: (from: string, to: string, date?: string) =>
    get<{ from: string; to: string; count: number; trips: GIGMTrip[] }>(
      `/api/gigm-test?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}${date ? `&date=${date}` : ''}`
    ),
  confirmPlan: (tripId: string, plan: GeminiPlan, phone?: string, selectedDate?: string) =>
    post<ConfirmResponse>('/api/confirm', { tripId, plan, phone, selectedDate: selectedDate || null }),
  /** Save a push subscription and/or email address to notify when the plan is ready. */
  subscribeNotify: (tripId: string, opts: { subscription?: object; email?: string }) =>
    post<{ ok: boolean }>('/api/notify/subscribe', { tripId, ...opts }),

  /** Link a completed trip to the signed-in user's account. */
  linkPlan:   (tripId: string, token: string) =>
    post<{ ok: boolean }>('/api/auth/link-plan', { tripId }, bearer(token)),

  /** Fetch all plans saved by the authenticated user. */
  getMyPlans: (token: string) =>
    get<{ plans: UserPlan[] }>('/api/auth/plans', bearer(token)),

  /** Verify token and return profile. */
  getMe: (token: string) =>
    get<{ uid: string; email: string; name: string | null; photoUrl: string | null; planCount: number }>(
      '/api/auth/me', bearer(token)
    ),

  /** Fetch the public (confirmed) plan — no auth needed. */
  getPublicPlan:  (tripId: string) =>
    get<PublicPlanResponse>(`/api/public/plan/${tripId}`),
  /** Squad member joins the plan — no auth needed. Returns participantId for payment. */
  joinPlan: (tripId: string, name?: string) =>
    post<{ ok: boolean; count: number; participantId: string }>(`/api/public/plan/${tripId}/join`, { name: name || null }),
  /** Poll for live participant count and payment stats. */
  getParticipants: (tripId: string) =>
    get<ParticipantsResponse>(`/api/public/plan/${tripId}/participants`),
  /** Initiate Paystack payment for a squad member's share. Returns authorization_url. */
  initPayment: (tripId: string, opts: { participantId: string; email: string; name?: string }) =>
    post<{ authorization_url: string; reference: string }>(`/api/public/plan/${tripId}/pay`, opts),

  joinWaitlist: (payload: { phone: string; source: string }) => post<{ ok: boolean }>('/api/waitlist', payload),
  registerAgent: (payload: AgentProfile) => post<{ ok: boolean; agent: AgentProfile }>('/api/agents', payload),
  getAgent: (phone: string) => get<{ agent: AgentProfile }>(`/api/agents/${encodeURIComponent(phone)}`),
  getDashboard: (phone: string) => get<DashboardData>(`/api/dashboard/${encodeURIComponent(phone)}`),
};
