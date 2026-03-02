import type { Vessel } from "@/types/ais";

interface ShipDetailPanelProps {
  vessel: Vessel | null;
  onClose: () => void;
}

export function ShipDetailPanel({ vessel, onClose }: ShipDetailPanelProps) {
  if (!vessel) return null;

  return (
    <div className="panel" style={{ position: "absolute", bottom: 16, right: 16, width: 240 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="panel-title" style={{ margin: 0 }}>Vessel Detail</div>
        <button
          onClick={onClose}
          style={{ background: "none", border: "none", color: "var(--color-text-dim)", cursor: "pointer", fontSize: 14, fontFamily: "var(--font-mono)" }}
        >
          X
        </button>
      </div>
      <div style={{ marginTop: 8, fontSize: 11, lineHeight: 1.8 }}>
        <div>
          <span style={{ color: "var(--color-text-dim)" }}>NAME </span>
          <span style={{ color: "#3388ff" }}>{vessel.name}</span>
        </div>
        <div>
          <span style={{ color: "var(--color-text-dim)" }}>MMSI </span>
          {vessel.mmsi}
        </div>
        <div>
          <span style={{ color: "var(--color-text-dim)" }}>SOG </span>
          {vessel.sog.toFixed(1)} kn
        </div>
        <div>
          <span style={{ color: "var(--color-text-dim)" }}>COG </span>
          {vessel.cog.toFixed(0)}&deg;
        </div>
        {vessel.destination && (
          <div>
            <span style={{ color: "var(--color-text-dim)" }}>DEST </span>
            {vessel.destination}
          </div>
        )}
      </div>
    </div>
  );
}
