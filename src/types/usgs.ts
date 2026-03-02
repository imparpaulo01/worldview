import { z } from "zod";

export const USGSPropertiesSchema = z.object({
  mag: z.number().nullable(),
  place: z.string().nullable(),
  time: z.number(),
  updated: z.number(),
  tsunami: z.number(),
  sig: z.number().nullable(),
  title: z.string(),
  type: z.string(),
  alert: z.string().nullable(),
});

export const USGSFeatureSchema = z.object({
  id: z.string(),
  properties: USGSPropertiesSchema,
  geometry: z.object({
    type: z.literal("Point"),
    coordinates: z.tuple([z.number(), z.number(), z.number()]), // [lon, lat, depth_km]
  }),
});

export const USGSResponseSchema = z.object({
  type: z.literal("FeatureCollection"),
  features: z.array(USGSFeatureSchema),
});

export interface Earthquake {
  id: string;
  magnitude: number;
  place: string;
  time: number;
  longitude: number;
  latitude: number;
  depth: number; // km
  tsunami: boolean;
  significance: number;
  title: string;
}
