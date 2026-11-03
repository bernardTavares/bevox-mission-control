import { describe, it, expect } from "vitest";
import { PROJECT_COLORS, getProjectColors } from "@/lib/projects/colors";

describe("PROJECT_COLORS", () => {
  it("includes all 10 canonical projects", () => {
    const expected = [
      "bevox-mobile", "bevox-backend", "bevox-web", "bevox-console",
      "bevox-harness", "openclaw", "company-os", "mission-control",
      "bevox-knowledge", "vox",
    ];
    for (const p of expected) {
      expect(PROJECT_COLORS[p]).toBeDefined();
      expect(PROJECT_COLORS[p].bg).toMatch(/^#[0-9a-f]{6}$/i);
      expect(PROJECT_COLORS[p].fg).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("getProjectColors returns fallback for unknown project", () => {
    const result = getProjectColors("unknown-project");
    expect(result.bg).toBe("#2a2f3e");
    expect(result.fg).toBe("#888");
  });
});
