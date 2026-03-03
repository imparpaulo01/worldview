# WorldView Intelligence Features — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add AI world brief, RSS news feed, breaking alerts, and country risk overlay to WorldView dashboard.

**Architecture:** Server-side collectors for RSS feeds and AI proxy (same pattern as existing GDELT/MeteoAlarm collectors). Frontend panels, hooks, and alert system follow existing patterns (hooks for polling, panels for display, Zod for validation). All API keys stay server-side.

**Tech Stack:** React 19, TypeScript, Cesium, Express, Zod, Groq API, OpenRouter API (fallback)

**Design Doc:** `docs/plans/2026-03-03-intelligence-features-design.md`

---

### Task 0: Fix TypeScript Build Error

**Files:**
- Modify: `src/layers/ConflictLayer.tsx:33-39`

**Step 1: Remove the unused TYPE_ABBREV constant**

Delete lines 33-39 in `ConflictLayer.tsx`:

```typescript
// DELETE these lines:
const TYPE_ABBREV: Record<string, string> = {
  "Protest": "PRT",
  "Coerce": "CRC",
  "Assault": "AST",
  "Fight": "FGT",
  "Mass Violence": "MVL",
};
```

**Step 2: Verify build passes**

Run: `cd /home/paulo/Documentos/IMPAR/JUVENAL/08-repos/internal/worldview && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/layers/ConflictLayer.tsx
git commit -m "fix: remove unused TYPE_ABBREV constant to fix build"
```

---

### Task 1: Add News Types and Country Lookup

**Files:**
- Create: `src/types/news.ts`
- Create: `src/lib/country-lookup.ts`
- Modify: `src/lib/constants.ts`

**Step 1: Create news Zod schema**

Create `src/types/news.ts`:

```typescript
import { z } from "zod";

export const NewsItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  link: z.string(),
  pubDate: z.string(),
  source: z.string(),
  category: z.enum(["geopolitics", "defense", "europe", "tech", "disasters"]),
});

export type NewsItem = z.infer<typeof NewsItemSchema>;

export const NewsResponseSchema = z.array(NewsItemSchema);

export const CATEGORY_COLORS: Record<string, string> = {
  geopolitics: "#ff6b6b",
  defense: "#ffa500",
  europe: "#4dabf7",
  tech: "#51cf66",
  disasters: "#ff3333",
};

export const CATEGORY_LABELS: Record<string, string> = {
  geopolitics: "GEO",
  defense: "DEF",
  europe: "EU",
  tech: "TECH",
  disasters: "DSTR",
};
```

**Step 2: Create country lookup**

Create `src/lib/country-lookup.ts` — maps country names to lat/lon centroids for "fly to" feature. Include ~60 most common countries:

```typescript
/** Country name → centroid coordinates for "fly to" feature */
export const COUNTRY_COORDS: Record<string, { lat: number; lon: number }> = {
  "ukraine": { lat: 48.38, lon: 31.17 },
  "russia": { lat: 61.52, lon: 105.32 },
  "china": { lat: 35.86, lon: 104.20 },
  "united states": { lat: 37.09, lon: -95.71 },
  "us": { lat: 37.09, lon: -95.71 },
  "usa": { lat: 37.09, lon: -95.71 },
  "iran": { lat: 32.43, lon: 53.69 },
  "israel": { lat: 31.05, lon: 34.85 },
  "gaza": { lat: 31.35, lon: 34.31 },
  "palestine": { lat: 31.95, lon: 35.23 },
  "syria": { lat: 34.80, lon: 38.99 },
  "iraq": { lat: 33.22, lon: 43.68 },
  "turkey": { lat: 38.96, lon: 35.24 },
  "india": { lat: 20.59, lon: 78.96 },
  "pakistan": { lat: 30.38, lon: 69.35 },
  "afghanistan": { lat: 33.94, lon: 67.71 },
  "north korea": { lat: 40.34, lon: 127.51 },
  "south korea": { lat: 35.91, lon: 127.77 },
  "japan": { lat: 36.20, lon: 138.25 },
  "taiwan": { lat: 23.70, lon: 120.96 },
  "myanmar": { lat: 21.91, lon: 95.96 },
  "yemen": { lat: 15.55, lon: 48.52 },
  "saudi arabia": { lat: 23.89, lon: 45.08 },
  "egypt": { lat: 26.82, lon: 30.80 },
  "libya": { lat: 26.34, lon: 17.23 },
  "sudan": { lat: 12.86, lon: 30.22 },
  "somalia": { lat: 5.15, lon: 46.20 },
  "ethiopia": { lat: 9.15, lon: 40.49 },
  "nigeria": { lat: 9.08, lon: 8.68 },
  "congo": { lat: -4.04, lon: 21.76 },
  "south africa": { lat: -30.56, lon: 22.94 },
  "brazil": { lat: -14.24, lon: -51.93 },
  "mexico": { lat: 23.63, lon: -102.55 },
  "colombia": { lat: 4.57, lon: -74.30 },
  "venezuela": { lat: 6.42, lon: -66.59 },
  "france": { lat: 46.60, lon: 2.21 },
  "germany": { lat: 51.17, lon: 10.45 },
  "united kingdom": { lat: 55.38, lon: -3.44 },
  "uk": { lat: 55.38, lon: -3.44 },
  "italy": { lat: 41.87, lon: 12.57 },
  "spain": { lat: 40.46, lon: -3.75 },
  "portugal": { lat: 39.40, lon: -8.22 },
  "poland": { lat: 51.92, lon: 19.15 },
  "netherlands": { lat: 52.13, lon: 5.29 },
  "belgium": { lat: 50.85, lon: 4.35 },
  "greece": { lat: 39.07, lon: 21.82 },
  "romania": { lat: 45.94, lon: 24.97 },
  "hungary": { lat: 47.16, lon: 19.50 },
  "serbia": { lat: 44.02, lon: 21.01 },
  "australia": { lat: -25.27, lon: 133.78 },
  "canada": { lat: 56.13, lon: -106.35 },
  "indonesia": { lat: -0.79, lon: 113.92 },
  "philippines": { lat: 12.88, lon: 121.77 },
  "vietnam": { lat: 14.06, lon: 108.28 },
  "thailand": { lat: 15.87, lon: 100.99 },
  "malaysia": { lat: 4.21, lon: 101.98 },
  "lebanon": { lat: 33.85, lon: 35.86 },
  "jordan": { lat: 30.59, lon: 36.24 },
  "mali": { lat: 17.57, lon: -4.00 },
  "mozambique": { lat: -18.67, lon: 35.53 },
  "kenya": { lat: -0.02, lon: 37.91 },
};

/**
 * Try to find a country mention in headline text.
 * Returns first matching country's coordinates, or null.
 */
export function findCountryInText(text: string): { name: string; lat: number; lon: number } | null {
  const lower = text.toLowerCase();
  for (const [name, coords] of Object.entries(COUNTRY_COORDS)) {
    // Match whole words only (avoid "us" matching "focus", "bus", etc.)
    const wordBoundary = name.length <= 3
      ? new RegExp(`\\b${name}\\b`, "i")
      : new RegExp(name, "i");
    if (wordBoundary.test(lower)) {
      return { name, ...coords };
    }
  }
  return null;
}
```

