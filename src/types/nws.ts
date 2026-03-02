import { z } from "zod";

export const NWSAlertSchema = z.object({
  id: z.string(),
  properties: z.object({
    event: z.string(),
    severity: z.enum(["Extreme", "Severe", "Moderate", "Minor", "Unknown"]),
    certainty: z.string(),
    headline: z.string().nullable(),
    description: z.string(),
    areaDesc: z.string(),
    effective: z.string(),
    expires: z.string().nullable(),
  }),
  geometry: z
    .object({
      type: z.string(),
      coordinates: z.unknown(),
    })
    .nullable(),
});

export const NWSResponseSchema = z.object({
  features: z.array(NWSAlertSchema),
});

export interface WeatherAlert {
  id: string;
  event: string;
  severity: string;
  headline: string;
  description: string;
  areaDesc: string;
  effective: string;
  expires: string | null;
  latitude: number | null;
  longitude: number | null;
}
