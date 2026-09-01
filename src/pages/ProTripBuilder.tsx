import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api, session } from "@/lib/api";
import { KarijeLogo } from "@/components/Nav";
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
      .then(() => setChecking(false))
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
    }, token);

    navigate(`/pro/trips/${res.tripId}`);
  }

  if (loading || checking) {
    return (
      <main className="min-h-screen bg-background grid place-items-center">
        <div className="w-8 h-8 rounded-full border-2 border-foreground border-t-transparent animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-6 py-10">

        <div className="flex items-center justify-between mb-10 gap-4">
          <KarijeLogo size="sm" />
          <Link to="/pro/dashboard" className="text-sm font-jost font-light text-muted-foreground hover:text-foreground transition-colors">
            ← Dashboard
          </Link>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <span className="h-px w-8 bg-primary" />
          <span className="text-[10px] font-jost font-light tracking-label text-muted-foreground uppercase">
            New trip
          </span>
        </div>
        <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight mb-2">
          Build a trip your travellers can join
        </h1>
        <p className="text-muted-foreground font-jost font-light mb-10 max-w-xl">
          Add your days and stops. The per-person price comes from the stops themselves.
          You get one link to share — everyone who opens it can join and pay their own share.
        </p>

        {/* ── Trip identity ─────────────────────────────────────────────── */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <div>
            <label htmlFor="trip-title" className="text-xs font-jost text-muted-foreground block mb-1.5">
              Trip name *
            </label>
            <input
              id="trip-title"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setErr(""); }}
              placeholder="Calabar Carnival Weekend"
              className="w-full bg-secondary/60 ring-hairline px-4 py-3 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
            />
          </div>
          <div>
            <label htmlFor="trip-city" className="text-xs font-jost text-muted-foreground block mb-1.5">
              City
            </label>
            <input
              id="trip-city"
              list="karije-city-suggestions"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Anywhere you run trips"
              maxLength={80}
              className="w-full bg-secondary/60 ring-hairline px-4 py-3 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
            />
            <datalist id="karije-city-suggestions">
              {CITY_SUGGESTIONS.map(c => <option key={c} value={c} />)}
            </datalist>
          </div>
          <div className="md:col-span-2">
            <label htmlFor="trip-summary" className="text-xs font-jost text-muted-foreground block mb-1.5">
              One-line description
            </label>
            <input
              id="trip-summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Three days of carnival, food and the Marina."
              maxLength={240}
              className="w-full bg-secondary/60 ring-hairline px-4 py-3 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
            />
          </div>
          <div>
            <label htmlFor="trip-date" className="text-xs font-jost text-muted-foreground block mb-1.5">
              Start date
            </label>
            <input
              id="trip-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-secondary/60 ring-hairline px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
            />
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
          extraFields={
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
          }
        />
      </div>
    </main>
  );
}
