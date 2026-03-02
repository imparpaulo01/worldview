/**
 * AIS Data Collector — connects to AISStream.io WebSocket and accumulates vessel positions.
 * Falls back to Digitraffic REST API when AISStream has no data.
 *
 * Used by both: Vite dev server plugin + Express production proxy.
 */

const WS_URL = "wss://stream.aisstream.io/v0/stream";
const DIGITRAFFIC_URL = "https://meri.digitraffic.fi/api/ais/v1/locations";
const DIGITRAFFIC_VESSELS_URL = "https://meri.digitraffic.fi/api/ais/v1/vessels";
const STALE_MS = 10 * 60_000; // Remove vessels not updated in 10 min
const MAX_SHIPS = 500;

interface TrackedVessel {
  mmsi: number;
  name: string;
  latitude: number;
  longitude: number;
  cog: number;
  sog: number;
  heading: number;
  shipType: number;
  destination: string;
  lastUpdate: number;
}

// Accumulated state
const vesselMap = new Map<number, TrackedVessel>();
let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let wsConnected = false;
let lastDigitrafficFetch = 0;
let digitrafficCache: TrackedVessel[] = [];
let vesselNameMap = new Map<number, { name: string; shipType: number; destination: string }>();
let lastNameFetch = 0;

function connect(apiKey: string) {
  if (ws || !apiKey) return;

  try {
    ws = new WebSocket(WS_URL);
  } catch {
    scheduleReconnect(apiKey);
    return;
  }

  const timeout = setTimeout(() => {
    // If not connected within 10s, give up and reconnect later
    if (!wsConnected) {
      console.log("[AIS] WebSocket handshake timeout — will retry");
      ws?.close();
    }
  }, 10_000);

  ws.onopen = () => {
    clearTimeout(timeout);
    wsConnected = true;
    console.log("[AIS] WebSocket connected to AISStream — subscribing to global feed");
    ws!.send(
      JSON.stringify({
        APIKey: apiKey,
        BoundingBoxes: [[[-90, -180], [90, 180]]],
        FilterMessageTypes: ["PositionReport", "ShipStaticData"],
      }),
    );
  };

  ws.onmessage = (event: MessageEvent) => {
    try {
      handleMessage(JSON.parse(String(event.data)));
    } catch {
      // Ignore malformed messages
    }
  };

  ws.onclose = () => {
    clearTimeout(timeout);
    ws = null;
    wsConnected = false;
    scheduleReconnect(apiKey);
  };

  ws.onerror = () => {
    clearTimeout(timeout);
    // Don't call ws.close() here — it can trigger another error event
    // causing infinite recursion on Node 22's native WebSocket.
    // The onclose handler will fire automatically after onerror.
    ws = null;
    wsConnected = false;
    scheduleReconnect(apiKey);
  };
}

function scheduleReconnect(apiKey: string) {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect(apiKey);
  }, 30_000); // Retry every 30s (not 5s, to be gentle on a flaky service)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function handleMessage(data: any) {
  const { MessageType, MetaData, Message } = data;
  if (!MetaData?.MMSI) return;

  const mmsi = MetaData.MMSI;
  const now = Date.now();

  if (MessageType === "PositionReport") {
    const pos = Message.PositionReport;
    const existing = vesselMap.get(mmsi);
    const rawHeading = pos.TrueHeading ?? 511;
    const cog = pos.Cog ?? 0;

    vesselMap.set(mmsi, {
      mmsi,
      name: MetaData.ShipName?.trim() || existing?.name || "UNKNOWN",
      latitude: pos.Latitude,
      longitude: pos.Longitude,
      cog,
      sog: pos.Sog ?? 0,
      heading: rawHeading === 511 ? cog : rawHeading,
      shipType: existing?.shipType ?? 0,
      destination: existing?.destination ?? "",
      lastUpdate: now,
    });
  } else if (MessageType === "ShipStaticData") {
    const sd = Message.ShipStaticData;
    const existing = vesselMap.get(mmsi);
    if (existing) {
      existing.name = sd.Name?.trim() || existing.name;
      existing.shipType = sd.Type ?? existing.shipType;
      existing.destination = sd.Destination?.trim() || existing.destination;
      existing.lastUpdate = now;
    }
  }
}

