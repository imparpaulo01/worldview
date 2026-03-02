# WorldView Full Overhaul — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all runtime bugs, add CORS proxy, swap to adsb.lol for flights, add 4 new data layers (earthquakes, ships, wildfires, weather alerts).

**Architecture:** Vite dev proxy + Express production proxy. All external API calls go through `/api/*` routes. Frontend consumes normalized data from our proxy. AIS uses HTTP snapshot polling (proxy holds persistent WebSocket).

**Tech Stack:** React 19, Cesium 1.124, Vite 6, Express (new), Zod, satellite.js, TypeScript strict

**Working directory:** `/home/paulo/Documentos/IMPAR/JUVENAL/08-repos/internal/worldview`
**Branch:** `fix/runtime-errors` (already created)

---

## Task 1: Fix Favicon + Google 3D Tiles + Constants

**Files:**
- Create: `public/favicon.svg`
- Modify: `index.html`
- Modify: `src/lib/cesium-config.ts`
- Modify: `src/lib/constants.ts`

**Step 1: Create SVG favicon**

Create `public/favicon.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <circle cx="16" cy="16" r="14" fill="none" stroke="#00ff41" stroke-width="1.5" stroke-dasharray="4 3"/>
  <circle cx="16" cy="16" r="6" fill="none" stroke="#00ff41" stroke-width="1"/>
  <line x1="16" y1="0" x2="16" y2="10" stroke="#00ff41" stroke-width="1" opacity="0.6"/>
  <line x1="16" y1="22" x2="16" y2="32" stroke="#00ff41" stroke-width="1" opacity="0.6"/>
  <line x1="0" y1="16" x2="10" y2="16" stroke="#00ff41" stroke-width="1" opacity="0.6"/>
  <line x1="22" y1="16" x2="32" y2="16" stroke="#00ff41" stroke-width="1" opacity="0.6"/>
  <circle cx="16" cy="16" r="2" fill="#00ff41"/>
</svg>
```

**Step 2: Add favicon to index.html**

In `index.html`, add inside `<head>` after `<meta charset>`:
```html
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
```

**Step 3: Fix Google 3D Tiles in cesium-config.ts**

Replace the `loadGoogleTileset` function in `src/lib/cesium-config.ts` with a retry + delay:
```typescript
export async function loadGoogleTileset() {
  // Small delay to let viewer finish initialization
  await new Promise((r) => setTimeout(r, 500));

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await createGooglePhotorealistic3DTileset();
    } catch (err) {
      if (attempt === 0) {
        console.warn("Google 3D Tiles attempt 1 failed, retrying...");
        await new Promise((r) => setTimeout(r, 1000));
      } else {
        console.warn("Google 3D Tiles unavailable, using default imagery:", err);
        return null;
      }
    }
  }
  return null;
}
```

**Step 4: Update constants.ts with new intervals and API paths**

Replace the entire `src/lib/constants.ts` with:
```typescript
/** Default camera position: Lisbon, Portugal */
export const DEFAULT_CAMERA = {
  longitude: -9.1393,
  latitude: 38.7223,
  height: 2_000_000,
} as const;

/** Proxy API paths (Vite proxy in dev, Express proxy in prod) */
export const API = {
  FLIGHTS: "/api/flights",
  OPENSKY_STATES: "https://opensky-network.org/api/states/all",
  CELESTRAK_GP: "https://celestrak.org/NORAD/elements/gp.php",
  EARTHQUAKES: "/api/quakes",
  AIS: "/api/ais",
  FIRES: "/api/fires",
  WEATHER: "/api/weather",
} as const;

/** Refresh intervals (ms) */
export const INTERVALS = {
  FLIGHTS: 15_000,
  SATELLITES: 1_000,
  EARTHQUAKES: 300_000,   // 5 min
  AIS: 10_000,
  FIRES: 1_800_000,       // 30 min
  WEATHER: 600_000,        // 10 min
} as const;

/** Performance caps */
export const LIMITS = {
  MAX_SATELLITES: 200,
  MAX_FLIGHTS: 500,
  MAX_SHIPS: 500,
  MAX_QUAKES: 200,
  MAX_FIRES: 500,
} as const;

/** Filter modes */
export type FilterMode = "none" | "crt" | "nvg" | "flir" | "cel";

export const FILTER_LABELS: Record<FilterMode, string> = {
  none: "STANDARD",
  crt: "CRT SCANLINES",
  nvg: "NIGHT VISION",
  flir: "THERMAL FLIR",
  cel: "CEL SHADING",
};

export const FILTER_KEYS: Record<string, FilterMode> = {
  "0": "none",
  "1": "crt",
  "2": "nvg",
  "3": "flir",
  "4": "cel",
};
```

**Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: PASS (no new errors — opensky.ts still references `API.OPENSKY_STATES` which still exists)

**Step 6: Commit**

```bash
git add public/favicon.svg index.html src/lib/cesium-config.ts src/lib/constants.ts
git commit -m "fix: favicon, 3D tiles retry, expanded constants"
```

---

## Task 2: Vite Proxy Configuration

**Files:**
- Modify: `vite.config.ts`

**Step 1: Add proxy routes to vite.config.ts**

Replace `src/vite.config.ts` with:
```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import cesium from "vite-plugin-cesium";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";

export default defineConfig({
  plugins: [react(), cesium(), tailwindcss()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api/flights": {
        target: "https://api.adsb.lol",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/flights/, ""),
      },
      "/api/quakes": {
        target: "https://earthquake.usgs.gov",
        changeOrigin: true,
        rewrite: () =>
          "/earthquakes/feed/v1.0/summary/2.5_day.geojson",
      },
      "/api/fires": {
        target: "https://firms.modaps.eosdis.nasa.gov",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/fires/, ""),
      },
      "/api/weather": {
        target: "https://api.weather.gov",
        changeOrigin: true,
        rewrite: () => "/alerts/active",
        headers: { "User-Agent": "WorldView/0.1 (github.com/imparpaulo01/worldview)" },
      },
      "/api/ais": {
        target: "http://localhost:3001",
        changeOrigin: true,
        rewrite: () => "/ais/snapshot",
      },
    },
  },
  build: {
    target: "es2020",
  },
});
```

Note: AIS proxy points to localhost:3001 where the Express proxy server will run (Task 10). Other feeds go directly to public APIs via Vite's proxy (which adds CORS headers).

**Step 2: Run dev server to verify proxy config is valid**

Run: `npm run dev` (starts without errors)
Then: `curl -s http://localhost:5173/api/quakes | head -c 200` should return USGS GeoJSON
Kill the dev server.

**Step 3: Commit**

```bash
git add vite.config.ts
git commit -m "feat: add Vite proxy routes for all data feeds"
```

---

## Task 3: ADS-B Flight Feed (adsb.lol)

**Files:**
- Create: `src/types/adsb.ts`
- Create: `src/feeds/adsb.ts`
- Modify: `src/hooks/useFlightData.ts`
- Modify: `src/feeds/opensky.ts` (minor: keep as fallback)

**Step 1: Create ADS-B v2 types**

