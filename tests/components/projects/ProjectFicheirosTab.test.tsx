import { describe, it, expect } from "vitest";
import type { ProjectFicheirosTabProps } from "@/components/projects/ProjectFicheirosTab";

describe("ProjectFicheirosTabProps contract", () => {
  it("requires projectId; selectedFile + onSelectFile optional", () => {
    let last: string | null = null;
    const props: ProjectFicheirosTabProps = {
      projectId: "openclaw",
      selectedFile: "35_specs/openclaw/foo.md",
      onSelectFile: (p) => { last = p; },
    };
    props.onSelectFile?.("x");
    expect(last).toBe("x");
    expect(props.selectedFile).toBe("35_specs/openclaw/foo.md");
  });
});