function cleanStale() {
  const cutoff = Date.now() - STALE_MS;
  for (const [mmsi, v] of vesselMap) {
    if (v.lastUpdate < cutoff) vesselMap.delete(mmsi);
  }
}

/** Fetch vessel names from Digitraffic (cached 10 min) */
async function fetchVesselNames(): Promise<void> {
  const now = Date.now();
  if (now - lastNameFetch < 600_000 && vesselNameMap.size > 0) return;

  try {
    const r = await fetch(DIGITRAFFIC_VESSELS_URL, {
      headers: { "Accept-Encoding": "gzip" },
    });
    if (!r.ok) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vessels: any[] = await r.json();
    const newMap = new Map<number, { name: string; shipType: number; destination: string }>();
    for (const v of vessels) {
      if (v.mmsi) {
        newMap.set(v.mmsi, {
          name: v.name?.trim() || "",
          shipType: v.shipType ?? 0,
          destination: v.destination?.trim() || "",
        });
      }
    }
    vesselNameMap = newMap;
    lastNameFetch = now;
    console.log(`[AIS] Loaded ${newMap.size} vessel names from Digitraffic`);
  } catch {
    // Keep existing cache on error
  }
}

/** Fetch from Digitraffic REST API as fallback (cached 30s) */
async function fetchDigitraffic(): Promise<TrackedVessel[]> {
  const now = Date.now();
  if (now - lastDigitrafficFetch < 30_000 && digitrafficCache.length > 0) {
    return digitrafficCache;
  }

  // Ensure vessel names are loaded
  await fetchVesselNames();

  try {
    const r = await fetch(DIGITRAFFIC_URL, {
      headers: { "Accept-Encoding": "gzip" },
    });
    if (!r.ok) return digitrafficCache;

    const geo = await r.json();
    const features: unknown[] = geo?.features ?? [];
    const vessels: TrackedVessel[] = [];

    for (const f of features) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const feat = f as any;
      const props = feat.properties;
      const [lon, lat] = feat.geometry?.coordinates ?? [0, 0];
      const sog: number = props?.sog ?? 0;
      if (sog < 0.5) continue;

      const rawHeading: number = props?.heading ?? 511;
      const cog: number = props?.cog ?? 0;
      const mmsi: number = props?.mmsi ?? 0;
      const meta = vesselNameMap.get(mmsi);

      vessels.push({
        mmsi,
        name: meta?.name || "UNKNOWN",
        latitude: lat,
        longitude: lon,
        cog,
        sog,
        heading: rawHeading === 511 ? cog : rawHeading,
        shipType: meta?.shipType ?? 0,
        destination: meta?.destination ?? "",
        lastUpdate: now,
      });

      if (vessels.length >= MAX_SHIPS) break;
    }

    digitrafficCache = vessels;
    lastDigitrafficFetch = now;
    return vessels;
  } catch {
    return digitrafficCache;
  }
}

/**
 * Get current vessel list. Uses AISStream data if available (global),
 * falls back to Digitraffic (Baltic).
 */
export async function getVessels(): Promise<object[]> {
  cleanStale();

  // If AISStream has accumulated enough data, use it
  const aisVessels = Array.from(vesselMap.values()).filter((v) => v.sog > 0.5);
  if (aisVessels.length >= 50) {
    return aisVessels
      .slice(0, MAX_SHIPS)
      .map(({ lastUpdate: _, ...v }) => v);
  }

  // Otherwise fall back to Digitraffic
  const fallback = await fetchDigitraffic();
  return fallback
    .slice(0, MAX_SHIPS)
    .map(({ lastUpdate: _, ...v }) => v);
}

/** Start the collector. Call once on server startup. */
export function startCollector(apiKey: string | undefined) {
  if (!apiKey) {
    console.log("[AIS] No VITE_AISSTREAM_API_KEY — using Digitraffic fallback only");
    return;
  }
  console.log("[AIS] Starting AISStream collector (Digitraffic fallback active)");
  connect(apiKey);
}

/** Get the current data source being used */
export function getSource(): string {
  const aisCount = Array.from(vesselMap.values()).filter((v) => v.sog > 0.5).length;
  return aisCount >= 50 ? "aisstream" : "digitraffic";
}
