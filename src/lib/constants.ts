/** Default camera position: Lisbon, Portugal */
export const DEFAULT_CAMERA = {
  longitude: -9.1393,
  latitude: 38.7223,
  height: 2_000_000,
} as const;

/** API endpoints */
export const API = {
  OPENSKY_STATES: "https://opensky-network.org/api/states/all",
  CELESTRAK_GP: "https://celestrak.org/NORAD/elements/gp.php",
} as const;

/** Refresh intervals (ms) */
export const INTERVALS = {
  FLIGHTS: 10_000,
  SATELLITES: 1_000,
} as const;

/** Performance caps */
export const LIMITS = {
  MAX_SATELLITES: 200,
  MAX_FLIGHTS: 500,
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
