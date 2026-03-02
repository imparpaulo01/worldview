import { z } from "zod";

/** CelesTrak GP (General Perturbations) element — JSON format */
export const GPElementSchema = z.object({
  OBJECT_NAME: z.string(),
  OBJECT_ID: z.string(),
  EPOCH: z.string(),
  MEAN_MOTION: z.number(),
  ECCENTRICITY: z.number(),
  INCLINATION: z.number(),
  RA_OF_ASC_NODE: z.number(),
  ARG_OF_PERICENTER: z.number(),
  MEAN_ANOMALY: z.number(),
  EPHEMERIS_TYPE: z.number(),
  CLASSIFICATION_TYPE: z.string(),
  NORAD_CAT_ID: z.number(),
  ELEMENT_SET_NO: z.number(),
  REV_AT_EPOCH: z.number(),
  BSTAR: z.number(),
  MEAN_MOTION_DOT: z.number(),
  MEAN_MOTION_DDOT: z.number(),
});

export type GPElement = z.infer<typeof GPElementSchema>;

export const GPResponseSchema = z.array(GPElementSchema);

/** Parsed satellite for rendering */
export interface Satellite {
  name: string;
  noradId: number;
  longitude: number;
  latitude: number;
  altitude: number;
  velocity: number;
  inclination: number;
}
