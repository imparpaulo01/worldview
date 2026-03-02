import type { FilterMode } from "@/lib/constants";

export interface FilterConfig {
  mode: FilterMode;
  label: string;
  key: string;
  shader: string | null;
}
