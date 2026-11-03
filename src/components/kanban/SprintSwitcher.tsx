"use client";

import type { Sprint, Task } from "@/lib/kanban/stateReader";
import { iconFor } from "@/lib/kanban/projectIcons";

interface Props {
  current: Sprint | null;
  next: Sprint | null;
  tasksByCurrent: Task[];
  tasksByNext: Task[];
  active: "current" | "next";
  onChange: (a: "current" | "next") => void;
}

/**
 * Sticky switcher visual rico. Substitui os botões simples [current]/[next]
 * da TopBar wave-1. Mostra project icon + stats sintetizados para cada sprint.
 * Wave-2 UX polish — zero mudança em backend/API/schema.
 */
export function SprintSwitcher({
  current,
  next,
  tasksByCurrent,
  tasksByNext,
  active,
  onChange,
}: Props) {
  const card = (
    sp: Sprint | null,
    key: "current" | "next",
    tasks: Task[],
  ) => {
    if (!sp) {
      return (
        <div className="flex-1 rounded border border-dashed border-[var(--border)] bg-[var(--card)] p-3 text-sm text-[var(--text-muted)]">
          (nenhum sprint em {key})
        </div>
      );
    }
    const visible = tasks.filter((t) => t.status !== "archived");
    const done = visible.filter((t) => t.status === "done").length;
    const isActive = active === key;
    const palette =
      key === "current"
        ? {
            ring: "ring-[var(--success)]",
            bg: isActive
              ? "bg-[var(--success-bg)] border-[var(--success)]"
              : "bg-[var(--card)] border-[var(--border)]",
            badge: "bg-[var(--success-bg)] text-[var(--success)]",
          }
        : {
            ring: "ring-[var(--accent)]",
            bg: isActive
              ? "bg-[var(--accent-soft)] border-[var(--accent)]"
              : "bg-[var(--card)] border-[var(--border)]",
            badge: "bg-[var(--accent-soft)] text-[var(--accent)]",
          };
    return (
      <button
        type="button"
        onClick={() => onChange(key)}
        className={`flex-1 rounded border p-3 text-left transition hover:bg-[var(--surface-hover)] ${palette.bg} ${
          isActive ? `ring-2 ${palette.ring}` : ""
        }`}
      >
        <div className="flex items-center gap-2">
          <span className={`rounded px-2 py-0.5 text-xs uppercase font-medium ${palette.badge}`}>
            {key}
          </span>
          <span className="font-mono text-sm text-[var(--text-secondary)]">{sp.id}</span>
          <span className="text-sm text-[var(--text-primary)]">{sp.name}</span>
        </div>
        <div className="mt-1 flex items-center gap-2 text-sm">
          <span className="text-base" aria-hidden>
            {iconFor(sp.project)}
          </span>
          <span className="text-[var(--text-secondary)]">{sp.project ?? "mixed"}</span>
        </div>
        <div className="mt-1 text-xs text-[var(--text-muted)]">
          {visible.length} tasks · {done} done
        </div>
      </button>
    );
  };

  return (
    <div className="sticky top-0 z-20 mb-3 border-b border-[var(--border)] bg-[var(--background)] py-2">
      <div className="flex items-center gap-2">
        {card(current, "current", tasksByCurrent)}
        <span className="text-xl text-[var(--text-muted)]" aria-hidden>
          ⇄
        </span>
        {card(next, "next", tasksByNext)}
      </div>
    </div>
  );
}
