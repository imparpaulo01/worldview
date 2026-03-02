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
import type { WeatherAlert } from "@/types/nws";

interface WeatherLayerProps {
  alerts: WeatherAlert[];
  viewer: import("cesium").Viewer | null;
}

function severityToColor(severity: string): Color {
  switch (severity) {
    case "Extreme": return Color.fromCssColorString("#ff0000");
    case "Severe": return Color.fromCssColorString("#ff6600");
    case "Moderate": return Color.fromCssColorString("#ffcc00");
    case "Minor": return Color.fromCssColorString("#66ccff");
    default: return Color.fromCssColorString("#999999");
  }
}

export function WeatherLayer({ alerts, viewer }: WeatherLayerProps) {
  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return;

    try {
      const idsToRemove: string[] = [];
      for (let i = 0; i < viewer.entities.values.length; i++) {
        const e = viewer.entities.values[i];
        if (e?.id?.startsWith("wx-")) idsToRemove.push(e.id);
      }
      for (const id of idsToRemove) viewer.entities.removeById(id);

      for (const alert of alerts) {
        if (alert.latitude == null || alert.longitude == null) continue;
        const color = severityToColor(alert.severity);

        viewer.entities.add({
          id: `wx-${alert.id}`,
          position: Cartesian3.fromDegrees(alert.longitude, alert.latitude, 0),
          point: {
            pixelSize: 10,
            color: color.withAlpha(0.5),
            outlineColor: color,
            outlineWidth: 2,
            scaleByDistance: new NearFarScalar(1e4, 2.0, 1e7, 0.5),
            distanceDisplayCondition: new DistanceDisplayCondition(0, 2e7),
          },
          label: {
            text: alert.event,
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
      console.warn("WeatherLayer error:", err);
    }
  }, [alerts, viewer]);

  return null;
}
