import { useState, useEffect, useCallback } from "react";
import type { FilterMode } from "@/lib/constants";
import { FILTER_KEYS } from "@/lib/constants";

export function useFilterMode() {
  const [mode, setMode] = useState<FilterMode>("none");

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't capture if user is typing in an input
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    )
      return;

    const filterMode = FILTER_KEYS[e.key];
    if (filterMode !== undefined) {
      setMode(filterMode);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return { mode, setMode };
}
