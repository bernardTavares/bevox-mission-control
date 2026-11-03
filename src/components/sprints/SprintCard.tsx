"use client";

import { useDraggable } from "@dnd-kit/core";
import type { Sprint } from "@/lib/kanban/stateReader";
import { getProjectColors } from "@/lib/projects/colors";

export interface SprintCardProps {
  sprint: Sprint;
  taskCount: number;
  isClosed: boolean;
  onClick: () => void;
}

/** Format task count: 0 → "empty", 1 → "1 task", N → "N tasks". */
export function formatTaskCount(count: number): string {
  if (count === 0) return "empty";
  if (count === 1) return "1 task";
  return `${count} tasks`;
}

/** Extract numeric N from "sprint-N" id pra display "Sprint N". Returns null se formato custom. */
export function extractSprintNumber(id: string): number | null {
  const match = /^sprint-(\d+)$/.exec(id);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Minimal card pra Sprints page: project chip + sprint name + task count.
 * Spec: bevox-knowledge/35_specs/company-os/2026-04-25-mc-sprints-page.md §3.1
 */
export function SprintCard({ sprint, taskCount, isClosed, onClick }: SprintCardProps) {
  const project = sprint.project ?? "unknown";
  const colors = getProjectColors(project);
  const sprintNum = extractSprintNumber(sprint.id);
  const sprintName = sprintNum !== null ? `Sprint ${sprintNum}` : sprint.name;

  // Closed sprints are terminal — no drag out (no valid transition).
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: sprint.id, disabled: isClosed });

  const dragStyle: React.CSSProperties = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: isDragging ? 200 : undefined,
      }
    : {};
  const baseOpacity = isClosed ? 0.55 : 1;
  const opacity = isDragging ? 0.5 : baseOpacity;

  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className="sprint-card"
      style={{
        background: "#1a2230",
        borderLeft: `3px solid ${colors.fg}`,
        borderRadius: 4,
        padding: "0.55rem 0.7rem",
        cursor: isClosed ? "pointer" : "grab",
        opacity,
        transition: isDragging ? "none" : "background-color 0.15s",
        ...dragStyle,
      }}
      onMouseEnter={(e) => {
        if (!isDragging) e.currentTarget.style.background = "#222b3c";
      }}
      onMouseLeave={(e) => {
        if (!isDragging) e.currentTarget.style.background = "#1a2230";
      }}
      {...attributes}
      {...listeners}
    >
      <div
        style={{
          display: "inline-block",
          background: colors.bg,
          color: colors.fg,
          padding: "0.1rem 0.45rem",
          borderRadius: 10,
          fontSize: "0.7rem",
          fontWeight: 600,
        }}
      >
        {project}
      </div>
      <div
        style={{
          color: "#e0e0e0",
          fontWeight: 600,
          fontSize: "0.9rem",
          margin: "0.25rem 0 0.1rem",
        }}
      >
        {sprintName}
      </div>
      <div style={{ color: "#888", fontSize: "0.72rem" }}>{formatTaskCount(taskCount)}</div>
    </div>
  );
}