**Step 3: Add constants for new features**

Add to `src/lib/constants.ts`:

```typescript
// Add to API object:
NEWS: "/api/news",
AI_BRIEF: "/api/ai/brief",

// Add to INTERVALS object:
NEWS: 600_000,        // 10 min
AI_BRIEF: 900_000,    // 15 min

// Add new export:
export const ALERT_THRESHOLDS = {
  EARTHQUAKE_MIN_MAG: 6.0,
  CONFLICT_MIN_GOLDSTEIN: -7,
  WEATHER_SEVERITY: "Extreme",
  NEWS_KEYWORDS: ["breaking", "attack", "explosion", "missile", "earthquake", "tsunami", "war"],
} as const;

export const LIMITS_NEWS = {
  MAX_HEADLINES: 200,
  MAX_DISPLAY: 50,
} as const;
```

**Step 4: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: No errors (new files have no consumers yet)

**Step 5: Commit**

```bash
git add src/types/news.ts src/lib/country-lookup.ts src/lib/constants.ts
git commit -m "feat: add news types, country lookup, and alert threshold constants"
```

---

### Task 2: RSS Collector Backend

**Files:**
- Create: `server/rss-collector.ts`
- Modify: `server/proxy.ts` (add `/api/news` route)
- Modify: `vite.config.ts` (add dev middleware for `/api/news`)

**Step 1: Create RSS collector**

Create `server/rss-collector.ts` following the MeteoAlarm collector pattern (in-memory cache, periodic fetch, regex XML parsing, no dependencies):

