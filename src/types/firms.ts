export interface FireHotspot {
  latitude: number;
  longitude: number;
  brightness: number;
  confidence: string;   // "low" | "nominal" | "high"
  frp: number;          // fire radiative power (MW)
  satellite: string;
  acqDate: string;
  acqTime: string;
}
