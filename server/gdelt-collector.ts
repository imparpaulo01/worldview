/**
 * GDELT Conflict Data Collector — fetches latest 15-min GDELT export,
 * filters for conflict events (CAMEO codes 14, 17-20), and serves as JSON.
 *
 * Used by both: Vite dev server plugin + Express production proxy.
 */

import { inflateRawSync } from "node:zlib";

const LASTUPDATE_URL = "http://data.gdeltproject.org/gdeltv2/lastupdate.txt";
const REFRESH_MS = 15 * 60_000; // 15 minutes (matches GDELT update cycle)
const STALE_MS = 24 * 60 * 60_000; // Remove events older than 24h
const MAX_EVENTS = 300;

/** CAMEO root codes for conflict events */
const CONFLICT_ROOT_CODES = new Set(["14", "17", "18", "19", "20"]);

const EVENT_TYPE_LABELS: Record<string, string> = {
  "14": "Protest",
  "17": "Coerce",
  "18": "Assault",
  "19": "Fight",
  "20": "Mass Violence",
};

interface ConflictEvent {
  id: string;
  latitude: number;
  longitude: number;
  eventCode: string;
  eventType: string;
  goldsteinScale: number;
  actor1: string;
  actor2: string;
  country: string;
  sourceUrl: string;
  dateAdded: number;
}

// In-memory cache
const eventMap = new Map<string, ConflictEvent>();
let refreshTimer: ReturnType<typeof setInterval> | null = null;

/**
 * GDELT CSV column indices (tab-separated, 61 columns).
 * Reference: http://data.gdeltproject.org/documentation/GDELT-Event_Codebook-V2.0.pdf
 */
const COL = {
  GLOBALEVENTID: 0,
  Actor1Name: 6,
  Actor2Name: 16,
  EventCode: 26,
  EventBaseCode: 27,
  EventRootCode: 28,
  GoldsteinScale: 30,
  NumMentions: 31,
  NumSources: 32,
  NumArticles: 33,
  AvgTone: 34,
  ActionGeo_CountryCode: 53,
  ActionGeo_Lat: 56,
  ActionGeo_Long: 57,
  SOURCEURL: 60,
  DATEADDED: 59,
} as const;

/**
 * Extract the first file from a ZIP buffer using raw deflate.
 * GDELT ZIPs contain a single CSV file.
 */
function extractFirstFileFromZip(zipBuffer: Buffer): string {
  // ZIP local file header signature: PK\x03\x04
  if (zipBuffer[0] !== 0x50 || zipBuffer[1] !== 0x4b) {
    throw new Error("Not a valid ZIP file");
  }

  // Read local file header fields
  const compressionMethod = zipBuffer.readUInt16LE(8);
  const compressedSize = zipBuffer.readUInt32LE(18);
  const fileNameLength = zipBuffer.readUInt16LE(26);
  const extraFieldLength = zipBuffer.readUInt16LE(28);

  const dataOffset = 30 + fileNameLength + extraFieldLength;
  const compressedData = zipBuffer.subarray(dataOffset, dataOffset + compressedSize);

  if (compressionMethod === 0) {
    // Stored (no compression)
    return compressedData.toString("utf-8");
  } else if (compressionMethod === 8) {
    // Deflated
    const decompressed = inflateRawSync(compressedData);
    return decompressed.toString("utf-8");
  } else {
    throw new Error(`Unsupported ZIP compression method: ${compressionMethod}`);
  }
}

