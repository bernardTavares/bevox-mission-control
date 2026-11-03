"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Sprint, Task, TaskStatus } from "@/lib/kanban/stateReader";
import { Board } from "@/components/kanban/Board";
import { DetailDrawer, type TaskPatch } from "@/components/kanban/DetailDrawer";
import { extractSprintNumber } from "./SprintCard";

export interface SprintKanbanModalProps {
  sprintId: string;
  sprint: Sprint | undefined;
  tasks: Task[];
  onClose: () => void;
  onMutate?: () => void;
}

/**
 * Build deep-link to /kanban scoped to project + sprint, optionally focusing a task.
 * /kanban consumes ?project= ?sprint= ?task= on mount.
 */
export function buildKanbanLink(
  sprintId: string,
  project: string | null,
  taskId?: string,
): string {
  const params = new URLSearchParams();
  if (project) params.set("project", project);
  if (sprintId) params.set("sprint", sprintId);
  if (taskId) params.set("task", taskId);
  const qs = params.toString();
  return qs ? `/kanban?${qs}` : "/kanban";
}

/**
 * Modal centered overlay embedding kanban Board for a specific sprint.
 * Closed sprints render a yellow banner; mutations may fail server-side.
 *
 * Spec: bevox-knowledge/35_specs/company-os/2026-04-25-mc-sprints-page.md §3.1, §4.4
 */
