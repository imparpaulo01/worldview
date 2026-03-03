import { useState, useCallback } from "react";
import { Cartesian3 } from "cesium";
import type { NewsItem } from "@/types/news";
import { CATEGORY_COLORS, CATEGORY_LABELS } from "@/types/news";
import { findCountryInText } from "@/lib/country-lookup";

type CategoryFilter = "ALL" | "geopolitics" | "defense" | "europe" | "tech" | "disasters";

const FILTER_OPTIONS: { key: CategoryFilter; label: string }[] = [
  { key: "ALL", label: "ALL" },
  { key: "geopolitics", label: "GEO" },
  { key: "defense", label: "DEF" },
  { key: "europe", label: "EU" },
  { key: "tech", label: "TECH" },
  { key: "disasters", label: "DSTR" },
];

interface NewsFeedPanelProps {
  headlines: NewsItem[];
  count: number;
  loading: boolean;
  viewer: import("cesium").Viewer | null;
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  if (diffMs < 0) return "now";

  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m ago`;

  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;

  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function NewsFeedPanel({ headlines, count, loading, viewer }: NewsFeedPanelProps) {
  const [collapsed, setCollapsed] = useState(true);
  const [filter, setFilter] = useState<CategoryFilter>("ALL");

  const filtered = filter === "ALL"
    ? headlines
    : headlines.filter((h) => h.category === filter);

  const flyTo = useCallback(
    (lat: number, lon: number) => {
      if (!viewer || viewer.isDestroyed()) return;
      viewer.camera.flyTo({
        destination: Cartesian3.fromDegrees(lon, lat, 2_000_000),
        duration: 2,
      });
    },
    [viewer],
  );

  if (collapsed) {
    return (
      <button
        className="panel"
        onClick={() => setCollapsed(false)}
        style={{
          position: "absolute",
          top: 48,
          left: 16,
          cursor: "pointer",
          fontSize: 10,
          fontFamily: "var(--font-mono)",
          color: "var(--color-green)",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          border: "1px solid var(--color-border)",
          background: "var(--color-bg-panel)",
          padding: "6px 10px",
        }}
      >
        News [{count}]
      </button>
    );
  }

  return (
    <div
      className="panel"
      style={{
        position: "absolute",
        top: 48,
        left: 16,
        width: 320,
        maxHeight: "calc(100vh - 120px)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="panel-title" style={{ margin: 0 }}>
          News Feed {loading && "(...)"}
        </div>
        <button
          onClick={() => setCollapsed(true)}
          style={{
            background: "none",
            border: "none",
            color: "var(--color-text-dim)",
            cursor: "pointer",
            fontSize: 14,
            fontFamily: "var(--font-mono)",
          }}
        >
          _
        </button>
      </div>

      {/* Category filter buttons */}
      <div style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap" }}>
        {FILTER_OPTIONS.map((opt) => {
          const isActive = filter === opt.key;
          const color = opt.key === "ALL"
            ? "var(--color-green)"
            : CATEGORY_COLORS[opt.key] || "var(--color-text-dim)";
          return (
            <button
              key={opt.key}
              onClick={() => setFilter(opt.key)}
              style={{
                padding: "2px 6px",
                fontSize: 9,
                fontFamily: "var(--font-mono)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                cursor: "pointer",
                border: `1px solid ${isActive ? color : "var(--color-border)"}`,
                borderRadius: 3,
                background: isActive ? "rgba(255,255,255,0.08)" : "transparent",
                color: isActive ? color : "var(--color-text-dim)",
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Scrollable headline list */}
      <div style={{ marginTop: 8, overflowY: "auto", flex: 1 }}>
        {filtered.length === 0 && (
          <div style={{ fontSize: 10, color: "var(--color-text-dim)", padding: 4 }}>
            No headlines
          </div>
        )}
        {filtered.map((item) => {
          const catColor = CATEGORY_COLORS[item.category] || "var(--color-text-dim)";
          const catLabel = CATEGORY_LABELS[item.category] || item.category.toUpperCase();
          const country = findCountryInText(item.title);

          return (
            <div
              key={item.id}
              style={{
                borderLeft: `3px solid ${catColor}`,
                paddingLeft: 8,
                paddingTop: 4,
                paddingBottom: 4,
                marginBottom: 4,
              }}
            >
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: "var(--color-text)",
                  fontSize: 10,
                  fontFamily: "var(--font-mono)",
                  lineHeight: 1.4,
                  textDecoration: "none",
                  display: "block",
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLElement).style.color = "var(--color-green)";
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.color = "var(--color-text)";
                }}
              >
                {item.title}
              </a>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                <span style={{ fontSize: 8, color: catColor, fontFamily: "var(--font-mono)" }}>
                  {catLabel}
                </span>
                <span style={{ fontSize: 8, color: "var(--color-text-dim)", fontFamily: "var(--font-mono)" }}>
                  {item.source}
                </span>
                <span style={{ fontSize: 8, color: "var(--color-text-dim)", fontFamily: "var(--font-mono)" }}>
                  {relativeTime(item.pubDate)}
                </span>
                {country && (
                  <button
                    onClick={() => flyTo(country.lat, country.lon)}
                    style={{
                      fontSize: 8,
                      fontFamily: "var(--font-mono)",
                      color: "var(--color-amber)",
                      background: "rgba(255,165,0,0.1)",
                      border: "1px solid rgba(255,165,0,0.3)",
                      borderRadius: 2,
                      padding: "1px 4px",
                      cursor: "pointer",
                      textTransform: "uppercase",
                    }}
                  >
                    FLY TO
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
