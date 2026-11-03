"use client";

export type TabKey = "geral" | "roadmap" | "ficheiros" | "sprints";

export interface TabNavProps {
  active: TabKey;
  onChange: (key: TabKey) => void;
  sprintCount?: number;
}

const TABS: { key: TabKey; label: string }[] = [
  { key: "geral", label: "Geral" },
  { key: "roadmap", label: "Roadmap" },
  { key: "ficheiros", label: "Ficheiros" },
  { key: "sprints", label: "Sprints" },
];

/**
 * Tab navigation com label fixos. Active tab tem border-bottom 2px azul.
 *
 * Spec: bevox-knowledge/35_specs/company-os/2026-04-25-mc-projects-redesign.md §3.2
 */
export function TabNav({ active, onChange, sprintCount }: TabNavProps) {
  return (
    <div style={{
      display: "flex",
      gap: "0.1rem",
      borderBottom: "1px solid #2a2f3e",
    }}>
      {TABS.map((tab) => {
        const isActive = active === tab.key;
        const label = tab.key === "sprints" && typeof sprintCount === "number"
          ? `${tab.label} (${sprintCount})`
          : tab.label;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            style={{
              padding: "0.5rem 0.9rem",
              background: "transparent",
              border: "none",
              borderBottom: isActive ? "2px solid #4f9eff" : "2px solid transparent",
              color: isActive ? "#4f9eff" : "#888",
              fontSize: "0.85rem",
              fontWeight: isActive ? 600 : 400,
              cursor: "pointer",
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