```typescript
/**
 * RSS Collector — fetches curated news feeds and caches headlines.
 * Pattern: same as meteoalarm-collector.ts (regex XML parse, in-memory cache, periodic refresh).
 * No auth required. No external dependencies.
 */

const REFRESH_MS = 10 * 60_000; // 10 minutes
const MAX_HEADLINES = 200;

interface RSSFeed {
  url: string;
  source: string;
  category: "geopolitics" | "defense" | "europe" | "tech" | "disasters";
}

const FEEDS: RSSFeed[] = [
  // Geopolitics
  { url: "https://feeds.reuters.com/Reuters/worldNews", source: "Reuters", category: "geopolitics" },
  { url: "https://feeds.bbci.co.uk/news/world/rss.xml", source: "BBC World", category: "geopolitics" },
  { url: "https://www.aljazeera.com/xml/rss/all.xml", source: "Al Jazeera", category: "geopolitics" },
  { url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml", source: "NY Times", category: "geopolitics" },
  // Defense & Security
  { url: "https://www.defenseone.com/rss/all/", source: "Defense One", category: "defense" },
  { url: "https://www.janes.com/feeds/news", source: "Janes", category: "defense" },
  { url: "https://www.thedefensepost.com/feed/", source: "Defense Post", category: "defense" },
  { url: "https://breakingdefense.com/feed/", source: "Breaking Defense", category: "defense" },
  // EU / Europe
  { url: "https://euobserver.com/rss.xml", source: "EU Observer", category: "europe" },
  { url: "https://www.euractiv.com/feed/", source: "EurActiv", category: "europe" },
  { url: "https://www.politico.eu/feed/", source: "Politico EU", category: "europe" },
  // Tech & Cyber
  { url: "https://feeds.arstechnica.com/arstechnica/index", source: "Ars Technica", category: "tech" },
  { url: "https://www.theregister.com/headlines.atom", source: "The Register", category: "tech" },
  { url: "https://feeds.wired.com/wired/index", source: "Wired", category: "tech" },
  { url: "https://www.bleepingcomputer.com/feed/", source: "BleepingComputer", category: "tech" },
  // Disasters
  { url: "https://reliefweb.int/updates/rss.xml", source: "ReliefWeb", category: "disasters" },
  { url: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_month.atom", source: "USGS", category: "disasters" },
  { url: "https://www.gdacs.org/xml/rss.xml", source: "GDACS", category: "disasters" },
];

interface NewsHeadline {
  id: string;
  title: string;
  link: string;
  pubDate: string;
  source: string;
  category: string;
}

/** Extract text content of an XML tag (handles CDATA) */
function xmlText(xml: string, tag: string): string {
  // Try CDATA first
  const cdataRe = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, "i");
  const cdataMatch = xml.match(cdataRe);
  if (cdataMatch) return cdataMatch[1].trim();

  // Plain text
  const re = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, "i");
  const m = xml.match(re);
  return m?.[1]?.trim() || "";
}

/** Extract href from Atom link tag */
function atomLink(xml: string): string {
  const m = xml.match(/<link[^>]*href="([^"]+)"[^>]*\/?>|<link[^>]*>([^<]*)<\/link>/i);
  return m?.[1]?.trim() || m?.[2]?.trim() || "";
}

/** Parse RSS 2.0 items or Atom entries */
function parseItems(xml: string, feed: RSSFeed): NewsHeadline[] {
  const items: NewsHeadline[] = [];
  const isAtom = xml.includes("<feed") || xml.includes("<entry>");

  if (isAtom) {
    const entries = xml.split(/<entry>/i).slice(1);
    for (const entry of entries) {
      const title = xmlText(entry, "title");
      const link = atomLink(entry);
      const pubDate = xmlText(entry, "published") || xmlText(entry, "updated");
      if (title && link) {
        items.push({
          id: `${feed.source}-${Buffer.from(link).toString("base64url").slice(0, 16)}`,
          title: title.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").replace(/&quot;/g, '"'),
          link,
          pubDate: pubDate || new Date().toISOString(),
          source: feed.source,
          category: feed.category,
        });
      }
    }
  } else {
    const rssItems = xml.split(/<item>/i).slice(1);
    for (const item of rssItems) {
      const title = xmlText(item, "title");
      const link = xmlText(item, "link") || atomLink(item);
      const pubDate = xmlText(item, "pubDate") || xmlText(item, "dc:date");
      if (title && link) {
        items.push({
          id: `${feed.source}-${Buffer.from(link).toString("base64url").slice(0, 16)}`,
          title: title.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").replace(/&quot;/g, '"'),
          link,
          pubDate: pubDate || new Date().toISOString(),
          source: feed.source,
          category: feed.category,
        });
      }
    }
  }

  return items;
}

/** Fetch a single RSS feed */
async function fetchFeed(feed: RSSFeed): Promise<NewsHeadline[]> {
  try {
    const r = await fetch(feed.url, {
      signal: AbortSignal.timeout(10_000),
      headers: { "User-Agent": "WorldView/0.1 News Aggregator" },
    });
    if (!r.ok) return [];
    const xml = await r.text();
    return parseItems(xml, feed);
  } catch {
    return [];
  }
}

// In-memory cache
let cachedNews: NewsHeadline[] = [];
let refreshTimer: ReturnType<typeof setInterval> | null = null;
let lastFetch = 0;

/** Fetch all RSS feeds */
async function fetchAll(): Promise<void> {
  const now = Date.now();
  if (now - lastFetch < 5 * 60_000) return;
  lastFetch = now;

  console.log("[RSS] Fetching news from all feeds...");

  const results = await Promise.allSettled(
    FEEDS.map((feed) => fetchFeed(feed)),
  );

  const headlineMap = new Map<string, NewsHeadline>();
  for (const result of results) {
    if (result.status === "fulfilled") {
      for (const item of result.value) {
        headlineMap.set(item.id, item);
      }
    }
  }

  // Sort by date (newest first) and cap
  cachedNews = [...headlineMap.values()]
    .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
    .slice(0, MAX_HEADLINES);

  const feedCount = results.filter(r => r.status === "fulfilled" && r.value.length > 0).length;
  console.log(`[RSS] Loaded ${cachedNews.length} headlines from ${feedCount}/${FEEDS.length} feeds`);
}

export function getNews(): NewsHeadline[] {
  return cachedNews;
}

export function startRSSCollector(): void {
  console.log("[RSS] Starting news feed collector (10-min refresh)");
  fetchAll();
  refreshTimer = setInterval(fetchAll, REFRESH_MS);
}

export function stopRSSCollector(): void {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}
```

**Step 2: Add `/api/news` to Express proxy**

In `server/proxy.ts`, add import and route:

```typescript
// Add import at top:
import { startRSSCollector, getNews } from "./rss-collector.ts";

// Add after startMeteoAlarmCollector():
startRSSCollector();

// Add route before SPA fallback:
app.get("/api/news", (_req, res) => {
  res.json(getNews());
});
```

**Step 3: Add `/api/news` to Vite dev config**

In `vite.config.ts`, add inside the `aisCollectorPlugin()` function's `configureServer()`:

```typescript
// Add import at top (alongside other collector imports):
import { startRSSCollector, getNews } from "./server/rss-collector.ts";

// Add inside configureServer(), after MeteoAlarm middleware:
startRSSCollector();

server.middlewares.use("/api/news", (_req, res) => {
  const news = getNews();
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(news));
});
```

**Step 4: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```bash
git add server/rss-collector.ts server/proxy.ts vite.config.ts
git commit -m "feat: add RSS news collector with 18 curated feeds"
```

