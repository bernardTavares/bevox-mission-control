/**
 * Tests for GET /api/kanban/state — currentSprintByProject map.
 *
 * Uses vi.resetModules() + dynamic import so that KANBAN_ROOT env override
 * takes effect even though paths.ts computes KANBAN_STATE at module load.
 *
 * Spec: bevox-knowledge/35_specs/openclaw/2026-04-25-sprint-per-project.md §4.2
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { writeFileSync, mkdirSync, rmSync } from "fs";
import path from "path";
import os from "os";

const TMP_BASE = path.join(os.tmpdir(), `mc-kanban-state-${process.pid}`);

function kanbanRoot(suffix = "") {
  return path.join(TMP_BASE + suffix, "kanban-tasks");
}

function stateFile(suffix = "") {
  return path.join(kanbanRoot(suffix), "state.json");
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  rmSync(TMP_BASE, { recursive: true, force: true });
  rmSync(TMP_BASE + "-empty", { recursive: true, force: true });
  delete process.env.KANBAN_ROOT;
});

describe("GET /api/kanban/state currentSprintByProject", () => {
  it("returns map of project → current sprint id", async () => {
    const root = kanbanRoot();
    mkdirSync(root, { recursive: true });
    writeFileSync(
      stateFile(),
      JSON.stringify({
        schema_version: 4,
        generated_at: "2026-04-25T00:00:00Z",
        last_event_seq: 0,
        projects: ["bevox-mobile", "bevox-backend"],
        sprints: [
          {
            id: "sprint-7",
            state: "current",
            project: "bevox-mobile",
            name: "S7",
            created_at: "2026-04-25",
            closed_at: null,
            created_by: "test",
          },
          {
            id: "sprint-8",
            state: "next",
            project: "bevox-mobile",
            name: "S8",
            created_at: "2026-04-25",
            closed_at: null,
            created_by: "test",
          },
          {
            id: "sprint-9",
            state: "current",
            project: "bevox-backend",
            name: "S9",
            created_at: "2026-04-25",
            closed_at: null,
            created_by: "test",
          },
        ],
        tasks: [],
      }),
    );

    process.env.KANBAN_ROOT = root;
    const { GET } = await import("@/app/api/kanban/state/route");
    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.currentSprintByProject).toEqual({
      "bevox-mobile": "sprint-7",
      "bevox-backend": "sprint-9",
    });
    // schema_version and projects are also surfaced
    expect(body.schema_version).toBe(4);
    expect(body.projects).toEqual(["bevox-mobile", "bevox-backend"]);
  });

  it("returns empty map when no sprints are current", async () => {
    const root = kanbanRoot();
    mkdirSync(root, { recursive: true });
    writeFileSync(
      stateFile(),
      JSON.stringify({
        schema_version: 4,
        generated_at: "2026-04-25T00:00:00Z",
        last_event_seq: 0,
        projects: ["bevox-mobile"],
        sprints: [
          {
            id: "sprint-8",
            state: "next",
            project: "bevox-mobile",
            name: "S8",
            created_at: "2026-04-25",
            closed_at: null,
            created_by: "test",
          },
        ],
        tasks: [],
      }),
    );

    process.env.KANBAN_ROOT = root;
    const { GET } = await import("@/app/api/kanban/state/route");
    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.currentSprintByProject).toEqual({});
  });

  it("returns empty map when state.json is missing", async () => {
    const root = kanbanRoot("-empty");
    mkdirSync(root, { recursive: true });
    // no state.json written

    process.env.KANBAN_ROOT = root;
    const { GET } = await import("@/app/api/kanban/state/route");
    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.currentSprintByProject).toEqual({});
    expect(body.projects).toEqual([]);
  });
});
