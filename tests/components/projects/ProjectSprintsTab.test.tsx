import { describe, it, expect } from "vitest";
import type { ProjectSprintsTabProps } from "@/components/projects/ProjectSprintsTab";

describe("ProjectSprintsTabProps contract", () => {
  it("requires projectId string", () => {
    const props: ProjectSprintsTabProps = { projectId: "openclaw" };
    expect(props.projectId).toBe("openclaw");
  });
});
