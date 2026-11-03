"use client";

import { useState } from "react";
import type { Task } from "@/lib/kanban/stateReader";
import { TaskCard } from "./TaskCard";

interface Props {
  rejected: Task[];
  onOpenDetail: (taskId: string) => void;
  onArchive: (taskId: string) => void;
  focusedId?: string | null;
  readOnly?: boolean;
}

/**
 * Wave-3: lane secundaria colapsavel para tasks rejected.
 * Espelha o pattern visual do ArchivedLane (mais abaixo no layout).
 */
export function RejectedLane({
  rejected,
  onOpenDetail,
  onArchive,
  focusedId,
  readOnly,
}: Props) {
  const [open, setOpen] = useState(false);
  if (rejected.length === 0) return null;
  return (
    <section className="mt-4 border-t border-[var(--border)] pt-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
        aria-expanded={open}
      >
        <span>{open ? "▼" : "▶"}</span>
        <span>Rejected ({rejected.length})</span>
      </button>
      {open && (
        <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3 lg:grid-cols-5">
          {rejected.map((t) => (
            <TaskCard
              key={t.id}
              task={t}
              onArchive={() => onArchive(t.id)}
              onOpenDetail={() => onOpenDetail(t.id)}
              disabled={readOnly}
              focused={focusedId === t.id}
            />
          ))}
        </div>
      )}
    </section>
  );
}
