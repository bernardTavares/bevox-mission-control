"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { Sprint, Task } from "@/lib/kanban/stateReader";
import { SprintColumn } from "@/components/sprints/SprintColumn";
import { SprintKanbanModal } from "@/components/sprints/SprintKanbanModal";
import {
  CloseSprintModal,
  type CarryoverEntry,
} from "@/components/kanban/CloseSprintModal";

interface KanbanStateResponse {
  schema_version: number;
  projects: string[];
  currentSprintByProject: Record<string, string>;
  sprints: Sprint[];
  tasks: Task[];
}

/** Group tasks by sprint_id for fast lookup. */
export function groupTasksBySprintId(tasks: Task[]): Record<string, Task[]> {
  const map: Record<string, Task[]> = {};
  for (const t of tasks) {
    if (!map[t.sprint_id]) map[t.sprint_id] = [];
    map[t.sprint_id].push(t);
  }
  return map;
}

/** Filter sprints by project (null = all). */
export function filterSprintsByProject(
  sprints: Sprint[],
  project: string | null,
): Sprint[] {
  if (!project) return sprints;
  return sprints.filter((s) => s.project === project);
}

/** Group sprints by state (current / next / closed). */
export function groupSprintsByState(sprints: Sprint[]): {
  current: Sprint[];
  next: Sprint[];
  closed: Sprint[];
} {
  return {
    current: sprints.filter((s) => s.state === "current"),
    next: sprints.filter((s) => s.state === "next"),
    closed: sprints.filter((s) => s.state === "closed"),
  };
}

/**
 * Validate sprint drag transition. Returns true if drop should trigger
 * close-current (carryover modal), false otherwise.
 *
 * Valid:
 * - current → closed: dragged sprint IS the current that gets closed.
 * - next → current: dragged sprint gets promoted as side effect of close-current.
 *
 * Invalid (silent no-op):
 * - same column drop, closed → anything (terminal), current → next (no demote),
 *   next → closed (no direct skip).
 */
export function isValidSprintTransition(
  fromState: Sprint["state"],
  toState: "current" | "next" | "closed",
): boolean {
  if (fromState === "current" && toState === "closed") return true;
  if (fromState === "next" && toState === "current") return true;
  return false;
}

export interface SprintsPageInnerProps {
  /** Quando setado, ignora ?project= URL e força filter pra esse projeto. */
  forcedProject?: string;
  /** Quando true, esconde o dropdown "Project: ▼" no header. */
  hideProjectFilter?: boolean;
}

/**
 * /sprints — cross-project sprints list with 3 columns + click → modal.
 *
 * Spec: bevox-knowledge/35_specs/company-os/2026-04-25-mc-sprints-page.md
 */
