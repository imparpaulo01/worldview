import type { FilterMode } from "@/lib/constants";
import { FILTER_LABELS, FILTER_KEYS } from "@/lib/constants";

interface FilterPanelProps {
  mode: FilterMode;
  onChange: (mode: FilterMode) => void;
}

const MODES = Object.entries(FILTER_LABELS) as [FilterMode, string][];
const KEY_LOOKUP = Object.fromEntries(
  Object.entries(FILTER_KEYS).map(([k, v]) => [v, k]),
);

export function FilterPanel({ mode, onChange }: FilterPanelProps) {
  return (
    <div className="panel" style={{ position: "absolute", top: 310, right: 16, width: 180 }}>
      <div className="panel-title">Filters</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {MODES.map(([key, label]) => (
          <button
            key={key}
            onClick={() => onChange(key)}
            style={{
              background: mode === key ? "rgba(0, 255, 65, 0.15)" : "transparent",
              border: `1px solid ${mode === key ? "var(--color-green)" : "rgba(255,255,255,0.1)"}`,
              borderRadius: 3,
              padding: "4px 8px",
              color: mode === key ? "var(--color-green)" : "var(--color-text-dim)",
              cursor: "pointer",
              fontSize: 10,
              fontFamily: "var(--font-mono)",
              textAlign: "left",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>{label}</span>
            <span style={{ opacity: 0.5 }}>[{KEY_LOOKUP[key]}]</span>
          </button>
        ))}
      </div>
    </div>
  );
}
