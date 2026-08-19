/**
 * Karije admin panel — /admin
 *
 * One admin key unlocks every section. Sections are tabs, each managing its
 * own list/form state:
 *   Experiences → curated trips shown on /start/explore (all states)
 *   Attractions → the attraction price table the AI planner quotes from
 */
import { useCallback, useEffect, useState } from "react";
import { KarijeLogo } from "@/components/Nav";
import { tripImageUrl } from "@/lib/tripImage";
import {
  type Experience,
  type DaySchedule,
  EMPTY_EXPERIENCE,
} from "@/lib/experienceTypes";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

type Tab = "experiences" | "attractions" | "money";

type MoneyTrip = {
  tripId: string; name: string; destination: string | null; tripDate: string | null;
  paidCount: number; collected: number; serviceFee: number;
  dueToOrganiser: number; paidOut: number; outstanding: number;
  payoutAccountName: string | null;
};
type Payout = {
  id: string; amount: number; note: string | null; status: string;
  reference: string | null; created_at: number; paid_at: number | null;
};

const naira = (n: number) => `₦${Number(n || 0).toLocaleString()}`;

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

const CATEGORIES = ['adventure', 'culture', 'nature', 'leisure', 'food', 'nightlife'] as const;
const CAT_EMOJI: Record<string, string> = {
  adventure: '⛵', culture: '🎭', nature: '🌿', leisure: '🏖️', food: '🍽️', nightlife: '🎉',
};

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

// ── Photo upload ───────────────────────────────────────────────────────────────

/**
 * Shrink a photo in the browser before upload.
 *
 * Phones produce 4–12MB images; the biggest place they're shown is a hero strip
 * about 1200px wide. Resizing here is what keeps DB-stored photos viable — it's
 * the difference between ~300KB and several megabytes a row.
 */
async function shrinkImage(file: File, maxEdge = 1600, quality = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale  = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process the image.");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  const blob = await new Promise<Blob | null>(resolve =>
    canvas.toBlob(resolve, "image/jpeg", quality)
  );
  if (!blob) throw new Error("Could not process the image.");
  return blob;
}

