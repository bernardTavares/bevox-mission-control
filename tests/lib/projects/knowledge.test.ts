/**
 * Tests for sandboxed bevox-knowledge filesystem reader.
 *
 * Spec: bevox-knowledge/35_specs/company-os/2026-04-25-mc-projects-redesign.md §4.3
 */
import { describe, it, expect } from "vitest";
import {
  ALLOWED_FOLDERS,
  detectStub,
  isPathSafe,
  readProjectFile,
  KnowledgeError,
} from "@/lib/projects/knowledge";

describe("ALLOWED_FOLDERS", () => {
  it("contains the 8 canonical folders", () => {
    expect(ALLOWED_FOLDERS).toEqual([
      "10_prd",
      "20_architecture",
      "30_adr",
      "35_specs",
      "40_roadmap",
      "50_releases",
      "60_customer-feedback",
      "70_metrics",
    ]);
  });
});

describe("detectStub", () => {
  it("detects '**Status:** stub' marker", () => {
    expect(detectStub("# Title\n\n**Status:** stub\n")).toBe(true);
  });
  it("detects 'status: stub' frontmatter line", () => {
    expect(detectStub("---\nstatus: stub\n---\n# Title\n")).toBe(true);
  });
  it("returns false for non-stub content", () => {
    expect(detectStub("# Title\n\nReal content here.\n")).toBe(false);
  });
  it("returns false for content that mentions 'stub' in prose", () => {
    expect(detectStub("This is not a stub document. Status: delivered.")).toBe(false);
  });
});

describe("isPathSafe", () => {
  const root = "/tmp/fake-knowledge-root";

  it("accepts path within root", () => {
    expect(isPathSafe(root, "/tmp/fake-knowledge-root/10_prd/foo.md")).toBe(true);
  });
  it("rejects path traversal via ..", () => {
    expect(isPathSafe(root, "/tmp/fake-knowledge-root/../secrets")).toBe(false);
  });
  it("rejects absolute paths outside root", () => {
    expect(isPathSafe(root, "/etc/passwd")).toBe(false);
  });
  it("rejects empty path", () => {
    expect(isPathSafe(root, "")).toBe(false);
  });
});

describe("readProjectFile path traversal protection", () => {
  it("rejects '..' segments in rest", () => {
    expect(() =>
      readProjectFile("openclaw", "10_prd/openclaw/../../30_adr/_shared/ADR-001.md")
    ).toThrow(KnowledgeError);
  });

  it("rejects '.' segments in rest", () => {
    expect(() =>
      readProjectFile("openclaw", "10_prd/openclaw/./foo.md")
    ).toThrow(KnowledgeError);
  });

  it("rejects null byte injection", () => {
    expect(() =>
      readProjectFile("openclaw", "10_prd/openclaw/foo\0.md")
    ).toThrow(KnowledgeError);
  });

  it("rejects projectId mismatch", () => {
    expect(() =>
      readProjectFile("openclaw", "10_prd/bevox-mobile/foo.md")
    ).toThrow(KnowledgeError);
  });
});
