/**
 * Karije admin panel — /admin
 *
 * One admin key unlocks every section. Sections are tabs, each managing its
 * own list/form state:
 *   Experiences → curated day experiences shown on /start/explore
 *   Trips       → ready-made multi-day trips shown on /trips
 *   Attractions → the attraction price table the AI planner quotes from
 */
import { useCallback, useEffect, useState } from "react";
import { KarijeLogo } from "@/components/Nav";
import {
  type Experience,
  type DaySchedule,
  EMPTY_EXPERIENCE,
} from "@/lib/experienceTypes";
import {
  type CuratedTrip,
  type TripDay,
  EMPTY_TRIP,
} from "@/lib/tripTypes";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

type Tab = "experiences" | "trips" | "attractions";

// ── Admin API helpers ──────────────────────────────────────────────────────────

function adminHeaders(key: string) {
  return { "Content-Type": "application/json", "X-Admin-Key": key };
}

async function apiFetch<T>(path: string, key: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { ...adminHeaders(key), ...(init?.headers as Record<string, string> ?? {}) },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
  return json as T;
}

// ── Shared options ─────────────────────────────────────────────────────────────

const CATEGORIES = ['adventure', 'culture', 'nature', 'leisure', 'food'] as const;
const CAT_EMOJI: Record<string, string> = {
  adventure: '⛵', culture: '🎭', nature: '🌿', leisure: '🏖️', food: '🍽️',
};
const STATES = ['Lagos', 'Abuja', 'Rivers', 'Delta', 'Oyo', 'Anambra', 'Kano', 'Enugu'];

/** Every state the attractions table covers — also the trip destination list. */
const ALL_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Abuja', 'Bauchi', 'Bayelsa', 'Benue',
  'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'Gombe',
  'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos',
  'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers',
  'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
];

const inp = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/30";
const labelCls = "block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1";
const section = "bg-white border border-gray-200 rounded-xl p-6 space-y-5";

// ── Reusable list editor ───────────────────────────────────────────────────────

function ListEditor({
  label,
  items,
  onChange,
  placeholder = "Add item…",
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</label>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && draft.trim()) {
              e.preventDefault();
              onChange([...items, draft.trim()]);
              setDraft("");
            }
          }}
          placeholder={placeholder}
          className="flex-1 border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30"
        />
        <button
          type="button"
          onClick={() => { if (draft.trim()) { onChange([...items, draft.trim()]); setDraft(""); } }}
          className="px-3 py-2 bg-gray-800 text-white rounded text-sm hover:bg-gray-700"
        >
          + Add
        </button>
      </div>
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded px-3 py-1.5">
          <span className="flex-1 text-sm">{item}</span>
          <button
            type="button"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            className="text-gray-400 hover:text-red-500 text-xs"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Schedule editor (experiences) ──────────────────────────────────────────────

function ScheduleEditor({
  label,
  items,
  onChange,
}: {
  label: string;
  items: DaySchedule[];
  onChange: (items: DaySchedule[]) => void;
}) {
  function update(i: number, field: keyof DaySchedule, val: string) {
    onChange(items.map((s, j) => j === i ? { ...s, [field]: val } : s));
  }
  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</label>
      {items.map((s, i) => (
        <div key={i} className="grid grid-cols-[80px,1fr,1fr,28px] gap-2 bg-gray-50 border border-gray-100 rounded p-2">
          <input
            value={s.time}
            onChange={(e) => update(i, "time", e.target.value)}
            placeholder="HH:MM"
            className="border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green-500/40"
          />
          <input
            value={s.activity}
            onChange={(e) => update(i, "activity", e.target.value)}
            placeholder="Activity name"
            className="border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green-500/40"
          />
          <input
            value={s.details || ""}
            onChange={(e) => update(i, "details", e.target.value)}
            placeholder="Details (optional)"
            className="border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green-500/40"
          />
          <button
            type="button"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            className="text-gray-300 hover:text-red-500 text-xs self-center"
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, { time: "", activity: "", details: "" }])}
        className="text-xs text-green-700 hover:underline"
      >
        + Add schedule item
      </button>
    </div>
  );
}

// ── Itinerary editor (trips) ───────────────────────────────────────────────────