Create `src/types/adsb.ts`:
```typescript
import { z } from "zod";

/** ADS-B Exchange v2 aircraft record (used by adsb.lol, airplanes.live, adsb.fi) */
export const ADSBv2AircraftSchema = z.object({
  hex: z.string(),
  flight: z.string().optional(),
  r: z.string().optional(),           // registration
  t: z.string().optional(),           // aircraft type
  alt_baro: z.union([z.number(), z.literal("ground")]).optional(),
  alt_geom: z.number().optional(),
  gs: z.number().optional(),          // ground speed (knots)
  track: z.number().optional(),       // heading
  lat: z.number().optional(),
  lon: z.number().optional(),
  baro_rate: z.number().optional(),
  squawk: z.string().optional(),
  emergency: z.string().optional(),
  category: z.string().optional(),
  true_heading: z.number().optional(),
});

export type ADSBv2Aircraft = z.infer<typeof ADSBv2AircraftSchema>;

export const ADSBv2ResponseSchema = z.object({
  now: z.number().optional(),
  total: z.number().optional(),
  ac: z.array(ADSBv2AircraftSchema).optional(),
});

export type ADSBv2Response = z.infer<typeof ADSBv2ResponseSchema>;
```

**Step 2: Create ADS-B feed**

Create `src/feeds/adsb.ts`:
```typescript
import { ADSBv2ResponseSchema } from "@/types/adsb";
import type { Aircraft } from "@/types/opensky";
import { API, LIMITS } from "@/lib/constants";

export interface FlightFetchResult {
  aircraft: Aircraft[];
  error: string | null;
}

/** Fetch flights from adsb.lol via our proxy, queried by camera center */
export async function fetchADSBFlights(
  lat: number,
  lon: number,
  radiusNm = 250,
): Promise<FlightFetchResult> {
  try {
    const url = `${API.FLIGHTS}/v2/point/${lat.toFixed(4)}/${lon.toFixed(4)}/${radiusNm}`;
    const res = await fetch(url);

    if (!res.ok) {
      return { aircraft: [], error: `HTTP ${res.status}` };
    }

    const json: unknown = await res.json();
    const parsed = ADSBv2ResponseSchema.safeParse(json);
    if (!parsed.success || !parsed.data.ac) {
      return { aircraft: [], error: null };
    }

    const aircraft: Aircraft[] = [];
    for (const ac of parsed.data.ac) {
      if (aircraft.length >= LIMITS.MAX_FLIGHTS) break;
      if (ac.lat == null || ac.lon == null) continue;
      if (ac.alt_baro === "ground") continue;

      aircraft.push({
        icao24: ac.hex,
        callsign: ac.flight?.trim() || ac.hex,
        country: "",
        longitude: ac.lon,
        latitude: ac.lat,
        altitude: (typeof ac.alt_baro === "number" ? ac.alt_baro : ac.alt_geom ?? 0) * 0.3048, // ft → m
        velocity: (ac.gs ?? 0) * 0.514444, // knots → m/s
        heading: ac.track ?? ac.true_heading ?? 0,
        verticalRate: (ac.baro_rate ?? 0) * 0.00508, // ft/min → m/s
        onGround: ac.alt_baro === "ground",
      });
    }

    return { aircraft, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Network error";
    return { aircraft: [], error: msg };
  }
}
```

**Step 3: Rewrite useFlightData.ts to use adsb.lol as primary**

Replace entire `src/hooks/useFlightData.ts`:
```typescript
import { useState, useEffect, useCallback, useRef } from "react";
import type { Aircraft } from "@/types/opensky";
import { fetchADSBFlights } from "@/feeds/adsb";
import { INTERVALS } from "@/lib/constants";

interface FlightDataState {
  aircraft: Map<string, Aircraft>;
  count: number;
  lastUpdate: number | null;
  loading: boolean;
  error: string | null;
}

export function useFlightData(enabled = true) {
  const [state, setState] = useState<FlightDataState>({
    aircraft: new Map(),
    count: 0,
    lastUpdate: null,
    loading: false,
    error: null,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const cameraRef = useRef({ lat: 38.7223, lon: -9.1393 });

  /** Update camera center for location-based queries */
  const updateCamera = useCallback((lat: number, lon: number) => {
    cameraRef.current = { lat, lon };
  }, []);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setState((prev) => ({ ...prev, loading: true }));

    const { lat, lon } = cameraRef.current;
    const result = await fetchADSBFlights(lat, lon);

    const map = new Map<string, Aircraft>();
    for (const a of result.aircraft) {
      map.set(a.icao24, a);
    }

    setState({
      aircraft: map,
      count: map.size,
      lastUpdate: Date.now(),
      loading: false,
      error: result.error,
    });
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    refresh();
    intervalRef.current = setInterval(refresh, INTERVALS.FLIGHTS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled, refresh]);

  return {
    ...state,
    aircraftList: Array.from(state.aircraft.values()),
    refresh,
    updateCamera,
  };
}
```

**Step 4: Reset opensky.ts to clean state (keep as reference, unused for now)**

Revert `src/feeds/opensky.ts` to its original shape (before our partial edit). It still exports the types used by `Aircraft` — keep `src/types/opensky.ts` unchanged since `Aircraft` interface is reused.

Replace entire `src/feeds/opensky.ts`:
```typescript
import { OpenSkyResponseSchema, parseAircraft } from "@/types/opensky";
import type { Aircraft } from "@/types/opensky";
import { API, LIMITS } from "@/lib/constants";

/** OpenSky fallback — only used when adsb.lol is unreachable */
export async function fetchOpenSkyFlights(): Promise<Aircraft[]> {
  try {
    const headers: Record<string, string> = {};
    const username = import.meta.env.VITE_OPENSKY_USERNAME as string | undefined;
    const password = import.meta.env.VITE_OPENSKY_PASSWORD as string | undefined;
    if (username && password) {
      headers["Authorization"] = "Basic " + btoa(`${username}:${password}`);
    }

    const res = await fetch(API.OPENSKY_STATES, { headers });
    if (!res.ok) return [];

    const json: unknown = await res.json();
    const parsed = OpenSkyResponseSchema.safeParse(json);
    if (!parsed.success || !parsed.data.states) return [];

    const aircraft: Aircraft[] = [];
    for (const state of parsed.data.states) {
      if (aircraft.length >= LIMITS.MAX_FLIGHTS) break;
      const a = parseAircraft(state);
      if (a && !a.onGround) aircraft.push(a);
    }
    return aircraft;
  } catch {
    return [];
  }
}
```

**Step 5: Update GlobeViewer.tsx to pass camera position to flight hook**

In `src/components/GlobeViewer.tsx`, add camera tracking. After the viewer initialization effect (the one with `setViewer(v)`), add a new effect:

```typescript
// Sync camera center to flight data hook
useEffect(() => {
  if (!viewer || viewer.isDestroyed()) return;

  const onMoveEnd = () => {
    if (viewer.isDestroyed()) return;
    const carto = viewer.camera.positionCartographic;
    const lat = CesiumMath.toDegrees(carto.latitude);
    const lon = CesiumMath.toDegrees(carto.longitude);
    flightData.updateCamera(lat, lon);
  };

  viewer.camera.moveEnd.addEventListener(onMoveEnd);
  return () => {
    if (!viewer.isDestroyed()) {
      viewer.camera.moveEnd.removeEventListener(onMoveEnd);
    }
  };
}, [viewer, flightData.updateCamera]);
```

