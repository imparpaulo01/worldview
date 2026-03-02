import { useEffect } from "react";
import {
  Cartesian3,
  Color,
  NearFarScalar,
  DistanceDisplayCondition,
} from "cesium";
import type { FireHotspot } from "@/types/firms";

interface FireLayerProps {
  fires: FireHotspot[];
  viewer: import("cesium").Viewer | null;
}

function frpToSize(frp: number): number {
  return Math.max(3, Math.min(12, 3 + frp / 50));
}

function confidenceToColor(conf: string): Color {
  if (conf === "high" || conf === "h") return Color.fromCssColorString("#ff2200");
  if (conf === "nominal" || conf === "n") return Color.fromCssColorString("#ff8800");
  return Color.fromCssColorString("#ffcc00");
}

export function FireLayer({ fires, viewer }: FireLayerProps) {
  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return;

    try {
      const idsToRemove: string[] = [];
      for (let i = 0; i < viewer.entities.values.length; i++) {
        const e = viewer.entities.values[i];
        if (e?.id?.startsWith("fire-")) idsToRemove.push(e.id);
      }
      for (const id of idsToRemove) viewer.entities.removeById(id);

      for (let i = 0; i < fires.length; i++) {
        const f = fires[i]!;
        const color = confidenceToColor(f.confidence);
        viewer.entities.add({
          id: `fire-${i}`,
          position: Cartesian3.fromDegrees(f.longitude, f.latitude, 0),
          point: {
            pixelSize: frpToSize(f.frp),
            color: color.withAlpha(0.6),
            outlineColor: color,
            outlineWidth: 1,
            scaleByDistance: new NearFarScalar(1e4, 1.5, 2e7, 0.3),
            distanceDisplayCondition: new DistanceDisplayCondition(0, 2e7),
          },
        });
      }
    } catch (err) {
      console.warn("FireLayer error:", err);
    }
  }, [fires, viewer]);

  return null;
}
