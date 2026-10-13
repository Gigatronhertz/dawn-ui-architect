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

  const scopeBtn = (active: boolean) =>
    `font-display text-sm md:text-base tracking-[0.04em] px-4 md:px-6 py-2.5 md:py-3 border-2 border-signal transition-colors ${
      active ? "bg-signal text-ink" : "bg-transparent text-signal hover:bg-signal/10"
    }`;
  const goBtn =
    "shrink-0 self-stretch font-display text-base md:text-lg tracking-[0.04em] bg-ink text-signal px-6 md:px-8 hover:bg-[#2A2A2A] transition-colors";

  return (
    <div className="flex flex-col gap-3.5 w-full max-w-[640px]">
      {/* Scope */}
      <div className="flex">
        <button type="button" onClick={() => setMode("lagos")} className={scopeBtn(mode === "lagos")}>
          Within Lagos
        </button>
        <button type="button" onClick={() => setMode("interstate")} className={`${scopeBtn(mode === "interstate")} -ml-0.5`}>
          Interstate
        </button>
      </div>

      {/* Within-Lagos search */}
      {mode === "lagos" && (
        <div ref={boxRef} className="relative w-full">
          <div className="flex items-center bg-paper shadow-[6px_6px_0_hsl(var(--signal))]">
            <svg viewBox="0 0 24 24" className="w-6 h-6 ml-5 shrink-0" fill="none" stroke="#0B0B0B" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M11 4a7 7 0 100 14 7 7 0 000-14z M20 20l-4-4" />
            </svg>
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              onKeyDown={(e) => { if (e.key === "Enter") goToPlace(matches[0]); }}
              placeholder="Tarkwa Bay, Lekki, Nike Art Gallery…"
              aria-label="Search places in Lagos"
              className="flex-1 min-w-0 bg-transparent outline-none text-base md:text-lg text-ink px-4 py-4 md:py-5 placeholder:text-[#8A8A8A]"
            />
            <button type="button" onClick={() => goToPlace(matches[0])} className={goBtn}>
              Go →
            </button>
          </div>

          {open && matches.length > 0 && (
            <div className="absolute left-0 right-0 mt-3 bg-ink border-2 border-signal z-20 max-h-[min(20rem,60vh)] overflow-y-auto overscroll-contain">
              {matches.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => goToPlace(p)}
                  className="w-full text-left px-5 py-3 hover:bg-[#1A1A1A] transition-colors border-b border-line last:border-b-0"
                >
                  <div className="font-semibold text-sm text-paper">{p.name}</div>
                  {p.address && <div className="text-xs text-muted-foreground">{p.address}</div>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Interstate: from / to */}
      {mode === "interstate" && (
        <div className="flex items-center bg-paper shadow-[6px_6px_0_hsl(var(--signal))] text-ink">
          <select
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            aria-label="From"
            className="flex-1 min-w-0 bg-transparent outline-none text-base md:text-lg font-semibold px-5 py-5 appearance-none"
          >
            {GIGM_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <span className="shrink-0 font-display text-lg">→</span>
          <select
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            aria-label="To"
            className="flex-1 min-w-0 bg-transparent outline-none text-base md:text-lg font-semibold px-5 py-5 appearance-none"
          >
            {GIGM_CITIES.filter((c) => c !== origin).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button type="button" onClick={goInterstate} className={goBtn}>
            Go →
          </button>
        </div>
      )}
    </div>
  );
};
