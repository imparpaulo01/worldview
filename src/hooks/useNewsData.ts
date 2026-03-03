import { useState, useEffect, useCallback, useRef } from "react";
import type { NewsItem } from "@/types/news";
import { fetchNews } from "@/feeds/rss";
import { INTERVALS } from "@/lib/constants";

interface NewsDataState {
  headlines: NewsItem[];
  count: number;
  loading: boolean;
  error: string | null;
}

export function useNewsData(enabled = true) {
  const [state, setState] = useState<NewsDataState>({
    headlines: [],
    count: 0,
    loading: false,
    error: null,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setState((prev) => ({ ...prev, loading: true }));

    const headlines = await fetchNews();
    setState({
      headlines,
      count: headlines.length,
      loading: false,
      error: headlines.length === 0 ? "No data" : null,
    });
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    refresh();
    intervalRef.current = setInterval(refresh, INTERVALS.NEWS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled, refresh]);

  return { ...state, refresh };
}