export function SprintKanbanModal({
  sprintId,
  sprint,
  tasks,
  onClose,
  onMutate,
}: SprintKanbanModalProps) {
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const [projects, setProjects] = useState<string[]>([]);
  const [detailEvents, setDetailEvents] = useState<Array<Record<string, unknown>>>([]);

  // Fetch projects list once for DetailDrawer's project dropdown
  useEffect(() => {
    let cancelled = false;
    fetch("/api/kanban/projects", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { projects: [] }))
      .then((d: { projects?: string[] }) => {
        if (!cancelled) setProjects(d.projects ?? []);
      })
      .catch(() => { /* ignore */ });
    return () => { cancelled = true; };
  }, []);

  // Fetch events for the focused task
  useEffect(() => {
    if (!detailTaskId) {
      setDetailEvents([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/kanban/events?task=${encodeURIComponent(detailTaskId)}&n=200`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { events: [] }))
      .then((d: { events?: Array<Record<string, unknown>> }) => {
        if (!cancelled) setDetailEvents(d.events ?? []);
      })
      .catch(() => { if (!cancelled) setDetailEvents([]); });
    return () => { cancelled = true; };
  }, [detailTaskId]);

  const detailTask = detailTaskId ? tasks.find((t) => t.id === detailTaskId) ?? null : null;

  const refresh = useCallback(() => { onMutate?.(); }, [onMutate]);

  const patchTask = useCallback(async (patch: TaskPatch) => {
    if (!detailTaskId) return;
    const r = await fetch(`/api/kanban/tasks/${encodeURIComponent(detailTaskId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      throw new Error((j as Record<string, unknown>).detail as string ?? `HTTP ${r.status}`);
    }
    refresh();
  }, [detailTaskId, refresh]);

  const moveDetail = useCallback(async (status: Exclude<TaskStatus, "archived">) => {
    if (!detailTaskId) return;
    const r = await fetch(`/api/kanban/tasks/${encodeURIComponent(detailTaskId)}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      alert((j as Record<string, unknown>).detail as string ?? `Move falhou: HTTP ${r.status}`);
      return;
    }
    refresh();
  }, [detailTaskId, refresh]);

  const resprintDetail = useCallback(async (target: "current" | "next") => {
    if (!detailTaskId) return;
    const r = await fetch(`/api/kanban/tasks/${encodeURIComponent(detailTaskId)}/resprint`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sprint: target }),
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      alert((j as Record<string, unknown>).detail as string ?? `Resprint falhou: HTTP ${r.status}`);
      return;
    }
    refresh();
  }, [detailTaskId, refresh]);

  const archiveDetail = useCallback(async () => {
    if (!detailTaskId) return;
    const r = await fetch(`/api/kanban/tasks/${encodeURIComponent(detailTaskId)}/archive`, { method: "POST" });
    if (!r.ok) {
      alert(`Archive falhou: HTTP ${r.status}`);
      return;
    }
    setDetailTaskId(null);
    refresh();
  }, [detailTaskId, refresh]);

  const unarchiveDetail = useCallback(async () => {
    if (!detailTaskId) return;
    const r = await fetch(`/api/kanban/tasks/${encodeURIComponent(detailTaskId)}/unarchive`, { method: "POST" });
    if (!r.ok) {
      alert(`Unarchive falhou: HTTP ${r.status}`);
      return;
    }
    refresh();
  }, [detailTaskId, refresh]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // Drawer-first: ESC closes the inline DetailDrawer if open; otherwise the modal.
      if (detailTaskId) {
        setDetailTaskId(null);
        e.stopPropagation();
        return;
      }
      onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, detailTaskId]);

  if (!sprint) {
    return (
      <div className="modal-backdrop" onClick={onClose} style={backdropStyle}>
        <div
          className="modal-box"
          onClick={(e) => e.stopPropagation()}
          style={{ ...modalBoxStyle, maxWidth: 480, padding: "2rem" }}
        >
          <div style={{ color: "#e46e6e", fontWeight: 600, marginBottom: "0.5rem" }}>
            Sprint not found
          </div>
          <div style={{ color: "#888", fontSize: "0.85rem", marginBottom: "1rem" }}>
            Sprint id <code>{sprintId}</code> não existe no kanban state.
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "#2a2f3e",
              color: "#e0e0e0",
              border: "none",
              padding: "0.5rem 1rem",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const isClosed = sprint.state === "closed";
  const sprintNum = extractSprintNumber(sprint.id);
  const sprintLabel = sprintNum !== null ? `Sprint ${sprintNum}` : sprint.name;
  const project = sprint.project ?? "?";

  const onMove = async (taskId: string, newStatus: TaskStatus) => {
    try {
      const r = await fetch(`/api/kanban/tasks/${taskId}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        const detail = (j as Record<string, unknown>).detail;
        throw new Error(typeof detail === "string" ? detail : `HTTP ${r.status}`);
      }
      onMutate?.();
    } catch (err) {
      alert(`Move failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };
  const onArchive = async (taskId: string) => {
    try {
      const r = await fetch(`/api/kanban/tasks/${taskId}/archive`, { method: "POST" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      onMutate?.();
    } catch (err) {
      alert(`Archive failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };
  const onOpenDetail = (taskId: string) => {
    setDetailTaskId(taskId);
  };

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      style={backdropStyle}
    >
      <div
        className="modal-box"
        onClick={(e) => e.stopPropagation()}
        style={modalBoxStyle}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0.75rem 1rem",
            borderBottom: "1px solid #2a2f3e",
          }}
        >
          <div style={{ display: "flex", gap: "0.6rem", alignItems: "baseline" }}>
            <span style={{ color: "#4f9eff", fontWeight: 600 }}>{sprintLabel}</span>
            <span style={{ color: "#888", fontSize: "0.85rem" }}>· {project}</span>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <Link
              href={buildKanbanLink(sprint.id, sprint.project)}
              style={{
                background: "#2a2f3e",
                color: "#4f9eff",
                padding: "0.35rem 0.7rem",
                borderRadius: 4,
                fontSize: "0.8rem",
                textDecoration: "none",
              }}
            >
              Open in /kanban →
            </Link>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              style={{
                background: "transparent",
                border: "none",
                color: "#888",
                fontSize: "1.4rem",
                cursor: "pointer",
                padding: "0 0.4rem",
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
        </div>

        {isClosed && (
          <div
            style={{
              background: "#5f5a1e",
              color: "#e4dc6e",
              padding: "0.5rem 1rem",
              fontSize: "0.85rem",
              borderBottom: "1px solid #2a2f3e",
            }}
          >
            ⚠ This sprint is closed (mutations may fail with kanban invariant errors)
          </div>
        )}

        <div style={{ flex: 1, overflow: "auto", padding: "1rem" }}>
          <Board
            tasks={tasks}
            onMove={onMove}
            onArchive={onArchive}
            onOpenDetail={onOpenDetail}
          />
        </div>
      </div>
      {/* Wrap DetailDrawer so clicks inside don't bubble to backdrop onClose. */}
      <div onClick={(e) => e.stopPropagation()}>
        <DetailDrawer
          open={detailTaskId !== null}
          task={detailTask}
          projects={projects}
          events={detailEvents}
          onClose={() => setDetailTaskId(null)}
          onSave={patchTask}
          onMoveStatus={moveDetail}
          onResprint={resprintDetail}
          onArchive={archiveDetail}
          onUnarchive={unarchiveDetail}
        />
      </div>
    </div>
  );
}

const backdropStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 100,
};

const modalBoxStyle: React.CSSProperties = {
  background: "#161b22",
  borderRadius: 8,
  width: "90%",
  height: "85%",
  maxWidth: 1400,
  maxHeight: 900,
  display: "flex",
  flexDirection: "column",
  boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
  border: "1px solid #2a2f3e",
};
