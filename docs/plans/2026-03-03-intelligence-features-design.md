# WorldView Intelligence Features — Design

**Date:** 2026-03-03
**Status:** Approved
**Branch:** `feat/intelligence-features` (from `feat/conflict-zones-layer`)

## Context

WorldView is a real-time geospatial dashboard (React 19 + Cesium 3D globe) with 8 data layers. This design adds 4 intelligence features inspired by WorldMonitor, tailored for ImparLabs product demo use case.

## Feature 1: Fix TypeScript Build

Remove unused `TYPE_ABBREV` constant from `ConflictLayer.tsx` (line 33). Build currently fails due to `noUnusedLocals: true`.

## Feature 2: AI World Brief Panel

**Purpose:** Generate a concise situational intelligence summary from live dashboard data.

**Architecture:**
- Backend: `server/ai-handler.ts` — Express route `/api/ai/brief` that:
  1. Receives a JSON payload with current data counts + notable events from the frontend
  2. Calls Groq API (`llama-3.3-70b`) with a system prompt for intelligence brief style
  3. Falls back to OpenRouter if Groq fails (429/500)
  4. Returns streamed or complete text response
- Frontend: `AIBriefPanel.tsx` — collapsible panel with:
  - "Generate Brief" button
  - Streaming text display
  - Auto-refresh toggle (every 15 min)
  - Timestamp of last generation

**System Prompt Pattern:**
```
You are a geospatial intelligence analyst. Given the following real-time data from a global monitoring dashboard, produce a concise situational brief (150-250 words). Focus on: notable patterns, risk areas, and significant events. Be factual and precise.

Active data:
- {flightCount} aircraft tracked, {notable flights}
- {quakeCount} earthquakes (max magnitude: {maxMag})
- {conflictCount} conflict events ({top regions})
- {weatherCount} weather alerts ({severe count} severe)
- {fireCount} active wildfires
- {shipCount} vessels tracked
```

**API Keys:** Server-side only (never exposed to client). Env vars: `GROQ_API_KEY`, `OPENROUTER_API_KEY`.

## Feature 3: RSS News Feed Panel

**Purpose:** Curated news headlines in a collapsible side panel.

**Architecture:**
- Backend: `server/rss-collector.ts` — background collector (same pattern as GDELT/MeteoAlarm):
  1. Fetches ~20 curated RSS feeds every 10 minutes
  2. Parses XML with regex (no dependency, same as MeteoAlarm)
  3. Extracts: title, link, pubDate, source name, category
  4. Deduplicates by title similarity
  5. Keeps last 200 headlines in memory, sorted by date
  6. Serves via `/api/news` endpoint
- Frontend: `NewsFeedPanel.tsx` — collapsible left panel with:
  - Scrollable headline list grouped by category
  - Source badge (colored by category)
  - Relative timestamps ("5 min ago")
  - Click opens article in new tab
  - "Fly to" button for geo-matchable headlines (country name lookup)

**Curated Feed List (~20 feeds, 5 categories):**

| Category | Feeds |
|----------|-------|
| Geopolitics | Reuters World, BBC World, Al Jazeera |
| Defense/Security | Defense One, The War Zone, Jane's |
| EU/Europe | EU Observer, Politico EU, EurActiv |
| Tech/Cyber | Ars Technica, The Register, Wired |
| Disasters | ReliefWeb, GDACS, USGS News |

**Country Geocoding:** Simple lookup table (`src/lib/country-lookup.ts`) mapping ~200 country names to lat/lon centroids. Match headline text against country names. No external API.

## Feature 4: Breaking News Alerts

**Purpose:** Toast notifications for significant events detected in live data.

**Architecture:**
- Frontend only (no new backend). `useAlerts.ts` hook that:
  1. Monitors all data hooks for threshold events
  2. Maintains a seen-events set to avoid duplicates
  3. Fires alert when:
     - Earthquake magnitude >= 6.0
     - Conflict event Goldstein scale <= -7
     - Weather alert severity = "Extreme"
     - New RSS headline matching keywords (e.g., "breaking", "attack", "explosion")
  4. Each alert: { type, title, description, lat, lon, timestamp, severity }
- UI: `AlertToast.tsx` — toast stack (top-right):
  - Auto-dismiss after 10s
  - Click to fly camera to event location
  - Color-coded by severity (red/orange/yellow)
  - Optional browser Notification API for background tabs
  - Sound option (subtle alert tone)

**Threshold Config (in constants.ts):**
```typescript
export const ALERT_THRESHOLDS = {
  EARTHQUAKE_MIN_MAG: 6.0,
  CONFLICT_MIN_GOLDSTEIN: -7,
  WEATHER_SEVERITY: "Extreme",
  NEWS_KEYWORDS: ["breaking", "attack", "explosion", "missile", "earthquake", "tsunami"],
}
```

## Feature 5: Country Risk Heat Overlay

**Purpose:** Visual indicator of event density per country.

**Architecture:**
- Frontend only. `useCountryRisk.ts` hook that:
  1. Aggregates events per country from all active data hooks
  2. Weighted scoring: conflicts (3x), extreme weather (2x), earthquakes by magnitude, fires (1x)
  3. Normalizes to 0-100 score per country
  4. Updates every 60 seconds
- Layer: `CountryRiskLayer.tsx`:
  - Renders colored polygons (country boundaries) with alpha based on risk score
  - Color ramp: transparent (0) → yellow (30) → orange (60) → red (90+)
  - Uses simplified GeoJSON country boundaries (~50KB)
  - Toggle in layer panel like other layers

**Data source for boundaries:** Natural Earth simplified 110m countries GeoJSON (public domain, ~50KB minified). Bundled as a static asset.

## New Files Summary

```
server/
  ai-handler.ts              # Groq/OpenRouter proxy
  rss-collector.ts           # RSS feed aggregator

src/
  components/panels/
    AIBriefPanel.tsx          # AI situation brief
    NewsFeedPanel.tsx         # RSS news feed
  components/alerts/
    AlertToast.tsx            # Breaking news toasts
  hooks/
    useNewsData.ts            # RSS polling
    useAlerts.ts              # Threshold detection
    useCountryRisk.ts         # Event density scoring
  feeds/
    rss.ts                    # RSS feed fetcher
    ai.ts                     # AI brief API caller
  types/
    news.ts                   # RSS Zod schemas
    alerts.ts                 # Alert type definitions
  layers/
    CountryRiskLayer.tsx      # Risk heat overlay
  lib/
    country-lookup.ts         # Country name → coords
  assets/
    countries-110m.json       # Simplified country boundaries
```

## Dependencies

**No new npm dependencies.** All features use:
- `fetch` for API calls (Groq, OpenRouter, RSS)
- Regex for XML parsing (same pattern as MeteoAlarm)
- Cesium entities for country polygons
- Zod for validation (already installed)

## Environment Variables (new)

```
GROQ_API_KEY=gsk_...           # Already have this
OPENROUTER_API_KEY=sk-or-v1-...  # Already have this
```

---

*Approved by Paulo — 2026-03-03*
