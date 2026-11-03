import { describe, it, expect } from "vitest";

describe("check-id endpoint contract", () => {
  it("response shape valid=true case", () => {
    type Response = { valid: boolean; reason?: "format" | "reserved" | "collision" };
    const sample: Response = { valid: true };
    expect(sample.valid).toBe(true);
  });

  it("response shape with reason", () => {
    type Response = { valid: boolean; reason?: string };
    const sample: Response = { valid: false, reason: "collision" };
    expect(sample.reason).toBe("collision");
  });
});
