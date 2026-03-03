export interface Alert {
  id: string;
  type: "earthquake" | "conflict" | "weather" | "news";
  title: string;
  description: string;
  severity: "critical" | "high" | "medium";
  latitude: number | null;
  longitude: number | null;
  timestamp: number;
}

export const ALERT_SEVERITY_COLORS: Record<string, string> = {
  critical: "#ff0000",
  high: "#ff6600",
  medium: "#ffcc00",
};
