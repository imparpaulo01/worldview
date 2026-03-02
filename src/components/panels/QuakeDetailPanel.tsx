import type { Earthquake } from "@/types/usgs";

interface QuakeDetailPanelProps {
  earthquake: Earthquake | null;
  onClose: () => void;
}

export function QuakeDetailPanel({ earthquake, onClose }: QuakeDetailPanelProps) {
  if (!earthquake) return null;

  const timeStr = new Date(earthquake.time).toUTCString();

  return (
    <div className="panel" style={{ position: "absolute", bottom: 16, right: 16, width: 240 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="panel-title" style={{ margin: 0 }}>Earthquake</div>
        <button
          onClick={onClose}
          style={{ background: "none", border: "none", color: "var(--color-text-dim)", cursor: "pointer", fontSize: 14, fontFamily: "var(--font-mono)" }}
        >
          X
        </button>
      </div>
      <div style={{ marginTop: 8, fontSize: 11, lineHeight: 1.8 }}>
        <div>
          <span style={{ color: "var(--color-text-dim)" }}>MAG </span>
          <span style={{ color: "var(--color-red)" }}>{earthquake.magnitude.toFixed(1)}</span>
        </div>
        <div>
          <span style={{ color: "var(--color-text-dim)" }}>PLACE </span>
          {earthquake.place}
        </div>
        <div>
          <span style={{ color: "var(--color-text-dim)" }}>DEPTH </span>
          {earthquake.depth.toFixed(1)} km
        </div>
        <div>
          <span style={{ color: "var(--color-text-dim)" }}>TIME </span>
          {timeStr}
        </div>
        {earthquake.tsunami && (
          <div style={{ color: "var(--color-red)", fontWeight: 600 }}>TSUNAMI WARNING</div>
        )}
      </div>
    </div>
  );
}
