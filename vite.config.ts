import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import cesium from "vite-plugin-cesium";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";
import { startCollector, getVessels, getSource } from "./server/ais-collector.ts";
import { startConflictCollector, getConflicts } from "./server/gdelt-collector.ts";
import { startMeteoAlarmCollector, getMeteoAlerts } from "./server/meteoalarm-collector.ts";
import { startRSSCollector, getNews } from "./server/rss-collector.ts";
import { generateBrief } from "./server/ai-handler.ts";

/**
 * Vite plugin: AIS data collector.
 * Starts an AISStream WebSocket on the server side, serves vessels via /api/ais.
 * Falls back to Digitraffic REST API when AISStream has no data.
 */
function aisCollectorPlugin(): Plugin {
  return {
    name: "ais-collector",
    configureServer(server) {
      // Load env vars from .env file (Vite doesn't put VITE_* into process.env)
      const env = loadEnv("development", process.cwd(), "VITE_");
      startCollector(env.VITE_AISSTREAM_API_KEY);

      // Also load non-VITE_ env vars for server-side handlers (AI keys, etc.)
      const serverEnv = loadEnv("development", process.cwd(), "");
      if (serverEnv.GROQ_API_KEY) process.env.GROQ_API_KEY = serverEnv.GROQ_API_KEY;
      if (serverEnv.OPENROUTER_API_KEY) process.env.OPENROUTER_API_KEY = serverEnv.OPENROUTER_API_KEY;

      // Register middleware SYNCHRONOUSLY so it runs before Vite's SPA fallback
      server.middlewares.use("/api/ais/vessel", async (req, res) => {
        const mmsi = req.url?.replace(/^\//, "") || "";
        if (!mmsi) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: "mmsi required" }));
          return;
        }
        try {
          const r = await fetch(
            `https://meri.digitraffic.fi/api/ais/v1/vessels/${mmsi}`,
            { headers: { "Accept-Encoding": "gzip" } },
          );
          const data = await r.text();
          res.writeHead(r.status, { "Content-Type": "application/json" });
          res.end(data);
        } catch {
          res.writeHead(502);
          res.end(JSON.stringify({ error: "upstream failed" }));
        }
      });

      server.middlewares.use("/api/ais", async (_req, res) => {
        const vessels = await getVessels();
        res.writeHead(200, {
          "Content-Type": "application/json",
          "X-AIS-Source": getSource(),
        });
        res.end(JSON.stringify(vessels));
      });

      // Start GDELT conflict collector
      startConflictCollector();

      server.middlewares.use("/api/conflicts", (_req, res) => {
        const conflicts = getConflicts();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(conflicts));
      });

      // Start MeteoAlarm European weather collector
      startMeteoAlarmCollector();

      server.middlewares.use("/api/weather-eu", (_req, res) => {
        const alerts = getMeteoAlerts();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(alerts));
      });

      // Start RSS news collector
      startRSSCollector();

      server.middlewares.use("/api/news", (_req, res) => {
        const news = getNews();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(news));
      });

      // AI situational brief (Groq primary, OpenRouter fallback)
      server.middlewares.use("/api/ai/brief", async (req, res) => {
        if (req.method !== "POST") {
          res.writeHead(405);
          res.end(JSON.stringify({ error: "POST only" }));
          return;
        }
        let body = "";
        req.on("data", (chunk: Buffer) => {
          body += chunk.toString();
        });
        req.on("end", async () => {
          try {
            const data = JSON.parse(body);
            const brief = await generateBrief(data);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({ brief, timestamp: new Date().toISOString() }),
            );
          } catch {
            res.writeHead(500);
            res.end(JSON.stringify({ error: "Brief generation failed" }));
          }
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), cesium(), tailwindcss(), aisCollectorPlugin()],
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
      "/api/celestrak": {
        target: "https://celestrak.org",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/celestrak/, "/NORAD/elements/gp.php"),
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
        rewrite: () =>
          "/data/active_fire/suomi-npp-viirs-c2/csv/SUOMI_VIIRS_C2_Global_24h.csv",
      },
      "/api/weather": {
        target: "https://api.weather.gov",
        changeOrigin: true,
        rewrite: () => "/alerts/active",
        headers: { "User-Agent": "WorldView/0.1 (github.com/imparpaulo01/worldview)" },
      },
    },
  },
  build: {
    target: "es2020",
  },
});