Also add `Math as CesiumMath` to the cesium import at top of GlobeViewer.tsx:
```typescript
import {
  Viewer as CesiumViewer,
  Cartesian3,
  ScreenSpaceEventType,
  ScreenSpaceEventHandler,
  defined,
  Math as CesiumMath,
} from "cesium";
```

**Step 6: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 7: Commit**

```bash
git add src/types/adsb.ts src/feeds/adsb.ts src/feeds/opensky.ts src/hooks/useFlightData.ts src/components/GlobeViewer.tsx
git commit -m "feat: swap OpenSky for adsb.lol with location-based queries"
```

---

## Task 4: Earthquake Layer

**Files:**
- Create: `src/types/usgs.ts`
- Create: `src/feeds/usgs.ts`
- Create: `src/hooks/useEarthquakeData.ts`
- Create: `src/layers/EarthquakeLayer.tsx`
- Create: `src/components/panels/QuakeDetailPanel.tsx`

**Step 1: Create USGS types**

Create `src/types/usgs.ts`:
```typescript
import { z } from "zod";

export const USGSPropertiesSchema = z.object({
  mag: z.number().nullable(),
  place: z.string().nullable(),
  time: z.number(),
  updated: z.number(),
  tsunami: z.number(),
  sig: z.number().nullable(),
  title: z.string(),
  type: z.string(),
  alert: z.string().nullable(),
});

export const USGSFeatureSchema = z.object({
  id: z.string(),
  properties: USGSPropertiesSchema,
  geometry: z.object({
    type: z.literal("Point"),
    coordinates: z.tuple([z.number(), z.number(), z.number()]), // [lon, lat, depth_km]
  }),
});

export const USGSResponseSchema = z.object({
  type: z.literal("FeatureCollection"),
  features: z.array(USGSFeatureSchema),
});

export interface Earthquake {
  id: string;
  magnitude: number;
  place: string;
  time: number;
  longitude: number;
  latitude: number;
  depth: number; // km
  tsunami: boolean;
  significance: number;
  title: string;
}
```

**Step 2: Create USGS feed**

Create `src/feeds/usgs.ts`:
```typescript
import { USGSResponseSchema } from "@/types/usgs";
import type { Earthquake } from "@/types/usgs";
import { API, LIMITS } from "@/lib/constants";

export async function fetchEarthquakes(): Promise<Earthquake[]> {
  try {
    const res = await fetch(API.EARTHQUAKES);
    if (!res.ok) return [];

    const json: unknown = await res.json();
    const parsed = USGSResponseSchema.safeParse(json);
    if (!parsed.success) return [];

    const quakes: Earthquake[] = [];
    for (const f of parsed.data.features) {
      if (quakes.length >= LIMITS.MAX_QUAKES) break;
      const [lon, lat, depth] = f.geometry.coordinates;
      quakes.push({
        id: f.id,
        magnitude: f.properties.mag ?? 0,
        place: f.properties.place ?? "Unknown",
        time: f.properties.time,
        longitude: lon,
        latitude: lat,
        depth,
        tsunami: f.properties.tsunami === 1,
        significance: f.properties.sig ?? 0,
        title: f.properties.title,
      });
    }
    return quakes;
  } catch (err) {
    console.warn("USGS fetch failed:", err);
    return [];
  }
}
```

**Step 3: Create earthquake data hook**

Create `src/hooks/useEarthquakeData.ts`:
```typescript
import { useState, useEffect, useCallback, useRef } from "react";
import type { Earthquake } from "@/types/usgs";
import { fetchEarthquakes } from "@/feeds/usgs";
import { INTERVALS } from "@/lib/constants";

interface EarthquakeDataState {
  earthquakes: Earthquake[];
  count: number;
  loading: boolean;
  error: string | null;
}

export function useEarthquakeData(enabled = true) {
  const [state, setState] = useState<EarthquakeDataState>({
    earthquakes: [],
    count: 0,
    loading: false,
    error: null,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setState((prev) => ({ ...prev, loading: true }));

    const quakes = await fetchEarthquakes();
    setState({
      earthquakes: quakes,
      count: quakes.length,
      loading: false,
      error: quakes.length === 0 ? "No data" : null,
    });
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    refresh();
    intervalRef.current = setInterval(refresh, INTERVALS.EARTHQUAKES);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled, refresh]);

  return { ...state, refresh };
}
```

**Step 4: Create EarthquakeLayer**

Create `src/layers/EarthquakeLayer.tsx`:
```typescript
import { useEffect } from "react";
import {
  Cartesian3,
  Cartesian2,
  Color,
  VerticalOrigin,
  NearFarScalar,
  DistanceDisplayCondition,
  LabelStyle,
} from "cesium";
import type { Earthquake } from "@/types/usgs";

interface EarthquakeLayerProps {
  earthquakes: Earthquake[];
  viewer: import("cesium").Viewer | null;
}

function magToSize(mag: number): number {
  return Math.max(4, Math.min(20, mag * 3));
}

function depthToColor(depth: number): Color {
  // Shallow (0-70km) = red, intermediate (70-300km) = orange, deep (300+km) = blue
  if (depth < 70) return Color.fromCssColorString("#ff3333");
  if (depth < 300) return Color.fromCssColorString("#ff8800");
  return Color.fromCssColorString("#3388ff");
}

export function EarthquakeLayer({ earthquakes, viewer }: EarthquakeLayerProps) {
  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return;

    try {
      const idsToRemove: string[] = [];
      for (let i = 0; i < viewer.entities.values.length; i++) {
        const e = viewer.entities.values[i];
        if (e?.id?.startsWith("quake-")) idsToRemove.push(e.id);
      }
      for (const id of idsToRemove) viewer.entities.removeById(id);

      for (const q of earthquakes) {
        const color = depthToColor(q.depth);
        viewer.entities.add({
          id: `quake-${q.id}`,
          position: Cartesian3.fromDegrees(q.longitude, q.latitude, 0),
          point: {
            pixelSize: magToSize(q.magnitude),
            color: color.withAlpha(0.7),
            outlineColor: color,
            outlineWidth: 1,
            scaleByDistance: new NearFarScalar(1e4, 2.0, 1e7, 0.5),
            distanceDisplayCondition: new DistanceDisplayCondition(0, 3e7),
          },
          label: {
            text: `M${q.magnitude.toFixed(1)}`,
            font: "9px JetBrains Mono",
            fillColor: color,
            outlineColor: Color.BLACK,
            outlineWidth: 2,
            style: LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: VerticalOrigin.BOTTOM,
            pixelOffset: new Cartesian2(0, -12),
            scaleByDistance: new NearFarScalar(1e4, 1.0, 5e6, 0.0),
            distanceDisplayCondition: new DistanceDisplayCondition(0, 5e6),
          },
        });
      }
    } catch (err) {
      console.warn("EarthquakeLayer error:", err);
    }
  }, [earthquakes, viewer]);

  return null;
}
```

**Step 5: Create QuakeDetailPanel**

