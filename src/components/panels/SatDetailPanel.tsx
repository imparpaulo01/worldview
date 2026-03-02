import type { Satellite } from "@/types/celestrak";
import { formatAltitude } from "@/lib/utils";

interface SatDetailPanelProps {
  satellite: Satellite | null;
  onClose: () => void;
}

export function SatDetailPanel({ satellite, onClose }: SatDetailPanelProps) {
  if (!satellite) return null;

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
          Satellite Detail
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
          <span style={{ color: "var(--color-text-dim)" }}>NAME </span>
          <span style={{ color: "var(--color-amber)" }}>
            {satellite.name}
          </span>
        </div>
        <div>
          <span style={{ color: "var(--color-text-dim)" }}>NORAD </span>
          {satellite.noradId}
        </div>
        <div>
          <span style={{ color: "var(--color-text-dim)" }}>ALT </span>
          {formatAltitude(satellite.altitude * 1000)}
        </div>
        <div>
          <span style={{ color: "var(--color-text-dim)" }}>VEL </span>
          {satellite.velocity.toFixed(2)} km/s
        </div>
        <div>
          <span style={{ color: "var(--color-text-dim)" }}>INC </span>
          {satellite.inclination.toFixed(2)}&deg;
        </div>
        <div>
          <span style={{ color: "var(--color-text-dim)" }}>LAT </span>
          {satellite.latitude.toFixed(4)}&deg;
        </div>
        <div>
          <span style={{ color: "var(--color-text-dim)" }}>LON </span>
          {satellite.longitude.toFixed(4)}&deg;
        </div>
      </div>
    </div>
  );
}
