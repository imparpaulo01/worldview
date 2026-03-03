import { API } from "@/lib/constants";

export interface BriefData {
  flights: number;
  satellites: number;
  earthquakes: { count: number; maxMag: number; locations: string[] };
  conflicts: { count: number; topRegions: string[]; topEvents?: string[] };
  weather: { count: number; severeCount: number };
  fires: number;
  ships: number;
  news?: string[];
}

export interface BriefResponse {
  brief: string;
  timestamp: string;
}

export async function fetchBrief(data: BriefData): Promise<BriefResponse> {
  try {
    const res = await fetch(API.AI_BRIEF, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      return { brief: `Error: ${res.status}`, timestamp: new Date().toISOString() };
    }
    return (await res.json()) as BriefResponse;
  } catch (err) {
    return { brief: `Network error: ${err}`, timestamp: new Date().toISOString() };
  }
}
