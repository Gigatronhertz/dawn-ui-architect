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
    `rounded-full px-3.5 py-1.5 text-xs md:text-sm font-semibold transition-colors ${
      active ? "bg-white text-ink" : "text-white/80 hover:text-white"
    }`;
  const goBtn =
    "kj-arrow w-11 h-11 md:w-12 md:h-12 mr-1.5 shrink-0 hover:brightness-105";
  const arrow = (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  );

  return (
    <div className="flex flex-col gap-3 w-full max-w-[640px]">
      {/* Scope */}
      <div className="self-start flex gap-1 rounded-full bg-white/10 p-1 backdrop-blur-sm">
        <button type="button" onClick={() => setMode("lagos")} className={scopeBtn(mode === "lagos")}>
          Within Lagos
        </button>
        <button type="button" onClick={() => setMode("interstate")} className={scopeBtn(mode === "interstate")}>
          Interstate
        </button>
      </div>

      {/* Within-Lagos search */}
      {mode === "lagos" && (
        <div ref={boxRef} className="relative w-full">
          <div className="flex items-center rounded-full bg-white text-ink shadow-card">
            <svg viewBox="0 0 24 24" className="w-5 h-5 ml-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
            </svg>
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              onKeyDown={(e) => { if (e.key === "Enter") goToPlace(matches[0]); }}
              placeholder="Where do you want to go?"
              aria-label="Search places in Lagos"
              className="flex-1 min-w-0 bg-transparent outline-none text-base text-ink px-3.5 py-4 placeholder:text-[#7a746b]"
            />
            <button type="button" onClick={() => goToPlace(matches[0])} className={goBtn} aria-label="Search">
              {arrow}
            </button>
          </div>

          {open && matches.length > 0 && (
            <div className="absolute left-0 right-0 mt-2 rounded-2xl bg-white text-ink shadow-card z-20 max-h-[min(20rem,60vh)] overflow-y-auto overscroll-contain py-1">
              {matches.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => goToPlace(p)}
                  className="w-full text-left px-5 py-3 hover:bg-[#F3EEE4] transition-colors"
                >
                  <div className="font-semibold text-sm">{p.name}</div>
                  {p.address && <div className="text-xs text-[#625D56]">{p.address}</div>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Interstate: from / to */}
      {mode === "interstate" && (
        <div className="flex items-center rounded-full bg-white text-ink shadow-card">
          <select
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            aria-label="From"
            className="flex-1 min-w-0 bg-transparent outline-none text-base font-semibold pl-6 pr-2 py-4 appearance-none"
          >
            {GIGM_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <span className="shrink-0 text-lg text-[#7a746b]" aria-hidden="true">→</span>
          <select
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            aria-label="To"
            className="flex-1 min-w-0 bg-transparent outline-none text-base font-semibold px-4 py-4 appearance-none"
          >
            {GIGM_CITIES.filter((c) => c !== origin).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button type="button" onClick={goInterstate} className={goBtn} aria-label="Plan this route">
            {arrow}
          </button>
        </div>
      )}
    </div>
  );
};
