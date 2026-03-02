# WorldView Full Overhaul — Design Document

**Date:** 2026-03-02
**Branch:** fix/runtime-errors
**Scope:** Bug fixes + CORS proxy + 4 new data layers

## Goals

1. Fix all runtime errors (OpenSky 429, Google 3D Tiles crash, missing favicon)
2. Add CORS proxy architecture (Vite dev proxy + Express production server)
3. Add 4 new data layers: Earthquakes, Ships (AIS), Wildfires, Weather Alerts
4. Deploy-ready Docker build (Coolify deployment in follow-up session)

## Architecture

### Data Flow

```
Browser → /api/{feed} → Proxy → External API
```

- **Dev:** Vite proxy config forwards `/api/*` to external APIs
- **Prod:** Express server serves static build + proxies `/api/*` routes
- API keys live in proxy env vars only (never in frontend)

### Proxy Routes

| Route | Upstream | Auth | Refresh |
|-------|----------|------|---------|
| /api/flights | api.adsb.lol/v2/point/{lat}/{lon}/{radius} | None | 15s |
| /api/quakes | earthquake.usgs.gov/.../2.5_day.geojson | None | 5min |
| /api/fires | firms.modaps.eosdis.nasa.gov/api/... | API key | 30min |
| /api/ais | Snapshot from WS relay to aisstream.io | API key | 10s |
| /api/weather | api.weather.gov/alerts/active | None | 10min |

### Flight Feed Fallback Chain

1. adsb.lol (no limits)
2. airplanes.live (1 req/s)
3. adsb.fi (1 req/s)
4. OpenSky (last resort, with backoff)

All community APIs use identical v2 response format.

## Bug Fixes

### OpenSky → adsb.lol
- New `src/feeds/adsb.ts` with v2 response parsing
- `useFlightData` queries by camera center position + 250 NM radius
- Fallback chain on fetch failure
- Proper error propagation to UI

### Google 3D Tiles
- Retry with delay after viewer creation
- Suppress geocoder warning via `additionalOptions`

### Favicon
- SVG favicon (green globe + crosshair aesthetic)

### Error Feedback
- Wire feed status indicators to actual error states
- Toast/notification on feed failure

## New Data Layers

### Earthquakes (USGS)
- Source: USGS GeoJSON feed (M2.5+ past day)
- Rendering: Pulsing circles — size by magnitude, color by depth
- Detail panel: magnitude, depth, location, time, tsunami flag
- No API key, CORS enabled natively

### Ships / AIS (AISStream.io)
- Source: WebSocket `wss://stream.aisstream.io/v0/stream`
- Proxy maintains persistent WS, frontend polls HTTP snapshots
- Rendering: Blue ship icons with heading rotation
- Detail panel: vessel name, MMSI, speed, course, ship type
- Cap: 500 vessels
- Requires free API key

### Wildfires (NASA FIRMS)
- Source: FIRMS VIIRS NRT data
- Rendering: Orange/red heat dots — brightness by fire radiative power
- Detail panel: confidence, brightness, satellite, time
- Refresh every 30 min
- Requires free API key

### Weather Alerts (NWS)
- Source: NWS active alerts API
- Rendering: Colored polygons (red=warning, orange=watch, yellow=advisory)
- Detail panel: event, severity, headline, description
- US-only, no key needed

## File Changes

~25 new/modified files, ~1,500-2,000 new lines.

### New Files
- `server/proxy.ts` — Express CORS proxy
- `src/feeds/adsb.ts` — adsb.lol v2 feed
- `src/feeds/usgs.ts` — earthquake feed
- `src/feeds/ais.ts` — AIS snapshot feed
- `src/feeds/firms.ts` — NASA FIRMS feed
- `src/feeds/nws.ts` — NWS alerts feed
- `src/hooks/useEarthquakeData.ts`
- `src/hooks/useAISData.ts`
- `src/hooks/useFireData.ts`
- `src/hooks/useWeatherData.ts`
- `src/layers/EarthquakeLayer.tsx`
- `src/layers/ShipLayer.tsx`
- `src/layers/FireLayer.tsx`
- `src/layers/WeatherLayer.tsx`
- `src/components/panels/QuakeDetailPanel.tsx`
- `src/components/panels/ShipDetailPanel.tsx`
- `src/components/panels/FireDetailPanel.tsx`
- `src/components/panels/WeatherDetailPanel.tsx`
- `src/types/adsb.ts`
- `src/types/usgs.ts`
- `src/types/ais.ts`
- `src/types/firms.ts`
- `src/types/nws.ts`
- `public/favicon.svg`

### Modified Files
- `vite.config.ts` — proxy routes
- `src/lib/cesium-config.ts` — 3D tiles retry
- `src/lib/constants.ts` — new intervals, API paths
- `src/feeds/opensky.ts` — fallback-only, error propagation
- `src/hooks/useFlightData.ts` — adsb.lol primary, fallback chain
- `src/components/GlobeViewer.tsx` — new layers + toggles
- `src/components/panels/LayerPanel.tsx` — new layer toggles
- `Dockerfile` — Express server instead of nginx-only
- `.env.example` — new env vars
- `index.html` — favicon link

## Environment Variables

```
# Build-time (frontend)
VITE_CESIUM_ION_TOKEN=...

# Runtime (proxy only)
NASA_FIRMS_API_KEY=...
AISSTREAM_API_KEY=...

# Optional (OpenSky fallback)
VITE_OPENSKY_USERNAME=...
VITE_OPENSKY_PASSWORD=...
```

## Non-Goals

- No AI/ML features (World Monitor has this, we don't need it)
- No news/RSS aggregation
- No desktop app (Tauri)
- No i18n
- No Coolify deployment this session (follow-up)
