import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { writeFileSync, mkdirSync, rmSync } from "fs";
import path from "path";
import os from "os";

import { GET } from "@/app/api/projects/[id]/route";

const TMP = path.join(os.tmpdir(), `mc-projects-detail-${process.pid}`);
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

function buildParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(reset);
afterEach(() => {
  rmSync(TMP, { recursive: true, force: true });
  delete process.env.MC_HOME;
  delete process.env.OPENCLAW_DIR;
  delete process.env.BEVOX_KNOWLEDGE_DIR;
});

describe("GET /api/projects/[id]", () => {
  it("404 when id is not canonical and not in projects-meta", async () => {
    const res = await GET({} as Request, buildParams("not-a-real-project"));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("project_not_found");
  });

  it("200 with health_details and empty sprints/tasks when nothing setup", async () => {
    const res = await GET({} as Request, buildParams("bevox-mobile"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("bevox-mobile");
    expect(body.health_details.bot.present).toBe(false);
    expect(body.health_details.workspace.present).toBe(false);
    expect(body.health_details.kanban.present).toBe(false);
    expect(body.health_details.knowledge.present).toBe(false);
    expect(body.sprints.active).toEqual([]);
    expect(body.sprints.closed).toEqual([]);
    expect(body.tasks_in_flight).toEqual([]);
    expect(body.links.kanban_filter_url).toBe("/kanban?project=bevox-mobile");
  });

  it("populates sprints and tasks_in_flight from state.json", async () => {
    mkdirSync(path.join(OC, "kanban-tasks"), { recursive: true });
    writeFileSync(
      path.join(OC, "kanban-tasks", "state.json"),
      JSON.stringify({
        sprints: [
          { id: "s1", name: "S1", state: "current", project: "bevox-mobile", created_at: "2026-04-01", closed_at: null },
          { id: "s2", name: "S2", state: "next", project: "bevox-mobile", created_at: "2026-04-02", closed_at: null },
          { id: "s3", name: "S3", state: "closed", project: "bevox-mobile", created_at: "2026-03-01", closed_at: "2026-03-15" },
          { id: "sX", name: "SX", state: "current", project: "other", created_at: "2026-04-01", closed_at: null },
        ],
        tasks: [
          { id: "T-1", title: "in-flight", status: "in_progress", project: "bevox-mobile", sprint_id: "s1", blocked: false, updated_at: "2026-04-24" },
          { id: "T-2", title: "blocked", status: "blocked", project: "bevox-mobile", sprint_id: "s1", blocked: true, updated_at: "2026-04-23" },
          { id: "T-3", title: "ready", status: "ready", project: "bevox-mobile", sprint_id: "s1", blocked: false, updated_at: "2026-04-24" },
          { id: "T-4", title: "other-proj", status: "in_progress", project: "other", sprint_id: null, blocked: false, updated_at: "2026-04-24" },
        ],
      }),
    );

    const res = await GET({} as Request, buildParams("bevox-mobile"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sprints.active.map((s: any) => s.id)).toEqual(["s1", "s2"]);
    expect(body.sprints.closed.map((s: any) => s.id)).toEqual(["s3"]);
    expect(body.tasks_in_flight.map((t: any) => t.id).sort()).toEqual(["T-1", "T-2"]);
  });

  it("expands health_details paths when resources exist", async () => {
    mkdirSync(path.join(OC, "gateway", "bots"), { recursive: true });
    writeFileSync(path.join(OC, "gateway", "bots", "bevox-mobile.env"), "TOKEN=x\n");
    mkdirSync(path.join(OC, "workspace-bevox-mobile"), { recursive: true });
    writeFileSync(path.join(OC, "workspace-bevox-mobile", "IDENTITY.md"), "x");
    writeFileSync(path.join(OC, "workspace-bevox-mobile", "SOUL.md"), "x");

    const res = await GET({} as Request, buildParams("bevox-mobile"));
    const body = await res.json();
    expect(body.health_details.bot.present).toBe(true);
    expect(body.health_details.bot.envPath).toContain("gateway/bots/bevox-mobile.env");
    expect(body.health_details.workspace.present).toBe(true);
    expect(body.health_details.workspace.files.sort()).toEqual(["IDENTITY.md", "SOUL.md"]);
    expect(body.links.telegram_bot_env).toContain("bevox-mobile.env");
    expect(body.links.workspace_dir).toContain("workspace-bevox-mobile");
  });

  it("returns 503 canonical_not_configured when BEVOX_KNOWLEDGE_DIR unset in production", async () => {
    delete process.env.BEVOX_KNOWLEDGE_DIR;
    vi.stubEnv("NODE_ENV", "production");
    try {
      const res = await GET({} as Request, buildParams("bevox-mobile"));
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
    const res = await GET({} as Request, buildParams("bevox-mobile"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("kanban_state_corrupt");
  });
});
