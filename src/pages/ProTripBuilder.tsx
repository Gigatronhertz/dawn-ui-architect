import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api, session, type TripTemplate } from "@/lib/api";
import ProShell from "@/components/ProShell";
import { BuildYourOwn } from "@/pages/Explore";

/**
 * Where an agency authors a trip it owns.
 *
 * The day/stop builder is the same component the squad flow uses — only the
 * save is different. An agency trip carries a name, an optional catalog blurb,
 * and a choice: list it on Karije, or keep it to the share link.
 */

// Suggestions, not a whitelist. An agency runs trips wherever it runs them, so
// the field below accepts anything typed into it — these just save typing for
// the cities we already have a venue library for.
const CITY_SUGGESTIONS = ["Lagos", "Abuja", "Calabar", "Enugu", "Port Harcourt", "Ibadan", "Uyo", "Kano"];

export default function ProTripBuilder() {
  const { user, loading, getIdToken } = useAuth();
  const navigate = useNavigate();

  const [checking, setChecking] = useState(true);
  const [city, setCity]         = useState("Lagos");
  // What the builder actually sees — only catches up once typing settles.
  const [builderCity, setBuilderCity] = useState("Lagos");
  const [title, setTitle]       = useState("");
  const [summary, setSummary]   = useState("");
  const [date, setDate]         = useState("");
  const [listed, setListed]     = useState(true);
  const [err, setErr]           = useState("");

  // Templates this agency has saved, and the one currently loaded.
  const [templates, setTemplates] = useState<TripTemplate[]>([]);
  const [seed, setSeed]           = useState<{ days: TripTemplate["days"]; squadSize?: number } | null>(null);
  const [usedTemplate, setUsedTemplate] = useState<string | null>(null);

  // Whether to keep this trip's shape for next time.
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName]     = useState("");

  useEffect(() => { document.title = "New trip · Karije Pro"; }, []);

  useEffect(() => {
    const t = setTimeout(() => setBuilderCity(city.trim() || "Lagos"), 600);
    return () => clearTimeout(t);
  }, [city]);

  // An agency must exist before it can own a trip; the API answers 403 with
  // needsSetup, so send them to finish setting up rather than showing an error.
  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/pro/login", { replace: true }); return; }
    const token = session.get();
    if (!token) { navigate("/pro/login", { replace: true }); return; }
    api.getProMe(token)
      .then(() => {
        setChecking(false);
        // Not fatal if this fails — the builder works without templates.
        api.listTripTemplates(token)
          .then(d => {
            const list = d.templates ?? [];
            setTemplates(list);
            // Arriving from "Start a trip from this" on the dashboard: apply
            // that template straight away, so the intent survives the
            // navigation instead of making them pick it again here.
            const wanted = new URLSearchParams(window.location.search).get("template");
            const match  = wanted ? list.find(t => t.id === wanted) : null;
            if (match) applyTemplate(match);
          })
          .catch(() => setTemplates([]));
      })
      .catch(() => navigate("/pro/setup", { replace: true }));
  }, [user, loading, navigate]);

  async function save(payload: {
    city: string;
    squadSize: number;
    days: { activities: { time: string; title: string; cost_per_person: number }[] }[];
  }) {
    setErr("");
    if (!title.trim()) {
      setErr("Give the trip a name — it's what travellers see on the link.");
      throw new Error("missing title");
    }
    const token = await getIdToken();
    if (!token) throw new Error("Please sign in again.");

    const res = await api.createAgencyTrip({
      title: title.trim(),
      summary: summary.trim() || undefined,
      city: city.trim() || payload.city,
      squadSize: payload.squadSize,
      days: payload.days,
      listed,
      selectedDate: date || null,
      saveAsTemplate,
      templateName: saveAsTemplate ? (templateName.trim() || title.trim()) : undefined,
    }, token);

    navigate(`/pro/trips/${res.tripId}`);
  }

  /** Load a saved shape into the builder. */
  function applyTemplate(t: TripTemplate) {
    if (t.city) setCity(t.city);
    // A new object each time, so re-picking the same template reloads it.
    setSeed({ days: t.days, squadSize: t.squadSize });
    setUsedTemplate(t.id);
    setErr("");
  }

  async function removeTemplate(t: TripTemplate) {
    const token = await getIdToken();
    if (!token) return;
    try {
      await api.deleteTripTemplate(t.id, token);
      setTemplates(prev => prev.filter(x => x.id !== t.id));
      if (usedTemplate === t.id) setUsedTemplate(null);
    } catch { /* leave it listed; deleting again is harmless */ }
  }

  if (loading || checking) {
    return (
      <main className="min-h-screen bg-background grid place-items-center">
        <div className="w-8 h-8 rounded-full border-2 border-foreground border-t-transparent animate-spin" />
      </main>
    );
  }

  const inputCls =
    "w-full rounded-xl bg-secondary/60 ring-hairline px-4 py-2.5 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 transition";

  return (
    <ProShell
      active="trips"
      backTo="/pro/dashboard"
      title="New trip"
      subtitle="Add your days and stops — the per-person price comes from the stops themselves."
    >
        {/* ── Start from a template ─────────────────────────────────────── */}
        {templates.length > 0 && (
          <div className="rounded-2xl bg-card ring-hairline p-5 mb-6">
            <div className="text-[11px] font-medium text-muted-foreground mb-3">
              Start from a saved template
            </div>
            <div className="flex flex-wrap gap-2">
              {templates.map(t => (
                <div
                  key={t.id}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 transition-colors ${
                    usedTemplate === t.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-foreground"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => applyTemplate(t)}
                    className="text-left"
                  >
                    <div className="text-sm font-medium">{t.name}</div>
                    <div className="text-[10px] text-muted-foreground tabular-nums">
                      {t.city ? `${t.city} · ` : ""}{t.dayCount}{t.dayCount === 1 ? " day" : " days"}
                      {t.perPerson > 0 ? ` · ₦${t.perPerson.toLocaleString()}` : ""}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeTemplate(t)}
                    aria-label={`Delete the ${t.name} template`}
                    className="text-muted-foreground hover:text-destructive text-xs px-1 shrink-0"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            {usedTemplate && (
              <p className="text-[11px] text-muted-foreground mt-3">
                Loaded. Edit anything below — the template stays as it is.
              </p>
            )}
          </div>
        )}

        {/* ── Trip identity ─────────────────────────────────────────────── */}
        <div className="rounded-2xl bg-card ring-hairline p-5 mb-6">
          <div className="text-[11px] font-medium text-muted-foreground mb-4">
            What travellers see
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="trip-title" className="text-xs text-muted-foreground block mb-1.5">
                Trip name *
              </label>
              <input
                id="trip-title"
                value={title}
                onChange={(e) => { setTitle(e.target.value); setErr(""); }}
                placeholder="Calabar Carnival Weekend"
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="trip-city" className="text-xs text-muted-foreground block mb-1.5">
                City
              </label>
              <input
                id="trip-city"
                list="karije-city-suggestions"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Anywhere you run trips"
                maxLength={80}
                className={inputCls}
              />
              <datalist id="karije-city-suggestions">
                {CITY_SUGGESTIONS.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div className="md:col-span-2">
              <label htmlFor="trip-summary" className="text-xs text-muted-foreground block mb-1.5">
                One-line description
              </label>
              <input
                id="trip-summary"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Three days of carnival, food and the Marina."
                maxLength={240}
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="trip-date" className="text-xs text-muted-foreground block mb-1.5">
                Start date
              </label>
              <input
                id="trip-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
        </div>

        {err && (
          <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2 mb-6">{err}</p>
        )}

        {/* ── The builder, shared with the squad flow ───────────────────── */}
        <BuildYourOwn
          city={builderCity}
          onSave={save}
          requireSignIn={false}
          allowCustomPlaces
          saveLabel="Create the trip →"
          seed={seed}
          extraFields={
            <>
              <label className="flex items-start gap-3 pb-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveAsTemplate}
                  onChange={(e) => setSaveAsTemplate(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-primary shrink-0"
                />
                <span className="text-xs font-jost font-light leading-relaxed">
                  <span className="text-foreground font-medium">Save as a template</span>
                  <span className="text-muted-foreground">
                    {" "}— keep this shape so your next run of it starts here.
                  </span>
                </span>
              </label>
              {saveAsTemplate && (
                <input
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder={title.trim() || "Template name"}
                  maxLength={120}
                  className="w-full border border-border bg-background px-3 py-2 text-xs font-jost focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/60"
                />
              )}
            <label className="flex items-start gap-3 pb-1 cursor-pointer">
              <input
                type="checkbox"
                checked={listed}
                onChange={(e) => setListed(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-primary shrink-0"
              />
              <span className="text-xs font-jost font-light leading-relaxed">
                <span className="text-foreground font-medium">List on Karije</span>
                <span className="text-muted-foreground">
                  {" "}— show this trip in the Explore catalog under your agency name.
                  Leave it off and the trip lives only at its share link.
                </span>
              </span>
            </label>
            </>
          }
        />
    </ProShell>
  );
}
