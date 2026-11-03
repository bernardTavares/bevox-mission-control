"use client";

import { useCallback, useEffect, useState } from "react";

export interface KanbanFilters {
  project: string | null;
  search: string;
  sprint: "current" | "next";
  showArchived: boolean;
  // Wave-3: filter "Show blocked only" (default false). Aditivo no schema v1 —
  // states sem o campo defaultam pra false em safeReadFilters.
  blockedOnly: boolean;
}

export const STORAGE_KEY = "kanban_filters_v1";

export const DEFAULT_FILTERS: KanbanFilters = {
  project: null,
  search: "",
  sprint: "current",
  showArchived: false,
  blockedOnly: false,
};

// Keep local aliases for backward-compat within this file.
const KEY = STORAGE_KEY;
const DEFAULT = DEFAULT_FILTERS;

export function safeReadFilters(): KanbanFilters {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw) as Partial<KanbanFilters>;
    return {
      project:
        typeof parsed.project === "string" || parsed.project === null
          ? parsed.project
          : DEFAULT.project,
      search: typeof parsed.search === "string" ? parsed.search : DEFAULT.search,
      sprint:
        parsed.sprint === "current" || parsed.sprint === "next"
          ? parsed.sprint
          : DEFAULT.sprint,
      showArchived:
        typeof parsed.showArchived === "boolean"
          ? parsed.showArchived
          : DEFAULT.showArchived,
      blockedOnly:
        typeof parsed.blockedOnly === "boolean"
          ? parsed.blockedOnly
          : DEFAULT.blockedOnly,
    };
  } catch {
    return DEFAULT;
  }
}

export function safeWriteFilters(filters: KanbanFilters): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(filters));
  } catch {
    // ignore (private mode, quota, etc.)
  }
}

export function safeRemoveFilters(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

/**
 * Persists kanban filters in localStorage key `kanban_filters_v1`.
 *
 * Returns `[filters, update, reset, isDirty]`:
 *   - `update(partial)` merges + persists
 *   - `reset()` removes the key + restores default
 *   - `isDirty` is true when any filter is non-default
 *
 * Wave-2 frontend-only feature; does not touch backend.
 */
export function useFilterPersistence(): [
  KanbanFilters,
  (partial: Partial<KanbanFilters>) => void,
  () => void,
  boolean,
] {
  // Start with DEFAULT for SSR parity; hydrate from localStorage on mount.
  const [filters, setFilters] = useState<KanbanFilters>(DEFAULT);

  useEffect(() => {
    setFilters(safeReadFilters());
  }, []);

  const update = useCallback((partial: Partial<KanbanFilters>) => {
    setFilters((cur) => {
      const merged = { ...cur, ...partial };
      safeWriteFilters(merged);
      return merged;
    });
  }, []);

  const reset = useCallback(() => {
    safeRemoveFilters();
    setFilters(DEFAULT);
  }, []);

  const isDirty =
    filters.project !== DEFAULT.project ||
    filters.search !== DEFAULT.search ||
    filters.sprint !== DEFAULT.sprint ||
    filters.showArchived !== DEFAULT.showArchived ||
    filters.blockedOnly !== DEFAULT.blockedOnly;

  return [filters, update, reset, isDirty];
}
