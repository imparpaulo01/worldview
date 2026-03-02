import type { WeatherAlert } from "@/types/nws";

interface WeatherDetailPanelProps {
  alert: WeatherAlert | null;
  onClose: () => void;
}

export function WeatherDetailPanel({ alert, onClose }: WeatherDetailPanelProps) {
  if (!alert) return null;

  return (
    <div className="panel" style={{ position: "absolute", bottom: 16, right: 16, width: 260 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="panel-title" style={{ margin: 0 }}>Weather Alert</div>
        <button
          onClick={onClose}
          style={{ background: "none", border: "none", color: "var(--color-text-dim)", cursor: "pointer", fontSize: 14, fontFamily: "var(--font-mono)" }}
        >
          X
        </button>
      </div>
      <div style={{ marginTop: 8, fontSize: 11, lineHeight: 1.8 }}>
        <div>
          <span style={{ color: "var(--color-text-dim)" }}>EVENT </span>
          <span style={{ color: "var(--color-amber)" }}>{alert.event}</span>
        </div>
        <div>
          <span style={{ color: "var(--color-text-dim)" }}>SEVERITY </span>
          <span style={{ color: alert.severity === "Extreme" || alert.severity === "Severe" ? "var(--color-red)" : "var(--color-text)" }}>
            {alert.severity}
          </span>
        </div>
        <div>
          <span style={{ color: "var(--color-text-dim)" }}>AREA </span>
          {alert.areaDesc.length > 60 ? alert.areaDesc.slice(0, 57) + "..." : alert.areaDesc}
        </div>
        {alert.headline && (
          <div style={{ marginTop: 4, color: "var(--color-text-dim)", fontSize: 10 }}>
            {alert.headline.length > 100 ? alert.headline.slice(0, 97) + "..." : alert.headline}
          </div>
        )}
      </div>
    </div>
  );
}
