/**
 * Karije admin panel — /admin
 *
 * Screens (state-based, no sub-routing):
 *   login   → enter admin key
 *   list    → all experiences table + New/Edit/Delete
 *   form    → create or edit an experience
 */
import { useEffect, useState } from "react";
import { KarijeLogo } from "@/components/Nav";
import {
  type Experience,
  type DaySchedule,
  EMPTY_EXPERIENCE,
} from "@/lib/experienceTypes";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

type Screen = "login" | "list" | "form";

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

// ── Category options ───────────────────────────────────────────────────────────

const CATEGORIES = ['adventure', 'culture', 'nature', 'leisure', 'food'] as const;
const CAT_EMOJI: Record<string, string> = {
  adventure: '⛵', culture: '🎭', nature: '🌿', leisure: '🏖️', food: '🍽️',
};
const STATES = ['Lagos', 'Abuja', 'Rivers', 'Delta', 'Oyo', 'Anambra', 'Kano', 'Enugu'];

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

// ── Schedule editor ────────────────────────────────────────────────────────────

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

// ── Main component ─────────────────────────────────────────────────────────────

export default function Admin() {
  const [screen, setScreen]     = useState<Screen>("login");
  const [adminKey, setAdminKey] = useState(() => localStorage.getItem("karije_admin_key") || "");
  const [keyInput, setKeyInput] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);

  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listErr, setListErr]         = useState("");
  const [stateFilter, setStateFilter] = useState("Lagos");

  const [editing, setEditing]         = useState<Experience | null>(null);
  const [formBusy, setFormBusy]       = useState(false);
  const [formErr, setFormErr]         = useState("");

  useEffect(() => {
    document.title = "Admin · Karije";
    const saved = localStorage.getItem("karije_admin_key");
    if (saved) { setAdminKey(saved); setScreen("list"); }
  }, []);

  // Load experiences when on list screen
  useEffect(() => {
    if (screen !== "list") return;
    setListLoading(true);
    setListErr("");
    apiFetch<{ experiences: Experience[] }>("/admin/experiences", adminKey)
      .then(d => setExperiences(d.experiences))
      .catch(e => setListErr(e.message))
      .finally(() => setListLoading(false));
  }, [screen, adminKey]);

  // ── Login ──────────────────────────────────────────────────────────────────
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
      setScreen("list");
    } catch {
      setLoginErr("Invalid admin key.");
    } finally {
      setLoginBusy(false);
    }
  }

  function logout() {
    localStorage.removeItem("karije_admin_key");
    setAdminKey("");
    setScreen("login");
  }

  // ── Delete experience ──────────────────────────────────────────────────────
  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await apiFetch(`/admin/experiences/${id}`, adminKey, { method: "DELETE" });
      setExperiences(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed.");
    }
  }

  // ── Save experience ────────────────────────────────────────────────────────
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
      if (isNew) {
        setExperiences(prev => [...prev, result.experience]);
      } else {
        setExperiences(prev => prev.map(e => e.id === exp.id ? result.experience : e));
      }
      setScreen("list");
    } catch (err) {
      setFormErr(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setFormBusy(false);
    }
  }

  // ── Screens ────────────────────────────────────────────────────────────────

  if (screen === "login") {
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

  if (screen === "form" && editing !== null) {
    return (
      <ExperienceForm
        initial={editing}
        onSave={handleSave}
        onCancel={() => setScreen("list")}
        busy={formBusy}
        error={formErr}
      />
    );
  }

  // ── List screen ────────────────────────────────────────────────────────────
  const filtered = experiences.filter(e =>
    stateFilter === "All" || e.state === stateFilter
  );

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <KarijeLogo />
          <span className="text-xs font-mono bg-gray-100 text-gray-500 px-2 py-0.5 rounded">admin</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setEditing({ id: `exp_${Date.now()}`, ...EMPTY_EXPERIENCE } as Experience); setScreen("form"); }}
            className="bg-[#2F4A33] text-[#F7F1E7] px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition"
          >
            + New experience
          </button>
          <button onClick={logout} className="text-xs text-gray-400 hover:text-gray-700">Sign out</button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* State tabs */}
        <div className="flex gap-2 flex-wrap mb-6">
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

        {listLoading && <p className="text-sm text-gray-500">Loading…</p>}
        {listErr    && <p className="text-sm text-red-500">{listErr}</p>}

        {!listLoading && filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-sm">No experiences for {stateFilter}. Create one above.</p>
          </div>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(exp => (
            <div key={exp.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              {/* Photo thumbnail */}
              <div
                className="h-32 relative"
                style={{ backgroundColor: exp.colorFallback }}
              >
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
                    onClick={() => { setEditing(exp); setScreen("form"); }}
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
    </main>
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
  const [overridesJson, setOverridesJson]   = useState(() => JSON.stringify(form.scheduleOverrides || {}, null, 2));
  const [overridesErr, setOverridesErr]     = useState("");

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

  const inp = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/30";
  const label = "block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1";
  const section = "bg-white border border-gray-200 rounded-xl p-6 space-y-5";

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
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
      </header>

      <div className="mx-auto max-w-3xl px-6 pt-8 space-y-6">

        {/* ── Basic info ── */}
        <div className={section}>
          <h2 className="font-semibold text-gray-900">Basic info</h2>

          <div>
            <label className={label}>ID <span className="text-gray-400 normal-case font-normal">(slug, no spaces)</span></label>
            <input value={form.id} onChange={e => set("id", e.target.value)} className={inp} placeholder="beach-camp" />
          </div>
          <div>
            <label className={label}>Name</label>
            <input value={form.name} onChange={e => set("name", e.target.value)} className={inp} placeholder="Beach Camping" required />
          </div>
          <div>
            <label className={label}>Tagline <span className="text-gray-400 normal-case font-normal">(1 short sentence)</span></label>
            <input value={form.tagline} onChange={e => set("tagline", e.target.value)} className={inp} placeholder="Tents, bonfires, and open water" />
          </div>
          <div>
            <label className={label}>Description</label>
            <textarea rows={4} value={form.description} onChange={e => set("description", e.target.value)} className={inp} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>State</label>
              <select value={form.state} onChange={e => set("state", e.target.value)} className={inp}>
                {STATES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Category</label>
              <select value={form.category} onChange={e => set("category", e.target.value as Experience['category'])} className={inp}>
                {CATEGORIES.map(c => <option key={c} value={c}>{CAT_EMOJI[c]} {c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={label}>Location <span className="text-gray-400 normal-case font-normal">(display address)</span></label>
            <input value={form.location} onChange={e => set("location", e.target.value)} className={inp} placeholder="Tarkwa Bay, Lagos Harbour" />
          </div>
        </div>

        {/* ── Pricing & logistics ── */}
        <div className={section}>
          <h2 className="font-semibold text-gray-900">Pricing & group</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Price per person per day (₦)</label>
              <input type="number" min={0} value={form.pricePerPersonPerDay} onChange={e => set("pricePerPersonPerDay", Number(e.target.value))} className={inp} />
            </div>
            <div>
              <label className={label}>Max days (hard cap)</label>
              <input type="number" min={1} max={30} value={form.maxDays} onChange={e => set("maxDays", Number(e.target.value))} className={inp} />
            </div>
            <div>
              <label className={label}>Min group size</label>
              <input type="number" min={1} value={form.groupMin} onChange={e => set("groupMin", Number(e.target.value))} className={inp} />
            </div>
            <div>
              <label className={label}>Max group size</label>
              <input type="number" min={1} value={form.groupMax} onChange={e => set("groupMax", Number(e.target.value))} className={inp} />
            </div>
          </div>
          <div>
            <label className={label}>Notes <span className="text-gray-400 normal-case font-normal">(optional tip / caveat)</span></label>
            <input value={form.notes || ""} onChange={e => set("notes", e.target.value || null)} className={inp} placeholder="Arrive early, book the 7:30am slot…" />
          </div>
        </div>

        {/* ── Media ── */}
        <div className={section}>
          <h2 className="font-semibold text-gray-900">Media</h2>
          <div>
            <label className={label}>Unsplash photo ID <span className="text-gray-400 normal-case font-normal">(from URL: images.unsplash.com/photo-<strong>THIS-PART</strong>)</span></label>
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
            <label className={label}>Colour fallback <span className="text-gray-400 normal-case font-normal">(shown if image fails)</span></label>
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
              <label className={label}>Sort order <span className="text-gray-400 normal-case font-normal">(lower = first)</span></label>
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
    </main>
  );
}
