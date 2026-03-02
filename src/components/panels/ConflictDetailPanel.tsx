import type { ConflictEvent } from "@/types/gdelt";
import { CONFLICT_COLORS } from "@/types/gdelt";

interface ConflictDetailPanelProps {
  conflict: ConflictEvent | null;
  onClose: () => void;
}

function severityLabel(goldstein: number): string {
  if (goldstein <= -7) return "EXTREME";
  if (goldstein <= -4) return "HIGH";
  if (goldstein <= -2) return "MODERATE";
  return "LOW";
}

export function ConflictDetailPanel({ conflict, onClose }: ConflictDetailPanelProps) {
  if (!conflict) return null;

  const rootCode = conflict.eventCode.substring(0, 2);
  const color = CONFLICT_COLORS[rootCode] || "#ffcc00";
  const timeStr = new Date(conflict.dateAdded).toUTCString();

  return (
    <div className="panel" style={{ position: "absolute", bottom: 16, right: 16, width: 260 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="panel-title" style={{ margin: 0 }}>Conflict</div>
        <button
          onClick={onClose}
          style={{ background: "none", border: "none", color: "var(--color-text-dim)", cursor: "pointer", fontSize: 14, fontFamily: "var(--font-mono)" }}
        >
          X
        </button>
      </div>
      <div style={{ marginTop: 8, fontSize: 11, lineHeight: 1.8 }}>
        <div>
          <span style={{ color: "var(--color-text-dim)" }}>TYPE </span>
          <span style={{ color }}>{conflict.eventType}</span>
        </div>
        <div>
          <span style={{ color: "var(--color-text-dim)" }}>SEVERITY </span>
          <span style={{ color }}>{severityLabel(conflict.goldsteinScale)} ({conflict.goldsteinScale.toFixed(1)})</span>
        </div>
        {conflict.actor1 && (
          <div>
            <span style={{ color: "var(--color-text-dim)" }}>ACTOR 1 </span>
            {conflict.actor1}
          </div>
        )}
        {conflict.actor2 && (
          <div>
            <span style={{ color: "var(--color-text-dim)" }}>ACTOR 2 </span>
            {conflict.actor2}
          </div>
        )}
        {conflict.country && (
          <div>
            <span style={{ color: "var(--color-text-dim)" }}>COUNTRY </span>
            {conflict.country}
          </div>
        )}
        <div>
          <span style={{ color: "var(--color-text-dim)" }}>CODE </span>
          {conflict.eventCode}
        </div>
        <div>
          <span style={{ color: "var(--color-text-dim)" }}>TIME </span>
          {timeStr}
        </div>
        {conflict.sourceUrl && (
          <div style={{ marginTop: 4 }}>
            <a
              href={conflict.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--color-accent)", fontSize: 10 }}
            >
              SOURCE
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
