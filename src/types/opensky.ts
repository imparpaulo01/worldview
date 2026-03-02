import { z } from "zod";

/** Single state vector from OpenSky API */
export const StateVectorSchema = z.tuple([
  z.string(), // 0: icao24
  z.string().nullable(), // 1: callsign
  z.string(), // 2: origin_country
  z.number().nullable(), // 3: time_position
  z.number(), // 4: last_contact
  z.number().nullable(), // 5: longitude
  z.number().nullable(), // 6: latitude
  z.number().nullable(), // 7: baro_altitude
  z.boolean(), // 8: on_ground
  z.number().nullable(), // 9: velocity
  z.number().nullable(), // 10: true_track (heading)
  z.number().nullable(), // 11: vertical_rate
  z.array(z.number()).nullable(), // 12: sensors
  z.number().nullable(), // 13: geo_altitude
  z.string().nullable(), // 14: squawk
  z.boolean(), // 15: spi
  z.number(), // 16: position_source
]);

export type StateVector = z.infer<typeof StateVectorSchema>;

export const OpenSkyResponseSchema = z.object({
  time: z.number(),
  states: z.array(StateVectorSchema).nullable(),
});

export type OpenSkyResponse = z.infer<typeof OpenSkyResponseSchema>;

/** Parsed aircraft data for rendering */
export interface Aircraft {
  icao24: string;
  callsign: string;
  country: string;
  longitude: number;
  latitude: number;
  altitude: number;
  velocity: number;
  heading: number;
  verticalRate: number;
  onGround: boolean;
}

/** Parse raw state vector into Aircraft */
export function parseAircraft(state: StateVector): Aircraft | null {
  const [
    icao24,
    callsign,
    country,
    ,
    ,
    longitude,
    latitude,
    altitude,
    onGround,
    velocity,
    heading,
    verticalRate,
  ] = state;

  if (longitude == null || latitude == null) return null;

  return {
    icao24,
    callsign: callsign?.trim() ?? icao24,
    country,
    longitude,
    latitude,
    altitude: altitude ?? 0,
    velocity: velocity ?? 0,
    heading: heading ?? 0,
    verticalRate: verticalRate ?? 0,
    onGround,
  };
}
