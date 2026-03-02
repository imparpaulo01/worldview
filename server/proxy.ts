import express from "express";
import { join } from "path";
import { startCollector, getVessels, getSource } from "./ais-collector.ts";
import { startConflictCollector, getConflicts } from "./gdelt-collector.ts";
import { startMeteoAlarmCollector, getMeteoAlerts } from "./meteoalarm-collector.ts";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Start AIS data collector (AISStream WebSocket + Digitraffic fallback)
startCollector(process.env.VITE_AISSTREAM_API_KEY);

// Start GDELT conflict data collector
startConflictCollector();

// Start MeteoAlarm European weather collector
startMeteoAlarmCollector();

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

// AIS vessel data (from collector — AISStream global + Digitraffic fallback)
app.get("/api/ais/vessel/:mmsi", async (req, res) => {
  try {
    const r = await fetch(`https://meri.digitraffic.fi/api/ais/v1/vessels/${req.params.mmsi}`, {
      headers: { "Accept-Encoding": "gzip" },
    });
    res.status(r.status).json(await r.json());
  } catch {
    res.status(502).json({ error: "upstream failed" });
  }
});

app.get("/api/ais", async (_req, res) => {
  const vessels = await getVessels();
  res.setHeader("X-AIS-Source", getSource());
  res.json(vessels);
});

// GDELT conflict data (from collector)
app.get("/api/conflicts", (_req, res) => {
  res.json(getConflicts());
});

// MeteoAlarm European weather alerts (from collector)
app.get("/api/weather-eu", (_req, res) => {
  res.json(getMeteoAlerts());
});

// SPA fallback
app.get("*", (_req, res) => {
  res.sendFile(join(import.meta.dirname, "../dist/index.html"));
});

app.listen(PORT, () => {
  console.log(`WorldView proxy running on port ${PORT}`);
});
