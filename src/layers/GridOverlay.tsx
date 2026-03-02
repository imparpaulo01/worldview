import { useEffect } from "react";
import {
  Cartesian3,
  Color,
  PolylineDashMaterialProperty,
} from "cesium";

interface GridOverlayProps {
  viewer: import("cesium").Viewer | null;
  enabled: boolean;
}

export function GridOverlay({ viewer, enabled }: GridOverlayProps) {
  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return;

    // Collect IDs to remove first
    const idsToRemove: string[] = [];
    for (let i = 0; i < viewer.entities.values.length; i++) {
      const e = viewer.entities.values[i];
      if (e?.id?.startsWith("grid-")) {
        idsToRemove.push(e.id);
      }
    }
    for (const id of idsToRemove) {
      viewer.entities.removeById(id);
    }

    if (!enabled) return;

    const dashMaterial = new PolylineDashMaterialProperty({
      color: Color.fromCssColorString("rgba(0, 255, 65, 0.15)"),
      dashLength: 16,
    });

    // Latitude lines every 30 degrees
    for (let lat = -60; lat <= 60; lat += 30) {
      const positions: Cartesian3[] = [];
      for (let lon = -180; lon <= 180; lon += 5) {
        positions.push(Cartesian3.fromDegrees(lon, lat, 0));
      }
      viewer.entities.add({
        id: `grid-lat-${lat}`,
        polyline: {
          positions,
          width: 1,
          material: dashMaterial,
        },
      });
    }

    // Longitude lines every 30 degrees
    for (let lon = -180; lon < 180; lon += 30) {
      const positions: Cartesian3[] = [];
      for (let lat = -90; lat <= 90; lat += 5) {
        positions.push(Cartesian3.fromDegrees(lon, lat, 0));
      }
      viewer.entities.add({
        id: `grid-lon-${lon}`,
        polyline: {
          positions,
          width: 1,
          material: dashMaterial,
        },
      });
    }
  }, [viewer, enabled]);

  return null;
}