/** Parse a single GDELT CSV row (tab-separated) into a ConflictEvent or null */
function parseRow(line: string): ConflictEvent | null {
  const cols = line.split("\t");
  if (cols.length < 61) return null;

  const rootCode = cols[COL.EventRootCode]?.trim();
  if (!rootCode || !CONFLICT_ROOT_CODES.has(rootCode)) return null;

  const lat = parseFloat(cols[COL.ActionGeo_Lat]);
  const lon = parseFloat(cols[COL.ActionGeo_Long]);
  if (isNaN(lat) || isNaN(lon) || (lat === 0 && lon === 0)) return null;

  const goldstein = parseFloat(cols[COL.GoldsteinScale]);
  const numSources = parseInt(cols[COL.NumSources]) || 0;
  const avgTone = parseFloat(cols[COL.AvgTone]) || 0;

  // Quality filter: require multiple sources OR very negative tone
  // Single-source events are often GDELT misclassifications (e.g., goat articles → "Fight")
  if (numSources < 2 && avgTone > -3) return null;

  return {
    id: cols[COL.GLOBALEVENTID]?.trim() || "",
    latitude: lat,
    longitude: lon,
    eventCode: cols[COL.EventCode]?.trim() || rootCode,
    eventType: EVENT_TYPE_LABELS[rootCode] || "Unknown",
    goldsteinScale: isNaN(goldstein) ? 0 : goldstein,
    actor1: cols[COL.Actor1Name]?.trim() || "",
    actor2: cols[COL.Actor2Name]?.trim() || "",
    country: cols[COL.ActionGeo_CountryCode]?.trim() || "",
    sourceUrl: cols[COL.SOURCEURL]?.trim() || "",
    dateAdded: Date.now(),
  };
}

/** Fetch and process the latest GDELT export */
async function fetchLatest(): Promise<void> {
  try {
    // 1. Get the latest file URL
    const updateRes = await fetch(LASTUPDATE_URL);
    if (!updateRes.ok) {
      console.warn("[GDELT] Failed to fetch lastupdate.txt:", updateRes.status);
      return;
    }

    const updateText = await updateRes.text();
    const lines = updateText.trim().split("\n");
    // First line is the export CSV zip
    const exportLine = lines.find((l) => l.includes(".export.CSV.zip"));
    if (!exportLine) {
      console.warn("[GDELT] No export CSV URL found in lastupdate.txt");
      return;
    }

    const csvUrl = exportLine.split(/\s+/).pop();
    if (!csvUrl) return;

    // 2. Download the ZIP file
    console.log(`[GDELT] Fetching ${csvUrl}`);
    const zipRes = await fetch(csvUrl);
    if (!zipRes.ok) {
      console.warn("[GDELT] Failed to download CSV zip:", zipRes.status);
      return;
    }

    const zipBuffer = Buffer.from(await zipRes.arrayBuffer());

    // 3. Extract CSV from ZIP
    const csvText = extractFirstFileFromZip(zipBuffer);

    // 4. Parse and filter conflict events
    const csvLines = csvText.split("\n");
    let added = 0;
    for (const line of csvLines) {
      if (!line.trim()) continue;
      const event = parseRow(line);
      if (event && event.id) {
        eventMap.set(event.id, event);
        added++;
      }
    }

    // 5. Remove stale events (older than 24h)
    const cutoff = Date.now() - STALE_MS;
    for (const [id, ev] of eventMap) {
      if (ev.dateAdded < cutoff) eventMap.delete(id);
    }

    console.log(
      `[GDELT] Processed: ${added} conflict events from ${csvLines.length} rows. Total cached: ${eventMap.size}`,
    );
  } catch (err) {
    console.warn("[GDELT] Fetch error:", err);
  }
}

/** Get current conflict events (sorted by severity) */
export function getConflicts(): object[] {
  return Array.from(eventMap.values())
    .sort((a, b) => a.goldsteinScale - b.goldsteinScale) // Most severe first (more negative)
    .slice(0, MAX_EVENTS);
}

/** Start the GDELT collector. Call once on server startup. */
export function startConflictCollector(): void {
  console.log("[GDELT] Starting conflict data collector (15-min refresh)");
  fetchLatest();
  refreshTimer = setInterval(fetchLatest, REFRESH_MS);
}

/** Stop the collector (for cleanup) */
export function stopConflictCollector(): void {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}
