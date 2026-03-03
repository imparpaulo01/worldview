import { useState, useCallback } from "react";
import { fetchBrief } from "@/feeds/ai";
import type { BriefData } from "@/feeds/ai";

interface AIBriefPanelProps {
  dataSummary: BriefData;
}

export function AIBriefPanel({ dataSummary }: AIBriefPanelProps) {
  const [collapsed, setCollapsed] = useState(true);
  const [brief, setBrief] = useState<string | null>(null);
  const [timestamp, setTimestamp] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = useCallback(async () => {
    setLoading(true);
    const result = await fetchBrief(dataSummary);
    setBrief(result.brief);
    setTimestamp(result.timestamp);
    setLoading(false);
  }, [dataSummary]);

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        style={{
          position: "absolute",
          bottom: 16,
          left: 16,
          background: "rgba(255, 176, 0, 0.15)",
          border: "1px solid var(--color-amber)",
          borderRadius: 4,
          padding: "6px 12px",
          color: "var(--color-amber)",
          cursor: "pointer",
          fontSize: 10,
          fontFamily: "var(--font-mono)",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          textShadow: "0 0 6px rgba(255, 176, 0, 0.4)",
        }}
      >
        AI Brief
      </button>
    );
  }

  const ts = timestamp
    ? new Date(timestamp).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : null;

  return (
    <div
      className="panel"
      style={{
        position: "absolute",
        bottom: 16,
        left: 16,
        width: 360,
        maxHeight: 300,
        display: "flex",
        flexDirection: "column",
        borderColor: "rgba(255, 176, 0, 0.3)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <div
          className="panel-title"
          style={{ color: "var(--color-amber)", margin: 0 }}
        >
          AI Situation Brief
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button
            onClick={generate}
            disabled={loading}
            style={{
              background: "rgba(255, 176, 0, 0.15)",
              border: "1px solid var(--color-amber)",
              borderRadius: 3,
              padding: "2px 8px",
              color: "var(--color-amber)",
              cursor: loading ? "wait" : "pointer",
              fontSize: 9,
              fontFamily: "var(--font-mono)",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Analyzing..." : brief ? "Refresh" : "Generate"}
          </button>
          <button
            onClick={() => setCollapsed(true)}
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 3,
              padding: "2px 6px",
              color: "var(--color-text-dim)",
              cursor: "pointer",
              fontSize: 10,
              fontFamily: "var(--font-mono)",
            }}
          >
            _
          </button>
        </div>
      </div>

      {/* Content */}
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
            Click Generate to create an AI-powered intelligence brief from
            current dashboard data.
          </span>
        )}
      </div>

      {/* Timestamp */}
      {ts && (
        <div
          style={{
            marginTop: 8,
            fontSize: 9,
            color: "var(--color-text-dim)",
            textAlign: "right",
          }}
        >
          Generated: {ts}
        </div>
      )}
    </div>
  );
}