---

### Task 3: AI Brief Handler Backend

**Files:**
- Create: `server/ai-handler.ts`
- Modify: `server/proxy.ts` (add `/api/ai/brief` route)
- Modify: `vite.config.ts` (add dev middleware)
- Modify: `.env.example` (add new env vars)

**Step 1: Create AI handler**

Create `server/ai-handler.ts`:

```typescript
/**
 * AI Brief Handler — proxies requests to Groq (primary) or OpenRouter (fallback).
 * API keys stay server-side. Frontend sends data summary, gets back intelligence brief.
 */

interface BriefRequest {
  flights: number;
  satellites: number;
  earthquakes: { count: number; maxMag: number; locations: string[] };
  conflicts: { count: number; topRegions: string[] };
  weather: { count: number; severeCount: number };
  fires: number;
  ships: number;
}

const SYSTEM_PROMPT = `You are a concise geospatial intelligence analyst for the WorldView dashboard. Given real-time monitoring data, produce a situational brief in 150-250 words. Structure:

1. **Priority Alerts** — Most significant events requiring attention (1-2 sentences)
2. **Regional Activity** — Notable patterns by region (2-3 sentences)
3. **Assessment** — Overall global activity level and trend (1 sentence)

Rules:
- Be factual and precise. No speculation.
- Use military/intelligence style: terse, active voice.
- Reference specific numbers from the data.
- If data is sparse, say so. Never fabricate.`;

function buildUserPrompt(data: BriefRequest): string {
  const lines = [
    `Current monitoring data snapshot:`,
    `- ${data.flights} aircraft tracked`,
    `- ${data.satellites} satellites tracked`,
    `- ${data.earthquakes.count} earthquakes (max magnitude: ${data.earthquakes.maxMag.toFixed(1)}${data.earthquakes.locations.length > 0 ? `, notable: ${data.earthquakes.locations.join(", ")}` : ""})`,
    `- ${data.conflicts.count} conflict events${data.conflicts.topRegions.length > 0 ? ` (hot regions: ${data.conflicts.topRegions.join(", ")})` : ""}`,
    `- ${data.weather.count} weather alerts (${data.weather.severeCount} severe/extreme)`,
    `- ${data.fires} active wildfires`,
    `- ${data.ships} vessels tracked`,
  ];
  return lines.join("\n");
}

async function callGroq(systemPrompt: string, userPrompt: string, apiKey: string): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 500,
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    throw new Error(`Groq API error: ${res.status}`);
  }

  const json = await res.json() as { choices: Array<{ message: { content: string } }> };
  return json.choices[0]?.message?.content || "Brief generation failed.";
}

async function callOpenRouter(systemPrompt: string, userPrompt: string, apiKey: string): Promise<string> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "meta-llama/llama-3.3-70b-instruct",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 500,
    }),
    signal: AbortSignal.timeout(20_000),
  });

  if (!res.ok) {
    throw new Error(`OpenRouter API error: ${res.status}`);
  }

  const json = await res.json() as { choices: Array<{ message: { content: string } }> };
  return json.choices[0]?.message?.content || "Brief generation failed.";
}

export async function generateBrief(data: BriefRequest): Promise<string> {
  const userPrompt = buildUserPrompt(data);
  const groqKey = process.env.GROQ_API_KEY;
  const orKey = process.env.OPENROUTER_API_KEY;

  // Try Groq first (free, fast)
  if (groqKey) {
    try {
      return await callGroq(SYSTEM_PROMPT, userPrompt, groqKey);
    } catch (err) {
      console.warn("[AI] Groq failed, trying OpenRouter:", err);
    }
  }

  // Fallback to OpenRouter
  if (orKey) {
    try {
      return await callOpenRouter(SYSTEM_PROMPT, userPrompt, orKey);
    } catch (err) {
      console.warn("[AI] OpenRouter failed:", err);
    }
  }

  return "AI brief unavailable — no API keys configured. Set GROQ_API_KEY or OPENROUTER_API_KEY.";
}
```

**Step 2: Add `/api/ai/brief` to Express proxy**

In `server/proxy.ts`:

```typescript
// Add import:
import { generateBrief } from "./ai-handler.ts";

// Add json body parser (needed for POST):
app.use(express.json());

// Add route before SPA fallback:
app.post("/api/ai/brief", async (req, res) => {
  try {
    const brief = await generateBrief(req.body);
    res.json({ brief, timestamp: new Date().toISOString() });
  } catch {
    res.status(500).json({ error: "Brief generation failed" });
  }
});
```

**Step 3: Add `/api/ai/brief` to Vite dev config**

In `vite.config.ts` inside `configureServer()`:

```typescript
// Add import at top:
import { generateBrief } from "./server/ai-handler.ts";

// Add middleware (after RSS, before closing bracket):
server.middlewares.use("/api/ai/brief", async (req, res) => {
  if (req.method !== "POST") {
    res.writeHead(405);
    res.end(JSON.stringify({ error: "POST only" }));
    return;
  }
  let body = "";
  req.on("data", (chunk: Buffer) => { body += chunk.toString(); });
  req.on("end", async () => {
    try {
      const data = JSON.parse(body);
      const brief = await generateBrief(data);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ brief, timestamp: new Date().toISOString() }));
    } catch {
      res.writeHead(500);
      res.end(JSON.stringify({ error: "Brief generation failed" }));
    }
  });
});
```

**Step 4: Update `.env.example`**

