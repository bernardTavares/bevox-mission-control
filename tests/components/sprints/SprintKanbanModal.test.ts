/**
 * Contract tests for SprintKanbanModal.
 * Type-level + helpers (pure logic).
 *
 * Spec: bevox-knowledge/35_specs/company-os/2026-04-25-mc-sprints-page.md §3.1, §4.4
 */
import { describe, it, expect } from "vitest";
import type { SprintKanbanModalProps } from "@/components/sprints/SprintKanbanModal";
import { buildKanbanLink } from "@/components/sprints/SprintKanbanModal";

describe("SprintKanbanModalProps contract", () => {
  it("requires sprintId, sprint, onClose; onMutate optional", () => {
    const props: SprintKanbanModalProps = {
      sprintId: "sprint-22",
      sprint: {
        id: "sprint-22",
        name: "Sprint 22",
        state: "current",
        project: "test-project",
        created_at: "2026-04-25",
        closed_at: null,
        created_by: "bernard",
      },
      tasks: [],
      onClose: () => {},
    };
    expect(props.sprintId).toBe("sprint-22");
    expect(props.sprint?.state).toBe("current");
  });
});

describe("buildKanbanLink helper", () => {
  it("includes project + sprint when both present", () => {
    const link = buildKanbanLink("sprint-22", "test-project");
    expect(link).toBe("/kanban?project=test-project&sprint=sprint-22");
  });

  it("includes only sprint when project is null", () => {
    const link = buildKanbanLink("sprint-22", null);
    expect(link).toBe("/kanban?sprint=sprint-22");
  });

  it("appends task param when taskId provided (deeplink to DetailDrawer)", () => {
    const link = buildKanbanLink("sprint-22", "test-project", "task-abc");
    expect(link).toBe(
      "/kanban?project=test-project&sprint=sprint-22&task=task-abc",
    );
  });

  it("returns /kanban when no params at all", () => {
    const link = buildKanbanLink("", null);
    expect(link).toBe("/kanban");
  });
});