Create `src/components/panels/QuakeDetailPanel.tsx`:
```typescript
import type { Earthquake } from "@/types/usgs";

interface QuakeDetailPanelProps {
  earthquake: Earthquake | null;
  onClose: () => void;
}

export function QuakeDetailPanel({ earthquake, onClose }: QuakeDetailPanelProps) {
  if (!earthquake) return null;

  const timeStr = new Date(earthquake.time).toUTCString();

  return (
    <div className="panel" style={{ position: "absolute", bottom: 16, right: 16, width: 240 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="panel-title" style={{ margin: 0 }}>Earthquake</div>
        <button
          onClick={onClose}
          style={{ background: "none", border: "none", color: "var(--color-text-dim)", cursor: "pointer", fontSize: 14, fontFamily: "var(--font-mono)" }}
        >
          X
        </button>
      </div>
      <div style={{ marginTop: 8, fontSize: 11, lineHeight: 1.8 }}>
        <div>
          <span style={{ color: "var(--color-text-dim)" }}>MAG </span>
          <span style={{ color: "var(--color-red)" }}>{earthquake.magnitude.toFixed(1)}</span>
        </div>
        <div>
          <span style={{ color: "var(--color-text-dim)" }}>PLACE </span>
          {earthquake.place}
        </div>
        <div>
          <span style={{ color: "var(--color-text-dim)" }}>DEPTH </span>
          {earthquake.depth.toFixed(1)} km
        </div>
        <div>
          <span style={{ color: "var(--color-text-dim)" }}>TIME </span>
          {timeStr}
        </div>
        {earthquake.tsunami && (
          <div style={{ color: "var(--color-red)", fontWeight: 600 }}>TSUNAMI WARNING</div>
        )}
      </div>
    </div>
  );
}
```

**Step 6: Run typecheck**

Run: `npm run typecheck`
Expected: PASS (new files are standalone, not yet wired into GlobeViewer)

**Step 7: Commit**

```bash
git add src/types/usgs.ts src/feeds/usgs.ts src/hooks/useEarthquakeData.ts src/layers/EarthquakeLayer.tsx src/components/panels/QuakeDetailPanel.tsx
git commit -m "feat: add earthquake layer (USGS feed)"
```

---

## Task 5: Wildfire Layer (NASA FIRMS)

**Files:**
- Create: `src/types/firms.ts`
- Create: `src/feeds/firms.ts`
- Create: `src/hooks/useFireData.ts`
- Create: `src/layers/FireLayer.tsx`
- Create: `src/components/panels/FireDetailPanel.tsx`

**Step 1: Create FIRMS types**

Create `src/types/firms.ts`:
```typescript
export interface FireHotspot {
  latitude: number;
  longitude: number;
  brightness: number;
  confidence: string;   // "low" | "nominal" | "high"
  frp: number;          // fire radiative power (MW)
  satellite: string;
  acqDate: string;
  acqTime: string;
}
```

**Step 2: Create FIRMS feed**

Create `src/feeds/firms.ts`:
```typescript
import type { FireHotspot } from "@/types/firms";
import { API, LIMITS } from "@/lib/constants";

/** Parse FIRMS CSV response into FireHotspot array */
function parseCSV(csv: string): FireHotspot[] {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];

  const header = lines[0]!.split(",");
  const latIdx = header.indexOf("latitude");
  const lonIdx = header.indexOf("longitude");
  const briIdx = header.indexOf("bright_ti4");
  const confIdx = header.indexOf("confidence");
  const frpIdx = header.indexOf("frp");
  const satIdx = header.indexOf("satellite");
  const dateIdx = header.indexOf("acq_date");
  const timeIdx = header.indexOf("acq_time");

  if (latIdx === -1 || lonIdx === -1) return [];

  const hotspots: FireHotspot[] = [];
  for (let i = 1; i < lines.length && hotspots.length < LIMITS.MAX_FIRES; i++) {
    const cols = lines[i]!.split(",");
    const lat = parseFloat(cols[latIdx] ?? "");
    const lon = parseFloat(cols[lonIdx] ?? "");
    if (isNaN(lat) || isNaN(lon)) continue;

    hotspots.push({
      latitude: lat,
      longitude: lon,
      brightness: parseFloat(cols[briIdx] ?? "0") || 0,
      confidence: cols[confIdx] ?? "nominal",
      frp: parseFloat(cols[frpIdx] ?? "0") || 0,
      satellite: cols[satIdx] ?? "VIIRS",
      acqDate: cols[dateIdx] ?? "",
      acqTime: cols[timeIdx] ?? "",
    });
  }
  return hotspots;
}

export async function fetchFires(): Promise<FireHotspot[]> {
  try {
    const res = await fetch(API.FIRES);
    if (!res.ok) return [];

    const text = await res.text();
    return parseCSV(text);
  } catch (err) {
    console.warn("FIRMS fetch failed:", err);
    return [];
  }
}
```

**Step 3: Create fire data hook**

Create `src/hooks/useFireData.ts`:
```typescript
import { useState, useEffect, useCallback, useRef } from "react";
import type { FireHotspot } from "@/types/firms";
import { fetchFires } from "@/feeds/firms";
import { INTERVALS } from "@/lib/constants";

interface FireDataState {
  fires: FireHotspot[];
  count: number;
  loading: boolean;
  error: string | null;
}

export function useFireData(enabled = true) {
  const [state, setState] = useState<FireDataState>({
    fires: [],
    count: 0,
    loading: false,
    error: null,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setState((prev) => ({ ...prev, loading: true }));

    const fires = await fetchFires();
    setState({
      fires,
      count: fires.length,
      loading: false,
      error: fires.length === 0 ? "No data" : null,
    });
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    refresh();
    intervalRef.current = setInterval(refresh, INTERVALS.FIRES);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled, refresh]);

  return { ...state, refresh };
}
```

**Step 4: Create FireLayer**

Create `src/layers/FireLayer.tsx`:
```typescript
import { useEffect } from "react";
import {
  Cartesian3,
  Color,
  NearFarScalar,
  DistanceDisplayCondition,
} from "cesium";
import type { FireHotspot } from "@/types/firms";

interface FireLayerProps {
  fires: FireHotspot[];
  viewer: import("cesium").Viewer | null;
}

function frpToSize(frp: number): number {
  return Math.max(3, Math.min(12, 3 + frp / 50));
}

function confidenceToColor(conf: string): Color {
  if (conf === "high" || conf === "h") return Color.fromCssColorString("#ff2200");
  if (conf === "nominal" || conf === "n") return Color.fromCssColorString("#ff8800");
  return Color.fromCssColorString("#ffcc00");
}

export function FireLayer({ fires, viewer }: FireLayerProps) {
  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return;

    try {
      const idsToRemove: string[] = [];
      for (let i = 0; i < viewer.entities.values.length; i++) {
        const e = viewer.entities.values[i];
        if (e?.id?.startsWith("fire-")) idsToRemove.push(e.id);
      }
      for (const id of idsToRemove) viewer.entities.removeById(id);

      for (let i = 0; i < fires.length; i++) {
        const f = fires[i]!;
        const color = confidenceToColor(f.confidence);
        viewer.entities.add({
          id: `fire-${i}`,
          position: Cartesian3.fromDegrees(f.longitude, f.latitude, 0),
          point: {
            pixelSize: frpToSize(f.frp),
            color: color.withAlpha(0.6),
            outlineColor: color,
            outlineWidth: 1,
            scaleByDistance: new NearFarScalar(1e4, 1.5, 2e7, 0.3),
            distanceDisplayCondition: new DistanceDisplayCondition(0, 2e7),
          },
        });
      }
    } catch (err) {
      console.warn("FireLayer error:", err);
    }
  }, [fires, viewer]);

  return null;
}
```

