import { useState, useCallback } from "react";
import { Cartesian3 } from "cesium";
import type { Aircraft } from "@/types/opensky";
import type { Satellite } from "@/types/celestrak";
import type { NewsItem } from "@/types/news";
import { CATEGORY_COLORS, CATEGORY_LABELS } from "@/types/news";
import { findCountryInText } from "@/lib/country-lookup";
import { fetchBrief } from "@/feeds/ai";
import type { BriefData } from "@/feeds/ai";

type Tab = "search" | "news" | "brief";
type ResultType = "flight" | "satellite" | "earthquake" | "ship";
type CategoryFilter = "ALL" | "geopolitics" | "defense" | "europe" | "tech" | "disasters";

interface SearchResult {
  type: ResultType;
  name: string;
  lat: number;
  lon: number;
  alt: number;
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

const FILTER_OPTIONS: { key: CategoryFilter; label: string }[] = [
  { key: "ALL", label: "ALL" },
  { key: "geopolitics", label: "GEO" },
  { key: "defense", label: "DEF" },
  { key: "europe", label: "EU" },
  { key: "tech", label: "TECH" },
  { key: "disasters", label: "DSTR" },
];

interface CommandPanelProps {
  viewer: import("cesium").Viewer | null;
  aircraft: Aircraft[];
  satellites: Satellite[];
  headlines: NewsItem[];
  newsCount: number;
  newsLoading: boolean;
  dataSummary: BriefData;
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  if (diffMs < 0) return "now";
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export function CommandPanel({
  viewer,
  aircraft,
  satellites,
  headlines,
  newsCount,
  newsLoading,
  dataSummary,
}: CommandPanelProps) {
  const [tab, setTab] = useState<Tab>("search");

  // Search state
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);

  // News state
  const [newsFilter, setNewsFilter] = useState<CategoryFilter>("ALL");

  // AI Brief state
  const [brief, setBrief] = useState<string | null>(null);
  const [briefTimestamp, setBriefTimestamp] = useState<string | null>(null);
  const [briefLoading, setBriefLoading] = useState(false);

  const flyTo = useCallback(
    (lon: number, lat: number, alt: number) => {
      if (!viewer || viewer.isDestroyed()) return;
      viewer.camera.flyTo({
        destination: Cartesian3.fromDegrees(lon, lat, alt),
        duration: 2,
      });
    },
    [viewer],
  );

  const handleSearch = useCallback(
    (q: string) => {
      setQuery(q);
      if (q.length < 2) { setResults([]); return; }
      const upper = q.toUpperCase();
      const found: SearchResult[] = [];
      for (const ac of aircraft) {
        if (ac.callsign.toUpperCase().includes(upper) || ac.icao24.toUpperCase().includes(upper)) {
          found.push({ type: "flight", name: ac.callsign, lat: ac.latitude, lon: ac.longitude, alt: ac.altitude });
        }
        if (found.length >= 10) break;
      }
      for (const sat of satellites) {
        if (sat.name.toUpperCase().includes(upper)) {
          found.push({ type: "satellite", name: sat.name, lat: sat.latitude, lon: sat.longitude, alt: sat.altitude * 1000 });
        }
        if (found.length >= 10) break;
      }
      setResults(found);
    },
    [aircraft, satellites],
  );

  const generateBrief = useCallback(async () => {
    setBriefLoading(true);
    const result = await fetchBrief(dataSummary);
    setBrief(result.brief);
    setBriefTimestamp(result.timestamp);
    setBriefLoading(false);
  }, [dataSummary]);

  const filteredNews = newsFilter === "ALL"
    ? headlines
    : headlines.filter((h) => h.category === newsFilter);

  const tabs: { key: Tab; label: string; badge?: number }[] = [
    { key: "search", label: "SEARCH" },
    { key: "news", label: "NEWS", badge: newsCount },
    { key: "brief", label: "AI BRIEF" },
  ];

  return (
    <div
      className="panel"
      style={{
        position: "absolute",
        top: 48,
        left: 16,
        width: 300,
        maxHeight: "calc(100vh - 80px)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Tab bar */}
      <div style={{ display: "flex", gap: 2, marginBottom: 8 }}>
        {tabs.map((t) => {
          const active = tab === t.key;
          const color = t.key === "brief" ? "var(--color-amber)" : "var(--color-green)";
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                flex: 1,
                padding: "5px 4px",
                fontSize: 9,
                fontFamily: "var(--font-mono)",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                cursor: "pointer",
                border: `1px solid ${active ? color : "var(--color-border)"}`,
                borderRadius: 3,
                background: active ? "rgba(255,255,255,0.08)" : "transparent",
                color: active ? color : "var(--color-text-dim)",
              }}
            >
              {t.label}
              {t.badge != null && t.badge > 0 && (
                <span style={{ marginLeft: 4, opacity: 0.7 }}>[{t.badge}]</span>
              )}
            </button>
          );
        })}
      </div>

