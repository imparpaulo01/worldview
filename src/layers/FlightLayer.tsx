import { useEffect } from "react";
import {
  Cartesian3,
  Cartesian2,
  Color,
  VerticalOrigin,
  HorizontalOrigin,
  NearFarScalar,
  DistanceDisplayCondition,
  Math as CesiumMath,
  LabelStyle,
} from "cesium";
import type { Aircraft } from "@/types/opensky";

interface FlightLayerProps {
  aircraft: Aircraft[];
  onSelect?: (aircraft: Aircraft) => void;
  viewer: import("cesium").Viewer | null;
}

// SVG airplane icon as data URI
const AIRPLANE_SVG = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32"><path d="M16 2 L14 12 L4 16 L14 18 L14 26 L11 28 L11 30 L16 28 L21 30 L21 28 L18 26 L18 18 L28 16 L18 12 Z" fill="#00ff41" stroke="#003300" stroke-width="0.5"/></svg>`)}`;

export function FlightLayer({ aircraft, viewer }: FlightLayerProps) {
  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return;

    try {
      // Collect IDs to remove first, then remove
      const idsToRemove: string[] = [];
      for (let i = 0; i < viewer.entities.values.length; i++) {
        const e = viewer.entities.values[i];
        if (e?.id?.startsWith("flight-")) {
          idsToRemove.push(e.id);
        }
      }
      for (const id of idsToRemove) {
        viewer.entities.removeById(id);
      }

      for (const ac of aircraft) {
        viewer.entities.add({
          id: `flight-${ac.icao24}`,
          position: Cartesian3.fromDegrees(
            ac.longitude,
            ac.latitude,
            ac.altitude,
          ),
          billboard: {
            image: AIRPLANE_SVG,
            width: 24,
            height: 24,
            rotation: CesiumMath.toRadians(-ac.heading),
            verticalOrigin: VerticalOrigin.CENTER,
            horizontalOrigin: HorizontalOrigin.CENTER,
            scaleByDistance: new NearFarScalar(1e4, 1.5, 1e7, 0.4),
            distanceDisplayCondition: new DistanceDisplayCondition(0, 2e7),
          },
          label: {
            text: ac.callsign,
            font: "10px JetBrains Mono",
            fillColor: Color.fromCssColorString("#00ff41"),
            outlineColor: Color.BLACK,
            outlineWidth: 2,
            style: LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: VerticalOrigin.BOTTOM,
            pixelOffset: new Cartesian2(0, -16),
            scaleByDistance: new NearFarScalar(1e4, 1.0, 5e6, 0.0),
            distanceDisplayCondition: new DistanceDisplayCondition(0, 5e6),
          },
        });
      }
    } catch (err) {
      console.warn("FlightLayer error:", err);
    }
  }, [aircraft, viewer]);

  return null;
}
