import { useEffect } from "react";
import {
  Cartesian3,
  Cartesian2,
  Color,
  VerticalOrigin,
  NearFarScalar,
  DistanceDisplayCondition,
  LabelStyle,
} from "cesium";
import type { Satellite } from "@/types/celestrak";

interface SatelliteLayerProps {
  satellites: Satellite[];
  viewer: import("cesium").Viewer | null;
}

export function SatelliteLayer({ satellites, viewer }: SatelliteLayerProps) {
  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return;

    try {
      // Collect IDs to remove first, then remove
      const idsToRemove: string[] = [];
      for (let i = 0; i < viewer.entities.values.length; i++) {
        const e = viewer.entities.values[i];
        if (e?.id?.startsWith("sat-")) {
          idsToRemove.push(e.id);
        }
      }
      for (const id of idsToRemove) {
        viewer.entities.removeById(id);
      }

      for (const sat of satellites) {
        viewer.entities.add({
          id: `sat-${sat.noradId}`,
          position: Cartesian3.fromDegrees(
            sat.longitude,
            sat.latitude,
            sat.altitude * 1000,
          ),
          point: {
            pixelSize: 4,
            color: Color.fromCssColorString("#ffb000"),
            outlineColor: Color.BLACK,
            outlineWidth: 1,
            scaleByDistance: new NearFarScalar(1e5, 2.0, 1e8, 0.5),
            distanceDisplayCondition: new DistanceDisplayCondition(0, 5e7),
          },
          label: {
            text: sat.name,
            font: "9px JetBrains Mono",
            fillColor: Color.fromCssColorString("#ffb000"),
            outlineColor: Color.BLACK,
            outlineWidth: 2,
            style: LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: VerticalOrigin.BOTTOM,
            pixelOffset: new Cartesian2(0, -8),
            scaleByDistance: new NearFarScalar(1e5, 1.0, 1e7, 0.0),
            distanceDisplayCondition: new DistanceDisplayCondition(0, 1e7),
          },
        });
      }
    } catch (err) {
      console.warn("SatelliteLayer error:", err);
    }
  }, [satellites, viewer]);

  return null;
}
