import { describe, it, expect } from "vitest";
import type { ProjectRoadmapTabProps } from "@/components/projects/ProjectRoadmapTab";
import type { RoadmapDocsListProps } from "@/components/projects/RoadmapDocsList";

describe("ProjectRoadmapTabProps contract", () => {
  it("requires projectId string", () => {
    const props: ProjectRoadmapTabProps = { projectId: "openclaw" };
    expect(props.projectId).toBe("openclaw");
  });
});

describe("RoadmapDocsListProps contract", () => {
  it("requires docs + selected + onSelect", () => {
    let last: string | null = null;
    const props: RoadmapDocsListProps = {
      docs: [{ path: "x", name: "x.md", modified_at: "", is_stub: true }],
      selected: "x",
      onSelect: (p) => { last = p; },
    };
    props.onSelect("y");
    expect(last).toBe("y");
  });
});
