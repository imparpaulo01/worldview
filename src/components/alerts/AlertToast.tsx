import { useEffect, useRef } from "react";
import { Cartesian3 } from "cesium";
import type { Viewer } from "cesium";
import type { Alert } from "@/types/alerts";
import { ALERT_SEVERITY_COLORS } from "@/types/alerts";

const MAX_VISIBLE = 5;
const AUTO_DISMISS_MS = 15_000;

const TYPE_ICONS: Record<Alert["type"], string> = {
  earthquake: "~",
  conflict: "!",
  weather: "*",
  news: ">",
};

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max - 1) + "\u2026" : text;
}

interface AlertToastProps {
  alerts: Alert[];
  onDismiss: (id: string) => void;
  viewer: Viewer | null;
}

export function AlertToast({ alerts, onDismiss, viewer }: AlertToastProps) {
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Auto-dismiss after 15 seconds
  useEffect(() => {
    const timers = timersRef.current;
    for (const alert of alerts) {
      if (!timers.has(alert.id)) {
        const timer = setTimeout(() => {
          onDismiss(alert.id);
          timers.delete(alert.id);
        }, AUTO_DISMISS_MS);
        timers.set(alert.id, timer);
      }
    }

    // Cleanup timers for dismissed alerts
    for (const [id, timer] of timers) {
      if (!alerts.some((a) => a.id === id)) {
        clearTimeout(timer);
        timers.delete(id);
      }
    }
  }, [alerts, onDismiss]);

  // Cleanup all timers on unmount
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const timer of timers.values()) {
        clearTimeout(timer);
      }
      timers.clear();
    };
  }, []);

  const flyTo = (lat: number, lon: number) => {
    if (!viewer) return;
    viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(lon, lat, 500_000),
      duration: 1.5,
    });
  };

  const visible = alerts.slice(0, MAX_VISIBLE);

  if (visible.length === 0) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: 48,
        right: 200,
        display: "flex",
        flexDirection: "column",
        gap: 6,
        zIndex: 900,
        pointerEvents: "auto",
      }}
    >
      {visible.map((alert) => {
        const borderColor = ALERT_SEVERITY_COLORS[alert.severity] ?? "#ffcc00";
        const hasLocation = alert.latitude !== null && alert.longitude !== null;

        return (
          <div
            key={alert.id}
            onClick={() => {
              if (hasLocation) {
                flyTo(alert.latitude!, alert.longitude!);
              }
            }}
            style={{
              width: 280,
              background: "var(--color-bg-panel)",
              borderLeft: `3px solid ${borderColor}`,
              borderTop: "1px solid var(--color-border)",
              borderRight: "1px solid var(--color-border)",
              borderBottom: "1px solid var(--color-border)",
              borderRadius: 4,
              padding: "8px 10px",
              cursor: hasLocation ? "pointer" : "default",
              fontFamily: "var(--font-mono)",
              animation: "fadeIn 0.3s ease-out",
            }}
          >
            {/* Header row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 4,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: borderColor,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  flex: 1,
                  overflow: "hidden",
                }}
              >
                <span style={{ opacity: 0.7 }}>[{TYPE_ICONS[alert.type]}]</span>
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {truncate(alert.title, 60)}
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDismiss(alert.id);
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--color-text-dim)",
                  cursor: "pointer",
                  fontSize: 11,
                  fontFamily: "var(--font-mono)",
                  padding: "0 2px",
                  marginLeft: 6,
                  flexShrink: 0,
                }}
              >
                x
              </button>
            </div>

            {/* Description */}
            <div
              style={{
                fontSize: 9,
                color: "var(--color-text-dim)",
                lineHeight: 1.4,
              }}
            >
              {truncate(alert.description, 80)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
