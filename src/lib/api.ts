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
  hotel: { name: string; area: string; price_per_night: number; rating: number; perks: string[]; imageUrl?: string | null };
  transport: { operator: string; type: string; price_per_person: number; depart_time: string; arrive_time: string; pickup: string; logo?: string | null };
  days: PlanDay[];
  date_options: { id: string; label: string; sub: string }[];
  cost_breakdown: { transport_total: number; lodging_total: number; food_total: number; activities_total: number; buffer: number; total: number; per_person: number };
  highlights: string[];
  offline_note: string;
  /** Present only on curated trips — the ones Karije picked and runs. */
  curated?: {
    experienceId: string;
    name:         string;
    tagline:      string;
    location:     string;
    imageId:      string;
    included:     string[];
    groupMin:     number;
    groupMax:     number;
  } | null;
};

export type ScrapedFlightOffer = { price: number; airline: string | null; logo?: string | null; stops: number | null; duration: string | null; roundTrip: boolean };
export type ScrapedFlights = { available: boolean; cheapestNGN: number; averageNGN: number; cheapestAirline: string; directAvailable: boolean; offers: ScrapedFlightOffer[]; source: string };
export type GTHotel = { name: string; pricePerNight: number; rating: number | null; stars: number | null; deal: string | null; amenities: string[]; location: string | null; imageUrl?: string | null };
export type GTRental = { name: string; pricePerNight: number; type: string | null; sleeps: number | null; bedrooms: number | null; amenities: string[] };
/** Google Places–sourced hotel — ratings/address/phone, no live pricing (see backend/services/googleMaps.js). */
export type GHotel = { name: string; address: string; rating: number | null; ratingCount: number; priceLevel: string | null; phone: string | null; estimatedNightNGN: number | null; imageUrl?: string | null };
export type GIGMTrip = { operator: string; departureTime: string | null; arrivalTime: string | null; price: number; class: string; seatsAvailable: number; terminal: string | null };
export type ScrapedData = { flights: ScrapedFlights | null; gtHotels: GTHotel[]; gHotels?: GHotel[]; gtRentals: GTRental[]; gigmTrips: GIGMTrip[]; localAttractions?: Attraction[] };

export type PlanResponse = { tripId: string; plan: TripPlan; scraped?: ScrapedData };
export type ConfirmResponse = { tripId: string; destination: string; squadSize: number; emailSent: boolean; selectedDate?: string | null };

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
  /** Present only when an agency owns the trip — null for a squad's own plan. */
  agency:           PlanAgency | null;
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
  /** How many automated nudges have gone out to this person. */
  remindersSent:  number;
  lastRemindedAt: number | null;
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
  destination?:  string | null;
  squadSize?:    number | null;
  selectedDate?: string | null;
};

/**
 * Turn a backend image path into something an <img> can load. The API is on a
 * different origin in production, so a relative path would point at the
 * frontend and 404.
 */