Add to `.env.example`:

```
# AI Brief — Groq API key (primary, free)
# Get yours at https://console.groq.com
GROQ_API_KEY=

# AI Brief — OpenRouter API key (fallback, paid)
# Get yours at https://openrouter.ai
OPENROUTER_API_KEY=
```

**Step 5: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 6: Commit**

```bash
git add server/ai-handler.ts server/proxy.ts vite.config.ts .env.example
git commit -m "feat: add AI brief handler with Groq primary + OpenRouter fallback"
```

---

### Task 4: News Feed Frontend (Hook + Feed + Panel)

**Files:**
- Create: `src/feeds/rss.ts`
- Create: `src/hooks/useNewsData.ts`
- Create: `src/components/panels/NewsFeedPanel.tsx`

**Step 1: Create RSS feed fetcher**

Create `src/feeds/rss.ts`:

```typescript
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
```

**Step 2: Create news data hook**

Create `src/hooks/useNewsData.ts`:

```typescript
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
```

**Step 3: Create NewsFeedPanel component**

Create `src/components/panels/NewsFeedPanel.tsx`:

```typescript
import { useState } from "react";
import type { NewsItem } from "@/types/news";
import { CATEGORY_COLORS, CATEGORY_LABELS } from "@/types/news";
import { findCountryInText } from "@/lib/country-lookup";
import type { Viewer } from "cesium";
import { Cartesian3 } from "cesium";

interface NewsFeedPanelProps {
  headlines: NewsItem[];
  count: number;
  loading: boolean;
  viewer: Viewer | null;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

export function NewsFeedPanel({ headlines, count, loading, viewer }: NewsFeedPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  const filtered = filterCategory
    ? headlines.filter((h) => h.category === filterCategory)
    : headlines;

  const flyTo = (lat: number, lon: number) => {
    if (!viewer || viewer.isDestroyed()) return;
    viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(lon, lat, 2_000_000),
      duration: 1.5,
    });
  };

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        style={{
          position: "absolute",
          top: 48,
          left: 16,
          background: "var(--color-bg-panel)",
          border: "1px solid var(--color-border)",
          borderRadius: 4,
          padding: "6px 10px",
          color: "var(--color-green)",
          cursor: "pointer",
          fontSize: 10,
          fontFamily: "var(--font-mono)",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
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
          News Feed {loading && <span style={{ color: "var(--color-amber)" }}>...</span>}
        </div>
        <button
          onClick={() => setCollapsed(true)}
          style={{
            background: "none",
            border: "none",
            color: "var(--color-text-dim)",
            cursor: "pointer",
            fontSize: 12,
            fontFamily: "var(--font-mono)",
          }}
        >
          _
        </button>
      </div>

      {/* Category filters */}
      <div style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap" }}>
        <button
          onClick={() => setFilterCategory(null)}
          style={{
            background: !filterCategory ? "var(--color-green)" : "transparent",
            color: !filterCategory ? "var(--color-bg)" : "var(--color-text-dim)",
            border: "1px solid var(--color-border)",
            borderRadius: 2,
            padding: "2px 6px",
            fontSize: 9,
            cursor: "pointer",
            fontFamily: "var(--font-mono)",
          }}
        >
          ALL
        </button>
        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilterCategory(filterCategory === key ? null : key)}
            style={{
              background: filterCategory === key ? CATEGORY_COLORS[key] : "transparent",
              color: filterCategory === key ? "var(--color-bg)" : CATEGORY_COLORS[key],
              border: `1px solid ${CATEGORY_COLORS[key]}40`,
              borderRadius: 2,
              padding: "2px 6px",
              fontSize: 9,
              cursor: "pointer",
              fontFamily: "var(--font-mono)",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Headlines */}
      <div
        style={{
          marginTop: 8,
          overflowY: "auto",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        {filtered.length === 0 && (
          <div style={{ color: "var(--color-text-dim)", fontSize: 10, padding: 8 }}>
            No headlines available
          </div>
        )}
        {filtered.map((item) => {
          const country = findCountryInText(item.title);
          return (
            <div
              key={item.id}
              style={{
                borderLeft: `2px solid ${CATEGORY_COLORS[item.category] || "var(--color-border)"}`,
                paddingLeft: 8,
                fontSize: 11,
                lineHeight: 1.4,
              }}
            >
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: "var(--color-text)",
                  textDecoration: "none",
                }}
                onMouseEnter={(e) => { (e.target as HTMLElement).style.color = "var(--color-green)"; }}
                onMouseLeave={(e) => { (e.target as HTMLElement).style.color = "var(--color-text)"; }}
              >
                {item.title}
              </a>
              <div style={{ display: "flex", gap: 8, marginTop: 2, alignItems: "center" }}>
                <span style={{ color: CATEGORY_COLORS[item.category], fontSize: 9 }}>
                  {item.source}
                </span>
                <span style={{ color: "var(--color-text-dim)", fontSize: 9 }}>
                  {timeAgo(item.pubDate)}
                </span>
                {country && (
                  <button
                    onClick={() => flyTo(country.lat, country.lon)}
                    style={{
                      background: "none",
                      border: "1px solid var(--color-border)",
                      borderRadius: 2,
                      color: "var(--color-amber)",
                      fontSize: 8,
                      cursor: "pointer",
                      padding: "0 4px",
                      fontFamily: "var(--font-mono)",
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
```

**Step 4: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```bash
git add src/feeds/rss.ts src/hooks/useNewsData.ts src/components/panels/NewsFeedPanel.tsx
git commit -m "feat: add news feed panel with category filters and fly-to"
```

