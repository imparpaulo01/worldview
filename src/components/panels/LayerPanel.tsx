import { Toggle } from "@/components/ui/Toggle";

interface LayerState {
  flights: boolean;
  satellites: boolean;
  grid: boolean;
}

interface LayerPanelProps {
  layers: LayerState;
  onToggle: (layer: keyof LayerState) => void;
}

export function LayerPanel({ layers, onToggle }: LayerPanelProps) {
  return (
    <div className="panel" style={{ position: "absolute", top: 48, right: 16, width: 180 }}>
      <div className="panel-title">Layers</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Toggle
          label="Flights"
          checked={layers.flights}
          onChange={() => onToggle("flights")}
        />
        <Toggle
          label="Satellites"
          checked={layers.satellites}
          onChange={() => onToggle("satellites")}
        />
        <Toggle
          label="Grid"
          checked={layers.grid}
          onChange={() => onToggle("grid")}
        />
      </div>
    </div>
  );
}