export function imageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return `${API_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

export type AgentProfile = {
  phone: string;
  agencyName: string;
  waNumber?: string;
  serviceFee: number;
  color: string;
  planType: 'starter' | 'growth';
  tagline?: string;
  /** Points into the image store; run it through imageUrl() before rendering. */
  logo_image_id?: string | null;
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
  /** Set when the trip is owned by an agency rather than a squad organiser. */
  agent_id?: string | null;
  title?: string | null;
  summary?: string | null;
  listed?: number | null;
  selected_date?: string | null;
};

export type DashboardSummary = {
  active_trips: number;
  trips_completed: number;
  total_collected: number;
  pending_payments: number;
  revenue_mtd: number;
};

export type DashboardData = {
  // wa_number is the raw agents column, snake_case as the row comes back —
  // the dashboard reads it, and leaving it off the type made that a build error.
  agent: AgentProfile & { agency_name: string; plan_type: string; service_fee: number; wa_number?: string };
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

async function patch<T>(path: string, body: unknown, headers?: Record<string, string>): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data as T;
}

async function del<T>(path: string, headers?: Record<string, string>): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { method: 'DELETE', headers });
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

/** A trip shape an agency saved to run again. */
export type TripTemplate = {
  id: string;
  name: string;
  city: string | null;
  squadSize: number;
  dayCount: number;
  perPerson: number;
  days: { activities: AgencyStop[] }[];
  createdAt: number;
};

/** One stop on an agency-built day. */
export type AgencyStop = { time: string; title: string; cost_per_person: number };

/** One traveller on an agency trip, as the dashboard sees them. */
export type AgencySquadMember = {
  id: string;
  name: string | null;
  email: string | null;
  waNumber: string | null;
  paid: boolean;
  amount: number | null;
  paidAt: number | null;
  wantsReminders: boolean;
  joinedAt: number;
  remindersSent: number;
  lastRemindedAt: number | null;
  /** Paystack reference, so a payment can be matched against a statement. */
  reference: string | null;
};

export type AgencyTripDetail = {
  /** The agency that owns the trip — its own branding, for the header. */
  agency: { name: string; color: string | null; logoUrl: string | null };
  trip: {
    id: string; title: string | null; summary: string | null; city: string;
    days: number; squadSize: number; listed: boolean; status: string;
    selectedDate: string | null; createdAt: number; perPerson: number;
  };
  plan: TripPlan | null;
  squad: AgencySquadMember[];
  /** The trip's money position, from the ledger. */
  money: {
    collected: number; serviceFee: number; dueToOrganiser: number;
    paidOut: number; outstanding: number;
  } | null;
  summary: { joined: number; paid: number; pending: number; collected: number };
};

/** A trip an agency has chosen to list in the Karije catalog. */
export type AgencyListing = {
  kind: 'agency_trip';
  id: string; name: string; tagline: string; location: string;
  days: number; groupMax: number | null; date: string | null;
  perPerson: number; imageId: string | null; colorFallback: string;
  agency: string; href: string;
  /** Relative image path, or null when the agency has not uploaded one. */
  agencyLogo: string | null;
};

/** The agency running a trip, shown on its public plan. */
export type PlanAgency = {
  name: string;
  tagline: string | null;
  color: string | null;
  logoUrl: string | null;
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
  confirmPlan: (tripId: string, plan: TripPlan, email?: string, selectedDate?: string) =>
    post<ConfirmResponse>('/api/confirm', { tripId, plan, email, selectedDate: selectedDate || null }),
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

  /**
   * Same trip, no account needed — used to get a shareable id before sending a
   * curated trip to a squad. Sharing needs something to link to, and requiring
   * a sign-in first is what left the share message with no link in it.
   */
  createShareTrip: (id: string, opts: { days: number; squadSize: number }) =>
    post<{ ok: boolean; tripId: string; perPerson: number; total: number; days: number }>(
      `/api/experiences/${encodeURIComponent(id)}/share-trip`, opts
    ),

  /**
   * Adopt a trip that nobody owns yet — how a plan made before signing up ends
   * up in the planner's My Plans instead of being stranded.
   */
  claimTrip: (tripId: string, token: string) =>
    post<{ ok: boolean; tripId: string; claimed: boolean }>(
      `/api/plan/${encodeURIComponent(tripId)}/claim`, {}, bearer(token)
    ),

  /** Ask the AI to fill the day schedule. Leaves transport and hotel alone. */
  draftDays: (tripId: string, opts: { transport?: string; vibe?: string } = {}) =>
    post<{ ok: boolean; days: PlanDay[]; highlights: string[] }>(
      `/api/plan/${encodeURIComponent(tripId)}/draft-days`, opts
    ),

  /**
   * A few places that would go well with what's already planned. Always drawn
   * from the real venue table, so prices are never invented.
   */
  suggestVenues: (body: { city: string; added: string[]; vibe?: string | null }) =>
    post<{ suggestions: (Attraction & { reason: string | null })[] }>('/api/suggest-venues', body),

  /** Venues for one city, for the build-your-own planner. No auth needed. */
  getAttractions: (city: string) =>
    get<{ city: string; state: string; attractions: Attraction[] }>(
      `/api/attractions?city=${encodeURIComponent(city)}`
    ),

  /** Save a day out the squad built themselves. Returns the shareable trip id. */
  saveCustomTrip: (
    body: { city: string; squadSize: number; days: { activities: Activity[] }[] },
    token: string,
  ) =>
    post<{ ok: boolean; tripId: string; perPerson: number; total: number }>(
      '/api/custom-trip', body, bearer(token)
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
    opts: { name?: string; email?: string; remindMe?: boolean } = {},
  ) =>
    post<{ ok: boolean; count: number; participantId: string }>(
      `/api/public/plan/${tripId}/join`,
      {
        name:     opts.name     || null,
        email:    opts.email    || null,
        remindMe: !!opts.remindMe,
      },
    ),
  /**
   * Whether this person has actually paid, according to the server.
   * The `?paid=1` the browser comes back with only means "returned from
   * Paystack" — it says nothing about whether money moved.
   */
  getMyPaymentStatus: (tripId: string, participantId: string) =>
    get<{ paid: boolean; amount: number | null; paidAt: number | null; hasEmail: boolean }>(
      `/api/public/plan/${tripId}/participant/${participantId}`
    ),

  /**
   * Where "Pay now" goes once we already know who someone is.
   *
   * The backend resolves this to a live Paystack checkout, reading the email
   * captured when they joined — so nobody is asked for it a second time. Not a
   * fetch: it's a link the browser follows, ending on Paystack.
   */
  payLink: (participantId: string) => `${API_URL}/pay/${participantId}`,

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

  /** Curated nightlife venues for one city — Explore's "Nightlife" section. */
  getNightlifeVenues: (city: string) =>
    get<{ venues: import('./experienceTypes').NightlifeVenue[] }>(`/api/nightlife?city=${encodeURIComponent(city)}`),

  /** Curated events for one city — Explore's "What's on" section. */
  getEvents: (city: string) =>
    get<{ events: import('./experienceTypes').EventItem[] }>(`/api/events?city=${encodeURIComponent(city)}`),

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
  // ── Agency branding ──────────────────────────────────────────────────────
  /** Upload the agency logo. Send the raw File — the mime comes from its type. */
  uploadAgencyLogo: async (file: File, token: string) => {
    const res = await fetch(`${API_URL}/api/pro/logo`, {
      method: 'POST',
      headers: { 'Content-Type': file.type, Authorization: `Bearer ${token}` },
      body: file,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not upload the logo.');
    return data as { ok: boolean; logoImageId: string; url: string };
  },

  /** Drop the logo. The stored image stays, so live plans keep rendering. */
  removeAgencyLogo: (token: string) =>
    del<{ ok: boolean }>('/api/pro/logo', bearer(token)),

  // ── Agency-owned trips ───────────────────────────────────────────────────
  /** Create a trip the agency owns. Costs are re-derived server-side. */
  createAgencyTrip: (
    payload: {
      title: string; summary?: string; city: string; squadSize: number;
      listed?: boolean; selectedDate?: string | null;
      days: { activities: AgencyStop[] }[];
      /** Also keep this trip's shape as a reusable template. */
      saveAsTemplate?: boolean;
      templateName?: string;
    },
    token: string,
  ) => post<{ ok: boolean; tripId: string; perPerson: number; total: number; templateId: string | null }>(
    '/api/pro/trips', payload, bearer(token),
  ),

  /** Templates this agency has saved. */
  listTripTemplates: (token: string) =>
    get<{ templates: TripTemplate[] }>('/api/pro/templates', bearer(token)),

  /** Save a shape as a template outside of creating a trip. */
  createTripTemplate: (
    payload: { name: string; city?: string; squadSize?: number; days: { activities: AgencyStop[] }[] },
    token: string,
  ) => post<{ ok: boolean; template: TripTemplate }>('/api/pro/templates', payload, bearer(token)),

  deleteTripTemplate: (templateId: string, token: string) =>
    del<{ ok: boolean }>(`/api/pro/templates/${templateId}`, bearer(token)),

  /** The agency's view of one of its trips: itinerary, travellers, money. */
  getAgencyTrip: (tripId: string, token: string) =>
    get<AgencyTripDetail>(`/api/pro/trips/${tripId}`, bearer(token)),

  /** Edit a trip, including flipping it on or off the Karije catalog. */
  updateAgencyTrip: (
    tripId: string,
    payload: {
      title?: string; summary?: string; listed?: boolean; squadSize?: number;
      selectedDate?: string; days?: { activities: AgencyStop[] }[];
    },
    token: string,
  ) => patch<{ ok: boolean; trip: { id: string; title: string; listed: boolean } }>(
    `/api/pro/trips/${tripId}`, payload, bearer(token),
  ),

  /** Absolute URL of the traveller CSV. Needs the token as a header, so fetch it. */
  agencyTripCsvUrl: (tripId: string) => `${API_URL}/api/pro/trips/${tripId}/travellers.csv`,

  /** Chase unpaid travellers now. Omit participantIds to chase everyone unpaid. */
  remindAgencyTrip: (tripId: string, participantIds: string[] | undefined, token: string) =>
    post<{
      ok: boolean; sent: number; skipped?: number; message?: string;
      results: { participantId: string; ok: boolean; channel?: string; reason?: string }[];
    }>(`/api/pro/trips/${tripId}/remind`, participantIds ? { participantIds } : {}, bearer(token)),

  /** The public catalog: Karije experiences plus listed agency trips. */
  getListings: (city?: string) =>
    get<{ experiences: import('./experienceTypes').Experience[]; agencyTrips: AgencyListing[] }>(
      city ? `/api/listings?city=${encodeURIComponent(city)}` : '/api/listings',
    ),

  registerAgent: (payload: AgentProfile) => post<{ ok: boolean; agent: AgentProfile }>('/api/agents', payload),
  getAgent: (phone: string) => get<{ agent: AgentProfile }>(`/api/agents/${encodeURIComponent(phone)}`),
  getDashboard: (phone: string) => get<DashboardData>(`/api/dashboard/${encodeURIComponent(phone)}`),
};
