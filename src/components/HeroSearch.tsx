import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, type Attraction } from "@/lib/api";
import { GIGM_CITIES } from "@/lib/cities";

type Mode = "lagos" | "interstate";

// Real places directory (the 272-venue attractions table) — no server-side
// search, so fetch Lagos once and filter client-side by name/address. Same
// data Explore's "Build your own" tab is built on.
export const HeroSearch = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("lagos");

  // ── Within Lagos: real places autocomplete ──────────────────────────────
  const [places, setPlaces] = useState<Attraction[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let live = true;
    api.getAttractions("Lagos")
      .then((d) => { if (live) setPlaces(d.attractions ?? []); })
      .catch(() => {});
    return () => { live = false; };
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const matches = query.trim().length > 0
    ? places.filter((p) =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        (p.address ?? "").toLowerCase().includes(query.toLowerCase())
      ).slice(0, 6)
    : [];

  function goToPlace(place?: Attraction) {
    navigate("/start/explore?tab=own", { state: place ? { presetPlaceName: place.name } : undefined });
  }

  // ── Interstate: city-to-city, feeds Start.tsx's real intake form ───────
  const [origin, setOrigin] = useState("Lagos");
  const [destination, setDestination] = useState("Abuja");

  function goInterstate() {
    navigate("/start/trip", { state: { origin, destination } });
  }

  return (
    <div className="animate-rise flex flex-col items-center gap-4 w-full" style={{ animationDelay: "0.12s" }}>
      {/* Toggle */}
      <div className="inline-flex border-[3px] border-foreground rounded-full p-1 gap-1 bg-background shadow-[4px_4px_0_0_hsl(var(--foreground))]">
        <button
          type="button"
          onClick={() => setMode("lagos")}
          className={`text-sm font-jost font-bold rounded-full px-5 py-2.5 transition-colors ${
            mode === "lagos" ? "bg-signal text-ink" : "text-muted-foreground"
          }`}
        >
          Within Lagos
        </button>
        <button
          type="button"
          onClick={() => setMode("interstate")}
          className={`text-sm font-jost font-bold rounded-full px-5 py-2.5 transition-colors ${
            mode === "interstate" ? "bg-signal text-ink" : "text-muted-foreground"
          }`}
        >
          Interstate
        </button>
      </div>

      {/* Within-Lagos search */}
      {mode === "lagos" && (
        <div ref={boxRef} className="relative w-full max-w-xl">
          <div className="flex items-center gap-3 h-16 bg-background border-[3px] border-foreground rounded-full pl-6 pr-2 shadow-[5px_5px_0_0_hsl(var(--foreground))]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-foreground">
              <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
            </svg>
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              onKeyDown={(e) => { if (e.key === "Enter") goToPlace(matches[0]); }}
              placeholder="Search places — Tarkwa Bay, Lekki, Nike Art Gallery…"
              className="flex-1 bg-transparent outline-none text-base placeholder:text-muted-foreground min-w-0"
            />
            <button
              type="button"
              onClick={() => goToPlace(matches[0])}
              className="shrink-0 font-jost font-bold text-sm text-background bg-foreground rounded-full px-6 py-3.5 whitespace-nowrap"
            >
              Go →
            </button>
          </div>

          {open && matches.length > 0 && (
            <div className="absolute left-0 right-0 mt-2 bg-background border-[3px] border-foreground rounded-2xl shadow-[5px_5px_0_0_hsl(var(--foreground))] overflow-hidden z-10">
              {matches.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => goToPlace(p)}
                  className="w-full text-left px-5 py-3 hover:bg-muted transition-colors border-b border-border last:border-b-0"
                >
                  <div className="font-jost font-medium text-sm text-foreground">{p.name}</div>
                  {p.address && <div className="font-jost text-xs text-muted-foreground">{p.address}</div>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Interstate: from / to */}
      {mode === "interstate" && (
        <div className="flex items-center gap-3 w-full max-w-xl h-16 bg-background border-[3px] border-foreground rounded-full pl-2 pr-2 shadow-[5px_5px_0_0_hsl(var(--foreground))]">
          <select
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            className="flex-1 min-w-0 bg-transparent outline-none text-sm font-jost font-medium text-foreground px-4 py-3 appearance-none"
          >
            {GIGM_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <span className="text-muted-foreground shrink-0">→</span>
          <select
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="flex-1 min-w-0 bg-transparent outline-none text-sm font-jost font-medium text-foreground px-4 py-3 appearance-none"
          >
            {GIGM_CITIES.filter((c) => c !== origin).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button
            type="button"
            onClick={goInterstate}
            className="shrink-0 font-jost font-bold text-sm text-background bg-foreground rounded-full px-6 py-3.5 whitespace-nowrap"
          >
            Go →
          </button>
        </div>
      )}
    </div>
  );
};
