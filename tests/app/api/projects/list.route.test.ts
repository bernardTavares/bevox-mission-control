import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { writeFileSync, mkdirSync, rmSync } from "fs";
import path from "path";
import os from "os";

import { GET } from "@/app/api/projects/route";

const TMP = path.join(os.tmpdir(), `mc-projects-list-${process.pid}`);
const OC = path.join(TMP, "openclaw");
const KN = path.join(TMP, "knowledge");

function reset() {
  rmSync(TMP, { recursive: true, force: true });
  mkdirSync(OC, { recursive: true });
  mkdirSync(KN, { recursive: true });
  process.env.MC_HOME = TMP;
  process.env.OPENCLAW_DIR = OC;
  process.env.BEVOX_KNOWLEDGE_DIR = KN;
}

beforeEach(() => {
  reset();
});
afterEach(() => {
  rmSync(TMP, { recursive: true, force: true });
  delete process.env.MC_HOME;
  delete process.env.OPENCLAW_DIR;
  delete process.env.BEVOX_KNOWLEDGE_DIR;
});

describe("GET /api/projects", () => {
  it("returns 10 canonical projects with health defaults to missing when nothing setup", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.projects).toHaveLength(10);
    const ids = body.projects.map((p: any) => p.id).sort();
    expect(ids).toEqual([
      "bevox-backend",
      "bevox-console",
      "bevox-harness",
      "bevox-knowledge",
      "bevox-mobile",
      "bevox-web",
      "company-os",
      "mission-control",
      "openclaw",
      "vox",
    ]);
    const bm = body.projects.find((p: any) => p.id === "bevox-mobile");
    expect(bm.health).toEqual({
      bot: "missing",
      workspace: "missing",
      kanban: "missing",
      knowledge: "missing",
    });
    expect(bm.counts).toEqual({ sprints_active: 0, tasks_in_progress: 0 });
  });

  it("reports ok health when all 4 resources exist for a project", async () => {
    // bot
    mkdirSync(path.join(OC, "gateway", "bots"), { recursive: true });
    writeFileSync(path.join(OC, "gateway", "bots", "bevox-mobile.env"), "TOKEN=x\n");
    // workspace
    mkdirSync(path.join(OC, "workspace-bevox-mobile"), { recursive: true });
    writeFileSync(path.join(OC, "workspace-bevox-mobile", "IDENTITY.md"), "# id\n");
    // kanban
    mkdirSync(path.join(OC, "kanban-tasks"), { recursive: true });
    writeFileSync(
      path.join(OC, "kanban-tasks", "projects.yml"),
      "projects:\n  - bevox-mobile\n",
    );
    // knowledge
    mkdirSync(path.join(KN, "35_specs", "bevox-mobile"), { recursive: true });
    writeFileSync(path.join(KN, "35_specs", "bevox-mobile", "2026-04-24-foo.md"), "# foo\n");

    const res = await GET();
    const body = await res.json();
    const bm = body.projects.find((p: any) => p.id === "bevox-mobile");
    expect(bm.health).toEqual({
      bot: "ok",
      workspace: "ok",
      kanban: "ok",
      knowledge: "ok",
    });
  });

  it("derives counts from kanban state.json when present", async () => {
    mkdirSync(path.join(OC, "kanban-tasks"), { recursive: true });
    writeFileSync(
      path.join(OC, "kanban-tasks", "state.json"),
      JSON.stringify({
        schema_version: 1,
        sprints: [
          { id: "s1", name: "S1", state: "current", project: "bevox-mobile" },
          { id: "s2", name: "S2", state: "next", project: "bevox-mobile" },
          { id: "s3", name: "S3", state: "closed", project: "bevox-mobile" },
        ],
        tasks: [
          { id: "T-1", status: "in_progress", project: "bevox-mobile", title: "x", sprint_id: "s1", blocked: false, updated_at: "2026-04-24" },
          { id: "T-2", status: "ready", project: "bevox-mobile", title: "y", sprint_id: "s1", blocked: false, updated_at: "2026-04-24" },
          { id: "T-3", status: "in_progress", project: "bevox-backend", title: "z", sprint_id: null, blocked: false, updated_at: "2026-04-24" },
        ],
      }),
    );
    const res = await GET();
    const body = await res.json();
    const bm = body.projects.find((p: any) => p.id === "bevox-mobile");
    expect(bm.counts.sprints_active).toBe(2); // current + next
    expect(bm.counts.tasks_in_progress).toBe(1);
    const bb = body.projects.find((p: any) => p.id === "bevox-backend");
    expect(bb.counts.sprints_active).toBe(0);
    expect(bb.counts.tasks_in_progress).toBe(1);
  });

  it("handles missing state.json gracefully (counts=0)", async () => {
    const res = await GET();
    const body = await res.json();
    for (const p of body.projects) {
      expect(p.counts.sprints_active).toBe(0);
      expect(p.counts.tasks_in_progress).toBe(0);
    }
  });

  it("returns 503 canonical_not_configured when BEVOX_KNOWLEDGE_DIR unset in production", async () => {
    delete process.env.BEVOX_KNOWLEDGE_DIR;
    vi.stubEnv("NODE_ENV", "production");
    try {
      const res = await GET();
      expect(res.status).toBe(503);
      const body = await res.json();
      expect(body.error).toBe("canonical_not_configured");
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("returns 500 kanban_state_corrupt when state.json malformed", async () => {
    mkdirSync(path.join(OC, "kanban-tasks"), { recursive: true });
    writeFileSync(path.join(OC, "kanban-tasks", "state.json"), "{ not valid json");
    const res = await GET();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("kanban_state_corrupt");
  });
});
