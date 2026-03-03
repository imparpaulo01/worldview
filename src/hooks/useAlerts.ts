import { useState, useRef, useEffect } from "react";
import type { Alert } from "@/types/alerts";
import type { Earthquake } from "@/types/usgs";
import type { ConflictEvent } from "@/types/gdelt";
import type { WeatherAlert } from "@/types/nws";
import type { NewsItem } from "@/types/news";
import { ALERT_THRESHOLDS } from "@/lib/constants";

const MAX_ALERTS = 20;

interface AlertSources {
  earthquakes: Earthquake[];
  conflicts: ConflictEvent[];
  weatherAlerts: WeatherAlert[];
  news: NewsItem[];
}

export function useAlerts(sources: AlertSources) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const seenRef = useRef(new Set<string>());

  useEffect(() => {
    const newAlerts: Alert[] = [];

    // Check earthquakes for magnitude >= threshold
    for (const eq of sources.earthquakes) {
      const key = `eq-${eq.id}`;
      if (seenRef.current.has(key)) continue;
      if (eq.magnitude >= ALERT_THRESHOLDS.EARTHQUAKE_MIN_MAG) {
        seenRef.current.add(key);
        newAlerts.push({
          id: key,
          type: "earthquake",
          title: `M${eq.magnitude.toFixed(1)} — ${eq.place}`,
          description: `Magnitude ${eq.magnitude.toFixed(1)} earthquake detected near ${eq.place}`,
          severity: eq.magnitude >= 7.5 ? "critical" : eq.magnitude >= 6.5 ? "high" : "medium",
          latitude: eq.latitude,
          longitude: eq.longitude,
          timestamp: eq.time,
        });
      }
    }

    // Check conflicts for goldsteinScale <= threshold (more negative = worse)
    for (const conflict of sources.conflicts) {
      const key = `cf-${conflict.id}`;
      if (seenRef.current.has(key)) continue;
      if (conflict.goldsteinScale <= ALERT_THRESHOLDS.CONFLICT_MIN_GOLDSTEIN) {
        seenRef.current.add(key);
        newAlerts.push({
          id: key,
          type: "conflict",
          title: `${conflict.eventType} — ${conflict.country}`,
          description: `${conflict.actor1} vs ${conflict.actor2} (Goldstein ${conflict.goldsteinScale})`,
          severity: conflict.goldsteinScale <= -9 ? "critical" : conflict.goldsteinScale <= -8 ? "high" : "medium",
          latitude: conflict.latitude,
          longitude: conflict.longitude,
          timestamp: conflict.dateAdded,
        });
      }
    }

    // Check weather for severity matching threshold
    for (const wx of sources.weatherAlerts) {
      const key = `wx-${wx.id}`;
      if (seenRef.current.has(key)) continue;
      if (wx.severity === ALERT_THRESHOLDS.WEATHER_SEVERITY) {
        seenRef.current.add(key);
        newAlerts.push({
          id: key,
          type: "weather",
          title: wx.event,
          description: wx.headline || wx.areaDesc,
          severity: "critical",
          latitude: wx.latitude,
          longitude: wx.longitude,
          timestamp: Date.now(),
        });
      }
    }

    // Check news headlines for keyword matches
    const keywords = ALERT_THRESHOLDS.NEWS_KEYWORDS;
    for (const item of sources.news) {
      const key = `nw-${item.id}`;
      if (seenRef.current.has(key)) continue;
      const lower = item.title.toLowerCase();
      const matched = keywords.some((kw) => lower.includes(kw));
      if (matched) {
        seenRef.current.add(key);
        newAlerts.push({
          id: key,
          type: "news",
          title: item.title,
          description: `Source: ${item.source}`,
          severity: "medium",
          latitude: null,
          longitude: null,
          timestamp: Date.now(),
        });
      }
    }

    if (newAlerts.length > 0) {
      setAlerts((prev) => [...newAlerts, ...prev].slice(0, MAX_ALERTS));
    }
  }, [sources.earthquakes, sources.conflicts, sources.weatherAlerts, sources.news]);

  const dismiss = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const dismissAll = () => {
    setAlerts([]);
  };

  return { alerts, dismiss, dismissAll };
}
