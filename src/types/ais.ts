export interface Vessel {
  mmsi: number;
  name: string;
  latitude: number;
  longitude: number;
  cog: number;     // course over ground (degrees)
  sog: number;     // speed over ground (knots)
  heading: number;
  shipType: number;
  destination: string;
}
