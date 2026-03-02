import type { Vessel } from "@/types/ais";
import { API } from "@/lib/constants";

/**
 * Fetch vessel positions from the backend AIS collector.
 * The collector tries AISStream.io (global) first, falls back to Digitraffic (Baltic).
 */
export async function fetchVessels(): Promise<Vessel[]> {
  const res = await fetch(API.AIS);
  if (!res.ok) throw new Error(`AIS fetch failed: ${res.status}`);

  const data: Vessel[] = await res.json();
  return data;
}
