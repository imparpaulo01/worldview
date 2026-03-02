/** Format number with fixed decimals */
export function formatCoord(value: number, decimals = 4): string {
  return value.toFixed(decimals);
}

/** Format altitude in meters → display string */
export function formatAltitude(meters: number): string {
  if (meters > 1_000_000) return `${(meters / 1_000_000).toFixed(1)}M km`;
  if (meters > 1_000) return `${(meters / 1_000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

/** Format velocity m/s → km/h */
export function formatSpeed(ms: number): string {
  return `${Math.round(ms * 3.6)} km/h`;
}

/** Convert degrees to radians */
export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Convert radians to degrees */
export function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/** UTC time string for HUD */
export function utcTimeString(): string {
  return new Date().toISOString().slice(11, 19) + "Z";
}
