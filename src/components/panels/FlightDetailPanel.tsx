import type { Aircraft } from "@/types/opensky";
import { formatAltitude, formatSpeed } from "@/lib/utils";

interface FlightDetailPanelProps {
  aircraft: Aircraft | null;
  onClose: () => void;
}

export function FlightDetailPanel({ aircraft, onClose }: FlightDetailPanelProps) {
  if (!aircraft) return null;

  return (
    <div
      className="panel"
      style={{ position: "absolute", bottom: 16, right: 16, width: 240 }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div className="panel-title" style={{ margin: 0 }}>
          Aircraft Detail
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "var(--color-text-dim)",
            cursor: "pointer",
            fontSize: 14,
            fontFamily: "var(--font-mono)",
          }}
        >
          X
        </button>
      </div>

      <div style={{ marginTop: 8, fontSize: 11, lineHeight: 1.8 }}>
        <div>
          <span style={{ color: "var(--color-text-dim)" }}>CALLSIGN </span>
          <span style={{ color: "var(--color-green)" }}>
            {aircraft.callsign}
          </span>
        </div>
        <div>
          <span style={{ color: "var(--color-text-dim)" }}>ICAO24 </span>
          {aircraft.icao24}
        </div>
        <div>
          <span style={{ color: "var(--color-text-dim)" }}>COUNTRY </span>
          {aircraft.country}
        </div>
        <div>
          <span style={{ color: "var(--color-text-dim)" }}>ALT </span>
          {formatAltitude(aircraft.altitude)}
        </div>
        <div>
          <span style={{ color: "var(--color-text-dim)" }}>SPD </span>
          {formatSpeed(aircraft.velocity)}
        </div>
        <div>
          <span style={{ color: "var(--color-text-dim)" }}>HDG </span>
          {aircraft.heading.toFixed(0)}&deg;
        </div>
        <div>
          <span style={{ color: "var(--color-text-dim)" }}>VRATE </span>
          {aircraft.verticalRate > 0 ? "+" : ""}
          {aircraft.verticalRate.toFixed(1)} m/s
        </div>
      </div>
    </div>
  );
}
