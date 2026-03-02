import { Toggle } from "@/components/ui/Toggle";

export interface LayerState {
  flights: boolean;
  satellites: boolean;
  grid: boolean;
  earthquakes: boolean;
  ships: boolean;
  fires: boolean;
  weather: boolean;
  conflicts: boolean;
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
        <Toggle label="Flights" checked={layers.flights} onChange={() => onToggle("flights")} />
        <Toggle label="Satellites" checked={layers.satellites} onChange={() => onToggle("satellites")} />
        <Toggle label="Earthquakes" checked={layers.earthquakes} onChange={() => onToggle("earthquakes")} />
        <Toggle label="Ships" checked={layers.ships} onChange={() => onToggle("ships")} />
        <Toggle label="Fires" checked={layers.fires} onChange={() => onToggle("fires")} />
        <Toggle label="Weather" checked={layers.weather} onChange={() => onToggle("weather")} />
        <Toggle label="Conflicts" checked={layers.conflicts} onChange={() => onToggle("conflicts")} />
        <Toggle label="Grid" checked={layers.grid} onChange={() => onToggle("grid")} />
      </div>
    </div>
  );
}