      {/* === SEARCH TAB === */}
      {tab === "search" && (
        <div style={{ display: "flex", flexDirection: "column" }}>
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
            <div style={{ marginTop: 8, maxHeight: 300, overflow: "auto" }}>
              {results.map((r, i) => (
                <button
                  key={`${r.type}-${r.name}-${i}`}
                  onClick={() => flyTo(r.lon, r.lat, r.alt + 50000)}
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
                  <span style={{ color: TYPE_COLORS[r.type], fontSize: 8 }}>
                    {TYPE_LABELS[r.type]}
                  </span>
                  <span>{r.name}</span>
                </button>
              ))}
            </div>
          )}
          {query.length >= 2 && results.length === 0 && (
            <div style={{ marginTop: 8, fontSize: 10, color: "var(--color-text-dim)" }}>
              No results
            </div>
          )}
        </div>
      )}

      {/* === NEWS TAB === */}
      {tab === "news" && (
        <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
          {/* Category filters */}
          <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginBottom: 8 }}>
            {FILTER_OPTIONS.map((opt) => {
              const isActive = newsFilter === opt.key;
              const color = opt.key === "ALL"
                ? "var(--color-green)"
                : CATEGORY_COLORS[opt.key] || "var(--color-text-dim)";
              return (
                <button
                  key={opt.key}
                  onClick={() => setNewsFilter(opt.key)}
                  style={{
                    padding: "2px 5px",
                    fontSize: 8,
                    fontFamily: "var(--font-mono)",
                    textTransform: "uppercase",
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

          {/* Headlines */}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {newsLoading && filteredNews.length === 0 && (
              <div style={{ fontSize: 10, color: "var(--color-text-dim)", padding: 4 }}>Loading...</div>
            )}
            {filteredNews.length === 0 && !newsLoading && (
              <div style={{ fontSize: 10, color: "var(--color-text-dim)", padding: 4 }}>No headlines</div>
            )}
            {filteredNews.map((item) => {
              const catColor = CATEGORY_COLORS[item.category] || "var(--color-text-dim)";
              const catLabel = CATEGORY_LABELS[item.category] || item.category.toUpperCase();
              const country = findCountryInText(item.title);
              return (
                <div
                  key={item.id}
                  style={{
                    borderLeft: `3px solid ${catColor}`,
                    paddingLeft: 8,
                    paddingTop: 3,
                    paddingBottom: 3,
                    marginBottom: 3,
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
                    onMouseEnter={(e) => { (e.target as HTMLElement).style.color = "var(--color-green)"; }}
                    onMouseLeave={(e) => { (e.target as HTMLElement).style.color = "var(--color-text)"; }}
                  >
                    {item.title}
                  </a>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                    <span style={{ fontSize: 8, color: catColor, fontFamily: "var(--font-mono)" }}>{catLabel}</span>
                    <span style={{ fontSize: 8, color: "var(--color-text-dim)", fontFamily: "var(--font-mono)" }}>{item.source}</span>
                    <span style={{ fontSize: 8, color: "var(--color-text-dim)", fontFamily: "var(--font-mono)" }}>{relativeTime(item.pubDate)}</span>
                    {country && (
                      <button
                        onClick={() => flyTo(country.lon, country.lat, 2_000_000)}
                        style={{
                          fontSize: 7,
                          fontFamily: "var(--font-mono)",
                          color: "var(--color-amber)",
                          background: "rgba(255,165,0,0.1)",
                          border: "1px solid rgba(255,165,0,0.3)",
                          borderRadius: 2,
                          padding: "1px 3px",
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
      )}

      {/* === AI BRIEF TAB === */}
      {tab === "brief" && (
        <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontSize: 9, color: "var(--color-text-dim)", fontFamily: "var(--font-mono)" }}>
              Groq-powered intelligence analysis
            </div>
            <button
              onClick={generateBrief}
              disabled={briefLoading}
              style={{
                background: "rgba(255, 176, 0, 0.15)",
                border: "1px solid var(--color-amber)",
                borderRadius: 3,
                padding: "3px 10px",
                color: "var(--color-amber)",
                cursor: briefLoading ? "wait" : "pointer",
                fontSize: 9,
                fontFamily: "var(--font-mono)",
                fontWeight: 600,
                opacity: briefLoading ? 0.6 : 1,
              }}
            >
              {briefLoading ? "Analyzing..." : brief ? "Refresh" : "Generate"}
            </button>
          </div>

          <div
            style={{
              flex: 1,
              overflow: "auto",
              fontSize: 11,
              lineHeight: 1.6,
              color: "var(--color-text)",
              whiteSpace: "pre-wrap",
            }}
          >
            {brief ?? (
              <span style={{ color: "var(--color-text-dim)", fontStyle: "italic" }}>
                Click Generate to produce an AI situational brief from current dashboard data.
              </span>
            )}
          </div>

          {briefTimestamp && (
            <div style={{ marginTop: 8, fontSize: 9, color: "var(--color-text-dim)", textAlign: "right" }}>
              Generated: {new Date(briefTimestamp).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
