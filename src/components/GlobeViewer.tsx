import { useEffect, useRef, useState, useCallback } from "react";
import {
  Viewer as CesiumViewer,
  Cartesian3,
  ScreenSpaceEventType,
  ScreenSpaceEventHandler,
  defined,
} from "cesium";
import { configureCesium, loadGoogleTileset } from "@/lib/cesium-config";
import { DEFAULT_CAMERA } from "@/lib/constants";
import { useFlightData } from "@/hooks/useFlightData";
import { useSatelliteData } from "@/hooks/useSatelliteData";
import { useFilterMode } from "@/hooks/useFilterMode";
import { FilterPipeline } from "@/filters/FilterPipeline";
import { FlightLayer } from "@/layers/FlightLayer";
import { SatelliteLayer } from "@/layers/SatelliteLayer";
import { GridOverlay } from "@/layers/GridOverlay";
import { Crosshair } from "@/components/hud/Crosshair";
import { DataReadout } from "@/components/hud/DataReadout";
import { StatusBar } from "@/components/hud/StatusBar";
import { LayerPanel } from "@/components/panels/LayerPanel";
import { FilterPanel } from "@/components/panels/FilterPanel";
import { SearchPanel } from "@/components/panels/SearchPanel";
import { FlightDetailPanel } from "@/components/panels/FlightDetailPanel";
import { SatDetailPanel } from "@/components/panels/SatDetailPanel";
import type { Aircraft } from "@/types/opensky";
import type { Satellite } from "@/types/celestrak";

configureCesium();

interface LayerState {
  flights: boolean;
  satellites: boolean;
  grid: boolean;
}

export function GlobeViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<CesiumViewer | null>(null);
  const [viewer, setViewer] = useState<CesiumViewer | null>(null);

  const [layers, setLayers] = useState<LayerState>({
    flights: true,
    satellites: true,
    grid: false,
  });

  const { mode: filterMode, setMode: setFilterMode } = useFilterMode();
  const flightData = useFlightData(layers.flights);
  const satData = useSatelliteData(layers.satellites);

  const [selectedFlight, setSelectedFlight] = useState<Aircraft | null>(null);
  const [selectedSat, setSelectedSat] = useState<Satellite | null>(null);

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

    // Fly to Lisbon
    v.camera.flyTo({
      destination: Cartesian3.fromDegrees(
        DEFAULT_CAMERA.longitude,
        DEFAULT_CAMERA.latitude,
        DEFAULT_CAMERA.height,
      ),
      duration: 0,
    });

    // Load Google 3D Tiles
    loadGoogleTileset().then((tileset) => {
      if (tileset && !v.isDestroyed()) {
        v.scene.primitives.add(tileset);
      }
    });

    // Enable depth testing against terrain
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
              setSelectedFlight(ac);
              setSelectedSat(null);
            }
          } else if (id.startsWith("sat-")) {
            const noradStr = id.replace("sat-", "");
            const sat = satData.satellites.find(
              (s) => String(s.noradId) === noradStr,
            );
            if (sat) {
              setSelectedSat(sat);
              setSelectedFlight(null);
            }
          }
        }
      },
      ScreenSpaceEventType.LEFT_CLICK,
    );

    return () => {
      if (!handler.isDestroyed()) handler.destroy();
    };
  }, [viewer, flightData.aircraft, satData.satellites]);

  const toggleLayer = useCallback((layer: keyof LayerState) => {
    setLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  }, []);

  const feeds = [
    { label: "FLIGHTS", active: flightData.count > 0, error: !!flightData.error },
    { label: "SATS", active: satData.count > 0, error: !!satData.error },
  ];

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      {/* Cesium container */}
      <div
        ref={containerRef}
        style={{ width: "100%", height: "100%" }}
      />

      {/* Layers */}
      <FlightLayer
        aircraft={flightData.aircraftList}
        onSelect={setSelectedFlight}
        viewer={viewer}
      />
      <SatelliteLayer
        satellites={satData.satellites}
        viewer={viewer}
      />
      <GridOverlay viewer={viewer} enabled={layers.grid} />

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
          display: selectedFlight || selectedSat ? "none" : "block",
        }}
      >
        <div>[0] Standard [1] CRT [2] NVG [3] FLIR [4] Cel</div>
      </div>
    </div>
  );
}
