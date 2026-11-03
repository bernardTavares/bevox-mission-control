import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFileSync, mkdirSync, rmSync } from "fs";
import path from "path";
import os from "os";

import { GET } from "@/app/api/delivery/product-tracker/route";

const TMP_BASE = path.join(os.tmpdir(), `mc-product-tracker-test-${process.pid}`);
const YML = path.join(TMP_BASE, "40_roadmap/_shared/delivery-tracker.yml");

function writeTracker(body: string) {
  mkdirSync(path.dirname(YML), { recursive: true });
  writeFileSync(YML, body);
}

describe("GET /api/delivery/product-tracker", () => {
  beforeEach(() => {
    mkdirSync(path.join(TMP_BASE, "40_roadmap/_shared"), { recursive: true });
    delete process.env.BEVOX_KNOWLEDGE_DIR;
  });
  afterEach(() => {
    rmSync(TMP_BASE, { recursive: true, force: true });
    delete process.env.BEVOX_KNOWLEDGE_DIR;
  });

  it("derives module status from work_items", async () => {
    writeTracker(`epics: []
product_modules:
  - id: bevox-harness
    name: "Bevox Harness"
    work_items:
      - id: harness-execution-mode
        status: delivered
        governed_by: ["30_adr/bevox-harness/ADR-018-modos-de-autonomia-execution-mode.md"]
        evidence: "ok"
      - id: harness-organization-id
        status: in_progress
        governed_by: ["30_adr/_shared/ADR-021-tenancy-canonica-organizationid.md"]
        evidence: "partial"
  - id: bevox-backend
    name: "Bevox Backend"
    work_items:
      - id: backend-aisuggestion
        status: blocked
        governed_by: ["30_adr/bevox-backend/ADR-011-criacao-de-aisuggestion.md"]
        evidence: "no repo"
        blocked_by: "bevox-backend nao existe"
  - id: bevox-web
    name: "Bevox Web"
    work_items: []
`);
    process.env.BEVOX_KNOWLEDGE_DIR = TMP_BASE;
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    const byId = Object.fromEntries(body.product_modules.map((m: any) => [m.id, m]));
    expect(byId["bevox-harness"].status).toBe("in_progress");
    expect(byId["bevox-backend"].status).toBe("blocked");
    expect(byId["bevox-web"].status).toBe("not_started");
    expect(byId["bevox-backend"].work_items[0].blocked_by).toBe("bevox-backend nao existe");
    expect(body.summary.total_modules).toBe(3);
    expect(body.summary.work_items_blocked).toBe(1);
    expect(typeof body.generated_at).toBe("string");
    expect(body.source).toContain("delivery-tracker.yml");
  });

  it("returns [] when product_modules key absent (forward-compat)", async () => {
    writeTracker(`epics: []\n`);
    process.env.BEVOX_KNOWLEDGE_DIR = TMP_BASE;
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.product_modules).toEqual([]);
    expect(body.summary.total_modules).toBe(0);
  });

  it("returns 404 when tracker file missing", async () => {
    process.env.BEVOX_KNOWLEDGE_DIR = TMP_BASE;
    const res = await GET();
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("tracker_not_found");
  });

  it("returns 503 when env var unset in production", async () => {
    const orig = process.env.NODE_ENV;
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    try {
      const res = await GET();
      expect(res.status).toBe(503);
      expect((await res.json()).error).toBe("canonical_not_configured");
    } finally {
      (process.env as Record<string, string | undefined>).NODE_ENV = orig;
    }
  });

  it("returns 500 on corrupt yaml", async () => {
    writeTracker(":\n  - bad: [unclosed\n");
    process.env.BEVOX_KNOWLEDGE_DIR = TMP_BASE;
    const res = await GET();
    expect(res.status).toBe(500);
  });
});
