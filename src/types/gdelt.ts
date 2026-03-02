import { z } from "zod";

export const ConflictEventSchema = z.object({
  id: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  eventCode: z.string(),
  eventType: z.string(),
  goldsteinScale: z.number(),
  actor1: z.string(),
  actor2: z.string(),
  country: z.string(),
  sourceUrl: z.string(),
  dateAdded: z.number(),
});

export type ConflictEvent = z.infer<typeof ConflictEventSchema>;

/** CAMEO root event codes that represent conflict */
export const CONFLICT_CODES: Record<string, string> = {
  "14": "Protest",
  "17": "Coerce",
  "18": "Assault",
  "19": "Fight",
  "20": "Mass Violence",
};

/** Color mapping by CAMEO root code */
export const CONFLICT_COLORS: Record<string, string> = {
  "20": "#ff0000",
  "19": "#ff3300",
  "18": "#ff6600",
  "17": "#ff9900",
  "14": "#ffcc00",
};
