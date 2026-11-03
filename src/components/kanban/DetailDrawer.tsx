"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import type { Task, TaskStatus } from "@/lib/kanban/stateReader";

export interface TaskPatch {
  title?: string;
  description?: string;
  project?: string | null;
  epic_id?: string;
  wave_ref?: string;
}

interface Props {
  open: boolean;
  task: Task | null;
  projects: string[];
  events: Array<Record<string, unknown>>;
  onClose: () => void;
  onSave: (patch: TaskPatch) => Promise<void> | void;
  onMoveStatus: (status: Exclude<TaskStatus, "archived">) => Promise<void> | void;
  onResprint: (sprint: "current" | "next") => Promise<void> | void;
  onArchive: () => Promise<void> | void;
  onUnarchive: () => Promise<void> | void;
}

export function DetailDrawer({
  open,
  task,
  projects,
  events,
  onClose,
  onSave,
  onMoveStatus,
  onResprint,
  onArchive,
  onUnarchive,
}: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [project, setProject] = useState("");
  const [epicId, setEpicId] = useState("");
  const [waveRef, setWaveRef] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || "");
      setProject(task.project ?? "");
      setEpicId(task.epic_id || "");
      setWaveRef(task.wave_ref || "");
      setBusy(false);
    }
  }, [task?.id]);

  if (!open || !task) return null;

  const isArchived = task.status === "archived";

  async function save() {
    if (!task) return;
    const patch: TaskPatch = {};
    if (title.trim() !== task.title) patch.title = title.trim();
    if (description !== (task.description || ""))
      patch.description = description;
    if (project !== (task.project ?? "")) {
      patch.project = project === "" ? null : project;
    }
    if (epicId !== (task.epic_id || "")) patch.epic_id = epicId;
    if (waveRef !== (task.wave_ref || "")) patch.wave_ref = waveRef;
    if (Object.keys(patch).length === 0) return;
    setBusy(true);
    try {
      await onSave(patch);
    } finally {
      setBusy(false);
    }
  }

  const statusButtons: Array<Exclude<TaskStatus, "archived">> = [
    "backlog",
    "ready",
    "in_progress",
    "testing",
    "done",
    "rejected",
  ];

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full overflow-y-auto border-l border-[var(--border)] bg-[var(--card)] p-4 shadow-xl sm:w-1/2">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-sm text-[var(--text-muted)]">
          {task.id} · {task.status}
        </span>
        <button
          onClick={onClose}
          className="rounded border border-[var(--border)] p-1 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
        >
          <X size={14} />
        </button>
      </div>

      <label className="mb-2 block text-sm">
        <span className="block text-[var(--text-secondary)]">Title</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--background)] p-1 font-medium text-[var(--text-primary)]"
        />
      </label>

      <label className="mb-2 block text-sm">
        <span className="block text-[var(--text-secondary)]">Description (markdown)</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={6}
          className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--background)] p-1 font-mono text-xs text-[var(--text-primary)]"
        />
      </label>

      <div className="mb-2 grid grid-cols-3 gap-2 text-sm">
        <label>
          <span className="block text-[var(--text-secondary)]">Project</span>
          <select
            value={project}
            onChange={(e) => setProject(e.target.value)}
            className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--background)] p-1 text-[var(--text-primary)]"
          >
            <option value="">(null)</option>
            {projects.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="block text-[var(--text-secondary)]">Epic</span>
          <input
            value={epicId}
            onChange={(e) => setEpicId(e.target.value)}
            className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--background)] p-1 text-[var(--text-primary)]"
          />
        </label>
        <label>
          <span className="block text-[var(--text-secondary)]">Wave ref</span>
          <input
            value={waveRef}
            onChange={(e) => setWaveRef(e.target.value)}
            className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--background)] p-1 text-[var(--text-primary)]"
          />
        </label>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          onClick={save}
          disabled={busy}
          className="rounded border border-[var(--success)] bg-[var(--success-bg)] px-3 py-1 text-sm text-[var(--success)] disabled:opacity-50"
        >
          {busy ? "Salvando…" : "Salvar"}
        </button>
        <span className="ml-2 text-xs text-[var(--text-muted)]">Mover status:</span>
        {statusButtons.map((s) => (
          <button
            key={s}
            onClick={() => onMoveStatus(s)}
            disabled={isArchived || task.status === s}
            className="rounded border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] disabled:opacity-30"
          >
            {s}
          </button>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-xs text-[var(--text-muted)]">Mover sprint:</span>
        <button
          onClick={() => onResprint("current")}
          disabled={isArchived}
          className="rounded border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] disabled:opacity-30"
        >
          → current
        </button>
        <button
          onClick={() => onResprint("next")}
          disabled={isArchived}
          className="rounded border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] disabled:opacity-30"
        >
          → next
        </button>
        {isArchived ? (
          <button
            onClick={onUnarchive}
            className="ml-auto rounded border border-[var(--border)] px-2 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
          >
            Unarchive → backlog
          </button>
        ) : (
          <button
            onClick={onArchive}
            className="ml-auto rounded border border-[var(--border)] px-2 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
          >
            Archive
          </button>
        )}
      </div>

      <div className="mb-2 text-xs text-[var(--text-muted)]">
        <div>sprint_id: {task.sprint_id}</div>
        <div>created_by: {task.created_by} · at {task.created_at}</div>
        <div>updated_at: {task.updated_at}</div>
        {task.archived_at && <div>archived_at: {task.archived_at}</div>}
      </div>

      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-medium text-[var(--text-secondary)]">
          Histórico ({events.length})
        </summary>
        <div className="mt-2 space-y-1 font-mono text-xs">
          {[...events].reverse().map((ev, i) => (
            <div key={i} className="text-[var(--text-secondary)]">
              {String(ev.ts)} · {String(ev.actor)} · {String(ev.type)}
            </div>
          ))}
          {events.length === 0 && (
            <div className="italic text-[var(--text-muted)]">sem eventos</div>
          )}
        </div>
      </details>
    </div>
  );
}
