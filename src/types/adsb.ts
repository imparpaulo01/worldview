import { z } from "zod";

/** ADS-B Exchange v2 aircraft record (used by adsb.lol, airplanes.live, adsb.fi) */
export const ADSBv2AircraftSchema = z.object({
  hex: z.string(),
  flight: z.string().optional(),
  r: z.string().optional(),           // registration
  t: z.string().optional(),           // aircraft type
  alt_baro: z.union([z.number(), z.literal("ground")]).optional(),
  alt_geom: z.number().optional(),
  gs: z.number().optional(),          // ground speed (knots)
  track: z.number().optional(),       // heading
  lat: z.number().optional(),
  lon: z.number().optional(),
  baro_rate: z.number().optional(),
  squawk: z.string().optional(),
  emergency: z.string().optional(),
  category: z.string().optional(),
  true_heading: z.number().optional(),
});

export type ADSBv2Aircraft = z.infer<typeof ADSBv2AircraftSchema>;

export const ADSBv2ResponseSchema = z.object({
  now: z.number().optional(),
  total: z.number().optional(),
  ac: z.array(ADSBv2AircraftSchema).optional(),
});

export type ADSBv2Response = z.infer<typeof ADSBv2ResponseSchema>;
