import { useEffect, useRef, useState, useCallback } from "react";
import {
  Viewer as CesiumViewer,
  Cartesian3,
  ScreenSpaceEventType,
  ScreenSpaceEventHandler,
  defined,
  Math as CesiumMath,
} from "cesium";
import { configureCesium, loadGoogleTileset } from "@/lib/cesium-config";
import { DEFAULT_CAMERA } from "@/lib/constants";
import { useFlightData } from "@/hooks/useFlightData";
import { useSatelliteData } from "@/hooks/useSatelliteData";
import { useEarthquakeData } from "@/hooks/useEarthquakeData";
import { useAISData } from "@/hooks/useAISData";
import { useFireData } from "@/hooks/useFireData";
import { useWeatherData } from "@/hooks/useWeatherData";
import { useConflictData } from "@/hooks/useConflictData";
import { useNewsData } from "@/hooks/useNewsData";
import { useAlerts } from "@/hooks/useAlerts";
import { useFilterMode } from "@/hooks/useFilterMode";
import { FilterPipeline } from "@/filters/FilterPipeline";
import { FlightLayer } from "@/layers/FlightLayer";
import { SatelliteLayer } from "@/layers/SatelliteLayer";
import { GridOverlay } from "@/layers/GridOverlay";
import { EarthquakeLayer } from "@/layers/EarthquakeLayer";
import { ShipLayer } from "@/layers/ShipLayer";
import { FireLayer } from "@/layers/FireLayer";
import { WeatherLayer } from "@/layers/WeatherLayer";
import { ConflictLayer } from "@/layers/ConflictLayer";
import { Crosshair } from "@/components/hud/Crosshair";
import { DataReadout } from "@/components/hud/DataReadout";
import { StatusBar } from "@/components/hud/StatusBar";
import { LayerPanel } from "@/components/panels/LayerPanel";
import type { LayerState } from "@/components/panels/LayerPanel";
import { FilterPanel } from "@/components/panels/FilterPanel";
import { SearchPanel } from "@/components/panels/SearchPanel";
import { FlightDetailPanel } from "@/components/panels/FlightDetailPanel";
import { SatDetailPanel } from "@/components/panels/SatDetailPanel";
import { QuakeDetailPanel } from "@/components/panels/QuakeDetailPanel";
import { ShipDetailPanel } from "@/components/panels/ShipDetailPanel";
import { FireDetailPanel } from "@/components/panels/FireDetailPanel";
import { WeatherDetailPanel } from "@/components/panels/WeatherDetailPanel";
import { ConflictDetailPanel } from "@/components/panels/ConflictDetailPanel";
import { NewsFeedPanel } from "@/components/panels/NewsFeedPanel";
import { AIBriefPanel } from "@/components/panels/AIBriefPanel";
import { AlertToast } from "@/components/alerts/AlertToast";
import type { Aircraft } from "@/types/opensky";
import type { Satellite } from "@/types/celestrak";
import type { Earthquake } from "@/types/usgs";
import type { Vessel } from "@/types/ais";
import type { FireHotspot } from "@/types/firms";
import type { WeatherAlert } from "@/types/nws";
import type { ConflictEvent } from "@/types/gdelt";

configureCesium();

