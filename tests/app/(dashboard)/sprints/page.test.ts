/**
 * Contract tests for SprintsPage.
 *
 * Page é client component com hooks; render-time tests não funcionam aqui (vide
 * NewTaskModal.test.ts pattern). Cobertura focada em pure helpers extraídos.
 *
 * Spec: bevox-knowledge/35_specs/company-os/2026-04-25-mc-sprints-page.md §4.2
 */
import { describe, it, expect } from "vitest";
import {
  groupTasksBySprintId,
  filterSprintsByProject,
  groupSprintsByState,
} from "@/app/(dashboard)/sprints/page";

describe("SprintsPage helpers", () => {
  it("groupTasksBySprintId groups correctly", () => {
    const tasks = [
      { id: "T-1", sprint_id: "sprint-1" },
      { id: "T-2", sprint_id: "sprint-1" },
      { id: "T-3", sprint_id: "sprint-2" },
    ] as any[];
    const result = groupTasksBySprintId(tasks);
    expect(result["sprint-1"]).toHaveLength(2);
    expect(result["sprint-2"]).toHaveLength(1);
    expect(result["sprint-3"]).toBeUndefined();
  });

  it("filterSprintsByProject filters when project arg given", () => {
    const sprints = [
      { id: "s1", project: "bevox-mobile" },
      { id: "s2", project: "openclaw" },
      { id: "s3", project: "bevox-mobile" },
    ] as any[];
    expect(filterSprintsByProject(sprints, "bevox-mobile")).toHaveLength(2);
    expect(filterSprintsByProject(sprints, null)).toHaveLength(3);
    expect(filterSprintsByProject(sprints, "unknown")).toHaveLength(0);
  });

  it("groupSprintsByState groups into 3 buckets", () => {
    const sprints = [
      { id: "s1", state: "current" },
      { id: "s2", state: "next" },
      { id: "s3", state: "closed" },
      { id: "s4", state: "current" },
    ] as any[];
    const grouped = groupSprintsByState(sprints);
    expect(grouped.current).toHaveLength(2);
    expect(grouped.next).toHaveLength(1);
    expect(grouped.closed).toHaveLength(1);
  });
});
