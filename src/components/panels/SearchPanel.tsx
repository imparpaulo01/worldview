import { useState, useCallback } from "react";
import { Cartesian3 } from "cesium";
import type { Aircraft } from "@/types/opensky";
import type { Satellite } from "@/types/celestrak";

type ResultType = "flight" | "satellite" | "earthquake" | "ship";

interface SearchResult {
  type: ResultType;
  name: string;
  lat: number;
  lon: number;
  alt: number;
}

interface SearchPanelProps {
  viewer: import("cesium").Viewer | null;
  aircraft: Aircraft[];
  satellites: Satellite[];
}

const TYPE_COLORS: Record<ResultType, string> = {
  flight: "var(--color-green)",
  satellite: "var(--color-amber)",
  earthquake: "var(--color-red)",
  ship: "#3388ff",
};

const TYPE_LABELS: Record<ResultType, string> = {
  flight: "AC",
  satellite: "SAT",
  earthquake: "EQ",
  ship: "AIS",
};

export function SearchPanel({ viewer, aircraft, satellites }: SearchPanelProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);

  const handleSearch = useCallback(
    (q: string) => {
      setQuery(q);
      if (q.length < 2) {
        setResults([]);
        return;
      }

      const upper = q.toUpperCase();
      const found: SearchResult[] = [];

      for (const ac of aircraft) {
        if (
          ac.callsign.toUpperCase().includes(upper) ||
          ac.icao24.toUpperCase().includes(upper)
        ) {
          found.push({
            type: "flight",
            name: ac.callsign,
            lat: ac.latitude,
            lon: ac.longitude,
            alt: ac.altitude,
          });
        }
        if (found.length >= 10) break;
      }

      for (const sat of satellites) {
        if (sat.name.toUpperCase().includes(upper)) {
          found.push({
            type: "satellite",
            name: sat.name,
            lat: sat.latitude,
            lon: sat.longitude,
            alt: sat.altitude * 1000,
          });
        }
        if (found.length >= 10) break;
      }

      setResults(found);
    },
    [aircraft, satellites],
  );

  const flyTo = useCallback(
    (lat: number, lon: number, alt: number) => {
      if (!viewer || viewer.isDestroyed()) return;
      viewer.camera.flyTo({
        destination: Cartesian3.fromDegrees(lon, lat, alt + 50000),
        duration: 2,
      });
    },
    [viewer],
  );

  return (
    <div className="panel" style={{ position: "absolute", top: 48, left: 16, width: 240 }}>
      <div className="panel-title">Search</div>
      <input
        type="text"
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Callsign, NORAD ID, vessel..."
        style={{
          width: "100%",
          background: "rgba(255,255,255,0.05)",
          border: "1px solid var(--color-border)",
          borderRadius: 3,
          padding: "6px 8px",
          color: "var(--color-text)",
          fontSize: 11,
          fontFamily: "var(--font-mono)",
          outline: "none",
        }}
      />
      {results.length > 0 && (
        <div style={{ marginTop: 8, maxHeight: 200, overflow: "auto" }}>
          {results.map((r, i) => (
            <button
              key={`${r.type}-${r.name}-${i}`}
              onClick={() => flyTo(r.lat, r.lon, r.alt)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                width: "100%",
                padding: "4px 6px",
                background: "transparent",
                border: "none",
                color: "var(--color-text)",
                cursor: "pointer",
                fontSize: 10,
                fontFamily: "var(--font-mono)",
                textAlign: "left",
              }}
            >
              <span
                style={{
                  color: TYPE_COLORS[r.type],
                  fontSize: 8,
                }}
              >
                {TYPE_LABELS[r.type]}
              </span>
              <span>{r.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
