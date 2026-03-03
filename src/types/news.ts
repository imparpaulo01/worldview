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
