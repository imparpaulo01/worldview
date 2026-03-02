import type { FireHotspot } from "@/types/firms";

interface FireDetailPanelProps {
  fire: FireHotspot | null;
  onClose: () => void;
}

export function FireDetailPanel({ fire, onClose }: FireDetailPanelProps) {
  if (!fire) return null;

  return (
    <div className="panel" style={{ position: "absolute", bottom: 16, right: 16, width: 240 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="panel-title" style={{ margin: 0 }}>Fire Hotspot</div>
        <button
          onClick={onClose}
          style={{ background: "none", border: "none", color: "var(--color-text-dim)", cursor: "pointer", fontSize: 14, fontFamily: "var(--font-mono)" }}
        >
          X
        </button>
      </div>
      <div style={{ marginTop: 8, fontSize: 11, lineHeight: 1.8 }}>
        <div>
          <span style={{ color: "var(--color-text-dim)" }}>CONF </span>
          <span style={{ color: fire.confidence === "high" || fire.confidence === "h" ? "var(--color-red)" : "var(--color-amber)" }}>
            {fire.confidence.toUpperCase()}
          </span>
        </div>
        <div>
          <span style={{ color: "var(--color-text-dim)" }}>FRP </span>
          {fire.frp.toFixed(1)} MW
        </div>
        <div>
          <span style={{ color: "var(--color-text-dim)" }}>BRIGHT </span>
          {fire.brightness.toFixed(1)} K
        </div>
        <div>
          <span style={{ color: "var(--color-text-dim)" }}>SAT </span>
          {fire.satellite}
        </div>
        <div>
          <span style={{ color: "var(--color-text-dim)" }}>TIME </span>
          {fire.acqDate} {fire.acqTime}
        </div>
        <div>
          <span style={{ color: "var(--color-text-dim)" }}>LAT </span>
          {fire.latitude.toFixed(4)}&deg;
        </div>
        <div>
          <span style={{ color: "var(--color-text-dim)" }}>LON </span>
          {fire.longitude.toFixed(4)}&deg;
        </div>
      </div>
    </div>
  );
}
