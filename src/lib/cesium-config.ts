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
  // Small delay to let viewer finish initialization
  await new Promise((r) => setTimeout(r, 500));

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await createGooglePhotorealistic3DTileset();
    } catch (err) {
      if (attempt === 0) {
        console.warn("Google 3D Tiles attempt 1 failed, retrying...");
        await new Promise((r) => setTimeout(r, 1000));
      } else {
        console.warn("Google 3D Tiles unavailable, using default imagery:", err);
        return null;
      }
    }
  }
  return null;
}

export function cameraDestination(
  lon: number,
  lat: number,
  height: number,
): Cartesian3 {
  return Cartesian3.fromDegrees(lon, lat, height);
}

export { CesiumMath };