**Step 5: Create FireDetailPanel**

Create `src/components/panels/FireDetailPanel.tsx`:
```typescript
import type { FireHotspot } from "@/types/firms";

interface FireDetailPanelProps {
  fire: FireHotspot | null;
  onClose: () => void;
}

export function FireDetailPanel({ fire, onClose }: FireDetailPanelProps) {
  if (!fire) return null;

  return (
    <div className="panel" style={{ position: "absolute", bottom: 16, right: 16, width: 240 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="panel-title" style={{ margin: 0 }}>Fire Hotspot</div>
        <button
          onClick={onClose}
          style={{ background: "none", border: "none", color: "var(--color-text-dim)", cursor: "pointer", fontSize: 14, fontFamily: "var(--font-mono)" }}
        >
          X
        </button>
      </div>
      <div style={{ marginTop: 8, fontSize: 11, lineHeight: 1.8 }}>
        <div>
          <span style={{ color: "var(--color-text-dim)" }}>CONF </span>
          <span style={{ color: fire.confidence === "high" || fire.confidence === "h" ? "var(--color-red)" : "var(--color-amber)" }}>
            {fire.confidence.toUpperCase()}
          </span>
        </div>
        <div>
          <span style={{ color: "var(--color-text-dim)" }}>FRP </span>
          {fire.frp.toFixed(1)} MW
        </div>
        <div>
          <span style={{ color: "var(--color-text-dim)" }}>BRIGHT </span>
          {fire.brightness.toFixed(1)} K
        </div>
        <div>
          <span style={{ color: "var(--color-text-dim)" }}>SAT </span>
          {fire.satellite}
        </div>
        <div>
          <span style={{ color: "var(--color-text-dim)" }}>TIME </span>
          {fire.acqDate} {fire.acqTime}
        </div>
        <div>
          <span style={{ color: "var(--color-text-dim)" }}>LAT </span>
          {fire.latitude.toFixed(4)}&deg;
        </div>
        <div>
          <span style={{ color: "var(--color-text-dim)" }}>LON </span>
          {fire.longitude.toFixed(4)}&deg;
        </div>
      </div>
    </div>
  );
}
```

**Step 6: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 7: Commit**

```bash
git add src/types/firms.ts src/feeds/firms.ts src/hooks/useFireData.ts src/layers/FireLayer.tsx src/components/panels/FireDetailPanel.tsx
git commit -m "feat: add wildfire layer (NASA FIRMS feed)"
```

---

## Task 6: Weather Alerts Layer (NWS)

**Files:**
- Create: `src/types/nws.ts`
- Create: `src/feeds/nws.ts`
- Create: `src/hooks/useWeatherData.ts`
- Create: `src/layers/WeatherLayer.tsx`
- Create: `src/components/panels/WeatherDetailPanel.tsx`

**Step 1: Create NWS types**

Create `src/types/nws.ts`:
```typescript
import { z } from "zod";

export const NWSAlertSchema = z.object({
  id: z.string(),
  properties: z.object({
    event: z.string(),
    severity: z.enum(["Extreme", "Severe", "Moderate", "Minor", "Unknown"]),
    certainty: z.string(),
    headline: z.string().nullable(),
    description: z.string(),
    areaDesc: z.string(),
    effective: z.string(),
    expires: z.string().nullable(),
  }),
  geometry: z
    .object({
      type: z.string(),
      coordinates: z.unknown(),
    })
    .nullable(),
});

export const NWSResponseSchema = z.object({
  features: z.array(NWSAlertSchema),
});

export interface WeatherAlert {
  id: string;
  event: string;
  severity: string;
  headline: string;
  description: string;
  areaDesc: string;
  effective: string;
  expires: string | null;
  latitude: number | null;
  longitude: number | null;
}
```

**Step 2: Create NWS feed**

Create `src/feeds/nws.ts`:
```typescript
import { NWSResponseSchema } from "@/types/nws";
import type { WeatherAlert } from "@/types/nws";
import { API } from "@/lib/constants";

/** Extract a rough center point from GeoJSON geometry */
function centroid(geometry: { type: string; coordinates: unknown } | null): { lat: number; lon: number } | null {
  if (!geometry || !geometry.coordinates) return null;

  try {
    // For Polygon: coordinates is [[[lon,lat],...]]
    if (geometry.type === "Polygon") {
      const ring = (geometry.coordinates as number[][][])[0];
      if (!ring || ring.length === 0) return null;
      let latSum = 0, lonSum = 0;
      for (const [lon, lat] of ring) {
        latSum += lat!;
        lonSum += lon!;
      }
      return { lat: latSum / ring.length, lon: lonSum / ring.length };
    }
    // For MultiPolygon: take first polygon
    if (geometry.type === "MultiPolygon") {
      const poly = (geometry.coordinates as number[][][][])[0];
      if (!poly) return null;
      const ring = poly[0];
      if (!ring || ring.length === 0) return null;
      let latSum = 0, lonSum = 0;
      for (const [lon, lat] of ring) {
        latSum += lat!;
        lonSum += lon!;
      }
      return { lat: latSum / ring.length, lon: lonSum / ring.length };
    }
  } catch {
    return null;
  }
  return null;
}

export async function fetchWeatherAlerts(): Promise<WeatherAlert[]> {
  try {
    const res = await fetch(API.WEATHER);
    if (!res.ok) return [];

    const json: unknown = await res.json();
    const parsed = NWSResponseSchema.safeParse(json);
    if (!parsed.success) return [];

    return parsed.data.features.map((f) => {
      const center = centroid(f.geometry);
      return {
        id: f.id,
        event: f.properties.event,
        severity: f.properties.severity,
        headline: f.properties.headline ?? f.properties.event,
        description: f.properties.description,
        areaDesc: f.properties.areaDesc,
        effective: f.properties.effective,
        expires: f.properties.expires,
        latitude: center?.lat ?? null,
        longitude: center?.lon ?? null,
      };
    });
  } catch (err) {
    console.warn("NWS fetch failed:", err);
    return [];
  }
}
```

**Step 3: Create weather data hook**

Create `src/hooks/useWeatherData.ts`:
```typescript
import { useState, useEffect, useCallback, useRef } from "react";
import type { WeatherAlert } from "@/types/nws";
import { fetchWeatherAlerts } from "@/feeds/nws";
import { INTERVALS } from "@/lib/constants";

interface WeatherDataState {
  alerts: WeatherAlert[];
  count: number;
  loading: boolean;
  error: string | null;
}

export function useWeatherData(enabled = true) {
  const [state, setState] = useState<WeatherDataState>({
    alerts: [],
    count: 0,
    loading: false,
    error: null,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setState((prev) => ({ ...prev, loading: true }));

    const alerts = await fetchWeatherAlerts();
    setState({
      alerts,
      count: alerts.length,
      loading: false,
      error: null,
    });
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    refresh();
    intervalRef.current = setInterval(refresh, INTERVALS.WEATHER);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled, refresh]);

  return { ...state, refresh };
}
```

**Step 4: Create WeatherLayer**

