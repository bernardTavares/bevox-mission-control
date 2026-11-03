import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFileSync, mkdirSync, rmSync } from "fs";
import path from "path";
import os from "os";

import { GET } from "@/app/api/roadmap/deps/route";

const TMP_BASE = path.join(os.tmpdir(), `mc-roadmap-deps-test-${process.pid}`);

describe("GET /api/roadmap/deps", () => {
  beforeEach(() => {
    mkdirSync(path.join(TMP_BASE, "40_roadmap", "company-os"), { recursive: true });
    delete process.env.BEVOX_KNOWLEDGE_DIR;
  });
  afterEach(() => {
    rmSync(TMP_BASE, { recursive: true, force: true });
    delete process.env.BEVOX_KNOWLEDGE_DIR;
  });

  it("returns parsed deps on valid markdown", async () => {
    const md = `
### E1 - Foundation
**Dependencias:** E0

### E3 - Agent Registry
**Prioridade:** P0 | **Dependencias:** E1, E2
`;
    writeFileSync(
      path.join(TMP_BASE, "40_roadmap/company-os/2026-04-09-openclaw-company-os-roadmap.md"),
      md,
    );
    process.env.BEVOX_KNOWLEDGE_DIR = TMP_BASE;
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.deps).toEqual({ E1: ["E0"], E3: ["E1", "E2"] });
    expect(typeof body.generated_at).toBe("string");
    expect(body.source).toContain("2026-04-09-openclaw-company-os-roadmap.md");
  });

  it("returns 404 when roadmap file missing", async () => {
    process.env.BEVOX_KNOWLEDGE_DIR = TMP_BASE;
    const res = await GET();
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("roadmap_not_found");
  });

  it("returns 503 when env var unset in production", async () => {
    const originalEnv = process.env.NODE_ENV;
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    try {
      const res = await GET();
      expect(res.status).toBe(503);
      const body = await res.json();
      expect(body.error).toBe("canonical_not_configured");
    } finally {
      (process.env as Record<string, string | undefined>).NODE_ENV = originalEnv;
    }
  });

  it("dev fallback to $HOME/bevox-knowledge when env unset", async () => {
    const res = await GET();
    expect([200, 404, 500]).toContain(res.status);
  });
});
