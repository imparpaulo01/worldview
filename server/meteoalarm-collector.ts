/**
 * MeteoAlarm Collector — fetches weather alerts from European national weather services
 * via MeteoAlarm Atom feeds. Covers 39 European countries.
 *
 * No auth required. Free public feeds.
 * Used by both: Vite dev server plugin + Express production proxy.
 */

const REFRESH_MS = 10 * 60_000; // 10 minutes
const MAX_ALERTS = 2000;

/** All MeteoAlarm country feeds */
const COUNTRY_FEEDS: Record<string, string> = {
  AD: "andorra",
  AT: "austria",
  BE: "belgium",
  BA: "bosnia-herzegovina",
  BG: "bulgaria",
  HR: "croatia",
  CY: "cyprus",
  CZ: "czechia",
  DK: "denmark",
  EE: "estonia",
  FI: "finland",
  FR: "france",
  DE: "germany",
  GR: "greece",
  HU: "hungary",
  IS: "iceland",
  IE: "ireland",
  IL: "israel",
  IT: "italy",
  LV: "latvia",
  LT: "lithuania",
  LU: "luxembourg",
  MT: "malta",
  MD: "moldova",
  ME: "montenegro",
  NL: "netherlands",
  MK: "republic-of-north-macedonia",
  NO: "norway",
  PL: "poland",
  PT: "portugal",
  RO: "romania",
  RS: "serbia",
  SK: "slovakia",
  SI: "slovenia",
  ES: "spain",
  SE: "sweden",
  CH: "switzerland",
  UA: "ukraine",
  GB: "united-kingdom",
};

const FEED_BASE = "https://feeds.meteoalarm.org/feeds/meteoalarm-legacy-atom-";

