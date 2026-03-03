/**
 * AI Brief Handler — generates intelligence-style situational briefs
 * from WorldView dashboard data using Groq (primary) or OpenRouter (fallback).
 *
 * Used by both: Vite dev server plugin + Express production proxy.
 */

interface BriefRequest {
  flights: number;
  satellites: number;
  earthquakes: { count: number; maxMag: number; locations: string[] };
  conflicts: { count: number; topRegions: string[]; topEvents?: string[] };
  weather: { count: number; severeCount: number };
  fires: number;
  ships: number;
  news?: string[];
}

const SYSTEM_PROMPT = `You are a concise intelligence analyst producing a GLOBAL situational awareness brief for a geospatial operations dashboard.

Format your brief in exactly this structure:
**Priority Alerts** — critical items requiring attention: active wars/conflicts, M5+ earthquakes, severe weather, major fires
**Global Hotspots** — top 3-5 regions of concern with specific details (countries, event types, severity)
**Monitoring** — notable patterns across air/space/maritime domains
**Assessment** — 2-3 sentence strategic summary of the global situation

Rules:
- 200-350 words total, no filler
- Use numbers AND specifics from the data — mention countries, event types, magnitudes
- Cross-reference news headlines with conflict/earthquake data for richer context
- If a data layer shows zero activity, skip it entirely
- Prioritize by severity: active wars first, then earthquakes M5+, severe weather, fires
- Be direct and analytical — this is an intelligence brief, not a weather report`;

function buildUserPrompt(data: BriefRequest): string {
  const lines: string[] = ["Current GLOBAL dashboard snapshot:"];

  lines.push(`\n## Tracked Assets`);
  lines.push(`- Flights: ${data.flights}`);
  lines.push(`- Satellites: ${data.satellites}`);
  lines.push(`- Ships: ${data.ships}`);

  lines.push(`\n## Earthquakes`);
  if (data.earthquakes.count > 0) {
    lines.push(
      `- ${data.earthquakes.count} events detected, max magnitude ${data.earthquakes.maxMag}`,
    );
    if (data.earthquakes.locations.length > 0) {
      lines.push(`- Notable locations: ${data.earthquakes.locations.join("; ")}`);
    }
  } else {
    lines.push("- None detected in last 24h");
  }

  lines.push(`\n## Conflicts`);
  if (data.conflicts.count > 0) {
    lines.push(`- ${data.conflicts.count} conflict events detected`);
    if (data.conflicts.topRegions.length > 0) {
      lines.push(`- Active regions: ${data.conflicts.topRegions.join(", ")}`);
    }
    if (data.conflicts.topEvents && data.conflicts.topEvents.length > 0) {
      lines.push(`- Recent events:`);
      for (const evt of data.conflicts.topEvents) {
        lines.push(`  * ${evt}`);
      }
    }
  } else {
    lines.push("- No conflict events detected");
  }

  lines.push(`\n## Weather`);
  if (data.weather.count > 0) {
    lines.push(
      `- ${data.weather.count} alerts active, ${data.weather.severeCount} severe/extreme`,
    );
  } else {
    lines.push("- No active alerts");
  }

  lines.push(`\n## Fires`);
  lines.push(`- ${data.fires} active hotspots`);

  if (data.news && data.news.length > 0) {
    lines.push(`\n## Top News Headlines`);
    for (const headline of data.news) {
      lines.push(`- ${headline}`);
    }
  }

  lines.push("\nProduce the global situational brief now.");
  return lines.join("\n");
}

async function callGroq(
  systemPrompt: string,
  userPrompt: string,
  apiKey: string,
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const r = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
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
        signal: controller.signal,
      },
    );

    if (!r.ok) throw new Error(`Groq ${r.status}: ${await r.text()}`);

    const json = (await r.json()) as {
      choices: { message: { content: string } }[];
    };
    return json.choices[0]?.message.content ?? "";
  } finally {
    clearTimeout(timeout);
  }
}

async function callOpenRouter(
  systemPrompt: string,
  userPrompt: string,
  apiKey: string,
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const r = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
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
        signal: controller.signal,
      },
    );

    if (!r.ok) throw new Error(`OpenRouter ${r.status}: ${await r.text()}`);

    const json = (await r.json()) as {
      choices: { message: { content: string } }[];
    };
    return json.choices[0]?.message.content ?? "";
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateBrief(data: BriefRequest): Promise<string> {
  const userPrompt = buildUserPrompt(data);

  // Try Groq first (free, fast)
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    try {
      return await callGroq(SYSTEM_PROMPT, userPrompt, groqKey);
    } catch (err) {
      console.warn("[ai-handler] Groq failed, trying OpenRouter:", err);
    }
  }

  // Fall back to OpenRouter
  const orKey = process.env.OPENROUTER_API_KEY;
  if (orKey) {
    try {
      return await callOpenRouter(SYSTEM_PROMPT, userPrompt, orKey);
    } catch (err) {
      console.warn("[ai-handler] OpenRouter failed:", err);
    }
  }

  return "Brief unavailable — no AI API keys configured. Set GROQ_API_KEY or OPENROUTER_API_KEY in your environment.";
}
