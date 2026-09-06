import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { KarijeLogo } from "@/components/Nav";
import { LAGOS_EXPERIENCES, type Experience, type DaySchedule } from "@/data/experiences";
import type { AgencyListing } from "@/lib/api";
import { api, imageUrl } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { tripImageUrl } from "@/lib/tripImage";
import { toVenue, VENUE_VIBES, VIBE_EMOJI, type VenueItem } from "@/lib/attractions";
import type { NightlifeVenue, EventItem } from "@/lib/experienceTypes";

// ── Types ─────────────────────────────────────────────────────────────────────
type ExploreStep = "browse" | "detail" | "share";

/** Vibe chips — `value` matches the `category` column on a curated trip. */
const VIBE_FILTERS: { value: string; emoji: string; label: string }[] = [
  { value: "all",       emoji: "🌍", label: "Everything" },
  { value: "adventure", emoji: "⛵", label: "Adventure" },
  { value: "culture",   emoji: "🎭", label: "Culture" },
  { value: "nature",    emoji: "🌿", label: "Nature" },
  { value: "leisure",   emoji: "🌊", label: "Chill" },
  { value: "food",      emoji: "🍽️", label: "Food" },
  { value: "nightlife", emoji: "🎉", label: "Nightlife" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatNGN(amount: number): string {
  return `₦${amount.toLocaleString("en-NG")}`;
}

const cdnImg = tripImageUrl;

/** A Google Maps search link for a place name/address — no API key needed,
 *  works for any location string. */
function mapsSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/**
 * Generic nightlife photos for fallback venues — drawn from the real
 * attractions price table, which carries no photo of its own. Verified,
 * on-theme Unsplash photos, cycled by index so a grid of them isn't the
 * exact same picture repeated.
 */
const FALLBACK_NIGHTLIFE_IMAGES = [
  "1470225620780-dba8ba36b745", // DJ mixer, club lights
  "1566737236500-c8ac43014a67", // nightclub interior, crowd
  "1470337458703-46ad1756a187", // cocktail being poured
  "1543007630-9710e4a00a20",    // bar interior, warm lighting
];

function getScheduleForDays(exp: Experience, days: number): DaySchedule[][] {
  const result: DaySchedule[][] = [];
  for (let d = 0; d < days; d++) {
    const override = exp.scheduleOverrides?.[d];
    result.push(override ?? exp.schedule);
  }
  return result;
}

// ── Category metadata ─────────────────────────────────────────────────────────
const CAT_LABEL: Record<string, string> = {
  adventure: "Adventure",
  culture:   "Culture",
  nature:    "Nature",
  leisure:   "Chill",
  food:      "Food & Culture",
  nightlife: "Nightlife",
};

const CAT_COLOR: Record<string, string> = {
  adventure: "bg-forest text-parchment",
  culture:   "bg-primary text-ink",
  nature:    "bg-sage text-parchment",
  leisure:   "bg-warm-grey text-white",
  food:      "bg-primary/90 text-white",
  nightlife: "bg-foreground text-background",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function PageHeader({ onBack }: { onBack?: () => void }) {
  return (
    <header className="relative pt-8 pb-4">
      <div className="mx-auto max-w-5xl px-6 flex items-center justify-between">
        <KarijeLogo />
        {onBack ? (
          <button
            onClick={onBack}
            className="text-xs font-jost font-light text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back
          </button>
        ) : (
          <Link
            to="/start"
            className="text-xs font-jost font-light text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Change trip type
          </Link>
        )}
      </div>
    </header>
  );
}

/**
 * A trip an agency listed. It links straight to the public plan page, which is
 * the same page its share link points at — one destination, one behaviour.
 */
function AgencyTripCard({ trip }: { trip: AgencyListing }) {
  return (
    <Link
      to={trip.href}
      className="group relative aspect-square overflow-hidden text-left flex flex-col justify-end p-4 border border-border hover:border-foreground transition-colors"
    >
      <span className="absolute top-3 left-3 text-[9px] font-jost font-medium tracking-[0.14em] uppercase bg-signal text-ink px-2 py-0.5">
        {trip.agency}
      </span>
      <div className="font-marcellus text-lg text-foreground leading-tight">{trip.name}</div>
      {trip.tagline && (
        <div className="font-jost font-light text-xs text-muted-foreground mt-1 line-clamp-2">{trip.tagline}</div>
      )}
      <div className="font-jost text-xs text-muted-foreground mt-2 tabular-nums">
        {trip.location} · {trip.days}{trip.days === 1 ? " day" : " days"}
        {trip.perPerson > 0 ? ` · ${formatNGN(trip.perPerson)}` : ""}
      </div>
    </Link>
  );
}

/**
 * A curated nightlife venue — admin-added, with a photo, from /admin →
 * Nightlife. Same aspect-square card shape as a Trip, so switching between
 * tabs on Explore feels like one consistent grid rather than a different UI.
 * Clicking it opens the full detail — location, entry fee, weekly program.
 */
function CuratedNightlifeCard({ v, onSelect }: { v: NightlifeVenue; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className="group relative aspect-square overflow-hidden text-left"
      style={{ backgroundColor: v.colorFallback }}
    >
      {v.imageId && (
        <img
          src={cdnImg(v.imageId, 600, 600)}
          alt={v.name}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
          loading="lazy"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/10" />
      <div className="absolute top-0 left-0 right-0 flex items-start justify-between p-3">
        <span className="text-[10px] font-jost font-medium tracking-wide px-2 py-1 bg-foreground text-background">
          🌙 {v.vibe}
        </span>
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <h3 className="font-marcellus text-base leading-snug text-white">{v.name}</h3>
        <p className="text-[11px] font-jost font-light text-white/60 mt-0.5 truncate">📍 {v.location}</p>
        <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-white/15">
          <span className="font-marcellus text-sm text-white">
            {v.feeNote || (v.feeMax > 0 ? `₦${v.feeMin.toLocaleString()}–₦${v.feeMax.toLocaleString()}` : "Free entry")}
          </span>
          <span className="text-[11px] font-jost font-light text-white/70 group-hover:text-white transition">
            Details →
          </span>
        </div>
      </div>
    </button>
  );
}

/** Fallback nightlife card — drawn from the real per-city attractions table
 *  when no admin-curated venue has been added for this city yet. Most of
 *  these venues now carry a real photo from the places import; the rest
 *  wear a generic on-theme nightlife photo (cycled by position) rather than
 *  a bare colour block. */
function FallbackNightlifeCard({ v, index, onSelect }: { v: VenueItem; index: number; onSelect: () => void }) {
  const realPhoto = imageUrl(v.imageUrl);
  const image = realPhoto || cdnImg(FALLBACK_NIGHTLIFE_IMAGES[index % FALLBACK_NIGHTLIFE_IMAGES.length], 600, 600);
  return (
    <button
      onClick={onSelect}
      className="group relative aspect-square overflow-hidden text-left"
    >
      <img
        src={image}
        alt=""
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
        loading="lazy"
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/15" />
      <div className="absolute top-0 left-0 right-0 p-3">
        <span className="text-2xl leading-none">{v.emoji}</span>
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <h3 className="font-marcellus text-base leading-snug text-white truncate">{v.name}</h3>
        <p className="text-[11px] font-jost font-light text-white/70 mt-1">{v.feeNote}</p>
      </div>
    </button>
  );
}

/**
 * Nightlife in this city. Admin-curated venues (with a photo and a tagline)
 * take priority; where none have been added yet, falls back to the real
 * 272-venue attractions table filtered to the Nightlife vibe, so the section
 * still has something real to show rather than sitting empty.
 */
function NightlifeSection({
  city, curated, fallback, loading, onSelectVenue, onSelectFallback,
}: {
  city: string; curated: NightlifeVenue[]; fallback: VenueItem[]; loading: boolean;
  onSelectVenue: (v: NightlifeVenue) => void;
  onSelectFallback: (v: VenueItem) => void;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="aspect-square bg-secondary animate-pulse" />
        ))}
      </div>
    );
  }

  if (curated.length === 0 && fallback.length === 0) {
    return (
      <div className="border border-border p-10 text-center">
        <div className="text-4xl mb-4">🌙</div>
        <h2 className="font-marcellus text-2xl text-foreground mb-3">
          Nightlife in {city} — coming soon
        </h2>
        <p className="font-jost font-light text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
          We're still picking out the best bars, clubs and lounges here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
      {curated.length > 0
        ? curated.map(v => <CuratedNightlifeCard key={v.id} v={v} onSelect={() => onSelectVenue(v)} />)
        : fallback.map((v, i) => <FallbackNightlifeCard key={v.id} v={v} index={i} onSelect={() => onSelectFallback(v)} />)}
    </div>
  );
}

/**
 * A single curated event — admin-added, from /admin → Events. Same
 * aspect-square card shape as a Trip and a nightlife venue. Clicking it
 * opens the full detail — location, description and the ticket link.
 */
function EventCard({ ev, onSelect }: { ev: EventItem; onSelect: () => void }) {
  const dateLabel = ev.eventDate
    ? new Date(ev.eventDate).toLocaleDateString(undefined, { day: "numeric", month: "short" })
    : "Date TBA";
  return (
    <button
      onClick={onSelect}
      className="group relative aspect-square overflow-hidden text-left"
      style={{ backgroundColor: ev.colorFallback }}
    >
      {ev.imageId && (
        <img
          src={cdnImg(ev.imageId, 600, 600)}
          alt={ev.name}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
          loading="lazy"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/10" />
      <div className="absolute top-0 left-0 right-0 flex items-start justify-between p-3">
        <span className="text-[10px] font-jost font-medium tracking-wide px-2 py-1 bg-signal text-ink capitalize">
          {ev.category}
        </span>
        <span className="text-[10px] font-jost font-light px-2 py-1 bg-black/50 text-white/90">
          {dateLabel}
        </span>
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <h3 className="font-marcellus text-base leading-snug text-white">{ev.name}</h3>
        <p className="text-[11px] font-jost font-light text-white/60 mt-0.5 truncate">📍 {ev.location}</p>
        <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-white/15">
          <span className="font-marcellus text-sm text-white">
            {ev.priceNote || (ev.priceMax > 0 ? `₦${ev.priceMin.toLocaleString()}–₦${ev.priceMax.toLocaleString()}` : "Free")}
          </span>
          <span className="text-[11px] font-jost font-light text-white/70 group-hover:text-white transition">
            Details →
          </span>
        </div>
      </div>
    </button>
  );
}

/**
 * What's on in this city. Shows admin-curated events when any exist; falls
 * back to an honest "coming soon" rather than inventing listings — matching
 * the empty states used elsewhere on this page.
 */
function EventsSection({
  city, events, loading, onSelectEvent,
}: {
  city: string; events: EventItem[]; loading: boolean; onSelectEvent: (ev: EventItem) => void;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="aspect-square bg-secondary animate-pulse" />
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="border border-border p-10 text-center">
        <div className="text-4xl mb-4">🎟️</div>
        <h2 className="font-marcellus text-2xl text-foreground mb-3">
          Events in {city} — coming soon
        </h2>
        <p className="font-jost font-light text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
          We're building out concerts, festivals and pop-ups your squad can plan a trip around.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
      {events.map(ev => <EventCard key={ev.id} ev={ev} onSelect={() => onSelectEvent(ev)} />)}
    </div>
  );
}

/**
 * A pair of actions for getting a place into whatever maps app someone
 * actually uses: a direct Google Maps link (zero-step, opens right there),
 * and a copy button for pasting into Apple Maps, Waze, or anything else.
 */
function MapsActions({ location }: { location: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-4 mt-2">
      <a
        href={mapsSearchUrl(location)}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[11px] font-jost font-medium text-signal hover:underline"
      >
        Open in Maps →
      </a>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard?.writeText(location)
            .then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); })
            .catch(() => {});
        }}
        className={`border px-3 py-1.5 text-[11px] font-jost font-medium tracking-[0.04em] transition-colors ${
          copied
            ? "border-signal text-signal"
            : "border-border text-foreground hover:border-signal hover:text-signal"
        }`}
      >
        {copied ? "✓ Copied" : "Copy location"}
      </button>
    </div>
  );
}

