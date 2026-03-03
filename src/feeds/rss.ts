import { NewsResponseSchema } from "@/types/news";
import type { NewsItem } from "@/types/news";
import { API } from "@/lib/constants";

export async function fetchNews(): Promise<NewsItem[]> {
  try {
    const res = await fetch(API.NEWS);
    if (!res.ok) return [];

    const json: unknown = await res.json();
    const parsed = NewsResponseSchema.safeParse(json);
    if (!parsed.success) {
      // Server returns slightly different shape — normalize
      if (Array.isArray(json)) {
        return (json as NewsItem[]).slice(0, 50);
      }
      return [];
    }

    return parsed.data.slice(0, 50);
  } catch (err) {
    console.warn("News fetch failed:", err);
    return [];
  }
}