function PhotoField({
  value,
  onChange,
  adminKey,
}: {
  value: string;
  onChange: (v: string) => void;
  adminKey: string;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState("");
  const [note, setNote] = useState("");

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setErr("");
    setNote("");
    try {
      const blob = await shrinkImage(file);
      const res  = await fetch(`${API}/admin/trip-images`, {
        method:  "POST",
        headers: { "Content-Type": "image/jpeg", "X-Admin-Key": adminKey },
        body:    blob,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || `Upload failed (${res.status})`);
      onChange(json.url);
      const kb = Math.round(json.bytes / 1024);
      setNote(`Uploaded — ${kb}KB (from ${Math.round(file.size / 1024)}KB original)`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <label className={labelCls}>Photo</label>
      <p className="text-xs text-gray-400 mb-2">
        Upload a picture of the actual place. Large photos are shrunk automatically.
      </p>

      <div className="flex items-center gap-3">
        <label className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition ${
          busy ? "bg-gray-200 text-gray-400" : "bg-gray-800 text-white hover:bg-gray-700"
        }`}>
          {busy ? "Uploading…" : value ? "Replace photo" : "Choose photo"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={busy}
            onChange={e => { handleFile(e.target.files?.[0]); e.target.value = ""; }}
            className="hidden"
          />
        </label>
        {value && (
          <button
            type="button"
            onClick={() => { onChange(""); setNote(""); }}
            className="text-xs text-gray-500 hover:text-red-600"
          >
            Remove
          </button>
        )}
      </div>

      {note && <p className="text-xs text-green-700 mt-2">{note}</p>}
      {err  && <p className="text-xs text-red-500 mt-2">{err}</p>}

      {value && (
        <img
          src={tripImageUrl(value, 480, 200)}
          alt="preview"
          className="mt-3 h-28 w-full object-cover rounded"
          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      )}

      <details className="mt-3">
        <summary className="text-xs text-gray-400 cursor-pointer">Or paste a link instead</summary>
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          className={`${inp} mt-2`}
          placeholder="https://… or an Unsplash photo ID"
        />
      </details>
    </div>
  );
}

// ── Per-day plan editor ────────────────────────────────────────────────────────

/**
 * Day-by-day editor for a trip's itinerary.
 *
 * Replaces what used to be a raw JSON textarea. Day 1 edits the base schedule;
 * every later day either repeats Day 1 or gets its own plan. Overrides are
 * keyed by day index (Day 2 → key 1), matching how Explore renders them —
 * the operator never sees the key, only "Day 2".
 */
function DayPlanEditor({
  maxDays,
  schedule,
  overrides,
  onScheduleChange,
  onOverridesChange,
}: {
  maxDays: number;
  schedule: DaySchedule[];
  overrides: Record<number, DaySchedule[]>;
  onScheduleChange: (v: DaySchedule[]) => void;
  onOverridesChange: (v: Record<number, DaySchedule[]>) => void;
}) {
  const days = Array.from({ length: Math.max(1, maxDays) }, (_, i) => i + 1);

  function customise(dayIdx: number) {
    // Start from a copy of Day 1 so the operator edits rather than starts blank.
    onOverridesChange({ ...overrides, [dayIdx]: schedule.map(s => ({ ...s })) });
  }

  function resetToDay1(dayIdx: number) {
    const next = { ...overrides };
    delete next[dayIdx];
    onOverridesChange(next);
  }

  return (
    <div className="space-y-3">
      {days.map(day => {
        const idx        = day - 1;
        const custom     = overrides[idx] !== undefined;
        const isFirstDay = day === 1;

        return (
          <div key={day} className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between bg-gray-50 px-4 py-2.5 border-b border-gray-200">
              <span className="font-medium text-sm text-gray-800">Day {day}</span>
              {isFirstDay && !custom ? (
                <span className="text-xs text-gray-400">Everyone's starting point</span>
              ) : custom ? (
                <button
                  type="button"
                  onClick={() => resetToDay1(idx)}
                  className="text-xs text-gray-500 hover:text-red-600"
                >
                  ✕ Use the Day 1 plan instead
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => customise(idx)}
                  className="text-xs text-green-700 hover:underline font-medium"
                >
                  + Give this day its own plan
                </button>
              )}
            </div>

            <div className="p-4">
              {isFirstDay && !custom ? (
                <ScheduleEditor label="" items={schedule} onChange={onScheduleChange} />
              ) : custom ? (
                <ScheduleEditor
                  label=""
                  items={overrides[idx]}
                  onChange={v => onOverridesChange({ ...overrides, [idx]: v })}
                />
              ) : (
                <p className="text-sm text-gray-400 py-2">
                  Same plan as Day 1 — {schedule.length} stop{schedule.length === 1 ? "" : "s"}.
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Experiences section ────────────────────────────────────────────────────────

function ExperiencesSection({ adminKey }: { adminKey: string }) {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(false);
  const [listErr, setListErr] = useState("");
  const [stateFilter, setStateFilter] = useState("All");
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

  /**
   * Move a trip one place earlier or later in its state's list. Swaps the two
   * sort_order values and saves both, so the order the operator sees on the
   * cards is the order the public page renders.
   */
  async function move(exp: Experience, dir: -1 | 1) {
    const group = experiences
      .filter(e => e.state === exp.state)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const i = group.findIndex(e => e.id === exp.id);
    const swap = group[i + dir];
    if (!swap) return;

    // Positions can collide (seeded rows share values), so renumber the pair
    // from their index rather than trusting the stored numbers.
    const a = { ...exp,  sortOrder: i + dir };
    const b = { ...swap, sortOrder: i };
    setExperiences(prev => prev.map(e => e.id === a.id ? a : e.id === b.id ? b : e));

    try {
      await Promise.all([a, b].map(t =>
        apiFetch(`/admin/experiences/${t.id}`, adminKey, { method: "PUT", body: JSON.stringify(t) })
      ));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not save the new order.");
      setExperiences(prev => prev.map(e => e.id === exp.id ? exp : e.id === swap.id ? swap : e));
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
        adminKey={adminKey}
      />
    );
  }

  const filtered = experiences
    .filter(e => stateFilter === "All" || e.state === stateFilter)
    .sort((a, b) => a.state.localeCompare(b.state) || a.sortOrder - b.sortOrder);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {["All", ...Array.from(new Set(experiences.map(e => e.state))).sort()].map(s => (
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
                  src={tripImageUrl(exp.imageId, 480, 200)}
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

              {/* Reorder — what shows first on the public page */}
              <div className="absolute top-2 right-2 flex gap-1">
                <button
                  type="button"
                  onClick={() => move(exp, -1)}
                  title="Show this earlier"
                  className="w-7 h-7 grid place-items-center rounded-full bg-white/90 text-gray-700 hover:bg-white hover:text-green-700 shadow-sm text-sm"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(exp, 1)}
                  title="Show this later"
                  className="w-7 h-7 grid place-items-center rounded-full bg-white/90 text-gray-700 hover:bg-white hover:text-green-700 shadow-sm text-sm"
                >
                  ↓
                </button>
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

// ── Money section ──────────────────────────────────────────────────────────────

/**
 * What Karije is holding and who it belongs to.
 *
 * Payouts are recorded here rather than executed here: the bank transfer
 * happens in your banking app, and this is the record of it. Nothing leaves an
 * account because someone clicked a button in a browser.
 */
function MoneySection({ adminKey }: { adminKey: string }) {
  const [trips, setTrips]   = useState<MoneyTrip[]>([]);
  const [totals, setTotals] = useState({ collected: 0, serviceFee: 0, paidOut: 0, outstanding: 0 });
  const [fee, setFee]       = useState(0);
  const [loading, setLoad]  = useState(true);
  const [err, setErr]       = useState("");
  const [openTrip, setOpen] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoad(true);
    apiFetch<{ trips: MoneyTrip[]; totals: typeof totals; feePerPerson: number }>("/admin/money", adminKey)
      .then(d => { setTrips(d.trips); setTotals(d.totals); setFee(d.feePerPerson); })
      .catch(e => setErr(e.message))
      .finally(() => setLoad(false));
  }, [adminKey]);

  useEffect(load, [load]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      {/* Position at a glance */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Collected",       value: totals.collected,   hint: "from squad members" },
          { label: "Karije fee",      value: totals.serviceFee,  hint: `${naira(fee)}/person` },
          { label: "Paid out",        value: totals.paidOut,     hint: "released to organisers" },
          { label: "Still to pay",    value: totals.outstanding, hint: "owed right now", accent: true },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-4 ${s.accent ? "border-amber-300 bg-amber-50" : "border-gray-200 bg-white"}`}>
            <div className="text-[11px] uppercase tracking-wide text-gray-500">{s.label}</div>
            <div className="text-xl font-semibold text-gray-900 mt-1 tabular-nums">{naira(s.value)}</div>
            <div className="text-[11px] text-gray-400 mt-0.5">{s.hint}</div>
          </div>
        ))}
      </div>

      {err && <p className="text-sm text-red-600 mb-4">{err}</p>}
      {loading && <p className="text-sm text-gray-400">Loading…</p>}

      {!loading && trips.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">💸</div>
          <p className="text-sm">No money collected yet. Trips appear here once someone pays.</p>
        </div>
      )}

      <div className="space-y-2">
        {trips.map(t => (
          <div key={t.tripId} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setOpen(openTrip === t.tripId ? null : t.tripId)}
              className="w-full flex items-center gap-4 p-4 text-left hover:bg-gray-50 transition"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 truncate">{t.name}</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {t.paidCount} paid · {naira(t.collected)} in
                  {t.tripDate ? ` · ${t.tripDate}` : ""}
                  {t.payoutAccountName ? ` · ${t.payoutAccountName}` : " · no payout account"}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className={`font-semibold tabular-nums ${t.outstanding > 0 ? "text-amber-700" : "text-green-700"}`}>
                  {naira(t.outstanding)}
                </div>
                <div className="text-[10px] text-gray-400">{t.outstanding > 0 ? "to pay out" : "settled"}</div>
              </div>
              <span className="text-gray-400 text-xs">{openTrip === t.tripId ? "▲" : "▼"}</span>
            </button>

            {openTrip === t.tripId && (
              <TripMoneyDetail tripId={t.tripId} adminKey={adminKey} onChange={load} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function TripMoneyDetail({ tripId, adminKey, onChange }: {
  tripId: string; adminKey: string; onChange: () => void;
}) {
  const [data, setData] = useState<(MoneyTrip & { payouts: Payout[]; feePerPerson: number }) | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote]     = useState("");
  const [busy, setBusy]     = useState(false);
  const [err, setErr]       = useState("");

  const load = useCallback(() => {
    apiFetch<MoneyTrip & { payouts: Payout[]; feePerPerson: number }>(`/admin/money/${tripId}`, adminKey)
      .then(setData)
      .catch(e => setErr(e.message));
  }, [tripId, adminKey]);

  useEffect(load, [load]);

  async function recordPayout() {
    setBusy(true); setErr("");
    try {
      await apiFetch(`/admin/money/${tripId}/payout`, adminKey, {
        method: "POST",
        body: JSON.stringify({ amount: Number(amount), note: note || null }),
      });
      setAmount(""); setNote("");
      load(); onChange();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not record that payout.");
    } finally { setBusy(false); }
  }

  if (!data) return <div className="px-4 pb-4 text-xs text-gray-400">Loading…</div>;

  return (
    <div className="border-t border-gray-100 p-4 space-y-4 bg-gray-50/60">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        {[
          ["Collected", data.collected],
          [`Fee (${data.paidCount} × ${naira(data.feePerPerson)})`, data.serviceFee],
          ["Due to organiser", data.dueToOrganiser],
          ["Already paid out", data.paidOut],
        ].map(([label, value]) => (
          <div key={String(label)}>
            <div className="text-[11px] text-gray-500">{label}</div>
            <div className="tabular-nums font-medium text-gray-900">{naira(Number(value))}</div>
          </div>
        ))}
      </div>

      {/* Record a release */}
      {data.outstanding > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="text-xs font-medium text-gray-700 mb-2">
            Record a payout — {naira(data.outstanding)} outstanding
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              type="number" min={1} max={data.outstanding} value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="Amount"
              className="w-28 border border-gray-200 rounded px-2 py-1.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-green-600/30"
            />
            <input
              value={note} onChange={e => setNote(e.target.value)}
              placeholder="What for? e.g. bus deposit"
              className="flex-1 min-w-[10rem] border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/30"
            />
            <button
              onClick={recordPayout}
              disabled={busy || !amount}
              className="px-4 py-1.5 bg-gray-900 text-white rounded text-sm hover:bg-gray-700 disabled:opacity-40"
            >
              {busy ? "Saving…" : "Record"}
            </button>
            <button
              onClick={() => setAmount(String(data.outstanding))}
              className="px-3 py-1.5 border border-gray-200 rounded text-xs text-gray-600 hover:border-gray-400"
            >
              Pay all
            </button>
          </div>
          <p className="text-[11px] text-gray-400 mt-2">
            Make the transfer in your bank first, then record it here.
          </p>
          {err && <p className="text-xs text-red-600 mt-2">{err}</p>}
        </div>
      )}

      {data.payouts.length > 0 && (
        <div>
          <div className="text-[11px] uppercase tracking-wide text-gray-500 mb-1.5">Payout history</div>
          <ul className="space-y-1">
            {data.payouts.map(p => (
              <li key={p.id} className="flex items-center gap-3 text-xs bg-white border border-gray-100 rounded px-3 py-2">
                <span className="tabular-nums font-medium text-gray-900">{naira(p.amount)}</span>
                <span className="flex-1 text-gray-500 truncate">{p.note || "—"}</span>
                <span className="text-gray-400">
                  {p.paid_at ? new Date(p.paid_at * 1000).toLocaleDateString() : "pending"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
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
    { id: "experiences", label: "Trips",       hint: "Curated trips on /start/explore" },
    { id: "money",       label: "Money",       hint: "Collected, owed, and paid out" },
    { id: "attractions", label: "Attractions", hint: "Prices the planner quotes" },
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
      {tab === "money"       && <MoneySection       adminKey={adminKey} />}
      {tab === "attractions" && <AttractionsSection adminKey={adminKey} />}
    </main>
  );
}


function ExperienceForm({
  initial,
  onSave,
  onCancel,
  busy,
  error,
  adminKey,
}: {
  initial: Experience;
  onSave: (exp: Experience) => void;
  onCancel: () => void;
  busy: boolean;
  error: string;
  adminKey: string;
}) {
  const [form, setForm] = useState<Experience>(initial);

  const set = <K extends keyof Experience>(key: K, val: Experience[K]) =>
    setForm(f => ({ ...f, [key]: val }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
            disabled={busy}
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
                {ALL_STATES.map(s => <option key={s}>{s}</option>)}
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
          <PhotoField
            value={form.imageId}
            onChange={v => set("imageId", v)}
            adminKey={adminKey}
          />
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
          <h2 className="font-semibold text-gray-900">What happens each day</h2>
          <p className="text-xs text-gray-400">
            Day 1 is the plan everyone gets. If a later day runs differently, give it its own
            plan — otherwise it repeats Day 1. Change the trip length above to add or remove days.
          </p>
          <DayPlanEditor
            maxDays={form.maxDays}
            schedule={form.schedule}
            overrides={form.scheduleOverrides || {}}
            onScheduleChange={v => set("schedule", v)}
            onOverridesChange={v => set("scheduleOverrides", v)}
          />
        </div>

        {/* ── Settings ── */}
        <div className={section}>
          <h2 className="font-semibold text-gray-900">Settings</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Position on the page</label>
              <p className="text-sm text-gray-500 pt-2">
                Use the ↑ ↓ arrows on the trip cards to change what shows first.
              </p>
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
            disabled={busy}
            className="bg-[#2F4A33] text-[#F7F1E7] px-6 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition"
          >
            {busy ? "Saving…" : "Save experience"}
          </button>
        </div>
      </div>
    </div>
  );
}
