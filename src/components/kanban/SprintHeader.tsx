"use client";

import { useState, useEffect } from "react";
import type { Sprint, Task } from "@/lib/kanban/stateReader";

interface Props {
  sprint: Sprint;
  tasks: Task[];
  projects: string[];
  onChangeName: (name: string) => void;
  onChangeProject: (project: string | null) => void;
  readOnly?: boolean;
}

export function SprintHeader({
  sprint,
  tasks,
  projects,
  onChangeName,
  onChangeProject,
  readOnly,
}: Props) {
  const [nameDraft, setNameDraft] = useState(sprint.name);
  useEffect(() => {
    setNameDraft(sprint.name);
  }, [sprint.id, sprint.name]);

  const stats = {
    backlog: tasks.filter((t) => t.status === "backlog").length,
    ready: tasks.filter((t) => t.status === "ready").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    testing: tasks.filter((t) => t.status === "testing").length,
    done: tasks.filter((t) => t.status === "done").length,
    rejected: tasks.filter((t) => t.status === "rejected").length,
  };
  const total =
    stats.backlog +
    stats.ready +
    stats.in_progress +
    stats.testing +
    stats.done +
    stats.rejected;

  return (
    <div className="mb-3 flex flex-wrap items-center gap-3 rounded border border-[var(--border)] bg-[var(--card-elevated)] p-2">
      <input
        className="rounded border border-[var(--border)] bg-[var(--card)] p-1 text-sm font-medium text-[var(--text-primary)] disabled:opacity-60"
        value={nameDraft}
        disabled={readOnly}
        onChange={(e) => setNameDraft(e.target.value)}
        onBlur={() => {
          const v = nameDraft.trim();
          if (v && v !== sprint.name) onChangeName(v);
          else setNameDraft(sprint.name);
        }}
      />
      <select
        value={sprint.project ?? ""}
        disabled={readOnly}
        onChange={(e) => onChangeProject(e.target.value || null)}
        className="rounded border border-[var(--border)] bg-[var(--card)] p-1 text-sm text-[var(--text-primary)] disabled:opacity-60"
      >
        <option value="">mixed</option>
        {projects.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
      <span className="text-xs text-[var(--text-muted)]">
        {total} tasks · {stats.backlog} backlog · {stats.ready} ready ·{" "}
        {stats.in_progress} in_progress · {stats.testing} testing ·{" "}
        {stats.done} done · {stats.rejected} rejected
      </span>
    </div>
  );
}
