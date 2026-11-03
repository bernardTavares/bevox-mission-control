"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Sprint, Task, TaskStatus } from "@/lib/kanban/stateReader";
import { Board } from "@/components/kanban/Board";
import { TopBar } from "@/components/kanban/TopBar";
import { SprintHeader } from "@/components/kanban/SprintHeader";
import { SprintSwitcher } from "@/components/kanban/SprintSwitcher";
import { NewTaskModal, type NewTaskPayload } from "@/components/kanban/NewTaskModal";
import {
  CloseSprintModal,
  type CarryoverEntry,
} from "@/components/kanban/CloseSprintModal";
import { DetailDrawer, type TaskPatch } from "@/components/kanban/DetailDrawer";
import { useFilterPersistence } from "@/components/kanban/useFilterPersistence";
import { useKeyboardShortcuts } from "@/components/kanban/KeyboardShortcuts";
import { ShortcutsCheatsheet } from "@/components/kanban/ShortcutsCheatsheet";
import { BlockModal } from "@/components/kanban/BlockModal";
import { RejectedLane } from "@/components/kanban/RejectedLane";
import { TERMINAL } from "@/lib/kanban/statusEnum";
import { optimisticUpdate } from "@/lib/kanban/optimistic";

type SpKey = "current" | "next";

/**
 * Fetch helper that reads the MC convention shape:
 *   success -> raw payload
 *   error   -> { error, detail } with non-2xx status
 */
async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  let json: unknown;
  try {
    json = await r.json();
  } catch {
    throw new Error(`HTTP ${r.status} (no JSON body)`);
  }
  if (!r.ok) {
    const j = (json ?? {}) as Record<string, unknown>;
    const detail = typeof j.detail === "string" ? j.detail : "";
    const err = typeof j.error === "string" ? j.error : `HTTP ${r.status}`;
    throw new Error(detail ? `${err}: ${detail}` : err);
  }
  return json as T;
}

