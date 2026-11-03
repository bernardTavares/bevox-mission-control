"use client";

import { useDroppable } from "@dnd-kit/core";
import type { Task, TaskStatus } from "@/lib/kanban/stateReader";
import { TaskCard } from "./TaskCard";

const ORDER = ["backlog", "ready", "in_progress", "testing", "done"] as const;
type ColStatus = (typeof ORDER)[number];

interface Props {
  status: ColStatus;
  tasks: Task[];
  onMove: (taskId: string, newStatus: TaskStatus) => void;
  onArchive: (taskId: string) => void;
  onOpenDetail: (taskId: string) => void;
  readOnly?: boolean;
  focusedId?: string | null;
}

const LABEL: Record<ColStatus, string> = {
  backlog: "Backlog",
  ready: "Ready",
  in_progress: "In Progress",
  testing: "Testing",
  done: "Done",
};

export function Column({
  status,
  tasks,
  onMove,
  onArchive,
  onOpenDetail,
  readOnly,
  focusedId,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    disabled: readOnly,
  });
  const idx = ORDER.indexOf(status);
  const prev = idx > 0 ? ORDER[idx - 1] : null;
  const next = idx < ORDER.length - 1 ? ORDER[idx + 1] : null;
  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-w-[220px] rounded border p-2 transition ${
        isOver
          ? "border-[var(--accent)] bg-[var(--accent-soft)] ring-2 ring-[var(--accent)]"
          : "border-[var(--border)] bg-[var(--background)]"
      }`}
    >
      <h3 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">
        {LABEL[status]}{" "}
        <span className="font-normal text-[var(--text-muted)]">({tasks.length})</span>
      </h3>
      {tasks.map((t) => (
        <TaskCard
          key={t.id}
          task={t}
          onMoveLeft={prev && !readOnly ? () => onMove(t.id, prev) : undefined}
          onMoveRight={next && !readOnly ? () => onMove(t.id, next) : undefined}
          onArchive={() => onArchive(t.id)}
          onOpenDetail={() => onOpenDetail(t.id)}
          disabled={readOnly}
          focused={focusedId === t.id}
        />
      ))}
      {tasks.length === 0 && (
        <div className="p-1 text-xs italic text-[var(--text-muted)]">vazio</div>
      )}
    </div>
  );
}
