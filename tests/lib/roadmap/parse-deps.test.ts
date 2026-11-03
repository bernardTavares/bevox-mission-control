import { describe, it, expect } from "vitest";
import { parseDeps } from "@/lib/roadmap/parse-deps";

describe("parseDeps", () => {
  it("extracts single epic with deps line", () => {
    const md = `
### E3 - Agent Registry
**Prioridade:** P0 | **Dependencias:** E1, E2
Conteudo...
`;
    expect(parseDeps(md)).toEqual({ E3: ["E1", "E2"] });
  });

  it("extracts multiple epics", () => {
    const md = `
### E1 - Knowledge Spine
**Dependencias:** E0

### E2 - Mission Control Shell
**Dependencias:** E1

### E3 - Something
sem deps line aqui
`;
    expect(parseDeps(md)).toEqual({
      E1: ["E0"],
      E2: ["E1"],
      E3: [],
    });
  });

  it("handles deps with checkmarks and surrounding formatting", () => {
    const md = `
### E5 - Roadmap
**Prioridade:** P0 | **Dependencias:** E2 ✓, E3 foundation ✓, E4 wave 1 ✓
`;
    expect(parseDeps(md)).toEqual({ E5: ["E2", "E3", "E4"] });
  });

  it("handles decimal epic ids like E4.2", () => {
    const md = `
### E4.2 - Operator Client
**Dependencias:** E4, E3
`;
    expect(parseDeps(md)).toEqual({ "E4.2": ["E4", "E3"] });
  });

  it("returns empty map for empty markdown", () => {
    expect(parseDeps("")).toEqual({});
  });

  it("returns empty map for markdown without epic headers", () => {
    expect(parseDeps("# Random doc\n\nSome text.")).toEqual({});
  });

  it("returns epic with empty deps when line absent", () => {
    const md = `### E7 - Doc System\n**Prioridade:** P1\nconteúdo\n`;
    expect(parseDeps(md)).toEqual({ E7: [] });
  });
});