export default function KanbanPage() {
  const [filters, updateFilters, resetFilters, filtersDirty] =
    useFilterPersistence();
  const activeSprint: SpKey = filters.sprint;
  const setActiveSprint = (s: SpKey) => updateFilters({ sprint: s });
  const projectFilter = filters.project;
  const setProjectFilter = (p: string | null) =>
    updateFilters({ project: p });

  // Deeplink support on mount: ?project=<id>, ?sprint=<id>, ?task=<id>.
  // Used by /sprints drill-down + project tab embed. Reads window.location
  // directly to avoid Next.js 15 CSR-bailout (page too large for Suspense).
  // Runs only on first mount; user can still edit filters manually after.
  // sprint/task params consumed in dedicated effects below (need allSprints/allTasks loaded).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const qp = new URLSearchParams(window.location.search).get("project");
    if (qp && qp !== projectFilter) {
      updateFilters({ project: qp });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const search = filters.search;
  const setSearch = (s: string) => updateFilters({ search: s });
  const showArchived = filters.showArchived;
  const setShowArchived = (v: boolean) =>
    updateFilters({ showArchived: v });
  const blockedOnly = filters.blockedOnly;
  const setBlockedOnly = (v: boolean) => updateFilters({ blockedOnly: v });

  const [allSprints, setAllSprints] = useState<Sprint[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [archivedTasks, setArchivedTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<string[]>([]);
  const [newOpen, setNewOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailEvents, setDetailEvents] = useState<
    Array<Record<string, unknown>>
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [cheatOpen, setCheatOpen] = useState(false);
  const [blockModalTask, setBlockModalTask] = useState<Task | null>(null);
  const [toastMsg, setToastMsg] = useState<{
    msg: string;
    kind: "ok" | "error";
  } | null>(null);

  const toast = useCallback((msg: string, kind: "ok" | "error" = "ok") => {
    setToastMsg({ msg, kind });
    // Auto-dismiss em 3s
    window.setTimeout(() => {
      setToastMsg((cur) => (cur && cur.msg === msg ? null : cur));
    }, 3000);
  }, []);

  const load = useCallback(async () => {
    try {
      const [sps, tks, pp] = await Promise.all([
        api<{ sprints: Sprint[] }>(`/api/kanban/sprints`),
        api<{ tasks: Task[] }>(`/api/kanban/tasks?archived=false`),
        api<{ projects: string[] }>(`/api/kanban/projects`),
      ]);
      setAllSprints(sps.sprints);
      setAllTasks(tks.tasks);
      setProjects(pp.projects);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  // Fetch archived tasks on demand (when toggle turns on)
  useEffect(() => {
    if (!showArchived) {
      setArchivedTasks([]);
      return;
    }
    api<{ tasks: Task[] }>(`/api/kanban/tasks?archived=true`)
      .then((r) => setArchivedTasks(r.tasks))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [showArchived, allTasks]);

  useEffect(() => {
    load();
  }, [load]);

  // Deeplink ?sprint=<id> → set activeSprint to current/next based on which one matches.
  // Runs once after sprints load (consume + clear is implicit; the effect won't refire
  // because we don't depend on a flag).
  const sprintDeeplinkApplied = useRef(false);
  useEffect(() => {
    if (sprintDeeplinkApplied.current) return;
    if (typeof window === "undefined" || allSprints.length === 0) return;
    const qp = new URLSearchParams(window.location.search).get("sprint");
    if (!qp) {
      sprintDeeplinkApplied.current = true;
      return;
    }
    const target = allSprints.find((s) => s.id === qp);
    if (target && (target.state === "current" || target.state === "next")) {
      updateFilters({ sprint: target.state });
    }
    sprintDeeplinkApplied.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allSprints]);

  // Deeplink ?task=<id> → auto-open DetailDrawer once after tasks load.
  const taskDeeplinkApplied = useRef(false);
  useEffect(() => {
    if (taskDeeplinkApplied.current) return;
    if (typeof window === "undefined" || allTasks.length === 0) return;
    const qp = new URLSearchParams(window.location.search).get("task");
    if (qp && allTasks.some((t) => t.id === qp)) {
      setDetailId(qp);
    }
    taskDeeplinkApplied.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allTasks]);

  // Derived sprint references — scoped to projectFilter when set (schema v4
  // sprint-per-project). Without filter, falls back to first global match
  // (legacy single-project behavior).
  const currentSp = useMemo(
    () =>
      allSprints.find(
        (s) =>
          s.state === "current" &&
          (!projectFilter || s.project === projectFilter),
      ) ?? null,
    [allSprints, projectFilter],
  );
  const nextSp = useMemo(
    () =>
      allSprints.find(
        (s) =>
          s.state === "next" &&
          (!projectFilter || s.project === projectFilter),
      ) ?? null,
    [allSprints, projectFilter],
  );
  const sprint = activeSprint === "current" ? currentSp : nextSp;
  const tasksByCurrent = useMemo(
    () =>
      currentSp ? allTasks.filter((t) => t.sprint_id === currentSp.id) : [],
    [allTasks, currentSp],
  );
  const tasksByNext = useMemo(
    () => (nextSp ? allTasks.filter((t) => t.sprint_id === nextSp.id) : []),
    [allTasks, nextSp],
  );
  const tasks = activeSprint === "current" ? tasksByCurrent : tasksByNext;

  // Filter visible tasks (exclude archived; project/search/blockedOnly client-side)
  const filtered = useMemo(
    () =>
      tasks.filter((t) => {
        if (t.status === "archived") return false;
        if (projectFilter && t.project !== projectFilter) return false;
        if (
          search &&
          !`${t.title} ${t.description ?? ""}`
            .toLowerCase()
            .includes(search.toLowerCase())
        ) {
          return false;
        }
        if (blockedOnly && !t.blocked) return false;
        return true;
      }),
    [tasks, projectFilter, search, blockedOnly],
  );

  // Wave-3: rejected vivem em RejectedLane separado.
  const boardTasks = useMemo(
    () => filtered.filter((t) => t.status !== "rejected"),
    [filtered],
  );
  const rejectedTasks = useMemo(
    () => filtered.filter((t) => t.status === "rejected"),
    [filtered],
  );
  const blockedCount = useMemo(
    () => filtered.filter((t) => t.blocked).length,
    [filtered],
  );

  const detailTask = useMemo(() => {
    if (!detailId) return null;
    return (
      tasks.find((t) => t.id === detailId) ??
      archivedTasks.find((t) => t.id === detailId) ??
      null
    );
  }, [detailId, tasks, archivedTasks]);

  // Ordered list for j/k navigation: backlog -> ready -> in_progress -> testing -> done
  // (rejected fica fora do orderedTasks; vive em RejectedLane separado.)
  const COL_ORDER = [
    "backlog",
    "ready",
    "in_progress",
    "testing",
    "done",
  ] as const;
  const orderedTasks = useMemo(
    () =>
      COL_ORDER.flatMap((s) =>
        boardTasks.filter((t) => t.status === s),
      ),
    [boardTasks],
  );

  useEffect(() => {
    if (!detailId) {
      setDetailEvents([]);
      return;
    }
    api<{ events: Array<Record<string, unknown>> }>(
      `/api/kanban/events?task=${detailId}&n=200`,
    )
      .then((r) => setDetailEvents(r.events))
      .catch(() => setDetailEvents([]));
  }, [detailId]);

  // ─── Mutations ─────────────────────────────────────────────────────

  const move = async (id: string, status: TaskStatus) => {
    if (status === "archived") return;
    const prevStatus = allTasks.find((t) => t.id === id)?.status;
    if (!prevStatus) return;
    const result = await optimisticUpdate(
      () =>
        setAllTasks((tasks) =>
          tasks.map((t) => (t.id === id ? { ...t, status } : t)),
        ),
      () =>
        setAllTasks((tasks) =>
          tasks.map((t) =>
            t.id === id ? { ...t, status: prevStatus } : t,
          ),
        ),
      () =>
        api(`/api/kanban/tasks/${id}/move`, {
          method: "POST",
          body: JSON.stringify({ status }),
        }),
      (msg) => toast(`move falhou: ${msg}`, "error"),
    );
    if (result !== null) await load();
  };

  const archive = async (id: string) => {
    const snapshot = allTasks.find((t) => t.id === id);
    if (!snapshot) return;
    const result = await optimisticUpdate(
      () => setAllTasks((tasks) => tasks.filter((t) => t.id !== id)),
      () => setAllTasks((tasks) => [...tasks, snapshot]),
      () => api(`/api/kanban/tasks/${id}/archive`, { method: "POST" }),
      (msg) => toast(`archive falhou: ${msg}`, "error"),
    );
    if (result !== null) await load();
  };

  const unarchive = async (id: string) => {
    const snapshot = archivedTasks.find((t) => t.id === id);
    const restored: Task | null = snapshot
      ? { ...snapshot, status: "backlog", archived_at: null }
      : null;
    const result = await optimisticUpdate(
      () => {
        setArchivedTasks((tasks) => tasks.filter((t) => t.id !== id));
        if (restored) setAllTasks((tasks) => [...tasks, restored]);
      },
      () => {
        if (snapshot) setArchivedTasks((tasks) => [...tasks, snapshot]);
        setAllTasks((tasks) => tasks.filter((t) => t.id !== id));
      },
      () =>
        api(`/api/kanban/tasks/${id}/unarchive`, {
          method: "POST",
          body: JSON.stringify({ status: "backlog" }),
        }),
      (msg) => toast(`unarchive falhou: ${msg}`, "error"),
    );
    if (result !== null) await load();
  };

  const createTask = async (data: NewTaskPayload) => {
    const tempId = `T-OPT-${Date.now()}`;
    const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
    const sprintTarget =
      data.sprint === "current" ? currentSp?.id : nextSp?.id;
    if (!sprintTarget) {
      toast("sprint alvo não carregado", "error");
      return;
    }
    const tempTask: Task = {
      id: tempId,
      title: data.title,
      description: data.description ?? "",
      status: "backlog",
      sprint_id: sprintTarget,
      project: data.project ?? null,
      epic_id: data.epic_id ?? null,
      wave_ref: data.wave_ref ?? null,
      created_at: now,
      updated_at: now,
      created_by: "bernard",
      archived_at: null,
    };
    const result = await optimisticUpdate(
      () => {
        setAllTasks((tasks) => [...tasks, tempTask]);
        setNewOpen(false);
      },
      () => {
        setAllTasks((tasks) => tasks.filter((t) => t.id !== tempId));
        setNewOpen(true);
      },
      () =>
        api(`/api/kanban/tasks`, {
          method: "POST",
          body: JSON.stringify(data),
        }),
      (msg) => toast(`criar task falhou: ${msg}`, "error"),
    );
    if (result !== null) await load();
  };

  const setSprintProject = async (project: string | null) => {
    if (!sprint) return;
    try {
      await api(`/api/kanban/sprints/${sprint.id}/project`, {
        method: "PATCH",
        body: JSON.stringify({ project }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const setSprintName = async (name: string) => {
    if (!sprint) return;
    try {
      await api(`/api/kanban/sprints/${sprint.id}/name`, {
        method: "PATCH",
        body: JSON.stringify({ name }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const closeSprint = async (carryover: CarryoverEntry[]) => {
    if (!projectFilter) {
      setError("Set a project filter before closing the current sprint (schema v4 is per-project).");
      return;
    }
    try {
      await api(`/api/kanban/sprints/close`, {
        method: "POST",
        body: JSON.stringify({ project: projectFilter, carryover }),
      });
      setCloseOpen(false);
      setActiveSprint("current");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const patchTask = async (patch: TaskPatch) => {
    if (!detailTask) return;
    const id = detailTask.id;
    const snapshot = detailTask;
    const result = await optimisticUpdate(
      () =>
        setAllTasks((tasks) =>
          tasks.map((t) =>
            t.id === id
              ? {
                  ...t,
                  ...(patch.title !== undefined ? { title: patch.title } : {}),
                  ...(patch.description !== undefined
                    ? { description: patch.description }
                    : {}),
                  ...(patch.project !== undefined
                    ? { project: patch.project }
                    : {}),
                  ...(patch.epic_id !== undefined
                    ? { epic_id: patch.epic_id }
                    : {}),
                  ...(patch.wave_ref !== undefined
                    ? { wave_ref: patch.wave_ref }
                    : {}),
                }
              : t,
          ),
        ),
      () =>
        setAllTasks((tasks) =>
          tasks.map((t) => (t.id === id ? snapshot : t)),
        ),
      () =>
        api(`/api/kanban/tasks/${id}`, {
          method: "PATCH",
          body: JSON.stringify(patch),
        }),
      (msg) => toast(`edit falhou: ${msg}`, "error"),
    );
    if (result !== null) await load();
  };

  const resprintDetail = async (target: "current" | "next") => {
    if (!detailTask) return;
    try {
      await api(`/api/kanban/tasks/${detailTask.id}/resprint`, {
        method: "POST",
        body: JSON.stringify({ sprint: target }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const archiveDetail = async () => {
    if (!detailTask) return;
    await archive(detailTask.id);
    setDetailId(null);
  };

  const unarchiveDetail = async () => {
    if (!detailTask) return;
    await unarchive(detailTask.id);
  };

  // ─── Wave-3: block / unblock / invalid drop ────────────────────────

  const onToggleBlock = useCallback(
    (task: Task) => {
      if (TERMINAL.has(task.status)) return;
      if (task.blocked) {
        const snapshot = task;
        void optimisticUpdate(
          () =>
            setAllTasks((tasks) =>
              tasks.map((t) =>
                t.id === task.id
                  ? {
                      ...t,
                      blocked: false,
                      blocked_reason: null,
                      blocked_at: null,
                    }
                  : t,
              ),
            ),
          () =>
            setAllTasks((tasks) =>
              tasks.map((t) => (t.id === task.id ? snapshot : t)),
            ),
          () =>
            api(`/api/kanban/tasks/${task.id}/unblock`, {
              method: "POST",
              body: "{}",
            }),
          (msg) => toast(`unblock falhou: ${msg}`, "error"),
        ).then((result) => {
          if (result !== null) load();
        });
      } else {
        setBlockModalTask(task);
      }
    },
    [load, toast],
  );

  const onBlockConfirm = useCallback(
    async (reason: string) => {
      if (!blockModalTask) return;
      const task = blockModalTask;
      setBlockModalTask(null);
      const snapshot = task;
      const result = await optimisticUpdate(
        () =>
          setAllTasks((tasks) =>
            tasks.map((t) =>
              t.id === task.id
                ? {
                    ...t,
                    blocked: true,
                    blocked_reason: reason,
                    blocked_at: new Date().toISOString(),
                  }
                : t,
            ),
          ),
        () =>
          setAllTasks((tasks) =>
            tasks.map((t) => (t.id === task.id ? snapshot : t)),
          ),
        () =>
          api(`/api/kanban/tasks/${task.id}/block`, {
            method: "POST",
            body: JSON.stringify({ reason }),
          }),
        (msg) => toast(`block falhou: ${msg}`, "error"),
      );
      if (result !== null) await load();
    },
    [blockModalTask, load, toast],
  );

  const onInvalidDrop = useCallback(
    (task: Task, target: TaskStatus) => {
      if (TERMINAL.has(task.status)) {
        toast(
          `Reopen via CLI: cli.sh task reopen ${task.id} --to ${target}`,
          "error",
        );
      } else {
        toast(
          `Move not allowed: ${task.status} → ${target}. Use CLI with --force if intended.`,
          "error",
        );
      }
    },
    [toast],
  );

  // ─── Keyboard shortcuts ────────────────────────────────────────────

  const focusedIdx = focusedId
    ? orderedTasks.findIndex((t) => t.id === focusedId)
    : -1;
  const focused = focusedIdx >= 0 ? orderedTasks[focusedIdx] : null;

  useKeyboardShortcuts({
    n: () => setNewOpen(true),
    "?": () => setCheatOpen(true),
    Escape: () => {
      setCheatOpen(false);
      setNewOpen(false);
      setCloseOpen(false);
      setDetailId(null);
    },
    "/": () => {
      const el = document.querySelector(
        'input[placeholder="search…"]',
      ) as HTMLInputElement | null;
      el?.focus();
    },
    j: () => {
      if (orderedTasks.length === 0) return;
      const next =
        focusedIdx >= 0 && focusedIdx < orderedTasks.length - 1
          ? orderedTasks[focusedIdx + 1]
          : orderedTasks[0];
      setFocusedId(next.id);
    },
    k: () => {
      if (orderedTasks.length === 0) return;
      const prev =
        focusedIdx > 0
          ? orderedTasks[focusedIdx - 1]
          : orderedTasks[orderedTasks.length - 1];
      setFocusedId(prev.id);
    },
    ArrowRight: () => {
      if (!focused) return;
      const i = COL_ORDER.indexOf(focused.status as (typeof COL_ORDER)[number]);
      if (i >= 0 && i < COL_ORDER.length - 1) {
        move(focused.id, COL_ORDER[i + 1]);
      }
    },
    ArrowLeft: () => {
      if (!focused) return;
      const i = COL_ORDER.indexOf(focused.status as (typeof COL_ORDER)[number]);
      if (i > 0) {
        move(focused.id, COL_ORDER[i - 1]);
      }
    },
    a: () => {
      if (focused) archive(focused.id);
    },
    b: () => {
      if (focused) onToggleBlock(focused);
    },
    e: () => {
      if (focused) setDetailId(focused.id);
    },
    m: () => {
      if (!focused || !sprint) return;
      const target: SpKey =
        activeSprint === "current" && focused.sprint_id === sprint.id
          ? "next"
          : "current";
      api(`/api/kanban/tasks/${focused.id}/resprint`, {
        method: "POST",
        body: JSON.stringify({ sprint: target }),
      })
        .then(() => load())
        .catch((err) =>
          setError(err instanceof Error ? err.message : String(err)),
        );
    },
    c: () => {
      if (activeSprint === "current") setCloseOpen(true);
    },
  });

  // ─── Render ────────────────────────────────────────────────────────

  if (!sprint) {
    return (
      <div className="p-6">
        {error ? (
          <div className="rounded border border-[var(--error)] bg-[var(--error-bg)] p-3 text-sm text-[var(--error)]">
            Erro: {error}
          </div>
        ) : (
          <div className="text-[var(--text-secondary)]">Carregando…</div>
        )}
      </div>
    );
  }

  const pending = tasks.filter(
    (t) => t.status !== "done" && t.status !== "archived",
  );

  return (
    <div className="p-6">
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

      <SprintSwitcher
        current={currentSp}
        next={nextSp}
        tasksByCurrent={tasksByCurrent}
        tasksByNext={tasksByNext}
        active={activeSprint}
        onChange={setActiveSprint}
      />
      <TopBar
        projects={projects}
        projectFilter={projectFilter}
        onChangeProjectFilter={setProjectFilter}
        search={search}
        onChangeSearch={setSearch}
        showArchived={showArchived}
        onToggleArchived={setShowArchived}
        blockedOnly={blockedOnly}
        onToggleBlockedOnly={setBlockedOnly}
        blockedCount={blockedCount}
        onNewTask={() => setNewOpen(true)}
        onCloseSprint={
          activeSprint === "current" ? () => setCloseOpen(true) : undefined
        }
        filtersDirty={filtersDirty}
        onResetFilters={resetFilters}
      />
      <SprintHeader
        sprint={sprint}
        tasks={tasks}
        projects={projects}
        onChangeName={setSprintName}
        onChangeProject={setSprintProject}
      />
      <Board
        tasks={boardTasks}
        onMove={move}
        onArchive={archive}
        onOpenDetail={setDetailId}
        onInvalidDrop={onInvalidDrop}
        focusedId={focusedId}
      />
      <RejectedLane
        rejected={rejectedTasks}
        onOpenDetail={setDetailId}
        onArchive={archive}
        focusedId={focusedId}
      />

      {showArchived && sprint && (
        <div className="mt-6 rounded border border-[var(--border)] bg-[var(--card-elevated)] p-3">
          <div className="mb-2 flex items-baseline gap-2">
            <h3 className="text-sm font-semibold text-[var(--text-secondary)]">
              Archived (sprint {sprint.id})
            </h3>
            <span className="text-xs text-[var(--text-muted)]">
              {archivedTasks.filter((t) => t.sprint_id === sprint.id).length}{" "}
              task(s)
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {archivedTasks
              .filter((t) => t.sprint_id === sprint.id)
              .filter((t) => {
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
              })
              .map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setDetailId(t.id)}
                  className="rounded border border-[var(--border)] bg-[var(--card)] p-2 text-left opacity-60 transition hover:opacity-100"
                >
                  <div className="font-mono text-xs text-[var(--text-muted)]">
                    {t.id}{" "}
                    <span className="ml-1 rounded bg-[var(--surface-elevated)] px-1 text-[10px] uppercase text-[var(--text-muted)]">
                      archived
                    </span>
                  </div>
                  <div className="text-sm text-[var(--text-primary)]">{t.title}</div>
                  {(t.project || t.epic_id) && (
                    <div className="mt-1 flex flex-wrap gap-1">
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
                    </div>
                  )}
                </button>
              ))}
            {archivedTasks.filter((t) => t.sprint_id === sprint.id).length ===
              0 && (
              <div className="text-xs italic text-[var(--text-muted)]">
                Nenhuma task archived neste sprint.
              </div>
            )}
          </div>
        </div>
      )}

      <NewTaskModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onSubmit={createTask}
        projects={projects}
        defaultSprint={activeSprint}
        defaultProject={projectFilter ?? undefined}
      />
      <CloseSprintModal
        open={closeOpen}
        onClose={() => setCloseOpen(false)}
        pending={pending}
        onConfirm={closeSprint}
      />
      <DetailDrawer
        open={detailId !== null}
        task={detailTask}
        projects={projects}
        events={detailEvents}
        onClose={() => setDetailId(null)}
        onSave={patchTask}
        onMoveStatus={async (s) => {
          if (detailTask) await move(detailTask.id, s);
        }}
        onResprint={resprintDetail}
        onArchive={archiveDetail}
        onUnarchive={unarchiveDetail}
      />
      <ShortcutsCheatsheet
        open={cheatOpen}
        onClose={() => setCheatOpen(false)}
      />
      {blockModalTask && (
        <BlockModal
          taskId={blockModalTask.id}
          taskTitle={blockModalTask.title}
          onConfirm={onBlockConfirm}
          onCancel={() => setBlockModalTask(null)}
        />
      )}

      {toastMsg && (
        <div
          className={`fixed bottom-4 right-4 z-50 rounded border px-3 py-2 text-sm shadow-lg ${
            toastMsg.kind === "ok"
              ? "border-[var(--success)] bg-[var(--success-bg)] text-[var(--success)]"
              : "border-[var(--error)] bg-[var(--error-bg)] text-[var(--error)]"
          }`}
          role="status"
          aria-live="polite"
        >
          {toastMsg.msg}
          <button
            onClick={() => setToastMsg(null)}
            className="ml-3 text-xs underline"
          >
            fechar
          </button>
        </div>
      )}
    </div>
  );
}
