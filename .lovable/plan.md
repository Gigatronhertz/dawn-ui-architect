# Authentic imagery and homepage event priority

## Outcome
- Place **Upcoming events** directly after the homepage hero/search area.
- Replace generic or mismatched AI/stock imagery throughout the app with authentic photographs matched to the named destination, attraction, venue, transport type, or trip.
- Preserve existing layouts and interactions; this pass changes ordering and imagery only.

## Implementation
1. **Homepage order**
   - Move the upcoming-events section immediately below the hero/search area.
   - Keep the remaining homepage sections in their current relative order.
   - Preserve the current behavior where the section stays hidden if no upcoming events exist.

2. **Image inventory and matching**
   - Audit shared seed data and every image-rendering surface across the homepage, Explore, event pages, trip planning, public plans, Pro demo, and the interactive demo.
   - Match each named place to an authentic photograph of that place, not merely a visually similar destination.
   - Match generic transport and hotel fallback images to the actual category; preserve live Google Places/Travel photos where they already identify the real venue.

3. **Source and store assets**
   - Prefer reputable open-license sources such as Wikimedia Commons and official destination or venue media where reuse is permitted.
   - Download selected images into temporary storage, optimize them for web delivery, and place them in the app through the project asset system rather than hotlinking third-party sites.
   - Record source and attribution details in a small project data file when a license requires attribution.

4. **Events accuracy**
   - Use organizer-provided artwork or venue photography when available.
   - If a specific event lacks an authoritative image, use a clearly relevant real venue/category photo without implying that it depicts that exact event.
   - Keep the event title and venue as the source of truth.

5. **Shared image resolution**
   - Update shared image data/helpers so the corrected image follows each trip or event everywhere it appears.
   - Keep graceful fallbacks and meaningful alternative text for unavailable images.

6. **Verification**
   - Check the homepage at desktop and mobile sizes to confirm upcoming events appears immediately after search.
   - Walk through the main Explore, event, planning, public-plan, and demo screens to confirm images load, match their labels, crop cleanly, and do not shift or overflow layouts.
   - Confirm the preview finishes with no build or runtime errors.

## Technical details
- Existing dynamic venue images remain untouched when they come from the named place's live listing.
- Static external image URLs and bare Unsplash IDs will be replaced with project-hosted asset references.
- No trip pricing, itinerary logic, event data, or navigation behavior will change.