interface MeteoAlert {
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

/**
 * EMMA_ID region centroids for European weather alert zones.
 * Format: EMMA_ID prefix (country code) → { lat, lon }
 *
 * For countries with few alerts, country centroid is fine.
 * For Portugal (user priority) and major countries, region-level centroids.
 */
const EMMA_CENTROIDS: Record<string, { lat: number; lon: number }> = {
  // Portugal districts
  PT001: { lat: 41.15, lon: -8.61 },   // Porto
  PT002: { lat: 41.44, lon: -8.3 },    // Braga
  PT003: { lat: 41.8, lon: -6.75 },    // Bragança
  PT004: { lat: 41.3, lon: -7.74 },    // Vila Real
  PT005: { lat: 41.69, lon: -8.83 },   // Viana do Castelo
  PT006: { lat: 40.66, lon: -7.91 },   // Viseu
  PT007: { lat: 40.21, lon: -8.43 },   // Coimbra
  PT008: { lat: 40.54, lon: -8.65 },   // Aveiro
  PT009: { lat: 40.27, lon: -7.5 },    // Guarda
  PT010: { lat: 39.82, lon: -7.49 },   // Castelo Branco
  PT011: { lat: 39.6, lon: -8.4 },     // Leiria (same as PT015)
  PT012: { lat: 39.46, lon: -8.2 },    // Santarém
  PT013: { lat: 38.72, lon: -9.14 },   // Lisboa
  PT014: { lat: 38.57, lon: -7.91 },   // Évora
  PT015: { lat: 39.74, lon: -8.81 },   // Leiria
  PT016: { lat: 38.72, lon: -9.14 },   // Lisboa
  PT017: { lat: 39.29, lon: -8.69 },   // Santarém
  PT018: { lat: 39.3, lon: -7.43 },    // Portalegre
  PT019: { lat: 38.57, lon: -7.91 },   // Évora
  PT020: { lat: 38.52, lon: -8.9 },    // Setúbal
  PT021: { lat: 38.02, lon: -7.87 },   // Beja
  PT022: { lat: 37.02, lon: -7.93 },   // Faro
  PT023: { lat: 32.76, lon: -16.96 },  // Madeira mountains
  PT024: { lat: 32.65, lon: -16.92 },  // Madeira south coast
  PT025: { lat: 32.82, lon: -16.85 },  // Madeira north coast
  PT026: { lat: 33.06, lon: -16.34 },  // Porto Santo
  PT027: { lat: 38.72, lon: -27.22 },  // Azores (central group)
  PT028: { lat: 37.74, lon: -25.67 },  // Azores (eastern)
  PT029: { lat: 39.5, lon: -31.11 },   // Azores (western)
};

/** Country centroids — fallback when EMMA_ID not in detailed map */
const COUNTRY_CENTROIDS: Record<string, { lat: number; lon: number }> = {
  AD: { lat: 42.55, lon: 1.57 },
  AT: { lat: 47.52, lon: 14.55 },
  BE: { lat: 50.85, lon: 4.35 },
  BA: { lat: 43.92, lon: 17.68 },
  BG: { lat: 42.73, lon: 25.49 },
  HR: { lat: 45.1, lon: 15.2 },
  CY: { lat: 35.13, lon: 33.43 },
  CZ: { lat: 49.82, lon: 15.47 },
  DK: { lat: 56.26, lon: 9.5 },
  EE: { lat: 58.6, lon: 25.01 },
  FI: { lat: 61.92, lon: 25.75 },
  FR: { lat: 46.6, lon: 2.21 },
  DE: { lat: 51.17, lon: 10.45 },
  GR: { lat: 39.07, lon: 21.82 },
  HU: { lat: 47.16, lon: 19.5 },
  IS: { lat: 64.96, lon: -19.02 },
  IE: { lat: 53.41, lon: -8.24 },
  IL: { lat: 31.05, lon: 34.85 },
  IT: { lat: 41.87, lon: 12.57 },
  LV: { lat: 56.88, lon: 24.6 },
  LT: { lat: 55.17, lon: 23.88 },
  LU: { lat: 49.82, lon: 6.13 },
  MT: { lat: 35.94, lon: 14.38 },
  MD: { lat: 47.41, lon: 28.37 },
  ME: { lat: 42.71, lon: 19.37 },
  NL: { lat: 52.13, lon: 5.29 },
  MK: { lat: 41.51, lon: 21.75 },
  NO: { lat: 60.47, lon: 8.47 },
  PL: { lat: 51.92, lon: 19.15 },
  PT: { lat: 39.4, lon: -8.22 },
  RO: { lat: 45.94, lon: 24.97 },
  RS: { lat: 44.02, lon: 21.01 },
  SK: { lat: 48.67, lon: 19.7 },
  SI: { lat: 46.15, lon: 14.99 },
  ES: { lat: 40.46, lon: -3.75 },
  SE: { lat: 60.13, lon: 18.64 },
  CH: { lat: 46.82, lon: 8.23 },
  UA: { lat: 48.38, lon: 31.17 },
  GB: { lat: 55.38, lon: -3.44 },
};

/** Map EMMA_ID to centroid coordinates */
function emmaToCoords(emmaId: string, countryCode: string): { lat: number; lon: number } | null {
  // Try exact EMMA_ID match first (e.g., PT019)
  const exact = EMMA_CENTROIDS[emmaId];
  if (exact) return exact;

  // Fall back to country centroid with slight offset based on EMMA_ID number
  // This spreads alerts across the country instead of stacking on one point
  const country = COUNTRY_CENTROIDS[countryCode];
  if (!country) return null;

  const num = parseInt(emmaId.replace(/^[A-Z]+/, "")) || 0;
  // Deterministic scatter: spread alerts up to ~2 degrees from country center
  const angle = (num * 137.5) * (Math.PI / 180); // Golden angle for uniform distribution
  const radius = 0.5 + (num % 20) * 0.1; // 0.5 to 2.5 degrees
  return {
    lat: country.lat + Math.sin(angle) * radius,
    lon: country.lon + Math.cos(angle) * radius,
  };
}

/** Map MeteoAlarm severity to NWS-compatible severity levels */
function normalizeSeverity(severity: string): string {
  switch (severity.toLowerCase()) {
    case "extreme": return "Extreme";
    case "severe": return "Severe";
    case "moderate": return "Moderate";
    case "minor": return "Minor";
    default: return "Unknown";
  }
}

/** Parse XML text to extract tag content (simple regex — no XML parser needed) */
function xmlTag(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, "i");
  const m = xml.match(re);
  return m?.[1]?.trim() || "";
}

