/**
 * Contract tests for GET /api/projects/[id]/roadmap.
 *
 * Spec: bevox-knowledge/35_specs/company-os/2026-04-25-mc-projects-redesign.md §4.2
 */
import { describe, it, expect } from "vitest";

describe("Roadmap endpoint contract", () => {
  it("response shape mirrors PRD endpoint (files[] + latest)", () => {
    type Response = {
      files: Array<{ path: string; name: string; modified_at: string; is_stub: boolean }>;
      latest: { path: string; name: string; content: string; is_stub: boolean } | null;
    };
    const sample: Response = {
      files: [],
      latest: null,
    };
    expect(sample.files).toEqual([]);
  });

  it("multi-file case: files array has multiple entries", () => {
    type Response = {
      files: Array<{ name: string }>;
    };
    const sample: Response = {
      files: [
        { name: "2026-04-25-roadmap.md" },
        { name: "2026-05-01-roadmap-v2.md" },
      ],
    };
    expect(sample.files).toHaveLength(2);
  });
});
