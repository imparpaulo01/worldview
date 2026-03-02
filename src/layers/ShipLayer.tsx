import { useEffect } from "react";
import {
  Cartesian3,
  Cartesian2,
  Color,
  VerticalOrigin,
  HorizontalOrigin,
  NearFarScalar,
  DistanceDisplayCondition,
  LabelStyle,
  Math as CesiumMath,
} from "cesium";
import type { Vessel } from "@/types/ais";

interface ShipLayerProps {
  vessels: Vessel[];
  viewer: import("cesium").Viewer | null;
}

const SHIP_SVG = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32"><path d="M16 4 L12 14 L8 24 L16 20 L24 24 L20 14 Z" fill="#3388ff" stroke="#001a44" stroke-width="0.5"/></svg>`)}`;

export function ShipLayer({ vessels, viewer }: ShipLayerProps) {
  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return;

    try {
      const idsToRemove: string[] = [];
      for (let i = 0; i < viewer.entities.values.length; i++) {
        const e = viewer.entities.values[i];
        if (e?.id?.startsWith("ship-")) idsToRemove.push(e.id);
      }
      for (const id of idsToRemove) viewer.entities.removeById(id);

      for (const v of vessels) {
        viewer.entities.add({
          id: `ship-${v.mmsi}`,
          position: Cartesian3.fromDegrees(v.longitude, v.latitude, 100),
          billboard: {
            image: SHIP_SVG,
            width: 28,
            height: 28,
            rotation: CesiumMath.toRadians(-v.heading),
            verticalOrigin: VerticalOrigin.CENTER,
            horizontalOrigin: HorizontalOrigin.CENTER,
            scaleByDistance: new NearFarScalar(5e3, 1.2, 1e7, 0.5),
          },
          label: {
            text: v.name,
            font: "14px JetBrains Mono",
            fillColor: Color.WHITE,
            style: LabelStyle.FILL,
            verticalOrigin: VerticalOrigin.BOTTOM,
            pixelOffset: new Cartesian2(0, -22),
            scaleByDistance: new NearFarScalar(5e3, 1.2, 8e6, 0.9),
            distanceDisplayCondition: new DistanceDisplayCondition(0, 5e6),
          },
        });
      }
    } catch (err) {
      console.warn("ShipLayer error:", err);
    }

    return () => {
      if (viewer && !viewer.isDestroyed()) {
        const ids: string[] = [];
        for (let i = 0; i < viewer.entities.values.length; i++) {
          const e = viewer.entities.values[i];
          if (e?.id?.startsWith("ship-")) ids.push(e.id);
        }
        for (const id of ids) viewer.entities.removeById(id);
      }
    };
  }, [vessels, viewer]);

  return null;
}
