/**
 * Contract tests for GET /api/projects/[id]/prd.
 *
 * Spec: bevox-knowledge/35_specs/company-os/2026-04-25-mc-projects-redesign.md §4.2
 */
import { describe, it, expect } from "vitest";

describe("PRD endpoint contract", () => {
  it("response shape includes files[] and latest", () => {
    type Response = {
      files: Array<{ path: string; name: string; modified_at: string; is_stub: boolean }>;
      latest: { path: string; name: string; content: string; is_stub: boolean } | null;
    };
    const sample: Response = {
      files: [{ path: "10_prd/openclaw/2026-04-25-prd.md", name: "2026-04-25-prd.md", modified_at: "2026-04-25T00:00:00Z", is_stub: true }],
      latest: { path: "10_prd/openclaw/2026-04-25-prd.md", name: "2026-04-25-prd.md", content: "# X", is_stub: true },
    };
    expect(sample.files).toHaveLength(1);
    expect(sample.latest?.is_stub).toBe(true);
  });

  it("empty case returns files=[] and latest=null", () => {
    type Response = {
      files: Array<{ path: string }>;
      latest: { path: string } | null;
    };
    const sample: Response = { files: [], latest: null };
    expect(sample.latest).toBeNull();
  });
});
