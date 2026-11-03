import { describe, it, expect } from "vitest";
import type { DocTreeProps, FoldersTree } from "@/components/projects/DocTree";

describe("DocTreeProps contract", () => {
  it("requires tree + projectId + selected + onSelectFile", () => {
    let lastSelected: string | null = null;
    const tree: FoldersTree = {
      "10_prd": { count: 1, files: ["foo.md"] },
      "20_architecture": { count: 0, files: [] },
      "30_adr": { count: 0, files: [] },
      "35_specs": { count: 0, files: [] },
      "40_roadmap": { count: 0, files: [] },
      "50_releases": { count: 0, files: [] },
      "60_customer-feedback": { count: 0, files: [] },
      "70_metrics": { count: 0, files: [] },
    };
    const props: DocTreeProps = {
      tree,
      projectId: "openclaw",
      selected: null,
      onSelectFile: (p) => { lastSelected = p; },
    };
    props.onSelectFile("10_prd/openclaw/foo.md");
    expect(lastSelected).toBe("10_prd/openclaw/foo.md");
  });
});