---

### Task 5: AI Brief Frontend (Feed + Panel)

**Files:**
- Create: `src/feeds/ai.ts`
- Create: `src/components/panels/AIBriefPanel.tsx`

**Step 1: Create AI brief API caller**

Create `src/feeds/ai.ts`:

```typescript
import { API } from "@/lib/constants";

interface BriefData {
  flights: number;
  satellites: number;
  earthquakes: { count: number; maxMag: number; locations: string[] };
  conflicts: { count: number; topRegions: string[] };
  weather: { count: number; severeCount: number };
  fires: number;
  ships: number;
}

interface BriefResponse {
  brief: string;
  timestamp: string;
}

export async function fetchBrief(data: BriefData): Promise<BriefResponse> {
  try {
    const res = await fetch(API.AI_BRIEF, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      return { brief: `Error: ${res.status}`, timestamp: new Date().toISOString() };
    }
    return await res.json() as BriefResponse;
  } catch (err) {
    return { brief: `Network error: ${err}`, timestamp: new Date().toISOString() };
  }
}
```

**Step 2: Create AIBriefPanel component**

Create `src/components/panels/AIBriefPanel.tsx`:

```typescript
import { useState, useCallback } from "react";
import { fetchBrief } from "@/feeds/ai";

interface DataSummary {
  flights: number;
  satellites: number;
  earthquakes: { count: number; maxMag: number; locations: string[] };
  conflicts: { count: number; topRegions: string[] };
  weather: { count: number; severeCount: number };
  fires: number;
  ships: number;
}

interface AIBriefPanelProps {
  dataSummary: DataSummary;
}

export function AIBriefPanel({ dataSummary }: AIBriefPanelProps) {
  const [brief, setBrief] = useState<string | null>(null);
  const [timestamp, setTimestamp] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

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
          background: "var(--color-bg-panel)",
          border: "1px solid var(--color-border)",
          borderRadius: 4,
          padding: "6px 10px",
          color: "var(--color-amber)",
          cursor: "pointer",
          fontSize: 10,
          fontFamily: "var(--font-mono)",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
        }}
      >
        AI Brief
      </button>
    );
  }

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
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="panel-title" style={{ margin: 0, color: "var(--color-amber)" }}>
          AI Situation Brief
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={generate}
            disabled={loading}
            style={{
              background: loading ? "transparent" : "var(--color-amber)",
              color: loading ? "var(--color-amber)" : "var(--color-bg)",
              border: `1px solid var(--color-amber)`,
              borderRadius: 2,
              padding: "2px 8px",
              fontSize: 9,
              cursor: loading ? "wait" : "pointer",
              fontFamily: "var(--font-mono)",
              textTransform: "uppercase",
            }}
          >
            {loading ? "Analyzing..." : brief ? "Refresh" : "Generate"}
          </button>
          <button
            onClick={() => setCollapsed(true)}
            style={{
              background: "none",
              border: "none",
              color: "var(--color-text-dim)",
              cursor: "pointer",
              fontSize: 12,
              fontFamily: "var(--font-mono)",
            }}
          >
            _
          </button>
        </div>
      </div>

      {/* Brief content */}
      <div
        style={{
          marginTop: 8,
          fontSize: 11,
          lineHeight: 1.7,
          color: "var(--color-text)",
          overflowY: "auto",
          flex: 1,
          whiteSpace: "pre-wrap",
        }}
      >
        {!brief && !loading && (
          <div style={{ color: "var(--color-text-dim)", fontSize: 10 }}>
            Click Generate to create an AI-powered intelligence brief from current dashboard data.
          </div>
        )}
        {loading && (
          <div style={{ color: "var(--color-amber)", fontSize: 10 }}>
            Analyzing live data streams...
          </div>
        )}
        {brief && !loading && brief}
      </div>

      {/* Timestamp */}
      {timestamp && !loading && (
        <div style={{ marginTop: 6, fontSize: 9, color: "var(--color-text-dim)" }}>
          Generated: {new Date(timestamp).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}
```

**Step 3: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/feeds/ai.ts src/components/panels/AIBriefPanel.tsx
git commit -m "feat: add AI situation brief panel with Groq/OpenRouter integration"
```

---

### Task 6: Alert System (Hook + Toast)

**Files:**
- Create: `src/types/alerts.ts`
- Create: `src/hooks/useAlerts.ts`
- Create: `src/components/alerts/AlertToast.tsx`

**Step 1: Create alert types**

Create `src/types/alerts.ts`:

```typescript
export interface Alert {
  id: string;
  type: "earthquake" | "conflict" | "weather" | "news";
  title: string;
  description: string;
  severity: "critical" | "high" | "medium";
  latitude: number | null;
  longitude: number | null;
  timestamp: number;
}

