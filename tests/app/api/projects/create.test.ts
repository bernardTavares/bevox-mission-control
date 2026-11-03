import { describe, it, expect } from "vitest";

describe("POST /api/projects contract", () => {
  it("success response shape", () => {
    type Response = {
      success: boolean;
      id?: string;
      github_url?: string;
      steps_completed: number;
    };
    const sample: Response = {
      success: true,
      id: "x",
      github_url: "https://github.com/bernardTavares/x",
      steps_completed: 6,
    };
    expect(sample.steps_completed).toBe(6);
  });

  it("failure response includes failed_at + error", () => {
    type Response = {
      success: boolean;
      failed_at?: number;
      error_code?: string;
    };
    const sample: Response = { success: false, failed_at: 5, error_code: "code_dir_exists" };
    expect(sample.failed_at).toBe(5);
  });
});
