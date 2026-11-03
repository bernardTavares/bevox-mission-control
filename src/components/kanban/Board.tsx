"use client";

import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { Task, TaskStatus } from "@/lib/kanban/stateReader";
import { canDragMove } from "@/lib/kanban/transitions";
import { TERMINAL } from "@/lib/kanban/statusEnum";
import { Column } from "./Column";

const ORDER = ["backlog", "ready", "in_progress", "testing", "done"] as const;
type ColStatus = (typeof ORDER)[number];

interface Props {
  tasks: Task[];
  onMove: (taskId: string, newStatus: TaskStatus) => void;
  onArchive: (taskId: string) => void;
  onOpenDetail: (taskId: string) => void;
  onInvalidDrop?: (task: Task, target: TaskStatus) => void;
  readOnly?: boolean;
  focusedId?: string | null;
}

/**
 * 5-column kanban board (wave-3): backlog, ready, in_progress, testing, done.
 * D&D guard via canDragMove — transicoes invalidas viram toast (sem POST).
 * Tasks rejected vivem em RejectedLane separado.
 */
export function Board({
  tasks,
  onMove,
  onArchive,
  onOpenDetail,
  onInvalidDrop,
  readOnly,
  focusedId,
}: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const grouped = {
    backlog: tasks.filter((t) => t.status === "backlog"),
    ready: tasks.filter((t) => t.status === "ready"),
    in_progress: tasks.filter((t) => t.status === "in_progress"),
    testing: tasks.filter((t) => t.status === "testing"),
    done: tasks.filter((t) => t.status === "done"),
  };

  const handleDragEnd = (e: DragEndEvent) => {
    if (readOnly) return;
    const taskId = String(e.active.id);
    const overId = e.over?.id;
    if (!overId) return;
    const target = String(overId) as ColStatus;
    if (!ORDER.includes(target)) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    if (task.status === target) return;
    if (TERMINAL.has(task.status) || !canDragMove(task.status, target)) {
      onInvalidDrop?.(task, target);
      return;
    }
    onMove(taskId, target);
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex gap-2 overflow-x-auto">
        {ORDER.map((s) => (
          <Column
            key={s}
            status={s}
            tasks={grouped[s]}
            onMove={onMove}
            onArchive={onArchive}
            onOpenDetail={onOpenDetail}
            readOnly={readOnly}
            focusedId={focusedId}
          />
        ))}
      </div>
    </DndContext>
  );
}
