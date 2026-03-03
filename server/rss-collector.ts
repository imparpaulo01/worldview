/**
 * RSS News Collector — fetches headlines from curated RSS/Atom feeds
 * across 5 categories: geopolitics, defense, europe, tech, disasters.
 *
 * No auth required. Free public feeds.
 * Used by both: Vite dev server plugin + Express production proxy.
 */

const REFRESH_MS = 10 * 60_000; // 10 minutes
const MAX_HEADLINES = 200;

interface RSSFeed {
  url: string;
  source: string;
  category: string;
}

interface NewsItem {
  id: string;
  title: string;
  link: string;
  source: string;
  category: string;
  published: string;
}

/** Curated RSS feeds across 5 categories */
const RSS_FEEDS: RSSFeed[] = [
  // Geopolitics
  { url: "https://feeds.reuters.com/reuters/worldNews", source: "Reuters", category: "geopolitics" },
  { url: "https://feeds.bbci.co.uk/news/world/rss.xml", source: "BBC World", category: "geopolitics" },
  { url: "https://www.aljazeera.com/xml/rss/all.xml", source: "Al Jazeera", category: "geopolitics" },
  { url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml", source: "NY Times", category: "geopolitics" },

  // Defense
  { url: "https://www.defenseone.com/rss/", source: "Defense One", category: "defense" },
  { url: "https://www.janes.com/feeds/news", source: "Janes", category: "defense" },
  { url: "https://www.thedefensepost.com/feed/", source: "Defense Post", category: "defense" },
  { url: "https://breakingdefense.com/feed/", source: "Breaking Defense", category: "defense" },

  // Europe
  { url: "https://euobserver.com/rss.xml", source: "EU Observer", category: "europe" },
  { url: "https://www.euractiv.com/feed/", source: "EurActiv", category: "europe" },
  { url: "https://www.politico.eu/feed/", source: "Politico EU", category: "europe" },

  // Tech
  { url: "https://feeds.arstechnica.com/arstechnica/index", source: "Ars Technica", category: "tech" },
  { url: "https://www.theregister.com/headlines.atom", source: "The Register", category: "tech" },
  { url: "https://www.wired.com/feed/rss", source: "Wired", category: "tech" },
  { url: "https://www.bleepingcomputer.com/feed/", source: "BleepingComputer", category: "tech" },

  // Disasters
  { url: "https://reliefweb.int/updates/rss.xml", source: "ReliefWeb", category: "disasters" },
  { url: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_month.atom", source: "USGS Quakes", category: "disasters" },
  { url: "https://www.gdacs.org/xml/rss.xml", source: "GDACS", category: "disasters" },
];

/** Unescape common HTML entities */
function unescapeHTML(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/");
}

/** Strip CDATA wrapper if present */
function stripCDATA(str: string): string {
  const m = str.match(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/);
  return m ? m[1] : str;
}

/** Extract text content from an XML tag (handles CDATA) */
function xmlText(block: string, tag: string): string {
  // Match tag with possible CDATA content inside
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const m = block.match(re);
  if (!m) return "";
  return unescapeHTML(stripCDATA(m[1].trim()));
}

/** Extract href from Atom <link> tag */
function atomLink(block: string): string {
  // Atom links: <link href="..." /> or <link rel="alternate" href="..." />
  const m = block.match(/<link[^>]*\bhref=["']([^"']+)["'][^>]*\/?>/i);
  return m?.[1]?.trim() || "";
}

/** Generate a deterministic ID from source + link */
function makeId(source: string, link: string): string {
  // Base64url encode the link for uniqueness
  const encoded = Buffer.from(link).toString("base64url");
  const prefix = source.toLowerCase().replace(/\s+/g, "-");
  return `${prefix}-${encoded}`;
}

/** Parse date string, return ISO string or empty */
function parseDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? "" : d.toISOString();
}

/** Parse RSS 2.0 <item> blocks */
function parseRSSItems(xml: string, feed: RSSFeed): NewsItem[] {
  const items: NewsItem[] = [];
  const blocks = xml.split(/<item[\s>]/i).slice(1);

  for (const block of blocks) {
    const title = xmlText(block, "title");
    const link = xmlText(block, "link") || atomLink(block);
    const pubDate = xmlText(block, "pubDate") || xmlText(block, "dc:date");

    if (!title || !link) continue;

    items.push({
      id: makeId(feed.source, link),
      title,
      link,
      source: feed.source,
      category: feed.category,
      published: parseDate(pubDate),
    });
  }

  return items;
}

/** Parse Atom <entry> blocks */
function parseAtomEntries(xml: string, feed: RSSFeed): NewsItem[] {
  const items: NewsItem[] = [];
  const blocks = xml.split(/<entry[\s>]/i).slice(1);

  for (const block of blocks) {
    const title = xmlText(block, "title");
    const link = atomLink(block) || xmlText(block, "link");
    const updated = xmlText(block, "updated") || xmlText(block, "published");

    if (!title || !link) continue;

    items.push({
      id: makeId(feed.source, link),
      title,
      link,
      source: feed.source,
      category: feed.category,
      published: parseDate(updated),
    });
  }

  return items;
}

/** Fetch and parse a single RSS/Atom feed */
async function fetchFeed(feed: RSSFeed): Promise<NewsItem[]> {
  try {
    const r = await fetch(feed.url, {
      signal: AbortSignal.timeout(10_000),
      headers: {
        "User-Agent": "WorldView/0.1 (github.com/imparpaulo01/worldview)",
      },
    });
    if (!r.ok) return [];

    const xml = await r.text();

    // Detect format: Atom feeds have <entry>, RSS 2.0 feeds have <item>
    if (/<entry[\s>]/i.test(xml)) {
      return parseAtomEntries(xml, feed);
    }
    return parseRSSItems(xml, feed);
  } catch {
    return [];
  }
}

// In-memory cache
let cachedNews: NewsItem[] = [];
let refreshTimer: ReturnType<typeof setInterval> | null = null;
let lastFetch = 0;

/** Fetch all feeds and update cache */
async function fetchAll(): Promise<void> {
  const now = Date.now();
  if (now - lastFetch < 5 * 60_000) return;
  lastFetch = now;

  const results = await Promise.allSettled(
    RSS_FEEDS.map((feed) => fetchFeed(feed)),
  );

  const seen = new Map<string, NewsItem>();
  let successCount = 0;

  for (const result of results) {
    if (result.status === "fulfilled" && result.value.length > 0) {
      successCount++;
      for (const item of result.value) {
        seen.set(item.id, item);
      }
    }
  }

  // Sort by date (newest first), cap at MAX_HEADLINES
  cachedNews = [...seen.values()]
    .sort((a, b) => {
      if (!a.published) return 1;
      if (!b.published) return -1;
      return new Date(b.published).getTime() - new Date(a.published).getTime();
    })
    .slice(0, MAX_HEADLINES);

  console.log(`[RSS] Loaded ${cachedNews.length} headlines from ${successCount}/${RSS_FEEDS.length} feeds`);
}

/** Get current news headlines */
export function getNews(): NewsItem[] {
  return cachedNews;
}

/** Start the RSS collector. Call once on server startup. */
export function startRSSCollector(): void {
  console.log("[RSS] Starting news collector (10-min refresh)");
  fetchAll();
  refreshTimer = setInterval(fetchAll, REFRESH_MS);
}

/** Stop the collector */
export function stopRSSCollector(): void {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}
