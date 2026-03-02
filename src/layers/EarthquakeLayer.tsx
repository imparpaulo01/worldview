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
import type { Earthquake } from "@/types/usgs";

interface EarthquakeLayerProps {
  earthquakes: Earthquake[];
  viewer: import("cesium").Viewer | null;
}

function magToSize(mag: number): number {
  return Math.max(4, Math.min(20, mag * 3));
}

function depthToColor(depth: number): Color {
  if (depth < 70) return Color.fromCssColorString("#ff3333");
  if (depth < 300) return Color.fromCssColorString("#ff8800");
  return Color.fromCssColorString("#3388ff");
}

export function EarthquakeLayer({ earthquakes, viewer }: EarthquakeLayerProps) {
  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return;

    try {
      const idsToRemove: string[] = [];
      for (let i = 0; i < viewer.entities.values.length; i++) {
        const e = viewer.entities.values[i];
        if (e?.id?.startsWith("quake-")) idsToRemove.push(e.id);
      }
      for (const id of idsToRemove) viewer.entities.removeById(id);

      for (const q of earthquakes) {
        const color = depthToColor(q.depth);
        viewer.entities.add({
          id: `quake-${q.id}`,
          position: Cartesian3.fromDegrees(q.longitude, q.latitude, 0),
          point: {
            pixelSize: magToSize(q.magnitude),
            color: color.withAlpha(0.7),
            outlineColor: color,
            outlineWidth: 1,
            scaleByDistance: new NearFarScalar(1e4, 2.0, 1e7, 0.5),
            distanceDisplayCondition: new DistanceDisplayCondition(0, 3e7),
          },
          label: {
            text: `M${q.magnitude.toFixed(1)}`,
            font: "9px JetBrains Mono",
            fillColor: color,
            outlineColor: Color.BLACK,
            outlineWidth: 2,
            style: LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: VerticalOrigin.BOTTOM,
            pixelOffset: new Cartesian2(0, -12),
            scaleByDistance: new NearFarScalar(1e4, 1.0, 5e6, 0.0),
            distanceDisplayCondition: new DistanceDisplayCondition(0, 5e6),
          },
        });
      }
    } catch (err) {
      console.warn("EarthquakeLayer error:", err);
    }
  }, [earthquakes, viewer]);

  return null;
}