export function SprintsPageInner({
  forcedProject,
  hideProjectFilter,
}: SprintsPageInnerProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const urlProjectFilter = searchParams.get("project");
  const projectFilter = forcedProject ?? urlProjectFilter;
  const selectedSprintId = searchParams.get("sprint");

  const [state, setState] = useState<KanbanStateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAllClosed, setShowAllClosed] = useState(false);
  const [dragClose, setDragClose] = useState<{ project: string; pending: Task[] } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const fetchState = useCallback(async () => {
    try {
      const r = await fetch("/api/kanban/state", { cache: "no-store" });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        const detail = (j as Record<string, unknown>).detail;
        throw new Error(typeof detail === "string" ? detail : `HTTP ${r.status}`);
      }
      const data = (await r.json()) as KanbanStateResponse;
      setState(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  const tasksBySprint = useMemo(
    () => (state ? groupTasksBySprintId(state.tasks) : {}),
    [state],
  );

  const filteredSprints = useMemo(
    () => (state ? filterSprintsByProject(state.sprints, projectFilter) : []),
    [state, projectFilter],
  );

  const grouped = useMemo(() => groupSprintsByState(filteredSprints), [filteredSprints]);

  // When embedded (forcedProject set), preserve the current pathname (e.g.
  // /projects/openclaw) so opening/closing modals doesn't navigate away.
  // Standalone /sprints uses the hardcoded base.
  const urlBase = forcedProject ? pathname : "/sprints";

  const setSelectedSprint = useCallback(
    (sprintId: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (sprintId) {
        params.set("sprint", sprintId);
      } else {
        params.delete("sprint");
      }
      const qs = params.toString();
      router.replace(qs ? `${urlBase}?${qs}` : urlBase, { scroll: false });
    },
    [router, searchParams, urlBase],
  );

  const setProjectFilter = useCallback(
    (project: string | null) => {
      if (forcedProject) return;
      const params = new URLSearchParams(searchParams.toString());
      if (project) {
        params.set("project", project);
      } else {
        params.delete("project");
      }
      const qs = params.toString();
      router.replace(qs ? `${urlBase}?${qs}` : urlBase, { scroll: false });
    },
    [router, searchParams, forcedProject, urlBase],
  );

  const selectedSprint = useMemo(
    () => (selectedSprintId && state
      ? state.sprints.find((s) => s.id === selectedSprintId)
      : undefined),
    [selectedSprintId, state],
  );

  const selectedTasks = useMemo(
    () => (selectedSprintId ? tasksBySprint[selectedSprintId] ?? [] : []),
    [selectedSprintId, tasksBySprint],
  );

  const handleDragEnd = useCallback(
    (e: DragEndEvent) => {
      if (!state) return;
      const sprintId = String(e.active.id);
      const overId = e.over?.id;
      if (!overId) return;
      const targetCol = String(overId).replace(/^col-/, "");
      if (targetCol !== "current" && targetCol !== "next" && targetCol !== "closed") return;

      const sprint = state.sprints.find((s) => s.id === sprintId);
      if (!sprint) return;
      if (!isValidSprintTransition(sprint.state, targetCol)) return;
      if (!sprint.project) {
        alert("Cannot transition: sprint has no project assigned");
        return;
      }

      // close-current always closes the project's CURRENT sprint, regardless of
      // which sprint was dragged. For next → current drag the dragged sprint
      // gets promoted as side effect; pending tasks come from the existing current.
      const currentOfProject = state.sprints.find(
        (s) => s.state === "current" && s.project === sprint.project,
      );
      if (!currentOfProject) {
        alert(`Cannot close: project ${sprint.project} has no current sprint`);
        return;
      }
      const pending = state.tasks.filter(
        (t) =>
          t.sprint_id === currentOfProject.id &&
          t.status !== "done" &&
          t.status !== "archived",
      );

      setDragClose({ project: sprint.project, pending });
    },
    [state],
  );

  const handleCarryoverConfirm = useCallback(
    async (carryover: CarryoverEntry[]) => {
      if (!dragClose) return;
      try {
        const r = await fetch("/api/kanban/sprints/close", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ project: dragClose.project, carryover }),
        });
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          const detail = (j as Record<string, unknown>).detail;
          throw new Error(typeof detail === "string" ? detail : `HTTP ${r.status}`);
        }
        setDragClose(null);
        await fetchState();
      } catch (err) {
        alert(`Close sprint failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
    [dragClose, fetchState],
  );

  if (error) {
    return (
      <div style={{ padding: "2rem" }}>
        <h1 style={{ color: "#e0e0e0" }}>Sprints</h1>
        <div style={{ color: "#e46e6e", padding: "1rem", background: "#3f1e1e", borderRadius: 4, marginTop: "1rem" }}>
          Failed to load: {error}
          <button
            type="button"
            onClick={fetchState}
            style={{
              marginLeft: "1rem",
              background: "#2a2f3e",
              color: "#e0e0e0",
              border: "none",
              padding: "0.3rem 0.7rem",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!state) {
    return (
      <div style={{ padding: "2rem", color: "#888" }}>Loading sprints...</div>
    );
  }

  return (
    <div style={{ padding: "1.5rem", color: "#e0e0e0" }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: 0 }}>Sprints</h1>
        {!hideProjectFilter && (
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <label htmlFor="project-filter" style={{ color: "#888", fontSize: "0.85rem" }}>
              Project:
            </label>
            <select
              id="project-filter"
              value={projectFilter ?? ""}
              onChange={(e) => setProjectFilter(e.target.value || null)}
              style={{
                background: "#1a2230",
                color: "#e0e0e0",
                border: "1px solid #2a2f3e",
                padding: "0.35rem 0.6rem",
                borderRadius: 4,
                fontSize: "0.85rem",
              }}
            >
              <option value="">All projects</option>
              {state.projects.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        )}
      </header>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "1rem",
        }}
      >
        <SprintColumn
          state="current"
          sprints={grouped.current}
          tasksBySprint={tasksBySprint}
          showAllClosed={showAllClosed}
          onToggleShowAll={() => setShowAllClosed((v) => !v)}
          onSelectSprint={(id) => setSelectedSprint(id)}
        />
        <SprintColumn
          state="next"
          sprints={grouped.next}
          tasksBySprint={tasksBySprint}
          showAllClosed={showAllClosed}
          onToggleShowAll={() => setShowAllClosed((v) => !v)}
          onSelectSprint={(id) => setSelectedSprint(id)}
        />
        <SprintColumn
          state="closed"
          sprints={grouped.closed}
          tasksBySprint={tasksBySprint}
          showAllClosed={showAllClosed}
          onToggleShowAll={() => setShowAllClosed((v) => !v)}
          onSelectSprint={(id) => setSelectedSprint(id)}
        />
      </div>
      </DndContext>

      {selectedSprintId && (
        <SprintKanbanModal
          sprintId={selectedSprintId}
          sprint={selectedSprint}
          tasks={selectedTasks}
          onClose={() => setSelectedSprint(null)}
          onMutate={fetchState}
        />
      )}

      <CloseSprintModal
        open={dragClose !== null}
        onClose={() => setDragClose(null)}
        pending={dragClose?.pending ?? []}
        onConfirm={handleCarryoverConfirm}
      />
    </div>
  );
}

/**
 * Suspense wrapper required by Next.js 15: SprintsPageInner reads URL state via
 * useSearchParams; without a Suspense boundary the build bails out of static
 * rendering for the entire page (CSR bailout error during prerender).
 */
export default function SprintsPage() {
  return (
    <Suspense fallback={<div style={{ padding: "2rem", color: "#888" }}>Loading sprints...</div>}>
      <SprintsPageInner />
    </Suspense>
  );
}
