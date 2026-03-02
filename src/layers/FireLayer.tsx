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
import type { FireHotspot } from "@/types/firms";

interface FireLayerProps {
  fires: FireHotspot[];
  viewer: import("cesium").Viewer | null;
}

function frpToSize(frp: number): number {
  return Math.max(14, Math.min(32, 14 + frp / 20));
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
          position: Cartesian3.fromDegrees(f.longitude, f.latitude, 500),
          point: {
            pixelSize: frpToSize(f.frp),
            color: color.withAlpha(0.6),
            outlineColor: color,
            outlineWidth: 1,
            scaleByDistance: new NearFarScalar(5e3, 1.0, 1e7, 0.4),
          },
          label: {
            text: `${f.frp.toFixed(0)} MW`,
            font: "14px JetBrains Mono",
            fillColor: Color.WHITE,
            style: LabelStyle.FILL,
            verticalOrigin: VerticalOrigin.BOTTOM,
            pixelOffset: new Cartesian2(0, -18),
            scaleByDistance: new NearFarScalar(5e3, 1.2, 8e6, 0.9),
            distanceDisplayCondition: new DistanceDisplayCondition(0, 5e6),
          },
        });
      }
    } catch (err) {
      console.warn("FireLayer error:", err);
    }

    return () => {
      if (viewer && !viewer.isDestroyed()) {
        const ids: string[] = [];
        for (let i = 0; i < viewer.entities.values.length; i++) {
          const e = viewer.entities.values[i];
          if (e?.id?.startsWith("fire-")) ids.push(e.id);
        }
        for (const id of ids) viewer.entities.removeById(id);
      }
    };
  }, [fires, viewer]);

  return null;
}