export const ALERT_SEVERITY_COLORS: Record<string, string> = {
  critical: "#ff0000",
  high: "#ff6600",
  medium: "#ffcc00",
};
```

**Step 2: Create alert detection hook**

Create `src/hooks/useAlerts.ts`:

```typescript
import { useState, useEffect, useRef } from "react";
import type { Alert } from "@/types/alerts";
import type { Earthquake } from "@/types/usgs";
import type { ConflictEvent } from "@/types/gdelt";
import type { WeatherAlert } from "@/types/nws";
import type { NewsItem } from "@/types/news";
import { ALERT_THRESHOLDS } from "@/lib/constants";

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

    // Check earthquakes
    for (const q of sources.earthquakes) {
      if (q.magnitude >= ALERT_THRESHOLDS.EARTHQUAKE_MIN_MAG) {
        const id = `quake-${q.id}`;
        if (!seenRef.current.has(id)) {
          seenRef.current.add(id);
          newAlerts.push({
            id,
            type: "earthquake",
            title: `M${q.magnitude.toFixed(1)} Earthquake`,
            description: q.place || "Unknown location",
            severity: q.magnitude >= 7 ? "critical" : "high",
            latitude: q.latitude,
            longitude: q.longitude,
            timestamp: Date.now(),
          });
        }
      }
    }

    // Check conflicts
    for (const c of sources.conflicts) {
      if (c.goldsteinScale <= ALERT_THRESHOLDS.CONFLICT_MIN_GOLDSTEIN) {
        const id = `conflict-alert-${c.id}`;
        if (!seenRef.current.has(id)) {
          seenRef.current.add(id);
          newAlerts.push({
            id,
            type: "conflict",
            title: `${c.eventType} — ${c.country}`,
            description: `${c.actor1}${c.actor2 ? ` vs ${c.actor2}` : ""} (Goldstein: ${c.goldsteinScale.toFixed(1)})`,
            severity: c.goldsteinScale <= -9 ? "critical" : "high",
            latitude: c.latitude,
            longitude: c.longitude,
            timestamp: Date.now(),
          });
        }
      }
    }

    // Check weather
    for (const w of sources.weatherAlerts) {
      if (w.severity === ALERT_THRESHOLDS.WEATHER_SEVERITY) {
        const id = `wx-alert-${w.id}`;
        if (!seenRef.current.has(id)) {
          seenRef.current.add(id);
          newAlerts.push({
            id,
            type: "weather",
            title: `Extreme Weather: ${w.event}`,
            description: w.headline || w.areaDesc || "",
            severity: "critical",
            latitude: w.latitude ?? null,
            longitude: w.longitude ?? null,
            timestamp: Date.now(),
          });
        }
      }
    }

    // Check breaking news keywords
    for (const n of sources.news) {
      const lower = n.title.toLowerCase();
      const isBreaking = ALERT_THRESHOLDS.NEWS_KEYWORDS.some((kw) => lower.includes(kw));
      if (isBreaking) {
        const id = `news-alert-${n.id}`;
        if (!seenRef.current.has(id)) {
          seenRef.current.add(id);
          newAlerts.push({
            id,
            type: "news",
            title: n.title,
            description: n.source,
            severity: "medium",
            latitude: null,
            longitude: null,
            timestamp: Date.now(),
          });
        }
      }
    }

    if (newAlerts.length > 0) {
      setAlerts((prev) => [...newAlerts, ...prev].slice(0, 20));
    }
  }, [sources.earthquakes, sources.conflicts, sources.weatherAlerts, sources.news]);

  const dismiss = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const dismissAll = () => setAlerts([]);

  return { alerts, dismiss, dismissAll };
}
```

**Step 3: Create AlertToast component**

Create `src/components/alerts/AlertToast.tsx`:

```typescript
import { useEffect } from "react";
import type { Alert } from "@/types/alerts";
import { ALERT_SEVERITY_COLORS } from "@/types/alerts";
import type { Viewer } from "cesium";
import { Cartesian3 } from "cesium";

interface AlertToastProps {
  alerts: Alert[];
  onDismiss: (id: string) => void;
  viewer: Viewer | null;
}

const TYPE_ICONS: Record<string, string> = {
  earthquake: "~",
  conflict: "!",
  weather: "*",
  news: ">",
};