function ItineraryEditor({
  days,
  onChange,
}: {
  days: TripDay[];
  onChange: (days: TripDay[]) => void;
}) {
  const setDay = (di: number, patch: Partial<TripDay>) =>
    onChange(days.map((d, i) => i === di ? { ...d, ...patch } : d));

  const setActivity = (di: number, ai: number, field: keyof TripDay["activities"][number], val: string) =>
    setDay(di, {
      activities: days[di].activities.map((a, j) => j === ai ? { ...a, [field]: val } : a),
    });

  return (
    <div className="space-y-3">
      {days.map((d, di) => (
        <div key={di} className="border border-gray-200 rounded-lg p-3 space-y-2 bg-gray-50/60">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 shrink-0">DAY {d.day}</span>
            <input
              value={d.title}
              onChange={(e) => setDay(di, { title: e.target.value })}
              placeholder="Day title — e.g. Beach day"
              className="flex-1 border border-gray-200 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-green-500/40"
            />
            <button
              type="button"
              onClick={() => onChange(
                days.filter((_, j) => j !== di).map((day, j) => ({ ...day, day: j + 1 }))
              )}
              className="text-gray-300 hover:text-red-500 text-xs"
              aria-label={`Remove day ${d.day}`}
            >
              ✕
            </button>
          </div>

          {d.activities.map((a, ai) => (
            <div key={ai} className="grid grid-cols-[70px,1fr,1fr,24px] gap-2">
              <input
                value={a.time}
                onChange={(e) => setActivity(di, ai, "time", e.target.value)}
                placeholder="09:00"
                className="border border-gray-200 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-green-500/40"
              />
              <input
                value={a.activity}
                onChange={(e) => setActivity(di, ai, "activity", e.target.value)}
                placeholder="Activity"
                className="border border-gray-200 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-green-500/40"
              />
              <input
                value={a.details || ""}
                onChange={(e) => setActivity(di, ai, "details", e.target.value)}
                placeholder="Details (optional)"
                className="border border-gray-200 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-green-500/40"
              />
              <button
                type="button"
                onClick={() => setDay(di, { activities: d.activities.filter((_, j) => j !== ai) })}
                className="text-gray-300 hover:text-red-500 text-xs self-center"
              >
                ✕
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={() => setDay(di, { activities: [...d.activities, { time: "", activity: "", details: "" }] })}
            className="text-xs text-green-700 hover:underline"
          >
            + Add activity
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChange([...days, { day: days.length + 1, title: "", activities: [] }])}
        className="text-xs font-medium text-green-700 hover:underline"
      >
        + Add day
      </button>
    </div>
  );
}

// ── Experiences section ────────────────────────────────────────────────────────

function ExperiencesSection({ adminKey }: { adminKey: string }) {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(false);
  const [listErr, setListErr] = useState("");
  const [stateFilter, setStateFilter] = useState("Lagos");
  const [editing, setEditing] = useState<Experience | null>(null);
  const [formBusy, setFormBusy] = useState(false);
  const [formErr, setFormErr] = useState("");

  useEffect(() => {
    setLoading(true);
    setListErr("");
    apiFetch<{ experiences: Experience[] }>("/admin/experiences", adminKey)
      .then(d => setExperiences(d.experiences))
      .catch(e => setListErr(e.message))
      .finally(() => setLoading(false));
  }, [adminKey]);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await apiFetch(`/admin/experiences/${id}`, adminKey, { method: "DELETE" });
      setExperiences(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed.");
    }
  }

  async function handleSave(exp: Experience) {
    setFormBusy(true);
    setFormErr("");
    try {
      const isNew = !experiences.find(e => e.id === exp.id);
      const result = await apiFetch<{ ok: boolean; experience: Experience }>(
        isNew ? "/admin/experiences" : `/admin/experiences/${exp.id}`,
        adminKey,
        { method: isNew ? "POST" : "PUT", body: JSON.stringify(exp) }
      );
      setExperiences(prev => isNew
        ? [...prev, result.experience]
        : prev.map(e => e.id === exp.id ? result.experience : e));
      setEditing(null);
    } catch (err) {
      setFormErr(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setFormBusy(false);
    }
  }

  if (editing) {
    return (
      <ExperienceForm
        initial={editing}
        onSave={handleSave}
        onCancel={() => { setEditing(null); setFormErr(""); }}
        busy={formBusy}
        error={formErr}
      />
    );
  }

  const filtered = experiences.filter(e => stateFilter === "All" || e.state === stateFilter);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {["All", ...STATES].map(s => (
            <button
              key={s}
              onClick={() => setStateFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                stateFilter === s
                  ? "bg-[#2F4A33] text-[#F7F1E7]"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-gray-400"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <button
          onClick={() => setEditing({ id: `exp_${Date.now()}`, ...EMPTY_EXPERIENCE } as Experience)}
          className="bg-[#2F4A33] text-[#F7F1E7] px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition"
        >
          + New experience
        </button>
      </div>

      {loading && <p className="text-sm text-gray-500">Loading…</p>}
      {listErr && <p className="text-sm text-red-500">{listErr}</p>}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-sm">No experiences for {stateFilter}. Create one above.</p>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(exp => (
          <div key={exp.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <div className="h-32 relative" style={{ backgroundColor: exp.colorFallback }}>
              {exp.imageId && (
                <img
                  src={`https://images.unsplash.com/photo-${exp.imageId}?auto=format&fit=crop&w=480&h=200&q=70`}
                  alt={exp.name}
                  className="w-full h-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              )}
              <div className="absolute top-2 left-2 flex gap-1.5">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${exp.published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {exp.published ? "Published" : "Draft"}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/80 text-gray-600 font-medium">
                  {CAT_EMOJI[exp.category]} {exp.category}
                </span>
              </div>
            </div>

            <div className="p-4">
              <div className="text-[10px] text-gray-400 font-mono mb-1">{exp.id}</div>
              <h3 className="font-semibold text-gray-900">{exp.name}</h3>
              <p className="text-xs text-gray-500 mt-0.5 truncate">{exp.tagline}</p>

              <div className="flex items-center justify-between mt-3">
                <div>
                  <span className="font-mono text-sm text-gray-800">
                    ₦{exp.pricePerPersonPerDay.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-gray-400">/p·day</span>
                </div>
                <span className="text-[10px] text-gray-400">
                  {exp.maxDays === 1 ? "1 day" : `Up to ${exp.maxDays} days`} · {exp.state}
                </span>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setEditing(exp)}
                  className="flex-1 text-center border border-gray-200 rounded-lg py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(exp.id, exp.name)}
                  className="flex-1 text-center border border-red-100 rounded-lg py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Trips section ──────────────────────────────────────────────────────────────

function TripsSection({ adminKey }: { adminKey: string }) {
  const [trips, setTrips] = useState<CuratedTrip[]>([]);
  const [loading, setLoading] = useState(false);
  const [listErr, setListErr] = useState("");
  const [editing, setEditing] = useState<CuratedTrip | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [formBusy, setFormBusy] = useState(false);
  const [formErr, setFormErr] = useState("");

  useEffect(() => {
    setLoading(true);
    setListErr("");
    apiFetch<{ trips: CuratedTrip[] }>("/admin/trips", adminKey)
      .then(d => setTrips(d.trips))
      .catch(e => setListErr(e.message))
      .finally(() => setLoading(false));
  }, [adminKey]);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await apiFetch(`/admin/trips/${id}`, adminKey, { method: "DELETE" });
      setTrips(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed.");
    }
  }

  /** Publish toggle straight from the list — the most common admin action. */
  async function togglePublish(trip: CuratedTrip) {
    const next = { ...trip, published: !trip.published };
    setTrips(prev => prev.map(t => t.id === trip.id ? next : t));
    try {
      await apiFetch<{ ok: boolean; trip: CuratedTrip }>(
        `/admin/trips/${trip.id}`, adminKey,
        { method: "PUT", body: JSON.stringify(next) }
      );
    } catch (err) {
      setTrips(prev => prev.map(t => t.id === trip.id ? trip : t)); // roll back
      alert(err instanceof Error ? err.message : "Could not change publish state.");
    }
  }

  async function handleSave(trip: CuratedTrip) {
    setFormBusy(true);
    setFormErr("");
    try {
      const result = await apiFetch<{ ok: boolean; trip: CuratedTrip }>(
        isNew ? "/admin/trips" : `/admin/trips/${trip.id}`,
        adminKey,
        { method: isNew ? "POST" : "PUT", body: JSON.stringify(trip) }
      );
      setTrips(prev => isNew
        ? [...prev, result.trip]
        : prev.map(t => t.id === trip.id ? result.trip : t));
      setEditing(null);
    } catch (err) {
      setFormErr(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setFormBusy(false);
    }
  }

  if (editing) {
    return (
      <TripForm
        initial={editing}
        isNew={isNew}
        onSave={handleSave}
        onCancel={() => { setEditing(null); setFormErr(""); }}
        busy={formBusy}
        error={formErr}
      />
    );
  }

  const liveCount = trips.filter(t => t.published).length;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <p className="text-sm text-gray-500">
          {trips.length} trip{trips.length === 1 ? "" : "s"} · {liveCount} live on <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">/trips</code>
        </p>
        <button
          onClick={() => { setIsNew(true); setEditing({ id: "", ...EMPTY_TRIP } as CuratedTrip); }}
          className="bg-[#2F4A33] text-[#F7F1E7] px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition"
        >
          + New trip
        </button>
      </div>

      {loading && <p className="text-sm text-gray-500">Loading…</p>}
      {listErr && <p className="text-sm text-red-500">{listErr}</p>}

      {!loading && trips.length === 0 && !listErr && (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">🧳</div>
          <p className="text-sm">No ready-made trips yet. Create one above.</p>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {trips.map(trip => (
          <div key={trip.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <div className="h-28 relative" style={{ backgroundColor: trip.colorFallback }}>
              {trip.imageId && (
                <img
                  src={`https://images.unsplash.com/photo-${trip.imageId}?auto=format&fit=crop&w=480&h=200&q=70`}
                  alt={trip.name}
                  className="w-full h-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              )}
              <div className="absolute top-2 left-2">
                <button
                  onClick={() => togglePublish(trip)}
                  title="Click to toggle"
                  className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition ${
                    trip.published
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {trip.published ? "Published" : "Draft"}
                </button>
              </div>
              <div className="absolute bottom-2 right-3 text-2xl">{trip.emoji}</div>
            </div>

            <div className="p-4">
              <div className="text-[10px] text-gray-400 font-mono mb-1">{trip.id}</div>
              <h3 className="font-semibold text-gray-900">{trip.name}</h3>
              <p className="text-xs text-gray-500 mt-0.5 truncate">{trip.location || trip.state}</p>

              <div className="flex items-center justify-between mt-3">
                <div>
                  <span className="font-mono text-sm text-gray-800">
                    ₦{trip.priceFrom.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-gray-400">/person</span>
                </div>
                <span className="text-[10px] text-gray-400">
                  {trip.days} day{trip.days === 1 ? "" : "s"} · from {trip.origin}
                </span>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => { setIsNew(false); setEditing(trip); }}
                  className="flex-1 text-center border border-gray-200 rounded-lg py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(trip.id, trip.name)}
                  className="flex-1 text-center border border-red-100 rounded-lg py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Attractions section ────────────────────────────────────────────────────────

type AttractionRow = {
  id: number;
  state: string;
  name: string;
  fee_min: number;
  fee_max: number;
  fee_note: string | null;
};

type StateCount = { state: string; total: number; unpriced: number };

/** Human-readable price summary for a row, matching what the AI planner sees. */
function feeSummary(a: Pick<AttractionRow, "fee_min" | "fee_max">) {
  if (a.fee_max <= 0 && a.fee_min <= 0) return "No price set";
  if (a.fee_min === a.fee_max) return `₦${a.fee_min.toLocaleString()}`;
  return `₦${a.fee_min.toLocaleString()}–₦${a.fee_max.toLocaleString()}`;
}

function AttractionsSection({ adminKey }: { adminKey: string }) {
  const [states,   setStates]   = useState<StateCount[]>([]);
  const [active,   setActive]   = useState("Lagos");
  const [rows,     setRows]     = useState<AttractionRow[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [err,      setErr]      = useState("");
  const [dirty,    setDirty]    = useState<Set<number>>(new Set());
  const [savingId, setSavingId] = useState<number | null>(null);
  const [search,   setSearch]   = useState("");
  const [draft,    setDraft]    = useState({ name: "", fee_min: 0, fee_max: 0, fee_note: "" });
  const [addBusy,  setAddBusy]  = useState(false);

  const loadStates = useCallback(() => {
    apiFetch<{ states: StateCount[] }>("/admin/attractions/states", adminKey)
      .then(d => setStates(d.states))
      .catch(e => setErr(e.message));
  }, [adminKey]);

  useEffect(() => { loadStates(); }, [loadStates]);

  useEffect(() => {
    setLoading(true);
    setErr("");
    setDirty(new Set());
    apiFetch<{ attractions: AttractionRow[] }>(
      `/admin/attractions?state=${encodeURIComponent(active)}`, adminKey
    )
      .then(d => setRows(d.attractions))
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, [active, adminKey]);

  function edit(id: number, patch: Partial<AttractionRow>) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
    setDirty(prev => new Set(prev).add(id));
  }

  async function saveRow(row: AttractionRow) {
    setSavingId(row.id);
    try {
      const { attraction } = await apiFetch<{ ok: boolean; attraction: AttractionRow }>(
        `/admin/attractions/${row.id}`, adminKey,
        {
          method: "PUT",
          body: JSON.stringify({
            name:     row.name,
            fee_min:  row.fee_min,
            fee_max:  row.fee_max,
            fee_note: row.fee_note || null,
          }),
        }
      );
      setRows(prev => prev.map(r => r.id === row.id ? attraction : r));
      setDirty(prev => { const n = new Set(prev); n.delete(row.id); return n; });
      loadStates();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSavingId(null);
    }
  }

  async function addRow(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.name.trim()) return;
    setAddBusy(true);
    try {
      const { attraction } = await apiFetch<{ ok: boolean; attraction: AttractionRow }>(
        "/admin/attractions", adminKey,
        {
          method: "POST",
          body: JSON.stringify({
            state:    active,
            name:     draft.name.trim(),
            fee_min:  draft.fee_min,
            fee_max:  draft.fee_max,
            fee_note: draft.fee_note || null,
          }),
        }
      );
      setRows(prev => [...prev, attraction].sort((a, b) => a.name.localeCompare(b.name)));
      setDraft({ name: "", fee_min: 0, fee_max: 0, fee_note: "" });
      loadStates();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Could not add attraction.");
    } finally {
      setAddBusy(false);
    }
  }

  async function removeRow(row: AttractionRow) {
    if (!confirm(`Delete "${row.name}" from ${row.state}? The AI planner will stop suggesting it.`)) return;
    try {
      await apiFetch(`/admin/attractions/${row.id}`, adminKey, { method: "DELETE" });
      setRows(prev => prev.filter(r => r.id !== row.id));
      loadStates();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed.");
    }
  }

  const activeCount = states.find(s => s.state === active);
  const visible = rows.filter(r =>
    !search || r.name.toLowerCase().includes(search.toLowerCase())
  );
  const cell = "border border-gray-200 rounded px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-green-500/40";

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6">
        <h2 className="font-semibold text-gray-900">Attraction prices</h2>
        <p className="text-sm text-gray-500 mt-1">
          These are the only venues the AI planner is allowed to suggest, and the prices it quotes.
          Research the real gate fee and correct it here — every plan for that state gets more accurate.
        </p>
      </div>

      {err && <p className="text-sm text-red-500 mb-4">{err}</p>}

      <div className="grid lg:grid-cols-[220px,1fr] gap-6 items-start">
        {/* State picker */}
        <aside className="border border-gray-200 rounded-xl bg-white overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-100 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            States · {states.length}
          </div>
          <div className="max-h-[70vh] overflow-y-auto">
            {states.map(s => (
              <button
                key={s.state}
                onClick={() => { setActive(s.state); setSearch(""); }}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left transition ${
                  active === s.state ? "bg-[#2F4A33] text-[#F7F1E7]" : "hover:bg-gray-50 text-gray-700"
                }`}
              >
                <span className="truncate">{s.state}</span>
                <span className="flex items-center gap-1.5 shrink-0">
                  {s.unpriced > 0 && (
                    <span
                      title={`${s.unpriced} with no price set`}
                      className={`text-[10px] px-1.5 rounded-full font-medium ${
                        active === s.state ? "bg-[#F7F1E7]/20 text-[#F7F1E7]" : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {s.unpriced}
                    </span>
                  )}
                  <span className={`text-[10px] ${active === s.state ? "text-[#F7F1E7]/60" : "text-gray-400"}`}>
                    {s.total}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </aside>

        {/* Rows */}
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
            <div>
              <h3 className="font-semibold text-gray-900">{active}</h3>
              {activeCount && (
                <p className="text-xs text-gray-500">
                  {activeCount.total} attraction{activeCount.total === 1 ? "" : "s"}
                  {activeCount.unpriced > 0 && (
                    <span className="text-amber-600"> · {activeCount.unpriced} still need a price</span>
                  )}
                </p>
              )}
            </div>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={`Search ${active}…`}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-green-600/30"
            />
          </div>

          {loading && <p className="text-sm text-gray-500">Loading…</p>}

          {!loading && (
            <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
              {/* Header */}
              <div className="hidden md:grid grid-cols-[1fr,110px,110px,1fr,120px] gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                <span>Name</span>
                <span>Fee min (₦)</span>
                <span>Fee max (₦)</span>
                <span>Fee note</span>
                <span className="text-right">Actions</span>
              </div>

              {visible.map(row => {
                const isDirty = dirty.has(row.id);
                const unpriced = row.fee_min === 0 && row.fee_max === 0;
                return (
                  <div
                    key={row.id}
                    className={`grid md:grid-cols-[1fr,110px,110px,1fr,120px] gap-2 px-3 py-2 border-b border-gray-100 last:border-0 items-center ${
                      isDirty ? "bg-amber-50/60" : unpriced ? "bg-amber-50/25" : ""
                    }`}
                  >
                    <input
                      value={row.name}
                      onChange={e => edit(row.id, { name: e.target.value })}
                      className={cell}
                    />
                    <input
                      type="number"
                      min={0}
                      value={row.fee_min}
                      onChange={e => edit(row.id, { fee_min: Number(e.target.value) })}
                      className={`${cell} tabular-nums`}
                    />
                    <input
                      type="number"
                      min={0}
                      value={row.fee_max}
                      onChange={e => edit(row.id, { fee_max: Number(e.target.value) })}
                      className={`${cell} tabular-nums`}
                    />
                    <input
                      value={row.fee_note || ""}
                      onChange={e => edit(row.id, { fee_note: e.target.value })}
                      placeholder={feeSummary(row)}
                      className={cell}
                    />
                    <div className="flex items-center justify-end gap-2">
                      {isDirty && (
                        <button
                          onClick={() => saveRow(row)}
                          disabled={savingId === row.id}
                          className="text-xs font-medium px-2.5 py-1 rounded bg-[#2F4A33] text-[#F7F1E7] hover:opacity-90 disabled:opacity-50 transition"
                        >
                          {savingId === row.id ? "Saving…" : "Save"}
                        </button>
                      )}
                      <button
                        onClick={() => removeRow(row)}
                        className="text-xs text-gray-300 hover:text-red-500 transition px-1"
                        aria-label={`Delete ${row.name}`}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}

              {visible.length === 0 && (
                <p className="px-3 py-8 text-center text-sm text-gray-400">
                  {search ? `Nothing in ${active} matching "${search}".` : `No attractions for ${active} yet.`}
                </p>
              )}

              {/* Add row */}
              <form
                onSubmit={addRow}
                className="grid md:grid-cols-[1fr,110px,110px,1fr,120px] gap-2 px-3 py-3 bg-gray-50 border-t border-gray-200 items-center"
              >
                <input
                  value={draft.name}
                  onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                  placeholder={`New attraction in ${active}`}
                  className={cell}
                />
                <input
                  type="number"
                  min={0}
                  value={draft.fee_min}
                  onChange={e => setDraft(d => ({ ...d, fee_min: Number(e.target.value) }))}
                  className={`${cell} tabular-nums`}
                />
                <input
                  type="number"
                  min={0}
                  value={draft.fee_max}
                  onChange={e => setDraft(d => ({ ...d, fee_max: Number(e.target.value) }))}
                  className={`${cell} tabular-nums`}
                />
                <input
                  value={draft.fee_note}
                  onChange={e => setDraft(d => ({ ...d, fee_note: e.target.value }))}
                  placeholder="e.g. ₦1,000 weekdays, ₦2,000 weekends"
                  className={cell}
                />
                <button
                  type="submit"
                  disabled={addBusy || !draft.name.trim()}
                  className="text-xs font-medium px-3 py-1.5 rounded bg-gray-800 text-white hover:bg-gray-700 disabled:opacity-40 transition"
                >
                  {addBusy ? "Adding…" : "+ Add"}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function Admin() {
  const [adminKey, setAdminKey] = useState(() => localStorage.getItem("karije_admin_key") || "");
  const [signedIn, setSignedIn] = useState(false);
  const [tab, setTab] = useState<Tab>("experiences");
  const [keyInput, setKeyInput] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);

  useEffect(() => {
    document.title = "Admin · Karije";
    if (localStorage.getItem("karije_admin_key")) setSignedIn(true);
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginBusy(true);
    setLoginErr("");
    try {
      await apiFetch("/admin/auth/verify", keyInput, {
        method: "POST",
        body: JSON.stringify({ key: keyInput }),
      });
      localStorage.setItem("karije_admin_key", keyInput);
      setAdminKey(keyInput);
      setSignedIn(true);
    } catch {
      setLoginErr("Invalid admin key.");
    } finally {
      setLoginBusy(false);
    }
  }

  function logout() {
    localStorage.removeItem("karije_admin_key");
    setAdminKey("");
    setSignedIn(false);
  }

  if (!signedIn) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <KarijeLogo />
            <p className="text-sm text-gray-500 mt-2">Admin panel</p>
          </div>
          <form onSubmit={handleLogin} className="bg-white border border-gray-200 rounded-xl p-8 space-y-4 shadow-sm">
            <h1 className="text-xl font-semibold text-gray-900">Sign in</h1>
            <input
              type="password"
              value={keyInput}
              onChange={e => setKeyInput(e.target.value)}
              placeholder="Admin key"
              required
              autoFocus
              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/30"
            />
            {loginErr && <p className="text-xs text-red-500">{loginErr}</p>}
            <button
              type="submit"
              disabled={loginBusy || !keyInput}
              className="w-full bg-[#2F4A33] text-[#F7F1E7] py-3 rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
            >
              {loginBusy ? "Checking…" : "Enter"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  const TABS: { id: Tab; label: string; hint: string }[] = [
    { id: "experiences", label: "Experiences", hint: "Day experiences on /start/explore" },
    { id: "trips",       label: "Trips",       hint: "Ready-made trips on /trips" },
    { id: "attractions", label: "Attractions", hint: "Prices the AI planner quotes" },
  ];

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <KarijeLogo />
            <span className="text-xs font-mono bg-gray-100 text-gray-500 px-2 py-0.5 rounded">admin</span>
          </div>
          <button onClick={logout} className="text-xs text-gray-400 hover:text-gray-700">Sign out</button>
        </div>
        <nav className="px-6 flex gap-1 -mb-px">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              title={t.hint}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
                tab === t.id
                  ? "border-[#2F4A33] text-[#2F4A33]"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      {tab === "experiences" && <ExperiencesSection adminKey={adminKey} />}
      {tab === "trips"       && <TripsSection       adminKey={adminKey} />}
      {tab === "attractions" && <AttractionsSection adminKey={adminKey} />}
    </main>
  );
}

// ── Trip form ──────────────────────────────────────────────────────────────────

function TripForm({
  initial,
  isNew,
  onSave,
  onCancel,
  busy,
  error,
}: {
  initial: CuratedTrip;
  isNew: boolean;
  onSave: (trip: CuratedTrip) => void;
  onCancel: () => void;
  busy: boolean;
  error: string;
}) {
  const [form, setForm] = useState<CuratedTrip>(initial);

  const set = <K extends keyof CuratedTrip>(key: K, val: CuratedTrip[K]) =>
    setForm(f => ({ ...f, [key]: val }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave(form);
  }

  return (
    <div className="pb-24">
      <div className="sticky top-[97px] z-[9] bg-gray-50/95 backdrop-blur border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onCancel} className="text-sm text-gray-500 hover:text-gray-800">← Back</button>
          <span className="text-sm font-semibold text-gray-900">
            {isNew ? "New trip" : `Edit: ${initial.name}`}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {error && <span className="text-xs text-red-500">{error}</span>}
          <button
            onClick={handleSubmit}
            disabled={busy || !form.name.trim()}
            className="bg-[#2F4A33] text-[#F7F1E7] px-5 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition"
          >
            {busy ? "Saving…" : "Save trip"}
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 pt-8 space-y-6">
        {/* ── Basic info ── */}
        <div className={section}>
          <h2 className="font-semibold text-gray-900">Basic info</h2>

          <div>
            <label className={labelCls}>Name</label>
            <input value={form.name} onChange={e => set("name", e.target.value)} className={inp} placeholder="Lekki Weekend Escape" required />
          </div>

          {!isNew && (
            <div>
              <label className={labelCls}>ID <span className="text-gray-400 normal-case font-normal">(fixed after creation)</span></label>
              <input value={form.id} disabled className={`${inp} bg-gray-50 text-gray-400 font-mono text-xs`} />
            </div>
          )}
          {isNew && (
            <p className="text-xs text-gray-400 -mt-2">
              The ID is generated from the name when you save (e.g. <code>lekki-weekend-escape</code>).
            </p>
          )}

          <div>
            <label className={labelCls}>Tagline <span className="text-gray-400 normal-case font-normal">(1 short sentence)</span></label>
            <input value={form.tagline} onChange={e => set("tagline", e.target.value)} className={inp} placeholder="Two days of beach, bonfires and island air." />
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <textarea rows={4} value={form.description} onChange={e => set("description", e.target.value)} className={inp} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Departs from</label>
              <select value={form.origin} onChange={e => set("origin", e.target.value)} className={inp}>
                {ALL_STATES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Destination state</label>
              <select value={form.state} onChange={e => set("state", e.target.value)} className={inp}>
                {ALL_STATES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Location line <span className="text-gray-400 normal-case font-normal">(shown under the trip name)</span></label>
            <input value={form.location} onChange={e => set("location", e.target.value)} className={inp} placeholder="Cross River · Calabar" />
          </div>

          <div>
            <label className={labelCls}>Tag <span className="text-gray-400 normal-case font-normal">(chip on the card)</span></label>
            <input value={form.tag} onChange={e => set("tag", e.target.value)} className={inp} placeholder="Beach & chill" />
          </div>
        </div>

        {/* ── Pricing & group ── */}
        <div className={section}>
          <h2 className="font-semibold text-gray-900">Pricing & group</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>"From" price per person (₦)</label>
              <input type="number" min={0} value={form.priceFrom} onChange={e => set("priceFrom", Number(e.target.value))} className={inp} />
            </div>
            <div>
              <label className={labelCls}>Days</label>
              <input type="number" min={1} max={30} value={form.days} onChange={e => set("days", Number(e.target.value))} className={inp} />
            </div>
            <div>
              <label className={labelCls}>Min group size</label>
              <input type="number" min={1} value={form.groupMin} onChange={e => set("groupMin", Number(e.target.value))} className={inp} />
            </div>
            <div>
              <label className={labelCls}>Max group size</label>
              <input type="number" min={1} value={form.groupMax} onChange={e => set("groupMax", Number(e.target.value))} className={inp} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Notes <span className="text-gray-400 normal-case font-normal">(caveat shown on the detail view)</span></label>
            <input value={form.notes || ""} onChange={e => set("notes", e.target.value || null)} className={inp} placeholder="Boat charter is weather-dependent June–September." />
          </div>
        </div>

        {/* ── Media ── */}
        <div className={section}>
          <h2 className="font-semibold text-gray-900">Media</h2>
          <div className="grid grid-cols-[100px,1fr] gap-4">
            <div>
              <label className={labelCls}>Emoji</label>
              <input value={form.emoji} onChange={e => set("emoji", e.target.value)} className={`${inp} text-center text-lg`} maxLength={4} />
            </div>
            <div>
              <label className={labelCls}>Unsplash photo ID <span className="text-gray-400 normal-case font-normal">(images.unsplash.com/photo-<strong>THIS-PART</strong>)</span></label>
              <input value={form.imageId} onChange={e => set("imageId", e.target.value)} className={inp} placeholder="1773146916270-e811bff4e923" />
            </div>
          </div>
          {form.imageId && (
            <img
              src={`https://images.unsplash.com/photo-${form.imageId}?auto=format&fit=crop&w=480&h=200&q=70`}
              alt="preview"
              className="h-28 w-full object-cover rounded"
              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          )}
          <div>
            <label className={labelCls}>Colour fallback <span className="text-gray-400 normal-case font-normal">(accent bar + image placeholder)</span></label>
            <div className="flex items-center gap-3">
              <input type="color" value={form.colorFallback} onChange={e => set("colorFallback", e.target.value)} className="h-10 w-14 border border-gray-200 rounded cursor-pointer" />
              <input value={form.colorFallback} onChange={e => set("colorFallback", e.target.value)} className={`${inp} w-32`} />
            </div>
          </div>
        </div>

        {/* ── Content ── */}
        <div className={section}>
          <h2 className="font-semibold text-gray-900">Content</h2>
          <ListEditor label="What's included" items={form.included} onChange={v => set("included", v)} placeholder="Return charter bus from Lagos" />
          <ListEditor label="Highlights" items={form.highlights} onChange={v => set("highlights", v)} placeholder="Elegushi and Landmark on the same weekend" />
        </div>

        {/* ── Itinerary ── */}
        <div className={section}>
          <h2 className="font-semibold text-gray-900">Day-by-day itinerary</h2>
          <p className="text-xs text-gray-400">Shown on the trip detail view. Leave empty to hide that section.</p>
          <ItineraryEditor days={form.itinerary} onChange={v => set("itinerary", v)} />
        </div>

        {/* ── Settings ── */}
        <div className={section}>
          <h2 className="font-semibold text-gray-900">Settings</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Sort order <span className="text-gray-400 normal-case font-normal">(lower = first)</span></label>
              <input type="number" min={0} value={form.sortOrder} onChange={e => set("sortOrder", Number(e.target.value))} className={inp} />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={e => set("published", e.target.checked)}
                  className="w-4 h-4 accent-green-700"
                />
                <span className="text-sm font-medium text-gray-700">Published — live on /trips</span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pb-8">
          <button onClick={onCancel} className="px-5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={busy || !form.name.trim()}
            className="bg-[#2F4A33] text-[#F7F1E7] px-6 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition"
          >
            {busy ? "Saving…" : "Save trip"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Experience form ────────────────────────────────────────────────────────────

function ExperienceForm({
  initial,
  onSave,
  onCancel,
  busy,
  error,
}: {
  initial: Experience;
  onSave: (exp: Experience) => void;
  onCancel: () => void;
  busy: boolean;
  error: string;
}) {
  const [form, setForm] = useState<Experience>(initial);

  const set = <K extends keyof Experience>(key: K, val: Experience[K]) =>
    setForm(f => ({ ...f, [key]: val }));

  // Parse schedule_overrides JSON manually for the textarea
  const [overridesJson, setOverridesJson] = useState(() => JSON.stringify(form.scheduleOverrides || {}, null, 2));
  const [overridesErr, setOverridesErr]   = useState("");

  function handleOverridesChange(raw: string) {
    setOverridesJson(raw);
    try {
      const parsed = JSON.parse(raw);
      set("scheduleOverrides", parsed);
      setOverridesErr("");
    } catch {
      setOverridesErr("Invalid JSON — fix before saving.");
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (overridesErr) return;
    onSave(form);
  }

  return (
    <div className="pb-24">
      <div className="sticky top-[97px] z-[9] bg-gray-50/95 backdrop-blur border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onCancel} className="text-sm text-gray-500 hover:text-gray-800">← Back</button>
          <span className="text-sm font-semibold text-gray-900">
            {initial.name ? `Edit: ${initial.name}` : "New experience"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {error && <span className="text-xs text-red-500">{error}</span>}
          <button
            onClick={handleSubmit}
            disabled={busy || !!overridesErr}
            className="bg-[#2F4A33] text-[#F7F1E7] px-5 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition"
          >
            {busy ? "Saving…" : "Save experience"}
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 pt-8 space-y-6">

        {/* ── Basic info ── */}
        <div className={section}>
          <h2 className="font-semibold text-gray-900">Basic info</h2>

          <div>
            <label className={labelCls}>ID <span className="text-gray-400 normal-case font-normal">(slug, no spaces)</span></label>
            <input value={form.id} onChange={e => set("id", e.target.value)} className={inp} placeholder="beach-camp" />
          </div>
          <div>
            <label className={labelCls}>Name</label>
            <input value={form.name} onChange={e => set("name", e.target.value)} className={inp} placeholder="Beach Camping" required />
          </div>
          <div>
            <label className={labelCls}>Tagline <span className="text-gray-400 normal-case font-normal">(1 short sentence)</span></label>
            <input value={form.tagline} onChange={e => set("tagline", e.target.value)} className={inp} placeholder="Tents, bonfires, and open water" />
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <textarea rows={4} value={form.description} onChange={e => set("description", e.target.value)} className={inp} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>State</label>
              <select value={form.state} onChange={e => set("state", e.target.value)} className={inp}>
                {STATES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Category</label>
              <select value={form.category} onChange={e => set("category", e.target.value as Experience['category'])} className={inp}>
                {CATEGORIES.map(c => <option key={c} value={c}>{CAT_EMOJI[c]} {c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Location <span className="text-gray-400 normal-case font-normal">(display address)</span></label>
            <input value={form.location} onChange={e => set("location", e.target.value)} className={inp} placeholder="Tarkwa Bay, Lagos Harbour" />
          </div>
        </div>

        {/* ── Pricing & logistics ── */}
        <div className={section}>
          <h2 className="font-semibold text-gray-900">Pricing & group</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Price per person per day (₦)</label>
              <input type="number" min={0} value={form.pricePerPersonPerDay} onChange={e => set("pricePerPersonPerDay", Number(e.target.value))} className={inp} />
            </div>
            <div>
              <label className={labelCls}>Max days (hard cap)</label>
              <input type="number" min={1} max={30} value={form.maxDays} onChange={e => set("maxDays", Number(e.target.value))} className={inp} />
            </div>
            <div>
              <label className={labelCls}>Min group size</label>
              <input type="number" min={1} value={form.groupMin} onChange={e => set("groupMin", Number(e.target.value))} className={inp} />
            </div>
            <div>
              <label className={labelCls}>Max group size</label>
              <input type="number" min={1} value={form.groupMax} onChange={e => set("groupMax", Number(e.target.value))} className={inp} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Notes <span className="text-gray-400 normal-case font-normal">(optional tip / caveat)</span></label>
            <input value={form.notes || ""} onChange={e => set("notes", e.target.value || null)} className={inp} placeholder="Arrive early, book the 7:30am slot…" />
          </div>
        </div>

        {/* ── Media ── */}
        <div className={section}>
          <h2 className="font-semibold text-gray-900">Media</h2>
          <div>
            <label className={labelCls}>Unsplash photo ID <span className="text-gray-400 normal-case font-normal">(from URL: images.unsplash.com/photo-<strong>THIS-PART</strong>)</span></label>
            <input value={form.imageId} onChange={e => set("imageId", e.target.value)} className={inp} placeholder="1773146916270-e811bff4e923" />
            {form.imageId && (
              <img
                src={`https://images.unsplash.com/photo-${form.imageId}?auto=format&fit=crop&w=480&h=200&q=70`}
                alt="preview"
                className="mt-2 h-28 w-full object-cover rounded"
                onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            )}
          </div>
          <div>
            <label className={labelCls}>Colour fallback <span className="text-gray-400 normal-case font-normal">(shown if image fails)</span></label>
            <div className="flex items-center gap-3">
              <input type="color" value={form.colorFallback} onChange={e => set("colorFallback", e.target.value)} className="h-10 w-14 border border-gray-200 rounded cursor-pointer" />
              <input value={form.colorFallback} onChange={e => set("colorFallback", e.target.value)} className={`${inp} w-32`} />
            </div>
          </div>
        </div>

        {/* ── Content ── */}
        <div className={section}>
          <h2 className="font-semibold text-gray-900">Content</h2>
          <ListEditor label="What's included" items={form.included} onChange={v => set("included", v)} placeholder="Return speedboat ride from CMS Marina" />
          <ListEditor label="Highlights (3 bullet points)" items={form.highlights} onChange={v => set("highlights", v)} placeholder="Island access by speedboat only…" />
        </div>

        {/* ── Schedule ── */}
        <div className={section}>
          <h2 className="font-semibold text-gray-900">Day schedule</h2>
          <p className="text-xs text-gray-400">Base schedule — used for Day 1 and as the fallback for all subsequent days.</p>
          <ScheduleEditor label="Base schedule" items={form.schedule} onChange={v => set("schedule", v)} />
        </div>

        {/* ── Schedule overrides ── */}
        <div className={section}>
          <h2 className="font-semibold text-gray-900">Day overrides <span className="text-sm font-normal text-gray-400">(optional)</span></h2>
          <p className="text-xs text-gray-400 mb-2">
            JSON object where keys are 0-indexed day numbers (0 = Day 1, 1 = Day 2…).<br/>
            Leave as <code>{"{}"}</code> if all days share the base schedule.
          </p>
          <textarea
            rows={12}
            value={overridesJson}
            onChange={e => handleOverridesChange(e.target.value)}
            className={`${inp} font-mono text-xs`}
          />
          {overridesErr && <p className="text-xs text-red-500 mt-1">{overridesErr}</p>}
        </div>

        {/* ── Settings ── */}
        <div className={section}>
          <h2 className="font-semibold text-gray-900">Settings</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Sort order <span className="text-gray-400 normal-case font-normal">(lower = first)</span></label>
              <input type="number" min={0} value={form.sortOrder} onChange={e => set("sortOrder", Number(e.target.value))} className={inp} />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={e => set("published", e.target.checked)}
                  className="w-4 h-4 accent-green-700"
                />
                <span className="text-sm font-medium text-gray-700">Published</span>
              </label>
            </div>
          </div>
        </div>

        {/* Bottom save */}
        <div className="flex justify-end gap-3 pb-8">
          <button onClick={onCancel} className="px-5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={busy || !!overridesErr}
            className="bg-[#2F4A33] text-[#F7F1E7] px-6 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition"
          >
            {busy ? "Saving…" : "Save experience"}
          </button>
        </div>
      </div>
    </div>
  );
}
