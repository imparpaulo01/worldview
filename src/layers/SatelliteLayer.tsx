import { useMemo } from "react";
import {
  Entity,
  PointGraphics,
  LabelGraphics,
  Cartesian3,
  Color,
  VerticalOrigin,
  NearFarScalar,
  DistanceDisplayCondition,
} from "cesium";
import type { Satellite } from "@/types/celestrak";

interface SatelliteLayerProps {
  satellites: Satellite[];
  viewer: import("cesium").Viewer | null;
}

export function SatelliteLayer({ satellites, viewer }: SatelliteLayerProps) {
  useMemo(() => {
    if (!viewer || viewer.isDestroyed()) return;

    // Clear existing satellite entities
    const toRemove = viewer.entities.values.filter(
      (e) => e.id?.startsWith("sat-"),
    );
    for (const e of toRemove) {
      viewer.entities.remove(e);
    }

    for (const sat of satellites) {
      viewer.entities.add(
        new Entity({
          id: `sat-${sat.noradId}`,
          position: Cartesian3.fromDegrees(
            sat.longitude,
            sat.latitude,
            sat.altitude * 1000, // km → m
          ),
          point: new PointGraphics({
            pixelSize: 4,
            color: Color.fromCssColorString("#ffb000"),
            outlineColor: Color.BLACK,
            outlineWidth: 1,
            scaleByDistance: new NearFarScalar(1e5, 2.0, 1e8, 0.5),
            distanceDisplayCondition: new DistanceDisplayCondition(0, 5e7),
          }),
          label: new LabelGraphics({
            text: sat.name,
            font: "9px JetBrains Mono",
            fillColor: Color.fromCssColorString("#ffb000"),
            outlineColor: Color.BLACK,
            outlineWidth: 2,
            style: 2,
            verticalOrigin: VerticalOrigin.BOTTOM,
            pixelOffset: new Cartesian3(0, -8, 0) as any,
            scaleByDistance: new NearFarScalar(1e5, 1.0, 1e7, 0.0),
            distanceDisplayCondition: new DistanceDisplayCondition(0, 1e7),
          }),
          properties: { type: "satellite", data: sat } as any,
        }),
      );
    }
  }, [satellites, viewer]);

  return null;
}
