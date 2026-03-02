import { useMemo } from "react";
import {
  Entity,
  BillboardGraphics,
  LabelGraphics,
  Cartesian3,
  Color,
  VerticalOrigin,
  HorizontalOrigin,
  NearFarScalar,
  DistanceDisplayCondition,
  Math as CesiumMath,
} from "cesium";
import type { Aircraft } from "@/types/opensky";

interface FlightLayerProps {
  aircraft: Aircraft[];
  onSelect?: (aircraft: Aircraft) => void;
  viewer: import("cesium").Viewer | null;
}

// SVG airplane icon as data URI
const AIRPLANE_SVG = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32"><path d="M16 2 L14 12 L4 16 L14 18 L14 26 L11 28 L11 30 L16 28 L21 30 L21 28 L18 26 L18 18 L28 16 L18 12 Z" fill="#00ff41" stroke="#003300" stroke-width="0.5"/></svg>`)}`;

export function FlightLayer({ aircraft, viewer }: FlightLayerProps) {
  const entities = useMemo(() => {
    if (!viewer || viewer.isDestroyed()) return;

    // Clear existing flight entities
    const toRemove = viewer.entities.values.filter(
      (e) => e.id?.startsWith("flight-"),
    );
    for (const e of toRemove) {
      viewer.entities.remove(e);
    }

    for (const ac of aircraft) {
      const entity = new Entity({
        id: `flight-${ac.icao24}`,
        position: Cartesian3.fromDegrees(
          ac.longitude,
          ac.latitude,
          ac.altitude,
        ),
        billboard: new BillboardGraphics({
          image: AIRPLANE_SVG,
          width: 24,
          height: 24,
          rotation: CesiumMath.toRadians(-ac.heading),
          verticalOrigin: VerticalOrigin.CENTER,
          horizontalOrigin: HorizontalOrigin.CENTER,
          scaleByDistance: new NearFarScalar(1e4, 1.5, 1e7, 0.4),
          distanceDisplayCondition: new DistanceDisplayCondition(0, 2e7),
        }),
        label: new LabelGraphics({
          text: ac.callsign,
          font: "10px JetBrains Mono",
          fillColor: Color.fromCssColorString("#00ff41"),
          outlineColor: Color.BLACK,
          outlineWidth: 2,
          style: 2, // FILL_AND_OUTLINE
          verticalOrigin: VerticalOrigin.BOTTOM,
          pixelOffset: new Cartesian3(0, -16, 0) as any,
          scaleByDistance: new NearFarScalar(1e4, 1.0, 5e6, 0.0),
          distanceDisplayCondition: new DistanceDisplayCondition(0, 5e6),
        }),
        properties: { type: "flight", data: ac } as any,
      });

      viewer.entities.add(entity);
    }
  }, [aircraft, viewer]);

  void entities;
  return null;
}
