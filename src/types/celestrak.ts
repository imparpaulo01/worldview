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
