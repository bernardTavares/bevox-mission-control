"use client";

import { useDraggable } from "@dnd-kit/core";
import {
  ArrowLeft,
  ArrowRight,
  Archive,
  Ban,
  MoreHorizontal,
  GripVertical,
} from "lucide-react";
import type { Task } from "@/lib/kanban/stateReader";

interface Props {
  task: Task;
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
  onArchive: () => void;
  onOpenDetail: () => void;
  disabled?: boolean;
  focused?: boolean;
}

/**
 * Draggable apenas quando `disabled` e `archived` são false. Handle = a
 * gripzinha no canto (GripVertical) + ID text, pra título + botões
 * continuarem clicáveis sem conflitar com drag (PointerSensor com
 * activationConstraint.distance=5 também ajuda).
 */
export function TaskCard({
  task,
  onMoveLeft,
  onMoveRight,
  onArchive,
  onOpenDetail,
  disabled,
  focused,
}: Props) {
  const isArchived = task.status === "archived";
  const dragDisabled = disabled || isArchived;

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: task.id, disabled: dragDisabled });

  const style: React.CSSProperties = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.5 : undefined,
      }
    : {};

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group rounded border border-[var(--border)] bg-[var(--card)] p-2 mb-2 shadow-sm hover:border-[var(--border-strong)] transition ${
        isArchived ? "opacity-50" : ""
      } ${task.blocked ? "opacity-75" : ""} ${
        focused ? "ring-2 ring-[var(--accent)]" : ""
      }`}
    >
      <div className="flex items-center gap-1">
        {!dragDisabled && (
          <button
            type="button"
            aria-label="Arrastar"
            className="cursor-grab touch-none text-[var(--text-muted)] hover:text-[var(--text-secondary)] active:cursor-grabbing"
            {...listeners}
            {...attributes}
          >
            <GripVertical size={12} />
          </button>
        )}
        <span className="font-mono text-xs text-[var(--text-muted)]">{task.id}</span>
      </div>
      <button
        onClick={onOpenDetail}
        className="text-left w-full text-sm font-medium text-[var(--text-primary)] hover:underline"
      >
        {task.title}
      </button>

      {(task.blocked ||
        (task.status === "rejected" && task.rejected_reason) ||
        task.project ||
        task.epic_id ||
        task.wave_ref ||
        (task.dispatch_payload?.blocked_by && task.dispatch_payload.blocked_by.length > 0)) && (
        <div className="mt-1 flex flex-wrap gap-1">
          {task.blocked && (
            <span
              title={task.blocked_reason ?? ""}
              className="inline-flex items-center gap-1 rounded bg-amber-700/60 px-1 py-0.5 text-xs text-amber-100"
              aria-label={`blocked: ${task.blocked_reason ?? ""}`}
            >
              <Ban size={10} /> blocked
            </span>
          )}
          {task.dispatch_payload?.blocked_by && task.dispatch_payload.blocked_by.length > 0 && (
            <span className="text-xs text-[var(--text-muted)]">
              deps: {task.dispatch_payload.blocked_by.join(", ")}
            </span>
          )}
          {task.status === "rejected" && task.rejected_reason && (
            <span
              title={task.rejected_reason}
              className="rounded bg-red-900/60 px-1 py-0.5 text-xs text-red-100"
            >
              {task.rejected_reason.slice(0, 30)}
              {task.rejected_reason.length > 30 ? "…" : ""}
            </span>
          )}
          {task.project && (
            <span className="rounded bg-[var(--accent-soft)] px-1 py-0.5 text-xs text-[var(--accent)]">
              {task.project}
            </span>
          )}
          {task.epic_id && (
            <span className="rounded bg-[var(--info-soft)] px-1 py-0.5 text-xs text-[var(--info)]">
              {task.epic_id}
            </span>
          )}
          {task.wave_ref && (
            <span className="rounded bg-[var(--card-elevated)] px-1 py-0.5 text-xs text-[var(--text-secondary)]">
              {task.wave_ref}
            </span>
          )}
        </div>
      )}

      {!disabled && !isArchived && (
        <div className="mt-2 flex gap-1 opacity-0 group-hover:opacity-100 transition">
          {onMoveLeft && (
            <button
              onClick={onMoveLeft}
              title="Mover coluna anterior"
              className="rounded border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
            >
              <ArrowLeft size={12} />
            </button>
          )}
          {onMoveRight && (
            <button
              onClick={onMoveRight}
              title="Mover próxima coluna"
              className="rounded border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
            >
              <ArrowRight size={12} />
            </button>
          )}
          <button
            onClick={onArchive}
            title="Arquivar"
            className="rounded border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
          >
            <Archive size={12} />
          </button>
          <button
            onClick={onOpenDetail}
            title="Detalhes"
            className="rounded border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
          >
            <MoreHorizontal size={12} />
          </button>
        </div>
      )}
    </div>
  );
}
