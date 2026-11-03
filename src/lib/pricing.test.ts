import { describe, it, expect, vi, beforeEach } from "vitest";
import { calculateCost, normalizeModelId } from "./pricing";

describe("pricing.ts E9 wave 1 delta", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("normalizes gpt-5.4 to the full openai id", () => {
    expect(normalizeModelId("gpt-5.4")).toBe("openai/gpt-5.4");
  });

  it("calculates cost for gpt-5.4 using official pricing", () => {
    // 1M input ($2.50) + 1M output ($15.00) + 0 cached = 17.50
    const cost = calculateCost("gpt-5.4", 1_000_000, 1_000_000);
    expect(cost).toBeCloseTo(17.5, 4);
  });

  it("applies cached input pricing when cachedInputTokens > 0", () => {
    // 1M input ($2.50) + 1M cached ($0.25) + 1M output ($15.00) = 17.75
    const cost = calculateCost("gpt-5.4", 1_000_000, 1_000_000, 1_000_000);
    expect(cost).toBeCloseTo(17.75, 4);
  });

  it("returns 0 (not Sonnet fallback) for unknown model", () => {
    const cost = calculateCost("brand-new-model-xyz", 1_000_000, 1_000_000);
    expect(cost).toBe(0);
  });

  it("historical alias 'sonnet' still maps to Sonnet 4.5", () => {
    expect(normalizeModelId("sonnet")).toBe("anthropic/claude-sonnet-4-5");
  });
});
