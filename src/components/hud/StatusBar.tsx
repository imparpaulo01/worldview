import type { FilterMode } from "@/lib/constants";
import { FILTER_LABELS } from "@/lib/constants";

interface FeedStatus {
  label: string;
  active: boolean;
  error?: boolean;
}

interface StatusBarProps {
  feeds: FeedStatus[];
  filterMode: FilterMode;
}

export function StatusBar({ feeds, filterMode }: StatusBarProps) {
  return (
    <div className="status-bar">
      <div className="title">
        WORLDVIEW <span style={{ color: "var(--color-text-dim)", fontWeight: 400, fontSize: 10 }}>v0.1</span>
      </div>

      <div style={{ color: "var(--color-amber)", fontSize: 10 }}>
        [{FILTER_LABELS[filterMode]}]
      </div>

      <div className="feed-status">
        {feeds.map((feed) => (
          <div key={feed.label} className="feed-indicator">
            <div
              className={`dot ${feed.error ? "error" : feed.active ? "active" : ""}`}
            />
            <span>{feed.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