Create `src/layers/WeatherLayer.tsx`:
```typescript
import { useEffect } from "react";
import {
  Cartesian3,
  Cartesian2,
  Color,
  VerticalOrigin,
  NearFarScalar,
  DistanceDisplayCondition,
  LabelStyle,
} from "cesium";
import type { WeatherAlert } from "@/types/nws";

interface WeatherLayerProps {
  alerts: WeatherAlert[];
  viewer: import("cesium").Viewer | null;
}

function severityToColor(severity: string): Color {
  switch (severity) {
    case "Extreme": return Color.fromCssColorString("#ff0000");
    case "Severe": return Color.fromCssColorString("#ff6600");
    case "Moderate": return Color.fromCssColorString("#ffcc00");
    case "Minor": return Color.fromCssColorString("#66ccff");
    default: return Color.fromCssColorString("#999999");
  }
}

export function WeatherLayer({ alerts, viewer }: WeatherLayerProps) {
  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return;

    try {
      const idsToRemove: string[] = [];
      for (let i = 0; i < viewer.entities.values.length; i++) {
        const e = viewer.entities.values[i];
        if (e?.id?.startsWith("wx-")) idsToRemove.push(e.id);
      }
      for (const id of idsToRemove) viewer.entities.removeById(id);

      for (const alert of alerts) {
        if (alert.latitude == null || alert.longitude == null) continue;
        const color = severityToColor(alert.severity);

        viewer.entities.add({
          id: `wx-${alert.id}`,
          position: Cartesian3.fromDegrees(alert.longitude, alert.latitude, 0),
          point: {
            pixelSize: 10,
            color: color.withAlpha(0.5),
            outlineColor: color,
            outlineWidth: 2,
            scaleByDistance: new NearFarScalar(1e4, 2.0, 1e7, 0.5),
            distanceDisplayCondition: new DistanceDisplayCondition(0, 2e7),
          },
          label: {
            text: alert.event,
            font: "9px JetBrains Mono",
            fillColor: color,
            outlineColor: Color.BLACK,
            outlineWidth: 2,
            style: LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: VerticalOrigin.BOTTOM,
            pixelOffset: new Cartesian2(0, -12),
            scaleByDistance: new NearFarScalar(1e4, 1.0, 5e6, 0.0),
            distanceDisplayCondition: new DistanceDisplayCondition(0, 5e6),
          },
        });
      }
    } catch (err) {
      console.warn("WeatherLayer error:", err);
    }
  }, [alerts, viewer]);

  return null;
}
```

**Step 5: Create WeatherDetailPanel**

Create `src/components/panels/WeatherDetailPanel.tsx`:
```typescript
import type { WeatherAlert } from "@/types/nws";

interface WeatherDetailPanelProps {
  alert: WeatherAlert | null;
  onClose: () => void;
}

export function WeatherDetailPanel({ alert, onClose }: WeatherDetailPanelProps) {
  if (!alert) return null;

  return (
    <div className="panel" style={{ position: "absolute", bottom: 16, right: 16, width: 260 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="panel-title" style={{ margin: 0 }}>Weather Alert</div>
        <button
          onClick={onClose}
          style={{ background: "none", border: "none", color: "var(--color-text-dim)", cursor: "pointer", fontSize: 14, fontFamily: "var(--font-mono)" }}
        >
          X
        </button>
      </div>
      <div style={{ marginTop: 8, fontSize: 11, lineHeight: 1.8 }}>
        <div>
          <span style={{ color: "var(--color-text-dim)" }}>EVENT </span>
          <span style={{ color: "var(--color-amber)" }}>{alert.event}</span>
        </div>
        <div>
          <span style={{ color: "var(--color-text-dim)" }}>SEVERITY </span>
          <span style={{ color: alert.severity === "Extreme" || alert.severity === "Severe" ? "var(--color-red)" : "var(--color-text)" }}>
            {alert.severity}
          </span>
        </div>
        <div>
          <span style={{ color: "var(--color-text-dim)" }}>AREA </span>
          {alert.areaDesc.length > 60 ? alert.areaDesc.slice(0, 57) + "..." : alert.areaDesc}
        </div>
        {alert.headline && (
          <div style={{ marginTop: 4, color: "var(--color-text-dim)", fontSize: 10 }}>
            {alert.headline.length > 100 ? alert.headline.slice(0, 97) + "..." : alert.headline}
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 6: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 7: Commit**

```bash
git add src/types/nws.ts src/feeds/nws.ts src/hooks/useWeatherData.ts src/layers/WeatherLayer.tsx src/components/panels/WeatherDetailPanel.tsx
git commit -m "feat: add weather alerts layer (NWS feed)"
```

---

## Task 7: AIS Ship Layer

**Files:**
- Create: `src/types/ais.ts`
- Create: `src/feeds/ais.ts`
- Create: `src/hooks/useAISData.ts`
- Create: `src/layers/ShipLayer.tsx`
- Create: `src/components/panels/ShipDetailPanel.tsx`

**Step 1: Create AIS types**

Create `src/types/ais.ts`:
```typescript
export interface Vessel {
  mmsi: number;
  name: string;
  latitude: number;
  longitude: number;
  cog: number;     // course over ground (degrees)
  sog: number;     // speed over ground (knots)
  heading: number;
  shipType: number;
  destination: string;
}
```

**Step 2: Create AIS feed**

Create `src/feeds/ais.ts`:
```typescript
import type { Vessel } from "@/types/ais";
import { API, LIMITS } from "@/lib/constants";

export async function fetchVessels(): Promise<Vessel[]> {
  try {
    const res = await fetch(API.AIS);
    if (!res.ok) return [];

    const json = (await res.json()) as Record<string, unknown>[];
    if (!Array.isArray(json)) return [];

    const vessels: Vessel[] = [];
    for (const v of json) {
      if (vessels.length >= LIMITS.MAX_SHIPS) break;
      const lat = Number(v.latitude);
      const lon = Number(v.longitude);
      if (isNaN(lat) || isNaN(lon)) continue;

      vessels.push({
        mmsi: Number(v.mmsi) || 0,
        name: String(v.name || "UNKNOWN"),
        latitude: lat,
        longitude: lon,
        cog: Number(v.cog) || 0,
        sog: Number(v.sog) || 0,
        heading: Number(v.heading) || Number(v.cog) || 0,
        shipType: Number(v.shipType) || 0,
        destination: String(v.destination || ""),
      });
    }
    return vessels;
  } catch (err) {
    console.warn("AIS fetch failed:", err);
    return [];
  }
}
```

**Step 3: Create AIS data hook**

Create `src/hooks/useAISData.ts`:
```typescript
import { useState, useEffect, useCallback, useRef } from "react";
import type { Vessel } from "@/types/ais";
import { fetchVessels } from "@/feeds/ais";
import { INTERVALS } from "@/lib/constants";

interface AISDataState {
  vessels: Vessel[];
  count: number;
  loading: boolean;
  error: string | null;
}