/** Shared overlay shell for the three detail views below — a bottom sheet on
 *  a phone, a centred card on a wider screen. */
function DetailOverlay({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
      />
      <div className="relative bg-card w-full sm:max-w-lg sm:mx-4 max-h-[88vh] overflow-y-auto rounded-t-2xl sm:rounded-none border border-border">
        {children}
      </div>
    </div>
  );
}

/** Full detail for an admin-curated nightlife venue — location, entry fee,
 *  and what's on which night, if the admin has set one up. */
function NightlifeVenueDetail({ venue, onClose }: { venue: NightlifeVenue; onClose: () => void }) {
  return (
    <DetailOverlay onClose={onClose}>
      <div className="relative h-48" style={{ backgroundColor: venue.colorFallback }}>
        {venue.imageId && (
          <img
            src={cdnImg(venue.imageId, 800, 480)}
            alt={venue.name}
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 w-8 h-8 grid place-items-center bg-black/50 text-white hover:bg-black/70 transition"
        >
          ✕
        </button>
        <div className="absolute bottom-4 left-5 right-5 text-white">
          <span className="text-[10px] font-jost font-medium tracking-wide px-2 py-1 bg-white/20 backdrop-blur-sm mb-2 inline-block">
            🌙 {venue.vibe}
          </span>
          <h2 className="font-marcellus text-2xl leading-snug">{venue.name}</h2>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {venue.tagline && (
          <p className="font-jost font-light text-sm text-foreground leading-relaxed">{venue.tagline}</p>
        )}

        <div className="flex items-start justify-between gap-4 border-y border-border py-4">
          <div>
            <div className="text-[10px] font-jost font-light tracking-label text-muted-foreground uppercase mb-1">Location</div>
            <div className="font-jost text-sm text-foreground">📍 {venue.location}</div>
            <MapsActions location={venue.location} />
          </div>
          <div className="text-right shrink-0">
            <div className="text-[10px] font-jost font-light tracking-label text-muted-foreground uppercase mb-1">Entry</div>
            <div className="font-marcellus text-base text-foreground">
              {venue.feeNote || (venue.feeMax > 0 ? `₦${venue.feeMin.toLocaleString()}–₦${venue.feeMax.toLocaleString()}` : "Free entry")}
            </div>
          </div>
        </div>

        {venue.weeklyProgram.length > 0 && (
          <div>
            <div className="flex items-center gap-4 mb-3">
              <span className="h-px w-6 bg-primary" />
              <span className="text-[10px] font-jost font-light tracking-label text-muted-foreground uppercase">
                What's on
              </span>
            </div>
            <ul className="space-y-2">
              {venue.weeklyProgram.map((entry, i) => (
                <li key={i} className="flex items-center justify-between gap-4 py-2 border-b border-border last:border-0">
                  <span className="font-jost font-medium text-sm text-foreground">{entry.day}</span>
                  <span className="font-jost font-light text-sm text-muted-foreground text-right">{entry.activity}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </DetailOverlay>
  );
}

/** Lighter detail for a fallback venue drawn from the attractions table —
 *  most now carry a real photo and address from the places import; a venue
 *  still missing either just shows what's actually known. */
function FallbackVenueDetail({ venue, onClose }: { venue: VenueItem; onClose: () => void }) {
  const photo = imageUrl(venue.imageUrl);
  return (
    <DetailOverlay onClose={onClose}>
      {photo ? (
        <div className="relative h-40">
          <img
            src={photo}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-3 right-3 w-8 h-8 grid place-items-center bg-black/50 text-white hover:bg-black/70 transition"
          >
            ✕
          </button>
          <div className="absolute bottom-3 left-5 right-5 text-white">
            <span className="text-2xl leading-none">{venue.emoji}</span>
            <h2 className="font-marcellus text-xl leading-snug">{venue.name}</h2>
          </div>
        </div>
      ) : (
        <div className="p-6 pb-0 flex items-start justify-between">
          <span className="text-4xl leading-none">{venue.emoji}</span>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 grid place-items-center bg-secondary text-muted-foreground hover:text-foreground transition"
          >
            ✕
          </button>
        </div>
      )}
      <div className="p-6 space-y-5">
        {!photo && (
          <h2 className="font-marcellus text-2xl text-foreground leading-snug -mt-2">{venue.name}</h2>
        )}
        <div>
          <p className="text-xs font-jost font-light text-muted-foreground">{venue.vibe}</p>
          {venue.address && (
            <p className="text-sm font-jost font-light text-foreground mt-2">📍 {venue.address}</p>
          )}
          <MapsActions location={venue.address || venue.name} />
        </div>
        <div className="border-t border-border pt-4">
          <div className="text-[10px] font-jost font-light tracking-label text-muted-foreground uppercase mb-1">Entry</div>
          <div className="font-marcellus text-base text-foreground">{venue.feeNote}</div>
        </div>
        {!venue.address && (
          <p className="text-xs font-jost font-light text-muted-foreground leading-relaxed">
            We don't have a full write-up for this one yet — it's listed from our venue price table.
          </p>
        )}
      </div>
    </DetailOverlay>
  );
}

/** Full detail for a curated event — location, description and, if the
 *  admin added one, the ticket link telling the squad where to buy. */
function EventDetail({ event, onClose }: { event: EventItem; onClose: () => void }) {
  const dateLabel = event.eventDate
    ? new Date(event.eventDate).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : "Date to be announced";
  return (
    <DetailOverlay onClose={onClose}>
      <div className="relative h-48" style={{ backgroundColor: event.colorFallback }}>
        {event.imageId && (
          <img
            src={cdnImg(event.imageId, 800, 480)}
            alt={event.name}
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 w-8 h-8 grid place-items-center bg-black/50 text-white hover:bg-black/70 transition"
        >
          ✕
        </button>
        <div className="absolute bottom-4 left-5 right-5 text-white">
          <span className="text-[10px] font-jost font-medium tracking-wide px-2 py-1 bg-signal text-ink capitalize mb-2 inline-block">
            {event.category}
          </span>
          <h2 className="font-marcellus text-2xl leading-snug">{event.name}</h2>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {event.description && (
          <p className="font-jost font-light text-sm text-foreground leading-relaxed">{event.description}</p>
        )}

        <div className="grid grid-cols-2 gap-4 border-y border-border py-4">
          <div>
            <div className="text-[10px] font-jost font-light tracking-label text-muted-foreground uppercase mb-1">Date</div>
            <div className="font-jost text-sm text-foreground">{dateLabel}</div>
          </div>
          <div>
            <div className="text-[10px] font-jost font-light tracking-label text-muted-foreground uppercase mb-1">Location</div>
            <div className="font-jost text-sm text-foreground">📍 {event.location}</div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-jost font-light tracking-label text-muted-foreground uppercase mb-1">Price</div>
            <div className="font-marcellus text-lg text-foreground">
              {event.priceNote || (event.priceMax > 0 ? `₦${event.priceMin.toLocaleString()}–₦${event.priceMax.toLocaleString()}` : "Free")}
            </div>
          </div>
          {event.ticketUrl && (
            <a
              href={event.ticketUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-signal text-ink px-6 py-3 text-sm font-jost font-medium tracking-[0.06em] hover:opacity-90 transition-opacity"
            >
              Get tickets →
            </a>
          )}
        </div>
        {!event.ticketUrl && (
          <p className="text-xs font-jost font-light text-muted-foreground leading-relaxed">
            No ticket link yet — check back closer to the date, or ask around at the venue.
          </p>
        )}
      </div>
    </DetailOverlay>
  );
}

function ExperienceCard({ exp, onSelect }: { exp: Experience; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className="group relative aspect-square overflow-hidden text-left"
      style={{ backgroundColor: exp.colorFallback }}
    >
      {/* Full-bleed photo */}
      <img
        src={cdnImg(exp.imageId, 600, 600)}
        alt={exp.name}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
        loading="lazy"
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
      />

      {/* Gradient overlay — heavier at bottom */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/10" />

      {/* Top row: category + day cap */}
      <div className="absolute top-0 left-0 right-0 flex items-start justify-between p-3">
        <span className={`text-[10px] font-jost font-medium tracking-wide px-2 py-1 ${CAT_COLOR[exp.category]}`}>
          {CAT_LABEL[exp.category]}
        </span>
        <span className="text-[10px] font-jost font-light px-2 py-1 bg-black/50 text-white/90">
          {exp.maxDays === 1 ? "1 day" : `↑ ${exp.maxDays} days`}
        </span>
      </div>

      {/* Bottom: name, location, price */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <h3 className="font-marcellus text-base leading-snug text-white">{exp.name}</h3>
        <p className="text-[11px] font-jost font-light text-white/60 mt-0.5 truncate">📍 {exp.location}</p>
        <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-white/15">
          <span className="font-marcellus text-sm text-white">
            {formatNGN(exp.pricePerPersonPerDay)}
            <span className="text-[10px] font-jost font-light text-white/55">/p·day</span>
          </span>
          <span className="text-[11px] font-jost font-light text-white/70 group-hover:text-white transition">
            Explore →
          </span>
        </div>
      </div>
    </button>
  );
}

function RangeSlider({
  label,
  value,
  min,
  max,
  onChange,
  format = (v: number) => String(v),
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-sm font-jost font-light text-foreground">{label}</span>
        <span className="font-marcellus text-lg text-foreground">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-[3px] bg-border rounded-full appearance-none cursor-pointer"
        style={{ accentColor: "hsl(var(--primary))" }}
      />
      <div className="flex justify-between mt-1.5">
        <span className="text-[10px] font-jost font-light text-muted-foreground">{format(min)}</span>
        <span className="text-[10px] font-jost font-light text-muted-foreground">{format(max)}</span>
      </div>
    </div>
  );
}

// ── Build-your-own planner ────────────────────────────────────────────────────

type BuiltStop = { id: string; time: string; title: string; cost: number; emoji: string };

/**
 * The squad plans their own day out from the venue database.
 *
 * Deliberately starts empty: they search and add, and the cost follows what
 * they picked. Nothing is generated for them — this is the "you're the planner"
 * half of Explore.
 */
/**
 * The day/stop builder: pick a city, stack stops from the venue library, and
 * the per-person cost falls out of the stops themselves.
 *
 * Shared by the squad flow in Explore and the agency flow in ProTripBuilder.
 * With no overrides it behaves exactly as it always has — saves a custom trip
 * and jumps to the plan page. Pass `onSave` to own the save yourself.
 */
export function BuildYourOwn({
  city,
  onSave,
  saveLabel,
  extraFields,
  requireSignIn = true,
  allowCustomPlaces = false,
  seed = null,
}: {
  city: string;
  /** Take over saving. Receives the built days and headcount. */
  onSave?: (payload: { city: string; squadSize: number; days: { activities: { time: string; title: string; cost_per_person: number }[] }[] }) => Promise<void>;
  /** Label for the save button when there is something to save. */
  saveLabel?: string;
  /** Rendered just above the total, for fields the host page needs. */
  extraFields?: React.ReactNode;
  /** Agency pages are already behind auth, so they skip the sign-in prompt. */
  requireSignIn?: boolean;
  /**
   * Let the planner add a place that isn't in our library. Pro only: agencies
   * are verified before they get here, and they routinely run trips around
   * venues we have never listed — or in cities we have not seeded at all.
   */
  allowCustomPlaces?: boolean;
  /**
   * Prefill the days from a saved template. Pass a NEW object each time you
   * want it applied — the effect keys off identity, so picking the same
   * template twice still reloads it.
   */
  seed?: { days: { activities: { time: string; title: string; cost_per_person: number }[] }[]; squadSize?: number } | null;
}) {
  const { user, getIdToken } = useAuth();
  const navigate = useNavigate();

  const [venues, setVenues]   = useState<VenueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [vibe, setVibe]       = useState<string>("All");
  const [squadSize, setSquad] = useState(6);
  const [dayCount, setDayCount] = useState(1);
  const [stops, setStops]     = useState<Record<number, BuiltStop[]>>({ 0: [] });
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState("");
  const [ideas, setIdeas]     = useState<(VenueItem & { reason: string | null })[]>([]);
  const [thinking, setThinking] = useState(false);
  // On a phone the library becomes a sheet rather than stacking below the days.
  const [libOpen, setLibOpen] = useState(false);
  // A place the planner is typing in themselves.
  const [ownName, setOwnName] = useState("");
  const [ownCost, setOwnCost] = useState("");
  const [ownDay,  setOwnDay]  = useState(0);

  useEffect(() => {
    let live = true;
    setLoading(true);
    // Swapping city swaps the venue library, so library-picked stops no longer
    // belong. A planner who can add their own places is different: their stops
    // are their own work and are not ours to throw away when they fix a typo
    // in the city name.
    if (!allowCustomPlaces) setStops({ 0: [] });
    api.getAttractions(city)
      .then(d => { if (live) setVenues((d.attractions ?? []).map(toVenue)); })
      .catch(() => { if (live) setVenues([]); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [city]);

  /**
   * Load a template into the builder. Stored titles carry their emoji inline
   * (that is how they were saved), so split it back off — otherwise re-saving
   * would stack a second emoji on every stop.
   */
  useEffect(() => {
    if (!seed) return;
    const next: Record<number, BuiltStop[]> = {};
    seed.days.forEach((d, i) => {
      next[i] = (d.activities ?? []).map((a, k) => {
        const m = /^(\p{Extended_Pictographic}\uFE0F?)\s+(.*)$/u.exec(a.title || "");
        return {
          id:    `seed-${i}-${k}-${Date.now()}`,
          time:  a.time === "—:—" ? "" : (a.time || ""),
          title: m ? m[2] : (a.title || ""),
          cost:  Math.max(0, Number(a.cost_per_person) || 0),
          emoji: m ? m[1] : "📍",
        };
      });
    });
    setStops(next);
    setDayCount(Math.max(1, seed.days.length));
    if (seed.squadSize) setSquad(Math.max(1, seed.squadSize));
  }, [seed]);

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    return venues.filter(v =>
      (vibe === "All" || v.vibe === vibe) &&
      (!q || v.name.toLowerCase().includes(q) || v.vibe.toLowerCase().includes(q))
    );
  }, [venues, search, vibe]);

  const days = Array.from({ length: dayCount }, (_, i) => i);
  const perPerson = days.reduce(
    (sum, d) => sum + (stops[d] ?? []).reduce((s, x) => s + x.cost, 0), 0
  );
  const totalStops = days.reduce((n, d) => n + (stops[d] ?? []).length, 0);

  /**
   * Ask for a few places that fit what's already picked. Additive only — the
   * squad's plan is never replaced, just offered more.
   */
  async function getIdeas() {
    setThinking(true);
    try {
      const added = days.flatMap(d => (stops[d] ?? []).map(s => s.title));
      const res = await api.suggestVenues({ city, added, vibe: vibe === "All" ? null : vibe });
      setIdeas(res.suggestions.map(s => ({ ...toVenue(s), reason: s.reason })));
    } catch {
      setIdeas([]);
    } finally {
      setThinking(false);
    }
  }

  function addStop(day: number, v: VenueItem) {
    setStops(prev => ({
      ...prev,
      [day]: [...(prev[day] ?? []), { id: `${v.id}-${Date.now()}`, time: "", title: v.name, cost: v.cost, emoji: v.emoji }],
    }));
  }
  /**
   * Add a place the planner typed in. It behaves exactly like a library venue
   * once added — same shape, same cost maths — it just never came from us.
   */
  function addOwnPlace() {
    const name = ownName.trim();
    if (!name) return;
    const cost = Math.max(0, Math.round(Number(ownCost) || 0));
    const day = Math.min(ownDay, dayCount - 1);
    addStop(day, {
      id:      `own-${Date.now()}`,
      name,
      emoji:   "📍",
      vibe:    "Custom",
      cost,
      feeNote: cost > 0 ? `₦${cost.toLocaleString()}` : "Free",
    });
    setOwnName("");
    setOwnCost("");
  }

  function removeStop(day: number, id: string) {
    setStops(prev => ({ ...prev, [day]: (prev[day] ?? []).filter(s => s.id !== id) }));
  }
  function setStopTime(day: number, id: string, time: string) {
    setStops(prev => ({
      ...prev,
      [day]: (prev[day] ?? []).map(s => s.id === id ? { ...s, time } : s),
    }));
  }

  /** The stops as the API wants them — the same shape for both callers. */
  function buildPayload() {
    return {
      city,
      squadSize,
      days: days.map(d => ({
        activities: (stops[d] ?? []).map(s => ({
          time: s.time || "—:—",
          title: `${s.emoji} ${s.title}`,
          cost_per_person: s.cost,
        })),
      })),
    };
  }

  async function handleSave() {
    setSaving(true);
    setErr("");
    try {
      if (onSave) {
        await onSave(buildPayload());
        return;
      }
      const token = await getIdToken();
      if (!token) throw new Error("Please sign in first.");
      const res = await api.saveCustomTrip(buildPayload(), token);
      navigate(`/plan/${res.tripId}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save your trip.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid lg:grid-cols-[1fr,340px] gap-8 items-start">
      {/* ── Left: the days being built ── */}
      <div className="space-y-5 min-w-0">
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-xs font-jost font-light text-muted-foreground">Days</label>
          <div className="flex">
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                onClick={() => setDayCount(n)}
                className={`w-9 h-9 text-sm font-jost border transition-colors ${
                  dayCount === n
                    ? "border-forest bg-forest text-parchment font-medium"
                    : "border-border text-muted-foreground hover:border-forest"
                } ${n > 1 ? "-ml-px" : ""}`}
              >
                {n}
              </button>
            ))}
          </div>
          <label className="text-xs font-jost font-light text-muted-foreground ml-2">Squad</label>
          <input
            type="number" min={1} max={60} value={squadSize}
            onChange={e => setSquad(Math.max(1, Number(e.target.value) || 1))}
            className="w-16 border border-border bg-background px-2 py-1.5 text-sm font-jost text-center tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {days.map(d => (
          <div key={d} className="border border-border">
            <div className="px-4 py-2.5 border-b border-border bg-secondary/30 flex items-center justify-between">
              <span className="font-jost font-medium text-sm">Day {d + 1}</span>
              <span className="text-[11px] font-jost font-light text-muted-foreground">
                {(stops[d] ?? []).length} stop{(stops[d] ?? []).length === 1 ? "" : "s"}
              </span>
            </div>

            {(stops[d] ?? []).length === 0 ? (
              <p className="px-4 py-6 text-sm font-jost font-light text-muted-foreground text-center">
                Nothing here yet — add somewhere from the list.
              </p>
            ) : (
              <ul>
                {(stops[d] ?? []).map(s => (
                  <li key={s.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-border/60 last:border-0">
                    <input
                      type="text" value={s.time}
                      onChange={e => setStopTime(d, s.id, e.target.value)}
                      placeholder="09:00"
                      className="w-16 shrink-0 border border-border bg-background px-2 py-1 text-xs font-jost text-center tabular-nums focus:outline-none focus:ring-1 focus:ring-primary/30 placeholder:text-muted-foreground/50"
                    />
                    <span className="text-lg shrink-0 leading-none">{s.emoji}</span>
                    <span className="flex-1 min-w-0 text-sm font-jost truncate">{s.title}</span>
                    <span className="text-xs font-jost tabular-nums text-muted-foreground shrink-0">
                      {s.cost > 0 ? formatNGN(s.cost) : "Free"}
                    </span>
                    <button
                      onClick={() => removeStop(d, s.id)}
                      aria-label={`Remove ${s.title}`}
                      className="text-muted-foreground hover:text-red-500 text-xs shrink-0"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}

        {/* Total + save */}
        <div className="border border-border p-5 space-y-3">
          {extraFields}
          <div className="flex items-end justify-between">
            <div>
              <div className="text-[10px] font-jost font-light tracking-label text-muted-foreground uppercase">Per person</div>
              <div className="font-marcellus text-3xl text-foreground">{formatNGN(perPerson)}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-jost font-light tracking-label text-muted-foreground uppercase">Squad total</div>
              <div className="font-marcellus text-xl text-foreground">{formatNGN(perPerson * squadSize)}</div>
            </div>
          </div>

          {user || !requireSignIn ? (
            <button
              onClick={handleSave}
              disabled={saving || totalStops === 0}
              className="w-full bg-signal text-ink py-3.5 font-jost font-medium text-sm tracking-[0.06em] hover:bg-ink hover:text-signal transition-colors disabled:opacity-40"
            >
              {saving ? "Saving…" : totalStops === 0 ? "Add a stop to continue" : (saveLabel ?? "Create shareable link →")}
            </button>
          ) : (
            <Link
              to="/login?redirect=/start/explore"
              className="w-full block text-center border border-border text-foreground py-3.5 font-jost font-light text-sm tracking-[0.06em] hover:border-forest hover:text-forest transition-colors"
            >
              Sign in to save and share this
            </Link>
          )}

          {err && <p className="text-xs font-jost text-red-500">{err}</p>}
          <p className="text-[10px] font-jost font-light text-muted-foreground leading-relaxed">
            Entry fees only — food, transport between stops and anything you book yourself aren't
            included. You can edit all of this before sharing.
          </p>
        </div>

        {/* Clearance for the fixed add-a-place bar on phones */}
        <div className="lg:hidden h-24" aria-hidden="true" />
      </div>

      {/* Dimmer behind the mobile sheet */}
      {libOpen && (
        <button
          aria-label="Close places"
          onClick={() => setLibOpen(false)}
          className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
        />
      )}

      {/* ── The venue library ────────────────────────────────────────────────
          Beside the days on a wide screen, a bottom sheet on a phone. Stacking
          it underneath would mean scrolling past the whole plan to add one
          place, which is the thing people do most. */}
      <div
        className={`bg-background border border-border p-4 space-y-3 lg:block lg:sticky lg:top-6 lg:max-h-none lg:overflow-visible lg:z-auto ${
          libOpen
            ? "fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-2xl"
            : "hidden"
        }`}
      >
        <div className="lg:hidden flex items-center justify-between mb-1">
          <span className="font-jost font-medium text-sm">Add a place</span>
          <button
            onClick={() => setLibOpen(false)}
            aria-label="Close"
            className="w-8 h-8 grid place-items-center bg-secondary text-muted-foreground"
          >
            ✕
          </button>
        </div>

        <div className="text-[10px] font-jost font-light tracking-label text-muted-foreground uppercase">
          Places in {city}
          {venues.length > 0 && <span className="text-foreground"> · {venues.length}</span>}
        </div>

        <input
          type="text" value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={`Search ${city}…`}
          className="w-full border border-border bg-background px-3 py-2 text-sm font-jost focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/60"
        />

        {allowCustomPlaces && (
          <div className="border border-border p-3 space-y-2">
            <div className="text-[10px] font-jost font-light tracking-label text-muted-foreground uppercase">
              Add your own place
            </div>
            <input
              type="text"
              value={ownName}
              onChange={e => setOwnName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addOwnPlace(); } }}
              placeholder="Name of the place or activity"
              maxLength={120}
              className="w-full border border-border bg-background px-3 py-2 text-sm font-jost focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/60"
            />
            <div className="flex gap-2">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={ownCost}
                onChange={e => setOwnCost(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addOwnPlace(); } }}
                placeholder="₦ per person"
                className="flex-1 min-w-0 border border-border bg-background px-3 py-2 text-sm font-jost focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/60"
              />
              <select
                value={ownDay}
                onChange={e => setOwnDay(Number(e.target.value))}
                aria-label="Which day"
                className="border border-border bg-background px-2 py-2 text-xs font-jost shrink-0"
              >
                {days.map(d => <option key={d} value={d}>Day {d + 1}</option>)}
              </select>
            </div>
            <button
              type="button"
              onClick={addOwnPlace}
              disabled={!ownName.trim()}
              className="w-full bg-signal text-ink py-2 text-xs font-jost font-medium tracking-[0.06em] hover:bg-ink hover:text-signal transition-colors disabled:opacity-40"
            >
              + Add to Day {Math.min(ownDay, dayCount - 1) + 1}
            </button>
            <p className="text-[10px] font-jost font-light text-muted-foreground leading-relaxed">
              Anywhere you run trips — it doesn't have to be a place we already list.
            </p>
          </div>
        )}

        <div className="flex gap-1.5 flex-wrap">
          {VENUE_VIBES.map(v => (
            <button
              key={v}
              onClick={() => setVibe(v)}
              className={`text-[10px] font-jost px-2 py-1 border transition-colors ${
                vibe === v
                  ? "border-forest bg-forest/5 text-forest font-medium"
                  : "border-border text-muted-foreground hover:border-forest"
              }`}
            >
              {VIBE_EMOJI[v]} {v}
            </button>
          ))}
        </div>

        {/* Ideas — additive suggestions, never a replacement for their picks */}
        {venues.length > 0 && (
          <div className="border-t border-border pt-3">
            <button
              onClick={getIdeas}
              disabled={thinking}
              className="w-full text-[11px] font-jost font-medium py-2 border border-border text-muted-foreground hover:border-forest hover:text-forest transition-colors disabled:opacity-50"
            >
              {thinking ? "Thinking…" : totalStops === 0 ? "✨ What should we do?" : "✨ What else goes with this?"}
            </button>

            {ideas.length > 0 && (
              <ul className="mt-2 space-y-1.5">
                {ideas.map(v => (
                  <li key={v.id} className="bg-secondary/40 p-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base shrink-0 leading-none">{v.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-jost font-medium truncate">{v.name}</div>
                        <div className="text-[10px] font-jost font-light text-muted-foreground truncate">
                          {v.reason || `${v.vibe} · ${v.feeNote}`}
                        </div>
                      </div>
                      <select
                        value=""
                        onChange={e => {
                          if (e.target.value !== "") {
                            addStop(Number(e.target.value), v);
                            setIdeas(prev => prev.filter(x => x.id !== v.id));
                          }
                        }}
                        aria-label={`Add ${v.name} to a day`}
                        className="text-[10px] font-jost border border-border bg-background px-1.5 py-1 shrink-0 cursor-pointer hover:border-forest focus:outline-none focus:ring-1 focus:ring-primary/30"
                      >
                        <option value="">+ Add</option>
                        {days.map(d => <option key={d} value={d}>Day {d + 1}</option>)}
                      </select>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {loading ? (
          <p className="text-xs font-jost font-light text-muted-foreground py-6 text-center">Loading places…</p>
        ) : matches.length === 0 ? (
          <p className="text-xs font-jost font-light text-muted-foreground py-6 text-center">
            {venues.length === 0
              ? allowCustomPlaces
                ? `We have no places listed for ${city} — add your own above.`
                : `No places listed for ${city} yet.`
              : `Nothing matching that in ${city}.`}
          </p>
        ) : (
          <ul className="max-h-[26rem] overflow-y-auto -mx-1 px-1">
            {matches.map(v => (
              <li key={v.id} className="flex items-center gap-2 py-2 border-b border-border/50 last:border-0">
                {imageUrl(v.imageUrl) ? (
                  <img
                    src={imageUrl(v.imageUrl)!}
                    alt=""
                    className="w-8 h-8 rounded-lg object-cover shrink-0"
                    loading="lazy"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <span className="w-8 h-8 grid place-items-center text-base shrink-0 leading-none">{v.emoji}</span>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-jost font-medium truncate">{v.name}</div>
                  <div className="text-[10px] font-jost font-light text-muted-foreground truncate">
                    <span className="text-foreground/70">{v.vibe}</span> · {v.feeNote}
                  </div>
                </div>
                <select
                  value=""
                  onChange={e => { if (e.target.value !== "") addStop(Number(e.target.value), v); }}
                  aria-label={`Add ${v.name} to a day`}
                  className="text-[10px] font-jost border border-border bg-background px-1.5 py-1 shrink-0 cursor-pointer hover:border-forest focus:outline-none focus:ring-1 focus:ring-primary/30"
                >
                  <option value="">+ Add</option>
                  {days.map(d => <option key={d} value={d}>Day {d + 1}</option>)}
                </select>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Phone-only bar — the library is one tap away, not a scroll away */}
      {!libOpen && (
        <div className="lg:hidden fixed inset-x-0 bottom-0 z-30 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 bg-background/95 backdrop-blur border-t border-border">
          <div className="flex items-center gap-3">
            <div className="min-w-0">
              <div className="text-[10px] font-jost font-light tracking-label text-muted-foreground uppercase">Per person</div>
              <div className="font-marcellus text-lg text-foreground tabular-nums truncate">{formatNGN(perPerson)}</div>
            </div>
            <button
              onClick={() => setLibOpen(true)}
              className="flex-1 bg-forest text-parchment py-3 font-jost font-medium text-sm tracking-[0.06em] active:opacity-90 transition"
            >
              ＋ Add a place
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
const ALL_EXPLORE_CITIES = [
  "Lagos", "Abuja", "Port Harcourt", "Ibadan", "Enugu",
  "Calabar", "Benin City", "Kano", "Kaduna", "Jos",
  "Abeokuta", "Ilorin", "Akure", "Owerri", "Warri",
];

export default function Explore() {
  const navigate            = useNavigate();
  const [step, setStep]     = useState<ExploreStep>("browse");
  const [selected, setSelected] = useState<Experience | null>(null);
  const [days, setDays]     = useState(1);
  const [squadSize, setSquadSize] = useState(6);
  const [city, setCity]     = useState("Lagos");

  // Curated trips for this city, from the API. LAGOS_EXPERIENCES is only an
  // offline fallback so the page still renders if the backend is unreachable.
  const [experiences, setExperiences] = useState<Experience[]>(LAGOS_EXPERIENCES);
  // Trips an agency built and chose to list. They sit in the same catalog as
  // Karije's own, but say who is running them.
  const [agencyTrips, setAgencyTrips] = useState<AgencyListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [vibe, setVibe] = useState("all");
  // "ours" = trips Karije picked and runs. "nightlife"/"events" = curated
  // after-dark content for the city. "own" = build your own day out.
  const [tab, setTab] = useState<"ours" | "nightlife" | "events" | "own">("ours");

  // Real venues for this city, from the same 272-venue table the "Build your
  // own" planner uses — powers the Nightlife section regardless of which tab
  // is active.
  const [cityVenues, setCityVenues] = useState<VenueItem[]>([]);
  const [venuesLoading, setVenuesLoading] = useState(true);

  useEffect(() => {
    let live = true;
    setLoading(true);
    api.getListings(city)
      .then(d => {
        if (!live) return;
        setExperiences(d.experiences ?? []);
        setAgencyTrips(d.agencyTrips ?? []);
      })
      .catch(() => {/* keep whatever is on screen */})
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [city]);

  useEffect(() => {
    let live = true;
    setVenuesLoading(true);
    api.getAttractions(city)
      .then(d => { if (live) setCityVenues((d.attractions ?? []).map(toVenue)); })
      .catch(() => { if (live) setCityVenues([]); })
      .finally(() => { if (live) setVenuesLoading(false); });
    return () => { live = false; };
  }, [city]);

  const nightlifeFallback = useMemo(
    () => cityVenues.filter(v => v.vibe === "Nightlife").slice(0, 10),
    [cityVenues]
  );

  // Admin-curated nightlife venues and events for this city — added from
  // /admin → Nightlife / Events, the same way trips are.
  const [nightlifeCurated, setNightlifeCurated] = useState<NightlifeVenue[]>([]);
  const [curatedLoading, setCuratedLoading] = useState(true);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  // Which card is open in a detail overlay, if any — one of the three, never
  // more than one at once.
  const [openVenue, setOpenVenue] = useState<NightlifeVenue | null>(null);
  const [openFallbackVenue, setOpenFallbackVenue] = useState<VenueItem | null>(null);
  const [openEvent, setOpenEvent] = useState<EventItem | null>(null);

  useEffect(() => {
    let live = true;
    setCuratedLoading(true);
    api.getNightlifeVenues(city)
      .then(d => { if (live) setNightlifeCurated(d.venues ?? []); })
      .catch(() => { if (live) setNightlifeCurated([]); })
      .finally(() => { if (live) setCuratedLoading(false); });
    return () => { live = false; };
  }, [city]);

  useEffect(() => {
    let live = true;
    setEventsLoading(true);
    api.getEvents(city)
      .then(d => { if (live) setEvents(d.events ?? []); })
      .catch(() => { if (live) setEvents([]); })
      .finally(() => { if (live) setEventsLoading(false); });
    return () => { live = false; };
  }, [city]);

  // Reset to browse when city changes
  useEffect(() => {
    setStep("browse");
    setSelected(null);
    setVibe("all");
  }, [city]);

  useEffect(() => {
    const titles: Record<ExploreStep, string> = {
      browse: `Explore ${city} · Karije`,
      detail: selected ? `${selected.name} · Karije` : `Explore ${city} · Karije`,
      share:  "Trip ready · Karije",
    };
    document.title = titles[step];
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step, selected, city]);

  // ── Save to the signed-in user's plans ──────────────────────────────────────
  const { user, getIdToken } = useAuth();
  const [saving, setSaving]   = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [saveErr, setSaveErr] = useState("");

  /**
   * A squad can't join a trip that doesn't exist yet, so the share step makes
   * one first and puts its link in the message. Reuses the saved trip when
   * there is one, so saving and then sharing doesn't create two.
   */
  const [shareTripId, setShareTripId] = useState<string | null>(null);
  const [sharePrep, setSharePrep]     = useState(false);
  const shareId = savedId || shareTripId;

  async function openShare() {
    setStep("share");
    if (!selected || shareId) return;
    setSharePrep(true);
    try {
      const res = await api.createShareTrip(selected.id, { days, squadSize });
      setShareTripId(res.tripId);
    } catch {
      // Leave the link out rather than blocking the share — the summary is
      // still worth sending, and they can retry from the plan page.
    } finally {
      setSharePrep(false);
    }
  }

  /**
   * Sign in without losing the trip.
   *
   * The trip is created first, then sign-in returns to it with ?claim=1 so it
   * gets adopted on arrival. Sending someone to /login and hoping they find
   * their way back is how a half-built plan disappears — and an ownerless trip
   * is exactly what we're trying to stop producing.
   */
  async function signInToSave() {
    let id = shareId;
    if (!id && selected) {
      setSharePrep(true);
      try {
        const res = await api.createShareTrip(selected.id, { days, squadSize });
        id = res.tripId;
        setShareTripId(res.tripId);
      } catch {
        // Couldn't reserve one — still let them sign in rather than dead-end.
      } finally {
        setSharePrep(false);
      }
    }
    const back = id ? `/plan/${id}?claim=1` : "/start/explore";
    navigate(`/login?next=${encodeURIComponent(back)}`);
  }

  async function handleAddToPlan() {
    if (!selected) return;
    setSaving(true);
    setSaveErr("");
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Please sign in first.");
      const res = await api.addCuratedToPlan(selected.id, { days, squadSize }, token);
      setSavedId(res.tripId);
    } catch (err) {
      setSaveErr(err instanceof Error ? err.message : "Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  const shown = vibe === "all" ? experiences : experiences.filter(e => e.category === vibe);

  // Only offer a vibe chip when something in this city actually carries it.
  const availableVibes = VIBE_FILTERS.filter(
    v => v.value === "all" || experiences.some(e => e.category === v.value)
  );

  function handleSelect(exp: Experience) {
    setSelected(exp);
    setDays(1);
    setSquadSize(Math.max(6, exp.groupMin));
    setStep("detail");
  }

  const totalCost       = selected ? selected.pricePerPersonPerDay * days * squadSize : 0;
  const perPersonTotal  = selected ? selected.pricePerPersonPerDay * days : 0;

  // ── Step: Browse ─────────────────────────────────────────────────────────
  if (step === "browse") {
    return (
      <main className="min-h-screen bg-background">
        <PageHeader />

        <div className="mx-auto max-w-5xl px-6 pb-24">
          {/* Section header */}
          <div className="py-8 border-b border-border mb-8">
            <div className="flex items-center gap-4 mb-5">
              <span className="h-px w-8 bg-primary" />
              <span className="text-[10px] font-jost font-light tracking-label text-muted-foreground uppercase">
                Explore within a state
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
              <h1 className="font-marcellus text-3xl md:text-4xl text-foreground">
                Explore {city}
              </h1>
              {/* City picker */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-jost font-light text-muted-foreground">City:</span>
                <select
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  className="border border-border bg-background px-3 py-1.5 text-sm font-jost font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 appearance-none pr-7 cursor-pointer"
                  style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='none' stroke='%238E93AA' stroke-width='1.5' stroke-linecap='round' d='M4 6l4 4 4-4'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 6px center", backgroundSize: "14px" }}
                >
                  {ALL_EXPLORE_CITIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Four ways into this city: our trips, nightlife, events, or build your own */}
            <div className="flex gap-0 mb-6 flex-wrap">
              {([
                { id: "ours",      label: "Trips we run" },
                { id: "nightlife", label: "🌙 Nightlife" },
                { id: "events",    label: "🎟️ Events" },
                { id: "own",       label: "Build your own" },
              ] as const).map(({ id, label }, i) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`px-5 py-2.5 text-sm font-jost border transition-colors ${i > 0 ? "-ml-px" : ""} ${
                    tab === id
                      ? "border-forest bg-forest text-parchment font-medium"
                      : "border-border text-muted-foreground hover:border-forest hover:text-forest"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <p className={`font-jost text-sm leading-relaxed max-w-xl mb-6 ${
              tab === "nightlife" ? "font-medium text-foreground" : "font-light text-muted-foreground"
            }`}>
              {tab === "ours" &&
                "Trips we've picked, priced and will run for your squad. Pick one, choose your days and squad size, and we handle the rest."}
              {tab === "nightlife" &&
                `Just some fun spots we found in ${city}'s nightlife scene — no strings attached. Tap one, copy the location into your maps app, and go have fun. No hassle. You're welcome.`}
              {tab === "events" &&
                `Concerts, festivals and pop-ups happening in ${city} that your squad can plan a trip around.`}
              {tab === "own" &&
                `Plan your own day out in ${city}. Add the places you want, we'll tell you what they cost, then share it with your squad to collect everyone's share.`}
            </p>

            {/* Vibe filter — chips only appear for vibes this city actually has */}
            {tab === "ours" && availableVibes.length > 1 && (
              <div className="flex gap-2 flex-wrap">
                {availableVibes.map(({ value, emoji, label }) => (
                  <button
                    key={value}
                    onClick={() => setVibe(value)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 border text-sm font-jost transition-colors ${
                      vibe === value
                        ? "border-forest bg-forest/5 text-forest font-medium"
                        : "border-border text-muted-foreground font-light hover:border-forest hover:text-forest"
                    }`}
                  >
                    <span>{emoji}</span>
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {tab === "own" && <BuildYourOwn city={city} />}

          {tab === "nightlife" && (
            <NightlifeSection
              city={city}
              curated={nightlifeCurated}
              fallback={nightlifeFallback}
              loading={venuesLoading || curatedLoading}
              onSelectVenue={setOpenVenue}
              onSelectFallback={setOpenFallbackVenue}
            />
          )}

          {tab === "events" && (
            <EventsSection
              city={city}
              events={events}
              loading={eventsLoading}
              onSelectEvent={setOpenEvent}
            />
          )}

          {tab === "ours" && loading && (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="border border-border animate-pulse">
                  <div className="h-40 bg-secondary" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-secondary" />
                    <div className="h-3 w-2/3 bg-secondary" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "ours" && !loading && (shown.length > 0 || agencyTrips.length > 0) && (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {shown.map((exp) => (
                <ExperienceCard
                  key={exp.id}
                  exp={exp}
                  onSelect={() => handleSelect(exp)}
                />
              ))}
              {/* Vibe filters describe Karije's own categories, so agency trips
                  are only shown on the unfiltered view rather than silently
                  dropped by a filter that does not apply to them. */}
              {vibe === "all" && agencyTrips.map((t) => (
                <AgencyTripCard key={t.id} trip={t} />
              ))}
            </div>
          )}

          {/* Nothing for this city yet, or nothing under the chosen vibe */}
          {tab === "ours" && !loading && shown.length === 0 && agencyTrips.length === 0 && (
            <div className="border border-border p-10 text-center">
              <div className="text-4xl mb-4">🗺️</div>
              <h2 className="font-marcellus text-2xl text-foreground mb-3">
                {experiences.length === 0
                  ? `Curated trips for ${city} coming soon`
                  : `No ${VIBE_FILTERS.find(v => v.value === vibe)?.label.toLowerCase()} trips in ${city}`}
              </h2>
              <p className="font-jost font-light text-sm text-muted-foreground leading-relaxed max-w-md mx-auto mb-6">
                {experiences.length === 0
                  ? `We're picking and pricing the first ${city} trips now. Try another city — or plan a trip between cities instead.`
                  : `Nothing under that vibe here yet. Try another one, or browse everything in ${city}.`}
              </p>
              {experiences.length === 0 ? (
                <Link
                  to="/start/trip"
                  className="inline-flex items-center gap-2 bg-forest text-parchment px-6 py-3 text-sm font-jost font-medium tracking-[0.06em] hover:bg-primary transition-colors"
                >
                  Plan a trip between cities
                  <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M13 5l7 7-7 7" />
                  </svg>
                </Link>
              ) : (
                <button
                  onClick={() => setVibe("all")}
                  className="inline-flex items-center gap-2 bg-forest text-parchment px-6 py-3 text-sm font-jost font-medium tracking-[0.06em] hover:bg-primary transition-colors"
                >
                  Show everything in {city}
                </button>
              )}
            </div>
          )}

        </div>

        {openVenue && <NightlifeVenueDetail venue={openVenue} onClose={() => setOpenVenue(null)} />}
        {openFallbackVenue && <FallbackVenueDetail venue={openFallbackVenue} onClose={() => setOpenFallbackVenue(null)} />}
        {openEvent && <EventDetail event={openEvent} onClose={() => setOpenEvent(null)} />}
      </main>
    );
  }

  // ── Step: Detail ─────────────────────────────────────────────────────────
  if (step === "detail" && selected) {
    const daySchedules = getScheduleForDays(selected, days);

    return (
      <main className="min-h-screen bg-background">
        <PageHeader onBack={() => setStep("browse")} />

        <div className="mx-auto max-w-5xl px-6 pb-24">
          {/* Hero photo */}
          <div
            className="relative h-56 md:h-72 overflow-hidden mb-8"
            style={{ backgroundColor: selected.colorFallback }}
          >
            <img
              src={cdnImg(selected.imageId, 1200, 580)}
              alt={selected.name}
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
            <div className="absolute bottom-6 left-6 text-white">
              <span
                className={`text-[10px] font-jost font-medium tracking-wide px-2 py-1 mb-3 inline-block ${CAT_COLOR[selected.category]}`}
              >
                {CAT_LABEL[selected.category]}
              </span>
              <h2 className="font-marcellus text-3xl md:text-4xl leading-snug">
                {selected.name}
              </h2>
              <p className="font-jost font-light text-sm opacity-75 mt-1">
                📍 {selected.location}
              </p>
            </div>
          </div>

          {/* Two-column layout */}
          <div className="grid lg:grid-cols-[1fr,340px] gap-10">
            {/* ── Left: info & schedule ────── */}
            <div className="space-y-8 min-w-0">
              {/* Description */}
              <p className="font-jost font-light text-base text-foreground leading-relaxed">
                {selected.description}
              </p>

              {/* Why this one */}
              <div>
                <div className="flex items-center gap-4 mb-4">
                  <span className="h-px w-6 bg-primary" />
                  <span className="text-[10px] font-jost font-light tracking-label text-muted-foreground uppercase">
                    Why this one
                  </span>
                </div>
                <ul className="space-y-2.5">
                  {selected.highlights.map((h) => (
                    <li key={h} className="flex items-start gap-3">
                      <span className="text-foreground mt-0.5 text-[8px] shrink-0">◆</span>
                      <span className="font-jost font-light text-sm text-foreground">{h}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* What's included */}
              <div>
                <div className="flex items-center gap-4 mb-4">
                  <span className="h-px w-6 bg-primary" />
                  <span className="text-[10px] font-jost font-light tracking-label text-muted-foreground uppercase">
                    What's included
                  </span>
                </div>
                <div className="grid sm:grid-cols-2 gap-y-2.5 gap-x-6">
                  {selected.included.map((item) => (
                    <div key={item} className="flex items-start gap-2.5">
                      <svg
                        className="w-4 h-4 text-forest mt-0.5 shrink-0"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                      <span className="font-jost font-light text-sm text-foreground">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Day-by-day schedule */}
              <div>
                <div className="flex items-center gap-4 mb-4">
                  <span className="h-px w-6 bg-primary" />
                  <span className="text-[10px] font-jost font-light tracking-label text-muted-foreground uppercase">
                    Day plan{days > 1 ? ` · ${days} days` : ""}
                  </span>
                </div>

                {daySchedules.map((sched, dayIdx) => (
                  <div key={dayIdx} className={dayIdx > 0 ? "mt-8" : ""}>
                    {days > 1 && (
                      <div className="font-marcellus text-sm text-forest mb-4 flex items-center gap-3">
                        <span>Day {dayIdx + 1}</span>
                        <span className="flex-1 h-px bg-border" />
                      </div>
                    )}
                    <div className="space-y-0">
                      {sched.map((slot, i) => (
                        <div
                          key={i}
                          className="flex gap-5 py-3 border-b border-border last:border-0"
                        >
                          <div className="w-14 shrink-0 pt-0.5">
                            <span className="text-[11px] font-jost font-light text-muted-foreground tabular-nums">
                              {slot.time}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="font-jost font-medium text-sm text-foreground">
                              {slot.activity}
                            </div>
                            {slot.details && (
                              <div className="font-jost font-light text-xs text-muted-foreground mt-0.5">
                                {slot.details}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {selected.notes && (
                  <div className="mt-5 p-4 border-l-2 border-primary bg-primary/5">
                    <p className="font-jost font-light text-xs text-foreground/70 leading-relaxed">
                      {selected.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* ── Right: sticky config panel ────── */}
            <div className="lg:sticky lg:top-8 self-start">
              <div className="border border-border p-6 space-y-6">
                <div className="flex items-center gap-4">
                  <span className="h-px w-6 bg-primary" />
                  <span className="text-[10px] font-jost font-light tracking-label text-muted-foreground uppercase">
                    Configure your trip
                  </span>
                </div>

                {/* Days slider */}
                <div>
                  <RangeSlider
                    label="Number of days"
                    value={days}
                    min={1}
                    max={selected.maxDays}
                    onChange={setDays}
                    format={(v) => (v === 1 ? "1 day" : `${v} days`)}
                  />
                  {selected.maxDays === 1 && (
                    <p className="text-[11px] font-jost font-light text-muted-foreground mt-2 leading-relaxed">
                      1-day experience. Book back-to-back for a repeat with the same squad.
                    </p>
                  )}
                </div>

                {/* Squad size slider */}
                <RangeSlider
                  label="Squad size"
                  value={squadSize}
                  min={selected.groupMin}
                  max={Math.min(selected.groupMax, 40)}
                  onChange={setSquadSize}
                  format={(v) => `${v} people`}
                />

                {/* Price breakdown */}
                <div className="border-t border-border pt-4 space-y-2">
                  <div className="text-xs font-jost font-light text-muted-foreground">
                    {formatNGN(selected.pricePerPersonPerDay)} × {days}{" "}
                    {days === 1 ? "day" : "days"} × {squadSize} people
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs font-jost font-light text-muted-foreground">
                      Squad total
                    </span>
                    <span className="font-marcellus text-2xl text-foreground">
                      {formatNGN(totalCost)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs font-jost font-light text-muted-foreground">
                    <span>Per person</span>
                    <span className="font-medium text-foreground">{formatNGN(perPersonTotal)}</span>
                  </div>
                </div>

                {/* CTA */}
                <button
                  onClick={openShare}
                  className="w-full bg-forest text-parchment py-4 font-jost font-medium text-sm tracking-[0.06em] hover:bg-primary transition-colors"
                >
                  Share with squad →
                </button>

                {/* Save it for later — needs an account, since it persists */}
                {savedId ? (
                  <Link
                    to="/my-plans"
                    className="w-full flex items-center justify-center gap-2 border border-forest text-forest py-3.5 font-jost font-medium text-sm tracking-[0.06em] hover:bg-forest/5 transition-colors"
                  >
                    ✓ Saved — view in My Plans
                  </Link>
                ) : user ? (
                  <button
                    onClick={handleAddToPlan}
                    disabled={saving}
                    className="w-full border border-border text-foreground py-3.5 font-jost font-light text-sm tracking-[0.06em] hover:border-forest hover:text-forest transition-colors disabled:opacity-50"
                  >
                    {saving ? "Saving…" : "+ Add to my plans"}
                  </button>
                ) : (
                  <button
                    onClick={signInToSave}
                    disabled={sharePrep}
                    className="w-full flex items-center justify-center border border-border text-foreground py-3.5 font-jost font-light text-sm tracking-[0.06em] hover:border-forest hover:text-forest transition-colors disabled:opacity-60"
                  >
                    {sharePrep ? "Holding your trip…" : "Sign in to save this trip"}
                  </button>
                )}

                {saveErr && (
                  <p className="text-[11px] font-jost font-light text-red-500 text-center">{saveErr}</p>
                )}

                <p className="text-[10px] font-jost font-light text-muted-foreground text-center leading-relaxed">
                  No payment collected here — you share the plan first, squad confirms, then payment comes next.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ── Step: Share ───────────────────────────────────────────────────────────
  if (step === "share" && selected) {
    const includedLines = selected.included.map((i) => `✅ ${i}`).join("\n");
    // The whole point of sharing. Without it the message said "drop your name
    // below" with nothing to tap — no way to join, and no way to pay.
    const planUrl = shareId ? `${window.location.origin}/plan/${shareId}` : null;

    const waText = encodeURIComponent(
      `Hey squad! 🎉\n\nWe're doing this:\n\n` +
      `*${selected.name}*\n` +
      `📍 ${selected.location}\n` +
      `📅 ${days} ${days === 1 ? "day" : "days"}\n` +
      `👥 ${squadSize} people\n` +
      `💰 ${formatNGN(perPersonTotal)} per person\n` +
      `💰 ${formatNGN(totalCost)} total for the squad\n\n` +
      `What's included:\n${includedLines}\n\n` +
      (planUrl
        ? `Say you're in and pay your share here 👇\n${planUrl}\n\n`
        : `Drop your name below if you're in 👇\n\n`) +
      `— Planned with Karije 🌍`
    );

    const clipboardText =
      `${selected.name} · ${selected.location}\n` +
      `${days} day${days > 1 ? "s" : ""} · ${squadSize} people\n` +
      `${formatNGN(perPersonTotal)}/person · ${formatNGN(totalCost)} total\n\n` +
      (planUrl ? `Join and pay: ${planUrl}\n\n` : "") +
      `Planned with Karije — karije.com`;

    return (
      <main className="min-h-screen bg-background">
        <PageHeader onBack={() => setStep("detail")} />

        <div className="mx-auto max-w-2xl lg:max-w-5xl px-6 lg:px-8 pb-24">
          {/* Eyebrow */}
          <div className="flex items-center gap-4 mb-6">
            <span className="h-px w-8 bg-primary" />
            <span className="text-[10px] font-jost font-light tracking-label text-muted-foreground uppercase">
              Trip ready
            </span>
          </div>

          <h1 className="font-marcellus text-3xl text-foreground mb-2 leading-snug">
            Your {city} trip is set.
          </h1>
          <p className="font-jost font-light text-base text-muted-foreground mb-10 leading-relaxed">
            Karije runs this one — we're the organisers. Share it to your squad, and pick how
            you want to handle payment below.
          </p>

          {/* Summary card */}
          <div className="border border-border p-6 mb-6">
            <div className="flex items-start gap-4">
              {/* Thumbnail */}
              <div
                className="w-20 h-20 overflow-hidden shrink-0"
                style={{ backgroundColor: selected.colorFallback }}
              >
                <img
                  src={cdnImg(selected.imageId, 160, 160)}
                  alt={selected.name}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <h2 className="font-marcellus text-xl text-foreground">{selected.name}</h2>
                <p className="text-[11px] font-jost font-light text-muted-foreground mt-0.5">
                  {selected.location}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-y-3 gap-x-4">
                  {[
                    { label: "Days",       value: String(days) },
                    { label: "People",     value: String(squadSize) },
                    { label: "Per person", value: formatNGN(perPersonTotal) },
                    { label: "Total",      value: formatNGN(totalCost), accent: true },
                  ].map(({ label, value, accent }) => (
                    <div key={label}>
                      <div className="text-[10px] font-jost font-light text-muted-foreground uppercase tracking-wide mb-0.5">
                        {label}
                      </div>
                      <div className={`font-marcellus text-lg ${accent ? "text-foreground" : "text-foreground"}`}>
                        {value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-3 mb-10">
            {/* Held back until the trip id lands, so the message can't go out
                without its link — that's the whole reason for sharing. */}
            <a
              href={sharePrep ? undefined : `https://wa.me/?text=${waText}`}
              aria-disabled={sharePrep}
              onClick={(e) => { if (sharePrep) e.preventDefault(); }}
              target="_blank"
              rel="noopener noreferrer"
              className={`w-full flex items-center justify-center gap-3 bg-[#25D366] text-white py-4 font-jost font-medium text-sm tracking-[0.06em] transition-opacity ${
                sharePrep ? "opacity-60 cursor-wait" : "hover:opacity-90"
              }`}
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              {sharePrep ? "Preparing your link…" : "Share on WhatsApp"}
            </a>

            <button
              onClick={() => {
                navigator.clipboard?.writeText(clipboardText).catch(() => {});
              }}
              className="w-full flex items-center justify-center gap-2 border border-border text-foreground py-3.5 font-jost font-light text-sm tracking-[0.06em] hover:border-primary hover:text-foreground/60 transition-colors"
            >
              Copy trip summary
            </button>

            {savedId ? (
              <Link
                to="/my-plans"
                className="w-full flex items-center justify-center gap-2 border border-forest text-forest py-3.5 font-jost font-medium text-sm tracking-[0.06em] hover:bg-forest/5 transition-colors"
              >
                ✓ Saved — view in My Plans
              </Link>
            ) : user ? (
              <button
                onClick={handleAddToPlan}
                disabled={saving}
                className="w-full border border-border text-foreground py-3.5 font-jost font-light text-sm tracking-[0.06em] hover:border-forest hover:text-forest transition-colors disabled:opacity-50"
              >
                {saving ? "Saving…" : "+ Save to my plans"}
              </button>
            ) : (
              <button
                onClick={signInToSave}
                disabled={sharePrep}
                className="w-full flex items-center justify-center border border-border text-foreground py-3.5 font-jost font-light text-sm tracking-[0.06em] hover:border-forest hover:text-forest transition-colors disabled:opacity-60"
              >
                {sharePrep ? "Holding your trip…" : "Sign in to save this trip"}
              </button>
            )}

            {saveErr && (
              <p className="text-[11px] font-jost font-light text-red-500 text-center">{saveErr}</p>
            )}
          </div>

          {/* Three ways to settle up — Karije is the organiser on curated trips */}
          <div className="border-t border-border pt-8 mb-10">
            <div className="flex items-center gap-4 mb-5">
              <span className="h-px w-6 bg-primary" />
              <span className="text-[10px] font-jost font-light tracking-label text-muted-foreground uppercase">
                How your squad pays
              </span>
            </div>
            <div className="space-y-3">
              {[
                {
                  emoji: "✉️",
                  title: "We chase the payments",
                  body: `Everyone gets their share by email, and we keep following up with whoever has not paid for the ${selected.name} run — so you do not have to.`,
                },
                {
                  emoji: "🔗",
                  title: "Send everyone a link",
                  body: `Each person registers and pays their own ${formatNGN(perPersonTotal)} — you don't have to chase anybody or front the money.`,
                },
                {
                  emoji: "💳",
                  title: "Pay for everything at once",
                  body: `Settle the full ${formatNGN(totalCost)} yourself and sort your squad out however you like.`,
                },
              ].map((opt) => (
                <div key={opt.title} className="border border-border p-4 flex gap-4">
                  <span className="text-2xl shrink-0 leading-none">{opt.emoji}</span>
                  <div>
                    <div className="font-jost font-medium text-sm text-foreground mb-1">{opt.title}</div>
                    <p className="font-jost font-light text-[13px] text-muted-foreground leading-relaxed">
                      {opt.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] font-jost font-light text-muted-foreground mt-4 leading-relaxed">
              Payment links go live once you've confirmed your headcount with us — nothing is charged today.
            </p>
          </div>

          {/* What happens next */}
          <div className="border-t border-border pt-8 mb-10">
            <div className="flex items-center gap-4 mb-5">
              <span className="h-px w-6 bg-primary" />
              <span className="text-[10px] font-jost font-light tracking-label text-muted-foreground uppercase">
                What happens next
              </span>
            </div>
            <ol className="space-y-4">
              {[
                "Share the plan link with your squad using the button above",
                "Everyone who's in confirms their spot by dropping their name",
                "Pick one of the three payment routes above and we take it from there",
              ].map((item, i) => (
                <li key={i} className="flex gap-4 items-start">
                  <span className="font-marcellus text-3xl text-border shrink-0 leading-none">
                    0{i + 1}
                  </span>
                  <span className="font-jost font-light text-sm text-muted-foreground leading-relaxed mt-2">
                    {item}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          {/* Navigation */}
          <div className="flex flex-col sm:flex-row gap-4 text-sm font-jost font-light text-muted-foreground">
            <button
              onClick={() => { setStep("browse"); setSelected(null); }}
              className="hover:text-foreground transition-colors"
            >
              ← Browse more experiences
            </button>
            <Link to="/start" className="hover:text-foreground transition-colors">
              Plan a different trip type
            </Link>
          </div>
        </div>
      </main>
    );
  }
  return null;
}
