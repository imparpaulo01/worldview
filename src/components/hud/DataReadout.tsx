import { useState, useEffect } from "react";
import { Math as CesiumMath } from "cesium";
import { formatCoord, formatAltitude, utcTimeString } from "@/lib/utils";
import { FILTER_LABELS } from "@/lib/constants";
import type { FilterMode } from "@/lib/constants";

interface DataReadoutProps {
  viewer: import("cesium").Viewer | null;
  filterMode: FilterMode;
  flightCount: number;
  satelliteCount: number;
}

export function DataReadout({
  viewer,
  filterMode,
  flightCount,
  satelliteCount,
}: DataReadoutProps) {
  const [camera, setCamera] = useState({
    lat: 0,
    lon: 0,
    alt: 0,
  });
  const [time, setTime] = useState(utcTimeString());
  const [fps, setFps] = useState(60);

  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return;

    let frameCount = 0;
    let lastTime = performance.now();

    const onTick = () => {
      if (viewer.isDestroyed()) return;

      const cam = viewer.camera;
      const carto = cam.positionCartographic;
      setCamera({
        lat: CesiumMath.toDegrees(carto.latitude),
        lon: CesiumMath.toDegrees(carto.longitude),
        alt: carto.height,
      });

      setTime(utcTimeString());

      // FPS calculation
      frameCount++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        setFps(frameCount);
        frameCount = 0;
        lastTime = now;
      }
    };

    viewer.scene.postRender.addEventListener(onTick);
    return () => {
      if (!viewer.isDestroyed()) {
        viewer.scene.postRender.removeEventListener(onTick);
      }
    };
  }, [viewer]);

  return (
    <div className="data-readout">
      <div>LAT {formatCoord(camera.lat)}&deg;</div>
      <div>LON {formatCoord(camera.lon)}&deg;</div>
      <div>ALT {formatAltitude(camera.alt)}</div>
      <div style={{ marginTop: 4 }}>UTC {time}</div>
      <div>FPS {fps}</div>
      <div style={{ marginTop: 4, color: "var(--color-amber)" }}>
        FILTER: {FILTER_LABELS[filterMode]}
      </div>
      <div style={{ marginTop: 4 }}>
        <span style={{ color: "var(--color-green)" }}>
          AC: {flightCount}
        </span>
        {" | "}
        <span style={{ color: "var(--color-amber)" }}>
          SAT: {satelliteCount}
        </span>
      </div>
    </div>
  );
}
