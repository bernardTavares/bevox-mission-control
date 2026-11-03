/**
 * Testa os helpers de persistência do useFilterPersistence.
 * (O hook em si requireria @testing-library/react + jsdom; ambos
 * ausentes e guardrail wave-2 = zero npm install. Helpers cobrem o
 * path crítico serialize/deserialize/fallback — onde drift poderia
 * aparecer — e são o que o hook envolve.)
 *
 * Setup: instala um localStorage mock in-memory em globalThis.window
 * antes dos imports do módulo em teste.
 */
import { describe, it, expect, beforeEach } from "vitest";

// Minimal in-memory localStorage — sufficient for our safe* helpers.
const store: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (k: string) => (k in store ? store[k] : null),
  setItem: (k: string, v: string) => {
    store[k] = v;
  },
  removeItem: (k: string) => {
    delete store[k];
  },
  clear: () => {
    for (const k of Object.keys(store)) delete store[k];
  },
};

(globalThis as unknown as { window: { localStorage: typeof mockLocalStorage } }).window = {
  localStorage: mockLocalStorage,
};
import {
  DEFAULT_FILTERS,
  STORAGE_KEY,
  safeReadFilters,
  safeWriteFilters,
  safeRemoveFilters,
  type KanbanFilters,
} from "./useFilterPersistence";

describe("useFilterPersistence helpers", () => {
  beforeEach(() => {
    if (typeof window !== "undefined") {
      window.localStorage.clear();
    }
  });

  it("safeReadFilters retorna DEFAULT quando localStorage vazio", () => {
    const filters = safeReadFilters();
    expect(filters).toEqual(DEFAULT_FILTERS);
  });

  it("roundtrip write -> read preserva valores", () => {
    const written: KanbanFilters = {
      project: "openclaw",
      search: "bug",
      sprint: "next",
      showArchived: true,
      blockedOnly: true,
    };
    safeWriteFilters(written);
    const read = safeReadFilters();
    expect(read).toEqual(written);

    const raw = window.localStorage.getItem(STORAGE_KEY);
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!)).toEqual(written);
  });

  it("safeRemoveFilters limpa a chave", () => {
    safeWriteFilters({
      project: "vox",
      search: "",
      sprint: "current",
      showArchived: false,
      blockedOnly: false,
    });
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeTruthy();
    safeRemoveFilters();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("blockedOnly defaulta a false quando ausente em v1", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        project: null,
        search: "",
        sprint: "current",
        showArchived: false,
      }),
    );
    expect(safeReadFilters().blockedOnly).toBe(false);
  });

  it("blockedOnly não-boolean cai no DEFAULT", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ blockedOnly: "yes" }),
    );
    expect(safeReadFilters().blockedOnly).toBe(false);
  });

  it("fallback gracioso quando JSON corrompido", () => {
    window.localStorage.setItem(STORAGE_KEY, "{not valid json");
    const filters = safeReadFilters();
    expect(filters).toEqual(DEFAULT_FILTERS);
  });

  it("sprint inválido cai no DEFAULT.sprint", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ sprint: "invalid-value" }),
    );
    const filters = safeReadFilters();
    expect(filters.sprint).toBe("current");
  });

  it("showArchived não-boolean cai no DEFAULT", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ showArchived: "yes" }),
    );
    const filters = safeReadFilters();
    expect(filters.showArchived).toBe(false);
  });

  it("project string ou null é aceito; outros tipos caem no DEFAULT", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ project: 42 }),
    );
    expect(safeReadFilters().project).toBeNull();

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ project: "bevox-mobile" }),
    );
    expect(safeReadFilters().project).toBe("bevox-mobile");

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ project: null }));
    expect(safeReadFilters().project).toBeNull();
  });

  it("preserva campos default quando parcial", () => {
    // Simulates migration-friendly behavior: only `project` stored,
    // resto preenchido com default.
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ project: "mission-control" }),
    );
    const filters = safeReadFilters();
    expect(filters.project).toBe("mission-control");
    expect(filters.search).toBe("");
    expect(filters.sprint).toBe("current");
    expect(filters.showArchived).toBe(false);
  });
});
