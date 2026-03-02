import { useEffect } from "react";
import {
  Cartesian3,
  Cartesian2,
  Color,
  VerticalOrigin,
  NearFarScalar,
  DistanceDisplayCondition,
  LabelStyle,
  PolylineDashMaterialProperty,
} from "cesium";

interface GridOverlayProps {
  viewer: import("cesium").Viewer | null;
  enabled: boolean;
}

/** Country centroids for labels */
const COUNTRIES: [string, number, number][] = [
  // Europe
  ["PORTUGAL", 39.4, -8.2],
  ["SPAIN", 40.5, -3.7],
  ["FRANCE", 46.6, 2.2],
  ["UNITED KINGDOM", 54.0, -2.5],
  ["IRELAND", 53.4, -8.2],
  ["GERMANY", 51.2, 10.4],
  ["ITALY", 42.5, 12.6],
  ["NETHERLANDS", 52.1, 5.3],
  ["BELGIUM", 50.8, 4.4],
  ["SWITZERLAND", 46.8, 8.2],
  ["AUSTRIA", 47.5, 14.6],
  ["POLAND", 51.9, 19.1],
  ["CZECHIA", 49.8, 15.5],
  ["SWEDEN", 62.0, 15.0],
  ["NORWAY", 64.0, 12.0],
  ["FINLAND", 64.0, 26.0],
  ["DENMARK", 56.3, 9.5],
  ["GREECE", 39.1, 21.8],
  ["TURKEY", 39.9, 32.9],
  ["ROMANIA", 45.9, 25.0],
  ["UKRAINE", 49.0, 31.2],
  ["HUNGARY", 47.2, 19.5],
  ["ICELAND", 65.0, -19.0],
  ["CROATIA", 45.1, 15.2],
  ["SERBIA", 44.0, 21.0],
  ["BULGARIA", 42.7, 25.5],
  ["SLOVAKIA", 48.7, 19.7],
  // Americas
  ["UNITED STATES", 39.8, -98.6],
  ["CANADA", 56.1, -106.3],
  ["MEXICO", 23.6, -102.6],
  ["BRAZIL", -14.2, -51.9],
  ["ARGENTINA", -38.4, -63.6],
  ["COLOMBIA", 4.6, -74.3],
  ["PERU", -9.2, -75.0],
  ["CHILE", -35.7, -71.5],
  ["VENEZUELA", 6.4, -66.6],
  // Asia
  ["RUSSIA", 61.5, 105.3],
  ["CHINA", 35.9, 104.2],
  ["INDIA", 20.6, 78.0],
  ["JAPAN", 36.2, 138.3],
  ["SOUTH KOREA", 35.9, 127.8],
  ["INDONESIA", -0.8, 113.9],
  ["PAKISTAN", 30.4, 69.3],
  ["IRAN", 32.4, 53.7],
  ["IRAQ", 33.2, 43.7],
  ["SAUDI ARABIA", 23.9, 45.1],
  ["THAILAND", 15.9, 101.0],
  ["VIETNAM", 14.1, 108.3],
  ["PHILIPPINES", 12.9, 121.8],
  ["MALAYSIA", 4.2, 101.9],
  ["ISRAEL", 31.0, 34.9],
  ["UAE", 23.4, 53.8],
  // Africa
  ["EGYPT", 26.8, 30.8],
  ["SOUTH AFRICA", -30.6, 22.9],
  ["NIGERIA", 9.1, 8.7],
  ["KENYA", -0.0, 37.9],
  ["ETHIOPIA", 9.1, 40.5],
  ["MOROCCO", 31.8, -7.1],
  ["ALGERIA", 28.0, 1.7],
  ["LIBYA", 26.3, 17.2],
  ["SUDAN", 12.9, 30.2],
  ["DR CONGO", -4.0, 21.8],
  ["TANZANIA", -6.4, 34.9],
  ["ANGOLA", -11.2, 17.9],
  // Oceania
  ["AUSTRALIA", -25.3, 133.8],
  ["NEW ZEALAND", -40.9, 174.9],
];

export function GridOverlay({ viewer, enabled }: GridOverlayProps) {
  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return;

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

    // Country name labels
    for (const [name, lat, lon] of COUNTRIES) {
      viewer.entities.add({
        id: `grid-country-${name}`,
        position: Cartesian3.fromDegrees(lon, lat, 0),
        label: {
          text: name,
          font: "14px JetBrains Mono",
          fillColor: Color.WHITE,
          style: LabelStyle.FILL,
          verticalOrigin: VerticalOrigin.CENTER,
          pixelOffset: new Cartesian2(0, 0),
          scaleByDistance: new NearFarScalar(5e4, 1.0, 2e7, 0.6),
          distanceDisplayCondition: new DistanceDisplayCondition(1e5, 2e7),
        },
      });
    }
  }, [viewer, enabled]);

  return null;
}
