/** Country name → centroid coordinates for "fly to" feature */
export const COUNTRY_COORDS: Record<string, { lat: number; lon: number }> = {
  "ukraine": { lat: 48.38, lon: 31.17 },
  "russia": { lat: 61.52, lon: 105.32 },
  "china": { lat: 35.86, lon: 104.20 },
  "united states": { lat: 37.09, lon: -95.71 },
  "us": { lat: 37.09, lon: -95.71 },
  "usa": { lat: 37.09, lon: -95.71 },
  "iran": { lat: 32.43, lon: 53.69 },
  "israel": { lat: 31.05, lon: 34.85 },
  "gaza": { lat: 31.35, lon: 34.31 },
  "palestine": { lat: 31.95, lon: 35.23 },
  "syria": { lat: 34.80, lon: 38.99 },
  "iraq": { lat: 33.22, lon: 43.68 },
  "turkey": { lat: 38.96, lon: 35.24 },
  "india": { lat: 20.59, lon: 78.96 },
  "pakistan": { lat: 30.38, lon: 69.35 },
  "afghanistan": { lat: 33.94, lon: 67.71 },
  "north korea": { lat: 40.34, lon: 127.51 },
  "south korea": { lat: 35.91, lon: 127.77 },
  "japan": { lat: 36.20, lon: 138.25 },
  "taiwan": { lat: 23.70, lon: 120.96 },
  "myanmar": { lat: 21.91, lon: 95.96 },
  "yemen": { lat: 15.55, lon: 48.52 },
  "saudi arabia": { lat: 23.89, lon: 45.08 },
  "egypt": { lat: 26.82, lon: 30.80 },
  "libya": { lat: 26.34, lon: 17.23 },
  "sudan": { lat: 12.86, lon: 30.22 },
  "somalia": { lat: 5.15, lon: 46.20 },
  "ethiopia": { lat: 9.15, lon: 40.49 },
  "nigeria": { lat: 9.08, lon: 8.68 },
  "congo": { lat: -4.04, lon: 21.76 },
  "south africa": { lat: -30.56, lon: 22.94 },
  "brazil": { lat: -14.24, lon: -51.93 },
  "mexico": { lat: 23.63, lon: -102.55 },
  "colombia": { lat: 4.57, lon: -74.30 },
  "venezuela": { lat: 6.42, lon: -66.59 },
  "france": { lat: 46.60, lon: 2.21 },
  "germany": { lat: 51.17, lon: 10.45 },
  "united kingdom": { lat: 55.38, lon: -3.44 },
  "uk": { lat: 55.38, lon: -3.44 },
  "italy": { lat: 41.87, lon: 12.57 },
  "spain": { lat: 40.46, lon: -3.75 },
  "portugal": { lat: 39.40, lon: -8.22 },
  "poland": { lat: 51.92, lon: 19.15 },
  "netherlands": { lat: 52.13, lon: 5.29 },
  "belgium": { lat: 50.85, lon: 4.35 },
  "greece": { lat: 39.07, lon: 21.82 },
  "romania": { lat: 45.94, lon: 24.97 },
  "hungary": { lat: 47.16, lon: 19.50 },
  "serbia": { lat: 44.02, lon: 21.01 },
  "australia": { lat: -25.27, lon: 133.78 },
  "canada": { lat: 56.13, lon: -106.35 },
  "indonesia": { lat: -0.79, lon: 113.92 },
  "philippines": { lat: 12.88, lon: 121.77 },
  "vietnam": { lat: 14.06, lon: 108.28 },
  "thailand": { lat: 15.87, lon: 100.99 },
  "malaysia": { lat: 4.21, lon: 101.98 },
  "lebanon": { lat: 33.85, lon: 35.86 },
  "jordan": { lat: 30.59, lon: 36.24 },
  "mali": { lat: 17.57, lon: -4.00 },
  "mozambique": { lat: -18.67, lon: 35.53 },
  "kenya": { lat: -0.02, lon: 37.91 },
};

/**
 * Try to find a country mention in headline text.
 * Returns first matching country's coordinates, or null.
 */
export function findCountryInText(text: string): { name: string; lat: number; lon: number } | null {
  const lower = text.toLowerCase();
  for (const [name, coords] of Object.entries(COUNTRY_COORDS)) {
    // Match whole words only (avoid "us" matching "focus", "bus", etc.)
    const wordBoundary = name.length <= 3
      ? new RegExp(`\\b${name}\\b`, "i")
      : new RegExp(name, "i");
    if (wordBoundary.test(lower)) {
      return { name, ...coords };
    }
  }
  return null;
}
