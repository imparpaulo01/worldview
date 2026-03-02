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
      const idsToRemove: string[] = [];
      for (let i = 0; i < viewer.entities.values.length; i++) {
        const e = viewer.entities.values[i];
        if (e?.id?.startsWith("sat-")) idsToRemove.push(e.id);
      }
      for (const id of idsToRemove) viewer.entities.removeById(id);

      for (const sat of satellites) {
        viewer.entities.add({
          id: `sat-${sat.noradId}`,
          position: Cartesian3.fromDegrees(sat.longitude, sat.latitude, sat.altitude * 1000),
          point: {
            pixelSize: 10,
            color: Color.fromCssColorString("#ffb000"),
            outlineColor: Color.BLACK,
            outlineWidth: 1,
            scaleByDistance: new NearFarScalar(1e5, 2.0, 1e8, 0.5),
          },
          label: {
            text: sat.name,
            font: "14px JetBrains Mono",
            fillColor: Color.WHITE,
            style: LabelStyle.FILL,
            verticalOrigin: VerticalOrigin.BOTTOM,
            pixelOffset: new Cartesian2(0, -14),
            scaleByDistance: new NearFarScalar(1e5, 1.2, 2e7, 0.9),
            distanceDisplayCondition: new DistanceDisplayCondition(0, 2e7),
          },
        });
      }
    } catch (err) {
      console.warn("SatelliteLayer error:", err);
    }

    return () => {
      if (viewer && !viewer.isDestroyed()) {
        const ids: string[] = [];
        for (let i = 0; i < viewer.entities.values.length; i++) {
          const e = viewer.entities.values[i];
          if (e?.id?.startsWith("sat-")) ids.push(e.id);
        }
        for (const id of ids) viewer.entities.removeById(id);
      }
    };
  }, [satellites, viewer]);

  return null;
}
