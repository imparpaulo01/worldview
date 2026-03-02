import { ConflictEventSchema } from "@/types/gdelt";
import type { ConflictEvent } from "@/types/gdelt";
import { API, LIMITS } from "@/lib/constants";
import { z } from "zod";

const ConflictResponseSchema = z.array(ConflictEventSchema);

export async function fetchConflicts(): Promise<ConflictEvent[]> {
  try {
    const res = await fetch(API.CONFLICTS);
    if (!res.ok) return [];

    const json: unknown = await res.json();
    const parsed = ConflictResponseSchema.safeParse(json);
    if (!parsed.success) return [];

    return parsed.data.slice(0, LIMITS.MAX_CONFLICTS);
  } catch (err) {
    console.warn("GDELT fetch failed:", err);
    return [];
  }
}
