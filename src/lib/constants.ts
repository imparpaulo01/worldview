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
  WEATHER_EU: "/api/weather-eu",
  CONFLICTS: "/api/conflicts",
  NEWS: "/api/news",
  AI_BRIEF: "/api/ai/brief",
} as const;

/** Refresh intervals (ms) */
export const INTERVALS = {
  FLIGHTS: 15_000,
  SATELLITES: 1_000,
  EARTHQUAKES: 300_000,   // 5 min
  AIS: 30_000,
  FIRES: 1_800_000,       // 30 min
  WEATHER: 600_000,        // 10 min
  CONFLICTS: 900_000,      // 15 min (matches GDELT update cycle)
  NEWS: 600_000,            // 10 min
  AI_BRIEF: 900_000,        // 15 min
} as const;

/** Performance caps */
export const LIMITS = {
  MAX_SATELLITES: 200,
  MAX_FLIGHTS: 500,
  MAX_SHIPS: 500,
  MAX_QUAKES: 200,
  MAX_FIRES: 500,
  MAX_CONFLICTS: 300,
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

/** Alert thresholds for intelligence features */
export const ALERT_THRESHOLDS = {
  EARTHQUAKE_MIN_MAG: 6.0,
  CONFLICT_MIN_GOLDSTEIN: -7,
  WEATHER_SEVERITY: "Extreme",
  NEWS_KEYWORDS: ["breaking", "attack", "explosion", "missile", "earthquake", "tsunami", "war"],
} as const;

/** News display limits */
export const LIMITS_NEWS = {
  MAX_HEADLINES: 200,
  MAX_DISPLAY: 50,
} as const;