export function useAISData(enabled = true) {
  const [state, setState] = useState<AISDataState>({
    vessels: [],
    count: 0,
    loading: false,
    error: null,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setState((prev) => ({ ...prev, loading: true }));

    const vessels = await fetchVessels();
    setState({
      vessels,
      count: vessels.length,
      loading: false,
      error: vessels.length === 0 ? "No AIS data" : null,
    });
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    refresh();
    intervalRef.current = setInterval(refresh, INTERVALS.AIS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled, refresh]);

  return { ...state, refresh };
}
```

**Step 4: Create ShipLayer**

Create `src/layers/ShipLayer.tsx`:
```typescript
import { useEffect } from "react";
import {
  Cartesian3,
  Cartesian2,
  Color,
  VerticalOrigin,
  HorizontalOrigin,
  NearFarScalar,
  DistanceDisplayCondition,
  LabelStyle,
  Math as CesiumMath,
} from "cesium";
import type { Vessel } from "@/types/ais";

interface ShipLayerProps {
  vessels: Vessel[];
  viewer: import("cesium").Viewer | null;
}

const SHIP_SVG = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32"><path d="M16 4 L12 14 L8 24 L16 20 L24 24 L20 14 Z" fill="#3388ff" stroke="#001a44" stroke-width="0.5"/></svg>`)}`;

export function ShipLayer({ vessels, viewer }: ShipLayerProps) {
  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return;

    try {
      const idsToRemove: string[] = [];
      for (let i = 0; i < viewer.entities.values.length; i++) {
        const e = viewer.entities.values[i];
        if (e?.id?.startsWith("ship-")) idsToRemove.push(e.id);
      }
      for (const id of idsToRemove) viewer.entities.removeById(id);

      for (const v of vessels) {
        viewer.entities.add({
          id: `ship-${v.mmsi}`,
          position: Cartesian3.fromDegrees(v.longitude, v.latitude, 0),
          billboard: {
            image: SHIP_SVG,
            width: 20,
            height: 20,
            rotation: CesiumMath.toRadians(-v.heading),
            verticalOrigin: VerticalOrigin.CENTER,
            horizontalOrigin: HorizontalOrigin.CENTER,
            scaleByDistance: new NearFarScalar(1e4, 1.5, 1e7, 0.4),
            distanceDisplayCondition: new DistanceDisplayCondition(0, 1e7),
          },
          label: {
            text: v.name,
            font: "9px JetBrains Mono",
            fillColor: Color.fromCssColorString("#3388ff"),
            outlineColor: Color.BLACK,
            outlineWidth: 2,
            style: LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: VerticalOrigin.BOTTOM,
            pixelOffset: new Cartesian2(0, -14),
            scaleByDistance: new NearFarScalar(1e4, 1.0, 5e6, 0.0),
            distanceDisplayCondition: new DistanceDisplayCondition(0, 3e6),
          },
        });
      }
    } catch (err) {
      console.warn("ShipLayer error:", err);
    }
  }, [vessels, viewer]);

  return null;
}
```

**Step 5: Create ShipDetailPanel**

Create `src/components/panels/ShipDetailPanel.tsx`:
```typescript
import type { Vessel } from "@/types/ais";

interface ShipDetailPanelProps {
  vessel: Vessel | null;
  onClose: () => void;
}

