"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Board } from "@/components/kanban/Board";
import { RejectedLane } from "@/components/kanban/RejectedLane";
import type { Sprint, Task } from "@/lib/kanban/stateReader";

async function api<T>(path: string): Promise<T> {
  const r = await fetch(path, { cache: "no-store" });
  let json: unknown;
  try {
    json = await r.json();
  } catch {
    throw new Error(`HTTP ${r.status}`);
  }
  if (!r.ok) {
    const j = (json ?? {}) as Record<string, unknown>;
    throw new Error(
      (typeof j.detail === "string" && j.detail) ||
        (typeof j.error === "string" && j.error) ||
        `HTTP ${r.status}`,
    );
  }
  return json as T;
}

/**
 * Read-only view do sprint fechado. Board reusado em modo readOnly;
 * botões de mutação não aparecem. Archived não aparece.
 */
export default function KanbanHistorySprintPage({
  params,
}: {
  params: Promise<{ sprint_id: string }>;
}) {
  const { sprint_id } = use(params);
  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ sprint: Sprint; tasks: Task[] }>(
      `/api/kanban/sprints/${sprint_id}`,
    )
      .then((r) => {
        setSprint(r.sprint);
        setTasks(r.tasks.filter((t) => t.status !== "archived"));
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [sprint_id]);

  if (error) {
    return (
      <div className="p-6">
        <Link
          href="/kanban/history"
          className="mb-3 inline-flex items-center gap-1 rounded border border-[var(--border)] px-2 py-1 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
        >
          <ArrowLeft size={14} /> History
        </Link>
        <div className="rounded border border-[var(--error)] bg-[var(--error-bg)] p-3 text-sm text-[var(--error)]">
          Erro: {error}
        </div>
      </div>
    );
  }

  if (!sprint) {
    return <div className="p-6 text-[var(--text-secondary)]">Carregando…</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-3 flex items-center gap-2 border-b border-[var(--border)] pb-3">
        <Link
          href="/kanban/history"
          className="flex items-center gap-1 rounded border border-[var(--border)] px-2 py-1 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
        >
          <ArrowLeft size={14} /> History
        </Link>
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">
          {sprint.id} — {sprint.name}
        </h1>
        <span className="text-xs text-[var(--text-muted)]">
          project: {sprint.project ?? "mixed"}
        </span>
      </div>

      <div className="mb-3 rounded border border-[var(--warning)] bg-[var(--warning-soft)] p-2 text-sm text-[var(--warning)]">
        Sprint fechado em {sprint.closed_at}. View read-only.
      </div>

      <Board
        tasks={tasks.filter((t) => t.status !== "rejected")}
        onMove={() => {}}
        onArchive={() => {}}
        onOpenDetail={() => {}}
        readOnly
      />
      <RejectedLane
        rejected={tasks.filter((t) => t.status === "rejected")}
        onOpenDetail={() => {}}
        onArchive={() => {}}
        readOnly
      />
    </div>
  );
}
