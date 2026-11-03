"use client";

import { useState, useEffect } from "react";

export interface NewTaskPayload {
  title: string;
  description?: string;
  sprint: "current" | "next";
  project?: string;
  epic_id?: string;
  wave_ref?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: NewTaskPayload) => Promise<void> | void;
  projects: string[];
  defaultSprint?: "current" | "next";
  /** Pre-selects the project dropdown when a project filter is active. */
  defaultProject?: string;
}

export function NewTaskModal({
  open,
  onClose,
  onSubmit,
  projects,
  defaultSprint = "current",
  defaultProject,
}: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sprint, setSprint] = useState<"current" | "next">(defaultSprint);
  const [project, setProject] = useState(defaultProject ?? "");
  const [epicId, setEpicId] = useState("");
  const [waveRef, setWaveRef] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle("");
      setDescription("");
      setSprint(defaultSprint);
      setProject(defaultProject ?? "");
      setEpicId("");
      setWaveRef("");
      setBusy(false);
    }
  }, [open, defaultSprint, defaultProject]);

  if (!open) return null;

  const canSubmit = title.trim().length > 0 && !busy;

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        sprint,
        project: project || undefined,
        epic_id: epicId.trim() || undefined,
        wave_ref: waveRef.trim() || undefined,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-[520px] max-w-[95vw] rounded border border-[var(--border)] bg-[var(--card)] p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-3 text-lg font-semibold text-[var(--text-primary)]">Nova task</h2>

        <label className="mb-2 block text-sm">
          <span className="block text-[var(--text-secondary)]">Title *</span>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--background)] p-1 text-[var(--text-primary)]"
          />
        </label>

        <label className="mb-2 block text-sm">
          <span className="block text-[var(--text-secondary)]">Description (markdown)</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--background)] p-1 text-[var(--text-primary)]"
          />
        </label>

        <div className="mb-2 flex gap-3 text-sm">
          <span className="text-[var(--text-secondary)]">Sprint:</span>
          <label className="flex items-center gap-1 text-[var(--text-primary)]">
            <input
              type="radio"
              checked={sprint === "current"}
              onChange={() => setSprint("current")}
            />{" "}
            current
          </label>
          <label className="flex items-center gap-1 text-[var(--text-primary)]">
            <input
              type="radio"
              checked={sprint === "next"}
              onChange={() => setSprint("next")}
            />{" "}
            next
          </label>
        </div>

        <label className="mb-2 block text-sm">
          <span className="block text-[var(--text-secondary)]">Project</span>
          <select
            value={project}
            onChange={(e) => setProject(e.target.value)}
            className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--background)] p-1 text-[var(--text-primary)]"
          >
            <option value="">(herda do sprint)</option>
            {projects.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>

        <div className="mb-2 grid grid-cols-2 gap-2 text-sm">
          <label className="block">
            <span className="block text-[var(--text-secondary)]">Epic (ex: E5)</span>
            <input
              value={epicId}
              onChange={(e) => setEpicId(e.target.value)}
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--background)] p-1 text-[var(--text-primary)]"
            />
          </label>
          <label className="block">
            <span className="block text-[var(--text-secondary)]">
              Wave ref (ex: E5/F4-sprint-planning)
            </span>
            <input
              value={waveRef}
              onChange={(e) => setWaveRef(e.target.value)}
              className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--background)] p-1 text-[var(--text-primary)]"
            />
          </label>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded border border-[var(--border)] px-3 py-1 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]">
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={!canSubmit}
            className="rounded border border-[var(--success)] bg-[var(--success-bg)] px-3 py-1 text-sm text-[var(--success)] disabled:opacity-50"
          >
            {busy ? "Criando…" : "Criar"}
          </button>
        </div>
      </div>
    </div>
  );
}
