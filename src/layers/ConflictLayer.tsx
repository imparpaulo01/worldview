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
import type { ConflictEvent } from "@/types/gdelt";
import { CONFLICT_COLORS } from "@/types/gdelt";

interface ConflictLayerProps {
  conflicts: ConflictEvent[];
  viewer: import("cesium").Viewer | null;
}

/** Map CAMEO root code to color */
function eventColor(eventCode: string): Color {
  const rootCode = eventCode.substring(0, 2);
  const hex = CONFLICT_COLORS[rootCode] || "#ffcc00";
  return Color.fromCssColorString(hex);
}

/** Map Goldstein scale to point size (more negative = larger) */
function severityToSize(goldstein: number): number {
  const normalized = Math.max(0, Math.min(1, (-goldstein) / 10));
  return 16 + normalized * 20;
}

/** Short label for event type */
const TYPE_ABBREV: Record<string, string> = {
  "Protest": "PRT",
  "Coerce": "CRC",
  "Assault": "AST",
  "Fight": "FGT",
  "Mass Violence": "MVL",
};

export function ConflictLayer({ conflicts, viewer }: ConflictLayerProps) {
  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return;

    try {
      const idsToRemove: string[] = [];
      for (let i = 0; i < viewer.entities.values.length; i++) {
        const e = viewer.entities.values[i];
        if (e?.id?.startsWith("conflict-")) idsToRemove.push(e.id);
      }
      for (const id of idsToRemove) viewer.entities.removeById(id);

      for (const c of conflicts) {
        const color = eventColor(c.eventCode);
        viewer.entities.add({
          id: `conflict-${c.id}`,
          position: Cartesian3.fromDegrees(c.longitude, c.latitude, 500),
          point: {
            pixelSize: severityToSize(c.goldsteinScale),
            color: color.withAlpha(0.7),
            outlineColor: color,
            outlineWidth: 1,
            scaleByDistance: new NearFarScalar(5e3, 1.0, 1e7, 0.4),

          },
          label: {
            text: c.eventType,
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
      console.warn("ConflictLayer error:", err);
    }

    return () => {
      if (viewer && !viewer.isDestroyed()) {
        const ids: string[] = [];
        for (let i = 0; i < viewer.entities.values.length; i++) {
          const e = viewer.entities.values[i];
          if (e?.id?.startsWith("conflict-")) ids.push(e.id);
        }
        for (const id of ids) viewer.entities.removeById(id);
      }
    };
  }, [conflicts, viewer]);

  return null;
}
