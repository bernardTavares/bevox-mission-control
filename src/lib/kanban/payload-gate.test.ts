import { describe, it, expect } from "vitest";
import { validatePayload, PAYLOAD_GATE_ERROR_CODE } from "./payload-gate";

describe("validatePayload", () => {
  it("empty dict returns both missing", () => {
    expect(validatePayload({})).toEqual(["spec_ref", "acceptance_criteria"]);
  });

  it("only spec_ref returns ac missing", () => {
    expect(validatePayload({ spec_ref: "x.md" })).toEqual(["acceptance_criteria"]);
  });

  it("only ac returns spec_ref missing", () => {
    expect(validatePayload({ acceptance_criteria: ["AC1"] })).toEqual(["spec_ref"]);
  });

  it("empty spec_ref string counts missing", () => {
    expect(validatePayload({ spec_ref: "", acceptance_criteria: ["AC1"] }))
      .toContain("spec_ref");
  });

  it("empty spec_ref list counts missing", () => {
    expect(validatePayload({ spec_ref: [], acceptance_criteria: ["AC1"] }))
      .toContain("spec_ref");
  });

  it("empty ac list counts missing", () => {
    expect(validatePayload({ spec_ref: "x.md", acceptance_criteria: [] }))
      .toContain("acceptance_criteria");
  });

  it("ac as string (not list) counts missing", () => {
    expect(validatePayload({ spec_ref: "x.md", acceptance_criteria: "AC1" as unknown as never }))
      .toContain("acceptance_criteria");
  });

  it("happy path returns empty array", () => {
    expect(validatePayload({
      spec_ref: "x.md",
      acceptance_criteria: ["AC1"],
    })).toEqual([]);
  });

  it("list spec_ref happy path", () => {
    expect(validatePayload({
      spec_ref: ["a.md", "b.md"],
      acceptance_criteria: ["AC1", "AC2"],
    })).toEqual([]);
  });

  it("null/undefined input returns both missing", () => {
    expect(validatePayload(null)).toEqual(["spec_ref", "acceptance_criteria"]);
    expect(validatePayload(undefined)).toEqual(["spec_ref", "acceptance_criteria"]);
  });

  it("error code constant matches Python PAYLOAD_INCOMPLETE", () => {
    expect(PAYLOAD_GATE_ERROR_CODE).toBe("PAYLOAD_INCOMPLETE");
  });
});
