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
