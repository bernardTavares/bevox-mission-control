/**
 * Integration tests for GET /api/projects/[id]/bot/status.
 *
 * Regression: canonical projects without a projects-meta.json entry used to
 * return 404, which the client swallowed silently — leaving the Telegram bot
 * section stuck on "Carregando status…". Now they return { connected: false }
 * so the UI can render the Connect bot button.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFileSync, mkdirSync, rmSync } from "fs";
import path from "path";
import os from "os";

import { GET } from "@/app/api/projects/[id]/bot/status/route";

const TMP = path.join(os.tmpdir(), `mc-bot-status-${process.pid}`);
const OC = path.join(TMP, "openclaw");

function reset() {
  rmSync(TMP, { recursive: true, force: true });
  mkdirSync(OC, { recursive: true });
  process.env.OPENCLAW_DIR = OC;
}

function writeMeta(projects: Record<string, unknown>) {
  writeFileSync(
    path.join(OC, "projects-meta.json"),
    JSON.stringify({ version: 1, projects }),
  );
}

function buildParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(reset);
afterEach(() => {
  rmSync(TMP, { recursive: true, force: true });
  delete process.env.OPENCLAW_DIR;
});

describe("GET /api/projects/[id]/bot/status", () => {
  it("returns connected:false for canonical project without meta entry", async () => {
    // no projects-meta.json at all
    const res = await GET({} as Request, buildParams("bevox-knowledge"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ connected: false });
  });

  it("returns connected:false for canonical project with meta entry but no bot_id", async () => {
    writeMeta({
      "openclaw": {
        name: "OpenClaw",
        description: "x",
        github_url: null,
        bot_id: null,
        bot_username: null,
        bot_port: null,
        created_at: "2026-04-08T00:00:00Z",
        source: "canonical",
      },
    });
    const res = await GET({} as Request, buildParams("openclaw"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ connected: false });
  });

  it("returns 404 when id is neither canonical nor in meta", async () => {
    const res = await GET({} as Request, buildParams("not-a-real-project"));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("project_not_found");
  });

  it("covers every canonical project ID (no 404 regression)", async () => {
    // Hard-coded mirror of CANONICAL_PROJECTS so a future addition there
    // surfaces here as a failing test instead of a silent UI break.
    const canonicalIds = [
      "bevox-backend",
      "bevox-console",
      "bevox-harness",
      "bevox-mobile",
      "bevox-web",
      "company-os",
      "openclaw",
      "mission-control",
      "bevox-knowledge",
      "vox",
    ];
    for (const id of canonicalIds) {
      const res = await GET({} as Request, buildParams(id));
      expect(res.status, `${id} status`).toBe(200);
      expect((await res.json()).connected, `${id} connected`).toBe(false);
    }
  });
});
