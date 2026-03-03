# WorldView — Geospatial Intelligence Dashboard

Real-time global situational awareness on a 3D globe. Built with React, CesiumJS, and Google Photorealistic 3D Tiles.

**Live:** [worldview.imparlabs.com](https://worldview.imparlabs.com)

---

## What It Does

WorldView aggregates 8 live data feeds onto an interactive 3D Earth, giving you a single-pane view of global activity — flights, satellites, earthquakes, ships, wildfires, weather alerts, armed conflicts, and breaking news.

---

## Features

### 3D Globe (Google Photorealistic 3D Tiles)

The entire Earth rendered in photorealistic 3D. Zoom into cities and see actual buildings, terrain, and geography. Powered by Google's 3D Tiles via CesiumJS.

- **Mouse controls:** Left-click drag to rotate, right-click drag to tilt, scroll to zoom
- **Click any entity** (plane, satellite, quake, ship, fire, etc.) to open its detail panel

### Data Layers (toggle ON/OFF in the Layers panel, top-right)

| Layer | Source | What You See |
|-------|--------|-------------|
| **Flights** | ADS-B Exchange (adsb.lol) | Live aircraft positions with callsigns. ~100-200 planes in your camera view. Click a plane for altitude, speed, heading, ICAO code. |
| **Satellites** | CelesTrak (NORAD) | ~190 satellites orbiting in real-time (ISS, Starlink, GPS, military). Yellow dots with names. Click for orbital details. |
| **Earthquakes** | USGS | All M2.5+ earthquakes in the last 24 hours. Red pulsing circles scaled by magnitude. Click for depth, location, time. |
| **Ships** | AISStream + Digitraffic | Vessel positions via AIS. Blue markers with MMSI. Click for vessel name, type, speed, destination. |
| **Fires** | NASA FIRMS (VIIRS) | Active fire hotspots worldwide in last 24h. Orange dots. Click for brightness, confidence, scan time. |
| **Weather** | NWS (US) + MeteoAlarm (Europe) | Active weather alerts. Colored polygons by severity. Click for alert type, description, affected area. |
| **Conflicts** | GDELT Global Event Database | Armed conflict events worldwide. Red triangles with skull icon. Shows wars, protests, military actions. Click for actors, event type, country. |
| **Grid** | Built-in | Latitude/longitude grid overlay for reference. |

### Command Panel (top-left, 3 tabs)

**SEARCH** — Type a callsign (e.g., "TAP"), NORAD satellite name, or vessel ID. Results appear instantly. Click to fly the camera to that entity.

**NEWS** — 50+ live headlines from 18 curated RSS feeds (NY Times, Al Jazeera, BBC, Reuters, Wired, The Register, etc.). Categorized:
- GEO (geopolitics), DEF (defense), EU (Europe), TECH (technology), DSTR (disasters)
- Filter by category using the buttons at the top
- Headlines with a recognized country show a **FLY TO** button that moves the camera there

**AI BRIEF** — Click **Generate** to produce an AI-powered global intelligence brief from all current dashboard data. Uses Groq (llama-3.3-70b) to analyze:
- Conflict events and their actors
- Earthquake magnitudes and locations
- Weather severity
- Fire hotspots
- Top news headlines

The brief follows an intelligence format: Priority Alerts, Global Hotspots, Monitoring, Assessment.

### Visual Filters (right panel)

Switch the globe rendering style with keyboard shortcuts or the Filters panel:

| Key | Filter | Effect |
|-----|--------|--------|
| `0` | Standard | Normal 3D view |
| `1` | CRT Scanlines | Retro green-screen monitor look |
| `2` | Night Vision | Green-tinted NVG effect |
| `3` | Thermal FLIR | Infrared heat-map style |
| `4` | Cel Shading | Cartoon/comic-book outline style |

### Breaking News Alerts (toast notifications)

When critical events are detected, toast notifications appear in the top-right:
- **Earthquakes** M5.0+ trigger an alert
- **Conflict events** with high Goldstein scale trigger alerts
- **Severe/Extreme weather** alerts are surfaced
- **Breaking news** headlines appear as they arrive

Click a toast to fly the camera to the event location. Toasts auto-dismiss after 15 seconds.

### HUD Overlay (bottom-left)

Always-visible readout showing:
- Current camera position (LAT/LON/ALT)
- UTC time
- FPS counter
- Active filter mode
- Entity counts (aircraft + satellites tracked)

### Status Bar (top center)

Shows live feed status for all 8 data sources. Green dot = active data, red dot = error, gray = no data.

---

## Quick Start (Local Development)

```bash
# Clone
git clone https://github.com/imparpaulo01/worldview.git
cd worldview

# Install
npm install

# Configure (get a free Cesium Ion token at cesium.com/ion)
cp .env.example .env
# Edit .env and add your VITE_CESIUM_ION_TOKEN

# Run
npm run dev
# Open http://localhost:5173
```

### Optional API Keys

| Key | Purpose | Where to Get |
|-----|---------|-------------|
| `VITE_CESIUM_ION_TOKEN` | **Required.** 3D globe tiles | [cesium.com/ion](https://cesium.com/ion) |
| `GROQ_API_KEY` | AI Brief (free) | [console.groq.com](https://console.groq.com) |
| `OPENROUTER_API_KEY` | AI Brief fallback | [openrouter.ai](https://openrouter.ai) |
| `VITE_AISSTREAM_API_KEY` | Real-time ship tracking | [aisstream.io](https://aisstream.io) |

Flights, satellites, earthquakes, fires, weather, conflicts, and news work without any API keys.

---

## Production Deployment

WorldView runs as a Docker container with an Express server that handles API proxying and data collection.

```bash
# Build and run
docker build --build-arg VITE_CESIUM_ION_TOKEN=your_token -t worldview .
docker run -p 3000:3000 \
  -e GROQ_API_KEY=your_key \
  -e OPENROUTER_API_KEY=your_key \
  -e VITE_AISSTREAM_API_KEY=your_key \
  worldview
```

The production server starts background collectors for AIS (WebSocket), GDELT conflicts, MeteoAlarm weather, and RSS news — all updating on intervals.

---

## Tech Stack

- **Frontend:** React 19, TypeScript, CesiumJS 1.124, Tailwind CSS 4
- **3D Tiles:** Google Photorealistic 3D Tiles (via Cesium Ion)
- **Server:** Express 5, Node.js 22
- **AI:** Groq API (llama-3.3-70b-versatile), OpenRouter fallback
- **Data feeds:** adsb.lol, CelesTrak, USGS, NASA FIRMS, NWS, MeteoAlarm, GDELT, 18 RSS feeds
- **Build:** Vite 6, Docker

---

Built by [ImparLabs](https://imparlabs.com)