export function ShipDetailPanel({ vessel, onClose }: ShipDetailPanelProps) {
  if (!vessel) return null;

  return (
    <div className="panel" style={{ position: "absolute", bottom: 16, right: 16, width: 240 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="panel-title" style={{ margin: 0 }}>Vessel Detail</div>
        <button
          onClick={onClose}
          style={{ background: "none", border: "none", color: "var(--color-text-dim)", cursor: "pointer", fontSize: 14, fontFamily: "var(--font-mono)" }}
        >
          X
        </button>
      </div>
      <div style={{ marginTop: 8, fontSize: 11, lineHeight: 1.8 }}>
        <div>
          <span style={{ color: "var(--color-text-dim)" }}>NAME </span>
          <span style={{ color: "#3388ff" }}>{vessel.name}</span>
        </div>
        <div>
          <span style={{ color: "var(--color-text-dim)" }}>MMSI </span>
          {vessel.mmsi}
        </div>
        <div>
          <span style={{ color: "var(--color-text-dim)" }}>SOG </span>
          {vessel.sog.toFixed(1)} kn
        </div>
        <div>
          <span style={{ color: "var(--color-text-dim)" }}>COG </span>
          {vessel.cog.toFixed(0)}&deg;
        </div>
        {vessel.destination && (
          <div>
            <span style={{ color: "var(--color-text-dim)" }}>DEST </span>
            {vessel.destination}
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 6: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 7: Commit**

```bash
git add src/types/ais.ts src/feeds/ais.ts src/hooks/useAISData.ts src/layers/ShipLayer.tsx src/components/panels/ShipDetailPanel.tsx
git commit -m "feat: add AIS ship layer"
```

---

## Task 8: Wire Everything into GlobeViewer

**Files:**
- Modify: `src/components/GlobeViewer.tsx`
- Modify: `src/components/panels/LayerPanel.tsx`
- Modify: `src/components/hud/StatusBar.tsx` (add new feed indicators)

**Step 1: Update LayerPanel**

Replace entire `src/components/panels/LayerPanel.tsx`:
```typescript
import { Toggle } from "@/components/ui/Toggle";

export interface LayerState {
  flights: boolean;
  satellites: boolean;
  grid: boolean;
  earthquakes: boolean;
  ships: boolean;
  fires: boolean;
  weather: boolean;
}

interface LayerPanelProps {
  layers: LayerState;
  onToggle: (layer: keyof LayerState) => void;
}

export function LayerPanel({ layers, onToggle }: LayerPanelProps) {
  return (
    <div className="panel" style={{ position: "absolute", top: 48, right: 16, width: 180 }}>
      <div className="panel-title">Layers</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Toggle label="Flights" checked={layers.flights} onChange={() => onToggle("flights")} />
        <Toggle label="Satellites" checked={layers.satellites} onChange={() => onToggle("satellites")} />
        <Toggle label="Earthquakes" checked={layers.earthquakes} onChange={() => onToggle("earthquakes")} />
        <Toggle label="Ships" checked={layers.ships} onChange={() => onToggle("ships")} />
        <Toggle label="Fires" checked={layers.fires} onChange={() => onToggle("fires")} />
        <Toggle label="Weather" checked={layers.weather} onChange={() => onToggle("weather")} />
        <Toggle label="Grid" checked={layers.grid} onChange={() => onToggle("grid")} />
      </div>
    </div>
  );
}
```

**Step 2: Rewrite GlobeViewer.tsx to integrate all layers**

This is the biggest change. Replace the entire `src/components/GlobeViewer.tsx`. The full code is large — see the design doc for the component list. Key changes:

- Import all new hooks: `useEarthquakeData`, `useAISData`, `useFireData`, `useWeatherData`
- Import all new layers: `EarthquakeLayer`, `ShipLayer`, `FireLayer`, `WeatherLayer`
- Import all new detail panels: `QuakeDetailPanel`, `ShipDetailPanel`, `FireDetailPanel`, `WeatherDetailPanel`
- Expand `LayerState` to include all 7 layers
- Add click handler detection for new entity prefixes (`quake-`, `ship-`, `fire-`, `wx-`)
- Add new selection state for each entity type
- Add `updateCamera` call from flightData hook
- Update feeds array for StatusBar
- Add `CesiumMath` import

The full GlobeViewer replacement should:
1. Use the new `LayerState` from LayerPanel (imported type)
2. Initialize new layers as OFF by default: `earthquakes: false, ships: false, fires: false, weather: false`
3. Add camera moveEnd listener that calls `flightData.updateCamera(lat, lon)`
4. Render all new layers and detail panels
5. Only show one detail panel at a time (clear others when selecting new entity)

**Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

**Step 4: Run dev server and test in browser**

Run: `npm run dev`
Verify: flights load from adsb.lol, earthquake toggle works, favicon shows

**Step 5: Commit**

```bash
git add src/components/GlobeViewer.tsx src/components/panels/LayerPanel.tsx
git commit -m "feat: wire all data layers into GlobeViewer"
```

---

## Task 9: Update .env.example and Search Panel

**Files:**
- Modify: `.env.example`
- Modify: `src/components/panels/SearchPanel.tsx`

**Step 1: Update .env.example**

Replace `.env.example`:
```
# Cesium Ion access token (required for Google 3D Tiles)
# Get yours at https://cesium.com/ion → Access Tokens
VITE_CESIUM_ION_TOKEN=your_token_here

# OpenSky Network credentials (optional fallback — increases rate limits)
# Register at https://opensky-network.org
VITE_OPENSKY_USERNAME=
VITE_OPENSKY_PASSWORD=

# --- Proxy server env vars (not needed for dev mode) ---

# NASA FIRMS API key (required for wildfire data)
# Register at https://firms.modaps.eosdis.nasa.gov/api/area/
NASA_FIRMS_API_KEY=

# AISStream.io API key (required for ship tracking)
# Register at https://aisstream.io
AISSTREAM_API_KEY=
```

**Step 2: Add earthquake and ship search to SearchPanel**

In `src/components/panels/SearchPanel.tsx`, add earthquake and vessel search alongside existing aircraft and satellite search. Add imports for the new types and add search across all entity types.

**Step 3: Commit**

```bash
git add .env.example src/components/panels/SearchPanel.tsx
git commit -m "feat: update env template and expand search panel"
```

---

## Task 10: Express Production Proxy Server

**Files:**
- Create: `server/proxy.ts`
- Modify: `Dockerfile`
- Modify: `package.json` (add express + tsx deps, add `start` script)

**Step 1: Install Express**

Run: `npm install express`
Run: `npm install -D @types/express tsx`

**Step 2: Create proxy server**

Create `server/proxy.ts`:
```typescript
import express from "express";
import { join } from "path";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Serve static build
app.use(express.static(join(import.meta.dirname, "../dist")));

// CORS proxy routes
app.get("/api/flights/*", async (req, res) => {
  const path = req.path.replace("/api/flights", "");
  const upstream = `https://api.adsb.lol${path}`;
  try {
    const r = await fetch(upstream);
    res.status(r.status).json(await r.json());
  } catch {
    res.status(502).json({ error: "upstream failed" });
  }
});

app.get("/api/quakes", async (_req, res) => {
  try {
    const r = await fetch("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson");
    res.status(r.status).json(await r.json());
  } catch {
    res.status(502).json({ error: "upstream failed" });
  }
});

app.get("/api/fires", async (_req, res) => {
  const key = process.env.NASA_FIRMS_API_KEY;
  if (!key) return res.status(503).json({ error: "FIRMS API key not configured" });
  try {
    const r = await fetch(`https://firms.modaps.eosdis.nasa.gov/api/area/csv/${key}/VIIRS_SNPP_NRT/world/1`);
    res.status(r.status).send(await r.text());
  } catch {
    res.status(502).json({ error: "upstream failed" });
  }
});

app.get("/api/weather", async (_req, res) => {
  try {
    const r = await fetch("https://api.weather.gov/alerts/active", {
      headers: { "User-Agent": "WorldView/0.1 (github.com/imparpaulo01/worldview)" },
    });
    res.status(r.status).json(await r.json());
  } catch {
    res.status(502).json({ error: "upstream failed" });
  }
});

// AIS snapshot placeholder (requires WebSocket relay - future enhancement)
app.get("/api/ais", (_req, res) => {
  res.json([]);
});

// SPA fallback
app.get("*", (_req, res) => {
  res.sendFile(join(import.meta.dirname, "../dist/index.html"));
});

app.listen(PORT, () => {
  console.log(`WorldView proxy running on port ${PORT}`);
});
```

**Step 3: Add start script to package.json**

Add to `scripts` in `package.json`:
```json
"start": "tsx server/proxy.ts"
```

**Step 4: Update Dockerfile**

Replace `Dockerfile`:
```dockerfile
# Build stage
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
ARG VITE_CESIUM_ION_TOKEN
ENV VITE_CESIUM_ION_TOKEN=$VITE_CESIUM_ION_TOKEN
RUN npm run build

# Production stage
FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm install tsx
COPY --from=builder /app/dist ./dist
COPY server ./server
EXPOSE 3000
CMD ["npx", "tsx", "server/proxy.ts"]
```

**Step 5: Run build to verify**

Run: `npm run build`
Expected: PASS

**Step 6: Commit**

```bash
git add server/proxy.ts Dockerfile package.json package-lock.json
git commit -m "feat: add Express production proxy server"
```

---

## Task 11: Final Integration Test

**Step 1: Start dev server**

Run: `npm run dev`

**Step 2: Verify in browser**

Open http://localhost:5173 and check:
- [ ] Globe loads with Google 3D Tiles (or graceful fallback)
- [ ] Favicon appears in browser tab
- [ ] Flights load (AC: N > 0 in HUD)
- [ ] Satellites load (SAT: N > 0)
- [ ] Toggle Earthquakes ON → markers appear
- [ ] Toggle Fires ON → (needs API key, should show empty gracefully)
- [ ] Toggle Weather ON → alerts appear if any are active
- [ ] Toggle Ships ON → (needs AIS relay, empty is OK)
- [ ] Click on flight → detail panel
- [ ] Click on earthquake → detail panel
- [ ] Filter modes 0-4 work
- [ ] Search panel finds flights + satellites

**Step 3: Run typecheck + build**

Run: `npm run typecheck && npm run build`
Expected: Both PASS

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: final integration cleanup"
```

---

## Summary

| Task | What | Files | Commit |
|------|------|-------|--------|
| 1 | Favicon + 3D Tiles fix + Constants | 4 | `fix: favicon, 3D tiles retry, expanded constants` |
| 2 | Vite proxy config | 1 | `feat: add Vite proxy routes for all data feeds` |
| 3 | ADS-B flight feed (adsb.lol) | 5 | `feat: swap OpenSky for adsb.lol` |
| 4 | Earthquake layer (USGS) | 5 | `feat: add earthquake layer` |
| 5 | Wildfire layer (NASA FIRMS) | 5 | `feat: add wildfire layer` |
| 6 | Weather alerts layer (NWS) | 5 | `feat: add weather alerts layer` |
| 7 | AIS ship layer | 5 | `feat: add AIS ship layer` |
| 8 | Wire into GlobeViewer | 2 | `feat: wire all data layers into GlobeViewer` |
| 9 | Env + search update | 2 | `feat: update env template and expand search` |
| 10 | Express proxy server | 4 | `feat: add Express production proxy server` |
| 11 | Integration test | 0 | `chore: final integration cleanup` |

**Total: ~25 new/modified files, 11 commits**
