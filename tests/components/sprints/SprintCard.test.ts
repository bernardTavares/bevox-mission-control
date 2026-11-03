/**
 * Contract tests for SprintCard.
 *
 * Pattern: type-level + props contract verification (sem renderToStaticMarkup
 * porque SprintCard usa hooks indiretamente via children).
 *
 * Spec: bevox-knowledge/35_specs/company-os/2026-04-25-mc-sprints-page.md §3.1
 */
import { describe, it, expect } from "vitest";
import type { SprintCardProps } from "@/components/sprints/SprintCard";
import { formatTaskCount, extractSprintNumber } from "@/components/sprints/SprintCard";

describe("SprintCardProps contract", () => {
  it("requires sprint, taskCount, isClosed, onClick", () => {
    const props: SprintCardProps = {
      sprint: {
        id: "sprint-22",
        name: "Sprint 22",
        state: "current",
        project: "test-project",
        created_at: "2026-04-25T00:00:00Z",
        closed_at: null,
        created_by: "bernard",
      },
      taskCount: 5,
      isClosed: false,
      onClick: () => {},
    };
    expect(props.sprint.id).toBe("sprint-22");
    expect(props.taskCount).toBe(5);
    expect(props.isClosed).toBe(false);
  });

  it("formatTaskCount handles 0 / 1 / N tasks", () => {
    expect(formatTaskCount(0)).toBe("empty");
    expect(formatTaskCount(1)).toBe("1 task");
    expect(formatTaskCount(5)).toBe("5 tasks");
  });

  it("extractSprintNumber handles sprint-N format", () => {
    expect(extractSprintNumber("sprint-22")).toBe(22);
    expect(extractSprintNumber("sprint-3")).toBe(3);
    expect(extractSprintNumber("custom-id")).toBeNull();
  });
});