export function AlertToast({ alerts, onDismiss, viewer }: AlertToastProps) {
  // Auto-dismiss after 15 seconds
  useEffect(() => {
    if (alerts.length === 0) return;
    const timers = alerts.map((a) =>
      setTimeout(() => onDismiss(a.id), 15_000),
    );
    return () => timers.forEach(clearTimeout);
  }, [alerts, onDismiss]);

  const flyTo = (lat: number | null, lon: number | null) => {
    if (!viewer || viewer.isDestroyed() || lat == null || lon == null) return;
    viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(lon, lat, 1_000_000),
      duration: 1.5,
    });
  };

  if (alerts.length === 0) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: 48,
        right: 200,
        display: "flex",
        flexDirection: "column",
        gap: 6,
        maxWidth: 340,
        zIndex: 20,
      }}
    >
      {alerts.slice(0, 5).map((alert) => (
        <div
          key={alert.id}
          style={{
            background: "var(--color-bg-panel)",
            border: `1px solid ${ALERT_SEVERITY_COLORS[alert.severity]}`,
            borderLeft: `3px solid ${ALERT_SEVERITY_COLORS[alert.severity]}`,
            borderRadius: 4,
            padding: "8px 10px",
            cursor: alert.latitude != null ? "pointer" : "default",
            animation: "fadeIn 0.3s ease-out",
          }}
          onClick={() => flyTo(alert.latitude, alert.longitude)}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span
                style={{
                  color: ALERT_SEVERITY_COLORS[alert.severity],
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                }}
              >
                [{TYPE_ICONS[alert.type] || "!"}]
              </span>
              <span style={{ fontSize: 10, color: "var(--color-text)", fontWeight: 600 }}>
                {alert.title.length > 60 ? alert.title.slice(0, 57) + "..." : alert.title}
              </span>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onDismiss(alert.id); }}
              style={{
                background: "none",
                border: "none",
                color: "var(--color-text-dim)",
                cursor: "pointer",
                fontSize: 10,
                fontFamily: "var(--font-mono)",
                padding: "0 2px",
              }}
            >
              x
            </button>
          </div>
          {alert.description && (
            <div style={{ fontSize: 9, color: "var(--color-text-dim)", marginTop: 2 }}>
              {alert.description.length > 80 ? alert.description.slice(0, 77) + "..." : alert.description}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

**Step 4: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```bash
git add src/types/alerts.ts src/hooks/useAlerts.ts src/components/alerts/AlertToast.tsx
git commit -m "feat: add breaking news alert system with threshold detection"
```

---

### Task 7: Wire Everything into GlobeViewer

**Files:**
- Modify: `src/components/GlobeViewer.tsx`
- Modify: `src/styles/globals.css` (add fadeIn animation)

**Step 1: Add fadeIn keyframe to globals.css**

Append to `src/styles/globals.css`:

```css
@keyframes fadeIn {
  from { opacity: 0; transform: translateX(20px); }
  to { opacity: 1; transform: translateX(0); }
}
```

**Step 2: Wire new features into GlobeViewer**

In `src/components/GlobeViewer.tsx`:

1. Add imports at top:

```typescript
import { useNewsData } from "@/hooks/useNewsData";
import { useAlerts } from "@/hooks/useAlerts";
import { NewsFeedPanel } from "@/components/panels/NewsFeedPanel";
import { AIBriefPanel } from "@/components/panels/AIBriefPanel";
import { AlertToast } from "@/components/alerts/AlertToast";
```

2. Add hooks after `conflictData` (around line 76):

```typescript
const newsData = useNewsData(true);

const alertSources = {
  earthquakes: quakeData.earthquakes,
  conflicts: conflictData.conflicts,
  weatherAlerts: weatherData.alerts,
  news: newsData.headlines,
};
const { alerts, dismiss: dismissAlert } = useAlerts(alertSources);
```

3. Build AI data summary (after the hooks, before the return):

```typescript
const aiDataSummary = {
  flights: flightData.count,
  satellites: satData.count,
  earthquakes: {
    count: quakeData.count,
    maxMag: quakeData.earthquakes.reduce((max, q) => Math.max(max, q.magnitude), 0),
    locations: quakeData.earthquakes
      .filter((q) => q.magnitude >= 5)
      .map((q) => q.place || "Unknown")
      .slice(0, 3),
  },
  conflicts: {
    count: conflictData.count,
    topRegions: [...new Set(conflictData.conflicts.map((c) => c.country))].slice(0, 5),
  },
  weather: {
    count: weatherData.count,
    severeCount: weatherData.alerts.filter((a) => a.severity === "Extreme" || a.severity === "Severe").length,
  },
  fires: fireData.count,
  ships: aisData.count,
};
```

4. Add NEWS feed indicator to feeds array (line ~243):

```typescript
{ label: "NEWS", active: newsData.count > 0, error: !!newsData.error },
```

5. Render new panels inside the `<div className="hud-overlay">` block, before the closing `</div>`:

```tsx
{/* News feed panel */}
<NewsFeedPanel
  headlines={newsData.headlines}
  count={newsData.count}
  loading={newsData.loading}
  viewer={viewer}
/>

{/* AI Brief panel */}
<AIBriefPanel dataSummary={aiDataSummary} />

{/* Breaking news alerts */}
<AlertToast alerts={alerts} onDismiss={dismissAlert} viewer={viewer} />
```

**Step 3: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Test the dev server**

Run: `npm run dev`
Expected: Vite starts on localhost:5173. Check console for:
- `[RSS] Starting news feed collector`
- `[RSS] Loaded X headlines from Y/18 feeds`
All existing layers still work. News panel visible on the left. AI Brief panel visible bottom-left.

**Step 5: Commit**

```bash
git add src/components/GlobeViewer.tsx src/styles/globals.css
git commit -m "feat: wire news feed, AI brief, and alerts into GlobeViewer"
```

---

### Task 8: Verify Full Build & Manual Test

**Step 1: Run full typecheck**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 2: Run full build**

Run: `npm run build`
Expected: Build succeeds, outputs to `dist/`

**Step 3: Test production server**

Run: `GROQ_API_KEY=gsk_... npm start`
Open http://localhost:3000. Verify:
- Globe renders with 3D tiles
- Existing layers (flights, satellites, etc.) still work
- News panel shows headlines on the left
- Category filter buttons work
- "FLY TO" buttons move camera
- AI Brief panel shows at bottom-left
- "Generate" button produces intelligence brief
- Alert toasts appear for significant events

**Step 4: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: address any issues found in manual testing"
```

---

## Execution Order & Dependencies

```
Task 0 (fix build)
  ↓
Task 1 (types + constants) ← no dependencies
  ↓
Task 2 (RSS backend) ← depends on Task 1 for types
Task 3 (AI backend) ← independent of Task 2
  ↓
Task 4 (news frontend) ← depends on Task 1 + 2
Task 5 (AI brief frontend) ← depends on Task 3
Task 6 (alerts) ← depends on Task 1 (types)
  ↓
Task 7 (wire into GlobeViewer) ← depends on Tasks 4, 5, 6
  ↓
Task 8 (verify build + test) ← depends on Task 7
```

Tasks 2 and 3 can be done in parallel. Tasks 4, 5, and 6 can be done in parallel after their dependencies complete.
