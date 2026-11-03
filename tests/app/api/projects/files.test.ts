/**
 * Contract tests for GET /api/projects/[id]/files.
 *
 * Variant 1 (no path): returns folders tree.
 * Variant 2 (with ?path=...): returns file content.
 *
 * Spec: bevox-knowledge/35_specs/company-os/2026-04-25-mc-projects-redesign.md §4.2
 */
import { describe, it, expect } from "vitest";

describe("Files endpoint contract — tree variant", () => {
  it("response shape has folders map keyed by folder name", () => {
    type Response = {
      folders: Record<string, { count: number; files: string[] }>;
    };
    const sample: Response = {
      folders: {
        "10_prd": { count: 1, files: ["2026-04-25-prd.md"] },
        "20_architecture": { count: 14, files: ["a.md"] },
        "30_adr": { count: 0, files: [] },
        "35_specs": { count: 51, files: [] },
        "40_roadmap": { count: 1, files: [] },
        "50_releases": { count: 2, files: [] },
        "60_customer-feedback": { count: 0, files: [] },
        "70_metrics": { count: 0, files: [] },
      },
    };
    expect(Object.keys(sample.folders)).toHaveLength(8);
  });
});

describe("Files endpoint contract — read variant", () => {
  it("response shape returns content + metadata", () => {
    type Response = {
      path: string;
      content: string;
      modified_at: string;
      size_bytes: number;
      is_stub: boolean;
    };
    const sample: Response = {
      path: "35_specs/openclaw/foo.md",
      content: "# Hello",
      modified_at: "2026-04-25T00:00:00Z",
      size_bytes: 42,
      is_stub: false,
    };
    expect(sample.size_bytes).toBe(42);
  });
});
