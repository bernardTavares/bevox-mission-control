"use client";

import { useDroppable } from "@dnd-kit/core";
import type { Sprint, Task } from "@/lib/kanban/stateReader";
import { SprintCard } from "./SprintCard";

export interface SprintColumnProps {
  state: "current" | "next" | "closed";
  sprints: Sprint[];
  tasksBySprint: Record<string, Task[]>;
  showAllClosed: boolean;
  onToggleShowAll: () => void;
  onSelectSprint: (sprintId: string) => void;
}

const STATE_LABELS: Record<SprintColumnProps["state"], string> = {
  current: "Active",
  next: "Next",
  closed: "Closed",
};

const CLOSED_DEFAULT_LIMIT = 10;

/** Sort sprints for column rendering. Active/Next: by project asc. Closed: by closed_at desc. */
export function sortSprintsForColumn(
  sprints: Sprint[],
  state: "current" | "next" | "closed",
): Sprint[] {
  if (state === "closed") {
    return [...sprints].sort((a, b) =>
      (b.closed_at ?? "").localeCompare(a.closed_at ?? ""),
    );
  }
  return [...sprints].sort((a, b) =>
    (a.project ?? "").localeCompare(b.project ?? ""),
  );
}

/**
 * One column of the Sprints page (Active / Next / Closed).
 * Closed col limits to top 10 by default with "Show all" expand.
 *
 * Spec: bevox-knowledge/35_specs/company-os/2026-04-25-mc-sprints-page.md §2.3, §3.1
 */
export function SprintColumn({
  state,
  sprints,
  tasksBySprint,
  showAllClosed,
  onToggleShowAll,
  onSelectSprint,
}: SprintColumnProps) {
  const sorted = sortSprintsForColumn(sprints, state);
  const isClosed = state === "closed";
  const visible = isClosed && !showAllClosed
    ? sorted.slice(0, CLOSED_DEFAULT_LIMIT)
    : sorted;
  const hidden = isClosed && !showAllClosed
    ? Math.max(0, sorted.length - CLOSED_DEFAULT_LIMIT)
    : 0;

  // Droppable target — id matches the column state for handleDragEnd lookup.
  const { setNodeRef, isOver } = useDroppable({ id: `col-${state}` });

  return (
    <div
      ref={setNodeRef}
      className="sprint-column"
      style={{
        background: "#0d1117",
        borderRadius: 8,
        padding: "0.75rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        minHeight: 200,
        outline: isOver ? "2px solid #4f9eff" : "2px solid transparent",
        outlineOffset: -2,
        transition: "outline-color 0.15s",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.25rem 0",
          borderBottom: "1px solid #2a2f3e",
          marginBottom: "0.25rem",
        }}
      >
        <span style={{ color: "#e0e0e0", fontWeight: 600, fontSize: "0.95rem" }}>
          {STATE_LABELS[state]}
        </span>
        <span
          style={{
            background: "#2a2f3e",
            color: "#888",
            padding: "0.05rem 0.5rem",
            borderRadius: 10,
            fontSize: "0.72rem",
          }}
        >
          {sorted.length}
        </span>
      </div>
      {visible.length === 0 ? (
        <div style={{ color: "#555", fontSize: "0.8rem", fontStyle: "italic", padding: "1rem 0", textAlign: "center" }}>
          No {STATE_LABELS[state].toLowerCase()} sprints
        </div>
      ) : (
        visible.map((sp) => (
          <SprintCard
            key={sp.id}
            sprint={sp}
            taskCount={(tasksBySprint[sp.id] ?? []).length}
            isClosed={isClosed}
            onClick={() => onSelectSprint(sp.id)}
          />
        ))
      )}
      {hidden > 0 && (
        <button
          type="button"
          onClick={onToggleShowAll}
          style={{
            background: "transparent",
            border: "1px solid #2a2f3e",
            color: "#888",
            padding: "0.4rem 0.5rem",
            borderRadius: 4,
            cursor: "pointer",
            fontSize: "0.78rem",
            marginTop: "0.25rem",
          }}
        >
          Show all ({sorted.length})
        </button>
      )}
    </div>
  );
}
