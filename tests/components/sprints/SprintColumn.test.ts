/**
 * Contract tests for SprintColumn.
 * Tests sort/filter helpers (pure functions) + props contract.
 *
 * Spec: bevox-knowledge/35_specs/company-os/2026-04-25-mc-sprints-page.md §3.1, §2.4
 */
import { describe, it, expect } from "vitest";
import type { SprintColumnProps } from "@/components/sprints/SprintColumn";
import { sortSprintsForColumn } from "@/components/sprints/SprintColumn";

describe("SprintColumnProps contract", () => {
  it("requires state, sprints, tasksBySprint, showAllClosed, onToggleShowAll, onSelectSprint", () => {
    const props: SprintColumnProps = {
      state: "current",
      sprints: [],
      tasksBySprint: {},
      showAllClosed: false,
      onToggleShowAll: () => {},
      onSelectSprint: () => {},
    };
    expect(props.state).toBe("current");
  });
});

describe("sortSprintsForColumn helper", () => {
  it("sorts current/next by project name asc", () => {
    const sprints = [
      { id: "sprint-3", state: "current" as const, project: "openclaw", name: "S3", created_at: "", closed_at: null, created_by: "" },
      { id: "sprint-1", state: "current" as const, project: "bevox-mobile", name: "S1", created_at: "", closed_at: null, created_by: "" },
      { id: "sprint-2", state: "current" as const, project: "bevox-backend", name: "S2", created_at: "", closed_at: null, created_by: "" },
    ];
    const result = sortSprintsForColumn(sprints, "current");
    expect(result.map((s) => s.project)).toEqual([
      "bevox-backend", "bevox-mobile", "openclaw",
    ]);
  });

  it("sorts closed by closed_at desc", () => {
    const sprints = [
      { id: "sprint-1", state: "closed" as const, project: "x", name: "S1", created_at: "", closed_at: "2026-04-10T00:00:00Z", created_by: "" },
      { id: "sprint-2", state: "closed" as const, project: "x", name: "S2", created_at: "", closed_at: "2026-04-25T00:00:00Z", created_by: "" },
      { id: "sprint-3", state: "closed" as const, project: "x", name: "S3", created_at: "", closed_at: "2026-04-15T00:00:00Z", created_by: "" },
    ];
    const result = sortSprintsForColumn(sprints, "closed");
    expect(result.map((s) => s.id)).toEqual(["sprint-2", "sprint-3", "sprint-1"]);
  });
});
