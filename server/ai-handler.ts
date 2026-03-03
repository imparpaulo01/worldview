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
  conflicts: { count: number; topRegions: string[] };
  weather: { count: number; severeCount: number };
  fires: number;
  ships: number;
}

const SYSTEM_PROMPT = `You are a concise intelligence analyst producing a situational awareness brief for a geospatial operations dashboard.

Format your brief in exactly this structure:
**Priority Alerts** — any critical items (severe weather, large earthquakes, active conflict zones)
**Regional Activity** — notable patterns across data layers
**Assessment** — 1-2 sentence operational summary

Rules:
- 150-250 words total, no filler
- Use numbers from the data provided — never fabricate
- If a data layer shows zero activity, skip it
- Prioritize by severity: earthquakes M5+, severe weather, active conflicts first`;

function buildUserPrompt(data: BriefRequest): string {
  const lines: string[] = ["Current dashboard snapshot:"];

  lines.push(`- Flights tracked: ${data.flights}`);
  lines.push(`- Satellites tracked: ${data.satellites}`);

  if (data.earthquakes.count > 0) {
    lines.push(
      `- Earthquakes: ${data.earthquakes.count} events, max magnitude ${data.earthquakes.maxMag}`,
    );
    if (data.earthquakes.locations.length > 0) {
      lines.push(`  Locations: ${data.earthquakes.locations.join(", ")}`);
    }
  } else {
    lines.push("- Earthquakes: none detected");
  }

  if (data.conflicts.count > 0) {
    lines.push(`- Conflict events: ${data.conflicts.count}`);
    if (data.conflicts.topRegions.length > 0) {
      lines.push(`  Top regions: ${data.conflicts.topRegions.join(", ")}`);
    }
  } else {
    lines.push("- Conflict events: none");
  }

  if (data.weather.count > 0) {
    lines.push(
      `- Weather alerts: ${data.weather.count} total, ${data.weather.severeCount} severe`,
    );
  } else {
    lines.push("- Weather alerts: none active");
  }

  lines.push(`- Active fires: ${data.fires}`);
  lines.push(`- Ships tracked: ${data.ships}`);

  lines.push("\nProduce the situational brief now.");
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
