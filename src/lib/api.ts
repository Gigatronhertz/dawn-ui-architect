const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
console.log('[api] Backend URL:', API_URL);

export type IntakeData = {
  origin: string;
  destination: string;
  /**
   * Nightly room ceiling in naira. Caps the hotel search and the AI's hotel
   * pick — it is deliberately NOT a whole-trip budget, since transport,
   * activity and meal prices are whatever they actually cost.
   */
  hotelBudgetPerNight: number;
  days: number;
  squadSize: number;
  accommodationType: string;
  dateFlexibility: string;
  dealbreakers: string;
  transport?: string;
  vibe?: string;
  specificDates?: string;
  roundTrip?: boolean;
};

export type Attraction = { id: number; state: string; name: string; fee_min: number; fee_max: number; fee_note: string | null };

export type Activity = { time: string; title: string; cost_per_person: number };
export type PlanDay = { day: number; title: string; activities: Activity[] };

export type TripPlan = {
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

export type PlanResponse = { tripId: string; plan: TripPlan; scraped?: ScrapedData };
export type ConfirmResponse = { tripId: string; botNumber: string; destination: string; squadSize: number; dmSent: boolean; instructions: string[]; selectedDate?: string | null };

export type UserPlan = {
  tripId:           string;
  origin:           string | null;
  destination:      string | null;
  days:             number | null;
  squadSize:        number | null;
  status:           string;
  plan:             TripPlan | null;
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
  hotel:            TripPlan['hotel'];
  transport:        TripPlan['transport'];
  highlights:       string[];
  days_plan:        PlanDay[];
  cost_breakdown:   TripPlan['cost_breakdown'];
  participantCount: number;
  selectedDate:     string | null;
  paidCount:        number;
  totalCollected:   number;
  paymentsEnabled:  boolean;
  participants:     { name: string | null; paid: boolean; createdAt: number }[];
  /** Present only on curated trips — the Karije-run ones. */
  curated: {
    experienceId: string;
    name:         string;
    tagline:      string;
    location:     string;
    imageId:      string;
    included:     string[];
    groupMin:     number;
    groupMax:     number;
  } | null;
  /** Headcount the squad must reach for the trip to run. Null when not applicable. */
  groupMin: number | null;
};

export type SquadMember = {
  name:           string | null;
  email:          string | null;
  waNumber:       string | null;
  paid:           boolean;
  amount:         number | null;
  paidAt:         number | null;
  wantsReminders: boolean;
  joinedAt:       number;
};

export type SquadResponse = {
  tripId:   string;
  groupMin: number | null;
  /** Unpaid first — those are the ones who need chasing. */
  squad:    SquadMember[];
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
  tripId:       string;
  status:       'generating' | 'plan_review' | 'awaiting_group' | 'error';
  plan?:        TripPlan;
  scraped?:     ScrapedData | null;
  intake?:      IntakeData | null;
  error?:       string;
  // Present when status === 'awaiting_group' (trip already confirmed)
  confirmed?:    boolean;
  botNumber?:    string;
  destination?:  string | null;
  squadSize?:    number | null;
  selectedDate?: string | null;
  instructions?: string[];
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
  confirmPlan: (tripId: string, plan: TripPlan, phone?: string, selectedDate?: string) =>
    post<ConfirmResponse>('/api/confirm', { tripId, plan, phone, selectedDate: selectedDate || null }),
  /** Save a push subscription and/or email address to notify when the plan is ready. */
  subscribeNotify: (tripId: string, opts: { subscription?: object; email?: string }) =>
    post<{ ok: boolean }>('/api/notify/subscribe', { tripId, ...opts }),

  /** Link a completed trip to the signed-in user's account. */
  linkPlan:   (tripId: string, token: string) =>
    post<{ ok: boolean }>('/api/auth/link-plan', { tripId }, bearer(token)),

  /** Save a curated trip to the signed-in user's plans. */
  addCuratedToPlan: (
    id: string,
    opts: { days: number; squadSize: number },
    token: string,
  ) =>
    post<{ ok: boolean; tripId: string; perPerson: number; total: number; days: number }>(
      `/api/experiences/${encodeURIComponent(id)}/add-to-plan`, opts, bearer(token)
    ),

  /** The organiser's view of one trip — who's in, who's paid, how to reach them. */
  getSquad: (tripId: string, token: string) =>
    get<SquadResponse>(`/api/auth/plans/${encodeURIComponent(tripId)}/squad`, bearer(token)),

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
  /**
   * Squad member joins the plan — no auth needed. Returns participantId for payment.
   * `remindMe` marks someone who is in but not paying yet, so the follow-up
   * knows to chase them.
   */
  joinPlan: (
    tripId: string,
    opts: { name?: string; email?: string; waNumber?: string; remindMe?: boolean } = {},
  ) =>
    post<{ ok: boolean; count: number; participantId: string }>(
      `/api/public/plan/${tripId}/join`,
      {
        name:     opts.name     || null,
        email:    opts.email    || null,
        waNumber: opts.waNumber || null,
        remindMe: !!opts.remindMe,
      },
    ),
  /** Poll for live participant count and payment stats. */
  getParticipants: (tripId: string) =>
    get<ParticipantsResponse>(`/api/public/plan/${tripId}/participants`),
  /** Initiate Paystack payment for a squad member's share. Returns authorization_url. */
  initPayment: (tripId: string, opts: { participantId: string; email: string; name?: string }) =>
    post<{ authorization_url: string; reference: string }>(`/api/public/plan/${tripId}/pay`, opts),

  /** Send a magic sign-in link to the given email. Returns preview URL if Resend not configured. */
  sendMagicLink: (opts: { email: string; tripId?: string; redirect?: string }) =>
    post<{ ok: boolean; preview?: string }>('/auth/magic', opts),

  /** Create a new Karije account (email + password). Sends a verification email. */
  signup: (opts: { email: string; password: string; tripId?: string }) =>
    post<{ ok: boolean; preview?: string }>('/auth/signup', opts),

  /** Sign in with email + password. Returns a JWT on success. */
  login: (opts: { email: string; password: string }) =>
    post<{ ok: boolean; token: string }>('/auth/login', opts),

  /** Fetch published curated experiences for a state. */
  getExperiences: (state = 'Lagos') =>
    get<{ experiences: import('./experienceTypes').Experience[] }>(`/api/experiences?state=${encodeURIComponent(state)}`),

  /** Create or update the agency profile tied to the authenticated user. */
  setupPro: (
    payload: { agencyName: string; tagline?: string; phone: string; waNumber?: string; serviceFee?: number; color?: string; planType?: string },
    token: string,
  ) => post<{ ok: boolean; agent: AgentProfile }>('/api/pro/setup', payload, bearer(token)),

  /** Get the agency profile for the authenticated user (404 if not set up). */
  getProMe: (token: string) =>
    get<{ agent: AgentProfile & { agency_name: string; plan_type: string; service_fee: number; wa_number?: string } }>('/api/pro/me', bearer(token)),

  /** Get the full agency dashboard (agent + trips + summary) for the authenticated user. */
  getProDashboard: (token: string) =>
    get<DashboardData>('/api/pro/dashboard', bearer(token)),

  joinWaitlist: (payload: { phone: string; source: string }) => post<{ ok: boolean }>('/api/waitlist', payload),

  /** Submit an agency / pro plan lead. */
  submitAgencyLead: (payload: { name: string; agencyName: string; phone: string; email: string }) =>
    post<{ ok: boolean }>('/api/agency-leads', payload),
  registerAgent: (payload: AgentProfile) => post<{ ok: boolean; agent: AgentProfile }>('/api/agents', payload),
  getAgent: (phone: string) => get<{ agent: AgentProfile }>(`/api/agents/${encodeURIComponent(phone)}`),
  getDashboard: (phone: string) => get<DashboardData>(`/api/dashboard/${encodeURIComponent(phone)}`),
};