/** Parse a single Atom entry block into a MeteoAlert */
function parseEntry(entryXml: string, countryCode: string): MeteoAlert | null {
  const event = xmlTag(entryXml, "cap:event");
  const severity = xmlTag(entryXml, "cap:severity");
  const areaDesc = xmlTag(entryXml, "cap:areaDesc");
  const effective = xmlTag(entryXml, "cap:effective") || xmlTag(entryXml, "cap:sent");
  const expires = xmlTag(entryXml, "cap:expires") || null;
  const identifier = xmlTag(entryXml, "cap:identifier");
  const title = xmlTag(entryXml, "title");

  if (!event || !severity) return null;

  // Check if alert has expired
  if (expires) {
    const expiresDate = new Date(expires);
    if (expiresDate.getTime() < Date.now()) return null;
  }

  // Extract EMMA_ID from geocode
  const emmaMatch = entryXml.match(/<valueName>EMMA_ID<\/valueName>\s*<value>([^<]+)<\/value>/i);
  const emmaId = emmaMatch?.[1]?.trim() || "";

  const coords = emmaToCoords(emmaId, countryCode);

  return {
    id: identifier
      ? `${identifier}-${emmaId || areaDesc.replace(/\s+/g, "_").slice(0, 30) || countryCode}`
      : `meteo-${countryCode}-${emmaId || areaDesc.replace(/\s+/g, "_").slice(0, 30)}-${Date.now()}`,
    event,
    severity: normalizeSeverity(severity),
    headline: title || `${event} — ${areaDesc}`,
    description: `${event} for ${areaDesc}`,
    areaDesc,
    effective,
    expires,
    latitude: coords?.lat ?? null,
    longitude: coords?.lon ?? null,
  };
}

/** Fetch and parse alerts from a single country feed */
async function fetchCountryAlerts(countryCode: string, feedName: string): Promise<MeteoAlert[]> {
  try {
    const r = await fetch(`${FEED_BASE}${feedName}`, {
      signal: AbortSignal.timeout(15_000),
    });
    if (!r.ok) return [];

    const xml = await r.text();

    // Split into entry blocks
    const entries = xml.split(/<entry>/i).slice(1); // First element is the feed header
    const alerts: MeteoAlert[] = [];

    for (const entry of entries) {
      const alert = parseEntry(entry, countryCode);
      if (alert && alert.latitude != null) {
        alerts.push(alert);
      }
    }

    return alerts;
  } catch {
    return [];
  }
}

// In-memory cache
let cachedAlerts: MeteoAlert[] = [];
let refreshTimer: ReturnType<typeof setInterval> | null = null;
let lastFetch = 0;

/** Fetch all European weather alerts */
async function fetchAll(): Promise<void> {
  const now = Date.now();
  // Don't fetch more often than every 5 minutes
  if (now - lastFetch < 5 * 60_000) return;
  lastFetch = now;

  console.log("[MeteoAlarm] Fetching alerts from all European feeds...");

  const entries = Object.entries(COUNTRY_FEEDS);

  // Fetch all countries in parallel (39 lightweight XML feeds)
  const results = await Promise.allSettled(
    entries.map(([code, name]) => fetchCountryAlerts(code, name)),
  );

  const alertMap = new Map<string, MeteoAlert>();
  for (const result of results) {
    if (result.status === "fulfilled") {
      for (const alert of result.value) {
        alertMap.set(alert.id, alert); // Dedup: last entry per ID wins
      }
    }
  }

  cachedAlerts = [...alertMap.values()].slice(0, MAX_ALERTS);
  console.log(`[MeteoAlarm] Loaded ${cachedAlerts.length} active alerts from ${entries.length} countries`);
}

/** Get current European weather alerts */
export function getMeteoAlerts(): MeteoAlert[] {
  return cachedAlerts;
}

/** Start the MeteoAlarm collector. Call once on server startup. */
export function startMeteoAlarmCollector(): void {
  console.log("[MeteoAlarm] Starting European weather alert collector (10-min refresh)");
  fetchAll();
  refreshTimer = setInterval(fetchAll, REFRESH_MS);
}

/** Stop the collector */
export function stopMeteoAlarmCollector(): void {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}
