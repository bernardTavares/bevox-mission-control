"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Task } from "@/lib/kanban/stateReader";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
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

type UnarchiveStatus =
  | "backlog"
  | "ready"
  | "in_progress"
  | "testing"
  | "done"
  | "rejected";

export default function KanbanArchivedPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<string[]>([]);
  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await api<{ tasks: Task[] }>(`/api/kanban/tasks?archived=true`);
      const pp = await api<{ projects: string[] }>(`/api/kanban/projects`);
      // archived_at desc
      setTasks(
        r.tasks
          .slice()
          .sort((a, b) =>
            (b.archived_at ?? "").localeCompare(a.archived_at ?? ""),
          ),
      );
      setProjects(pp.projects);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(
    () =>
      tasks.filter((t) => {
        if (projectFilter && t.project !== projectFilter) return false;
        if (
          search &&
          !`${t.title} ${t.description ?? ""}`
            .toLowerCase()
            .includes(search.toLowerCase())
        ) {
          return false;
        }
        return true;
      }),
    [tasks, projectFilter, search],
  );

  const unarchive = async (id: string, status: UnarchiveStatus) => {
    try {
      await api(`/api/kanban/tasks/${id}/unarchive`, {
        method: "POST",
        body: JSON.stringify({ status }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="p-6">
      <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-[var(--border)] pb-3">
        <Link
          href="/kanban"
          className="flex items-center gap-1 rounded border border-[var(--border)] px-2 py-1 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
        >
          <ArrowLeft size={14} /> Board
        </Link>
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">
          Archived <span className="font-normal text-[var(--text-muted)]">({tasks.length})</span>
        </h1>
        <div className="flex-1" />
        <select
          value={projectFilter ?? ""}
          onChange={(e) => setProjectFilter(e.target.value || null)}
          className="rounded border border-[var(--border)] bg-[var(--card)] p-1 text-sm text-[var(--text-primary)]"
        >
          <option value="">all projects</option>
          {projects.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="search…"
          className="rounded border border-[var(--border)] bg-[var(--card)] p-1 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
        />
      </div>

      {error && (
        <div className="mb-3 rounded border border-[var(--error)] bg-[var(--error-bg)] p-2 text-sm text-[var(--error)]">
          Erro: {error}
          <button
            onClick={() => setError(null)}
            className="ml-3 text-xs underline"
          >
            fechar
          </button>
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((t) => (
          <div
            key={t.id}
            className="flex flex-wrap items-center gap-2 rounded border border-[var(--border)] bg-[var(--card)] p-2"
          >
            <span className="font-mono text-xs text-[var(--text-muted)]">{t.id}</span>
            <span className="flex-1 text-sm text-[var(--text-primary)]">{t.title}</span>
            {t.project && (
              <span className="rounded bg-[var(--accent-soft)] px-1 py-0.5 text-xs text-[var(--accent)]">
                {t.project}
              </span>
            )}
            {t.epic_id && (
              <span className="rounded bg-[var(--info-soft)] px-1 py-0.5 text-xs text-[var(--info)]">
                {t.epic_id}
              </span>
            )}
            <span className="text-xs text-[var(--text-muted)]">
              sprint: {t.sprint_id}
            </span>
            <span className="text-xs text-[var(--text-muted)]">
              archived: {t.archived_at}
            </span>
            <select
              defaultValue=""
              onChange={(e) => {
                const s = e.target.value as UnarchiveStatus | "";
                if (s) {
                  unarchive(t.id, s);
                  e.currentTarget.value = "";
                }
              }}
              className="rounded border border-[var(--border)] bg-[var(--background)] p-1 text-xs text-[var(--text-primary)]"
            >
              <option value="" disabled>
                unarchive →
              </option>
              <option value="backlog">backlog</option>
              <option value="ready">ready</option>
              <option value="in_progress">in_progress</option>
              <option value="testing">testing</option>
              <option value="done">done</option>
              <option value="rejected">rejected</option>
            </select>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-sm italic text-[var(--text-muted)]">
            Nenhuma task archived{projectFilter || search ? " (com filtros ativos)" : ""}.
          </div>
        )}
      </div>
    </div>
  );
}
