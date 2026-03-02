import {
  Ion,
  Cartesian3,
  Math as CesiumMath,
  createGooglePhotorealistic3DTileset,
} from "cesium";

export function configureCesium(): void {
  const token = import.meta.env.VITE_CESIUM_ION_TOKEN as string | undefined;
  if (token) {
    Ion.defaultAccessToken = token;
  }
}

export async function loadGoogleTileset() {
  try {
    return await createGooglePhotorealistic3DTileset();
  } catch (err) {
    console.warn("Failed to load Google 3D Tiles:", err);
    return null;
  }
}

export function cameraDestination(
  lon: number,
  lat: number,
  height: number,
): Cartesian3 {
  return Cartesian3.fromDegrees(lon, lat, height);
}

export { CesiumMath };