export function GlobeViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<CesiumViewer | null>(null);
  const [viewer, setViewer] = useState<CesiumViewer | null>(null);

  const [layers, setLayers] = useState<LayerState>({
    flights: true,
    satellites: true,
    grid: false,
    earthquakes: false,
    ships: false,
    fires: false,
    weather: false,
    conflicts: false,
  });

  const { mode: filterMode, setMode: setFilterMode } = useFilterMode();
  const flightData = useFlightData(layers.flights);
  const satData = useSatelliteData(layers.satellites);
  const quakeData = useEarthquakeData(layers.earthquakes);
  const aisData = useAISData(layers.ships);
  const fireData = useFireData(layers.fires);
  const weatherData = useWeatherData(layers.weather);
  const conflictData = useConflictData(layers.conflicts);
  const newsData = useNewsData(true);

  const { alerts, dismiss: dismissAlert } = useAlerts({
    earthquakes: quakeData.earthquakes,
    conflicts: conflictData.conflicts,
    weatherAlerts: weatherData.alerts,
    news: newsData.headlines,
  });

  const [selectedFlight, setSelectedFlight] = useState<Aircraft | null>(null);
  const [selectedSat, setSelectedSat] = useState<Satellite | null>(null);
  const [selectedQuake, setSelectedQuake] = useState<Earthquake | null>(null);
  const [selectedShip, setSelectedShip] = useState<Vessel | null>(null);
  const [selectedFire, setSelectedFire] = useState<FireHotspot | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<WeatherAlert | null>(null);
  const [selectedConflict, setSelectedConflict] = useState<ConflictEvent | null>(null);

  // Clear all detail panels except the given type
  const clearSelections = useCallback((except?: string) => {
    if (except !== "flight") setSelectedFlight(null);
    if (except !== "sat") setSelectedSat(null);
    if (except !== "quake") setSelectedQuake(null);
    if (except !== "ship") setSelectedShip(null);
    if (except !== "fire") setSelectedFire(null);
    if (except !== "alert") setSelectedAlert(null);
    if (except !== "conflict") setSelectedConflict(null);
  }, []);

  // Initialize Cesium viewer
  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return;

    const v = new CesiumViewer(containerRef.current, {
      animation: false,
      baseLayerPicker: false,
      fullscreenButton: false,
      vrButton: false,
      geocoder: false,
      homeButton: false,
      infoBox: false,
      sceneModePicker: false,
      selectionIndicator: false,
      timeline: false,
      navigationHelpButton: false,
      creditContainer: document.createElement("div"),
      msaaSamples: 4,
    });

    v.camera.flyTo({
      destination: Cartesian3.fromDegrees(
        DEFAULT_CAMERA.longitude,
        DEFAULT_CAMERA.latitude,
        DEFAULT_CAMERA.height,
      ),
      duration: 0,
    });

    loadGoogleTileset().then((tileset) => {
      if (tileset && !v.isDestroyed()) {
        v.scene.primitives.add(tileset);
      }
    });

    v.scene.globe.depthTestAgainstTerrain = false;

    viewerRef.current = v;
    setViewer(v);

    return () => {
      if (!v.isDestroyed()) {
        v.destroy();
      }
      viewerRef.current = null;
    };
  }, []);

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

  // Entity click handler
  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return;

    const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction(
      (click: { position: import("cesium").Cartesian2 }) => {
        const picked = viewer.scene.pick(click.position);
        if (defined(picked) && picked.id) {
          const entity = picked.id;
          const id = typeof entity.id === "string" ? entity.id : "";

          if (id.startsWith("flight-")) {
            const icao = id.replace("flight-", "");
            const ac = flightData.aircraft.get(icao);
            if (ac) {
              clearSelections("flight");
              setSelectedFlight(ac);
            }
          } else if (id.startsWith("sat-")) {
            const noradStr = id.replace("sat-", "");
            const sat = satData.satellites.find(
              (s) => String(s.noradId) === noradStr,
            );
            if (sat) {
              clearSelections("sat");
              setSelectedSat(sat);
            }
          } else if (id.startsWith("quake-")) {
            const qId = id.replace("quake-", "");
            const quake = quakeData.earthquakes.find((q) => q.id === qId);
            if (quake) {
              clearSelections("quake");
              setSelectedQuake(quake);
            }
          } else if (id.startsWith("ship-")) {
            const mmsi = Number(id.replace("ship-", ""));
            const ship = aisData.vessels.find((v) => v.mmsi === mmsi);
            if (ship) {
              clearSelections("ship");
              setSelectedShip(ship);
            }
          } else if (id.startsWith("fire-")) {
            const idx = Number(id.replace("fire-", ""));
            const fire = fireData.fires[idx];
            if (fire) {
              clearSelections("fire");
              setSelectedFire(fire);
            }
          } else if (id.startsWith("wx-")) {
            const wxId = id.replace("wx-", "");
            const alert = weatherData.alerts.find((a) => a.id === wxId);
            if (alert) {
              clearSelections("alert");
              setSelectedAlert(alert);
            }
          } else if (id.startsWith("conflict-")) {
            const cId = id.replace("conflict-", "");
            const conflict = conflictData.conflicts.find((c) => c.id === cId);
            if (conflict) {
              clearSelections("conflict");
              setSelectedConflict(conflict);
            }
          }
        }
      },
      ScreenSpaceEventType.LEFT_CLICK,
    );

    return () => {
      if (!handler.isDestroyed()) handler.destroy();
    };
  }, [viewer, flightData.aircraft, satData.satellites, quakeData.earthquakes, aisData.vessels, fireData.fires, weatherData.alerts, conflictData.conflicts, clearSelections]);

  const toggleLayer = useCallback((layer: keyof LayerState) => {
    setLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  }, []);

  const aiDataSummary = {
    flights: flightData.count,
    satellites: satData.count,
    earthquakes: {
      count: quakeData.count,
      maxMag: quakeData.earthquakes.reduce((max, q) => Math.max(max, q.magnitude), 0),
      locations: quakeData.earthquakes
        .filter((q) => q.magnitude >= 5)
        .map((q) => q.place || "Unknown")
        .slice(0, 3),
    },
    conflicts: {
      count: conflictData.count,
      topRegions: [...new Set(conflictData.conflicts.map((c) => c.country))].slice(0, 5),
    },
    weather: {
      count: weatherData.count,
      severeCount: weatherData.alerts.filter((a) => a.severity === "Extreme" || a.severity === "Severe").length,
    },
    fires: fireData.count,
    ships: aisData.count,
  };

  const feeds = [
    { label: "FLIGHTS", active: flightData.count > 0, error: !!flightData.error },
    { label: "SATS", active: satData.count > 0, error: !!satData.error },
    { label: "QUAKES", active: quakeData.count > 0, error: !!quakeData.error },
    { label: "SHIPS", active: aisData.count > 0, error: !!aisData.error },
    { label: "FIRES", active: fireData.count > 0, error: !!fireData.error },
    { label: "WX", active: weatherData.count > 0, error: false },
    { label: "CONFLICTS", active: conflictData.count > 0, error: !!conflictData.error },
    { label: "NEWS", active: newsData.count > 0, error: !!newsData.error },
  ];

  const hasDetailOpen = selectedFlight || selectedSat || selectedQuake || selectedShip || selectedFire || selectedAlert || selectedConflict;

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      {/* Cesium container */}
      <div
        ref={containerRef}
        style={{ width: "100%", height: "100%" }}
      />

      {/* Layers */}
      {layers.flights && (
        <FlightLayer
          aircraft={flightData.aircraftList}
          onSelect={setSelectedFlight}
          viewer={viewer}
        />
      )}
      {layers.satellites && (
        <SatelliteLayer
          satellites={satData.satellites}
          viewer={viewer}
        />
      )}
      <GridOverlay viewer={viewer} enabled={layers.grid} />
      {layers.earthquakes && (
        <EarthquakeLayer earthquakes={quakeData.earthquakes} viewer={viewer} />
      )}
      {layers.ships && (
        <ShipLayer vessels={aisData.vessels} viewer={viewer} />
      )}
      {layers.fires && (
        <FireLayer fires={fireData.fires} viewer={viewer} />
      )}
      {layers.weather && (
        <WeatherLayer alerts={weatherData.alerts} viewer={viewer} />
      )}
      {layers.conflicts && (
        <ConflictLayer conflicts={conflictData.conflicts} viewer={viewer} />
      )}

      {/* Filter pipeline */}
      <FilterPipeline viewer={viewer} mode={filterMode} />

      {/* HUD overlay */}
      <div className="hud-overlay">
        <StatusBar feeds={feeds} filterMode={filterMode} />
        <Crosshair />
        <DataReadout
          viewer={viewer}
          filterMode={filterMode}
          flightCount={flightData.count}
          satelliteCount={satData.count}
        />

        {/* Panels */}
        <LayerPanel layers={layers} onToggle={toggleLayer} />
        <FilterPanel mode={filterMode} onChange={setFilterMode} />
        <SearchPanel
          viewer={viewer}
          aircraft={flightData.aircraftList}
          satellites={satData.satellites}
        />

        {/* Detail panels */}
        <FlightDetailPanel
          aircraft={selectedFlight}
          onClose={() => setSelectedFlight(null)}
        />
        <SatDetailPanel
          satellite={selectedSat}
          onClose={() => setSelectedSat(null)}
        />
        <QuakeDetailPanel
          earthquake={selectedQuake}
          onClose={() => setSelectedQuake(null)}
        />
        <ShipDetailPanel
          vessel={selectedShip}
          onClose={() => setSelectedShip(null)}
        />
        <FireDetailPanel
          fire={selectedFire}
          onClose={() => setSelectedFire(null)}
        />
        <WeatherDetailPanel
          alert={selectedAlert}
          onClose={() => setSelectedAlert(null)}
        />
        <ConflictDetailPanel
          conflict={selectedConflict}
          onClose={() => setSelectedConflict(null)}
        />

        {/* Intelligence panels */}
        <NewsFeedPanel
          headlines={newsData.headlines}
          count={newsData.count}
          loading={newsData.loading}
          viewer={viewer}
        />
        <AIBriefPanel dataSummary={aiDataSummary} />
        <AlertToast alerts={alerts} onDismiss={dismissAlert} viewer={viewer} />
      </div>

      {/* Keyboard shortcut hints */}
      <div
        style={{
          position: "absolute",
          bottom: 16,
          right: 16,
          fontSize: 9,
          color: "var(--color-text-dim)",
          textAlign: "right",
          lineHeight: 1.6,
          pointerEvents: "none",
          display: hasDetailOpen ? "none" : "block",
        }}
      >
        <div>[0] Standard [1] CRT [2] NVG [3] FLIR [4] Cel</div>
      </div>
    </div>
  );
}
