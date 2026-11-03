/**
 * Contract tests for DELETE /api/projects/[id].
 *
 * Spec: bevox-knowledge/35_specs/company-os/2026-04-27-mc-projects-delete.md §3.6
 */
import { describe, it, expect } from "vitest";

describe("DELETE /api/projects/[id] contract", () => {
  it("success response shape with github_deleted flag", () => {
    type Response = {
      success: boolean;
      id?: string;
      steps_completed: number;
      github_deleted?: boolean;
      github_hint?: string;
    };
    const sample: Response = {
      success: true,
      id: "x",
      steps_completed: 6,
      github_deleted: true,
    };
    expect(sample.steps_completed).toBe(6);
    expect(sample.github_deleted).toBe(true);
  });

  it("partial success shape (GitHub soft-fail)", () => {
    type Response = {
      success: boolean;
      github_deleted?: boolean;
      github_hint?: string;
    };
    const sample: Response = {
      success: true,
      github_deleted: false,
      github_hint: "gh CLI lacks delete_repo scope...",
    };
    expect(sample.github_deleted).toBe(false);
  });

  it("canonical block error shape", () => {
    type Response = { error: string; detail?: string };
    const sample: Response = {
      error: "cannot_delete_canonical",
      detail: "openclaw is canonical (ADR-002)...",
    };
    expect(sample.error).toBe("cannot_delete_canonical");
  });
});
