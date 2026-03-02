import { useMemo } from "react";
import {
  Entity,
  PolylineGraphics,
  Cartesian3,
  Color,
  PolylineDashMaterialProperty,
} from "cesium";

interface GridOverlayProps {
  viewer: import("cesium").Viewer | null;
  enabled: boolean;
}

export function GridOverlay({ viewer, enabled }: GridOverlayProps) {
  useMemo(() => {
    if (!viewer || viewer.isDestroyed()) return;

    // Clear existing grid entities
    const toRemove = viewer.entities.values.filter(
      (e) => e.id?.startsWith("grid-"),
    );
    for (const e of toRemove) {
      viewer.entities.remove(e);
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
      viewer.entities.add(
        new Entity({
          id: `grid-lat-${lat}`,
          polyline: new PolylineGraphics({
            positions,
            width: 1,
            material: dashMaterial,
          }),
        }),
      );
    }

    // Longitude lines every 30 degrees
    for (let lon = -180; lon < 180; lon += 30) {
      const positions: Cartesian3[] = [];
      for (let lat = -90; lat <= 90; lat += 5) {
        positions.push(Cartesian3.fromDegrees(lon, lat, 0));
      }
      viewer.entities.add(
        new Entity({
          id: `grid-lon-${lon}`,
          polyline: new PolylineGraphics({
            positions,
            width: 1,
            material: dashMaterial,
          }),
        }),
      );
    }
  }, [viewer, enabled]);

  return null;
}
