import { NextResponse } from "next/server";
import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { spawn } from "child_process";
import path from "path";
import os from "os";

import { PATHS } from "@/lib/bevox/paths";
import { CANONICAL_PROJECTS, getCanonicalProject, isCanonicalProject } from "@/lib/projects/canonical";
import {
  checkBotHealth,
  checkKanbanHealth,
  checkKnowledgeHealth,
  checkWorkspaceHealth,
} from "@/lib/projects/health";
import { readMeta, mergeProjectMeta } from "@/lib/projects/meta";
import type {
  ProjectDetail,
  Sprint,
  Task,
} from "@/lib/projects/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/projects/[id]
 *
 * Returns ProjectDetail: health_details expandido, sprints (active + closed top 5),
 * tasks_in_flight (in_progress + blocked), links.
 *
 * Spec: bevox-knowledge/35_specs/company-os/2026-04-24-e2-projects-dashboard-w1.md §3 §4
 */

function resolveOpenclawDir(): string | null {
  const mcHome = process.env.MC_HOME;
  if (mcHome) return path.join(mcHome, "openclaw");
  if (process.env.NODE_ENV !== "production") return PATHS.openclawHome;
  return PATHS.openclawHome;
}

function resolveBevoxKnowledgeDir(): string | null {
  if (process.env.BEVOX_KNOWLEDGE_DIR) return process.env.BEVOX_KNOWLEDGE_DIR;
  if (process.env.NODE_ENV !== "production") return path.join(os.homedir(), "bevox-knowledge");
  return null;
}

type KanbanReadResult =
  | { ok: true; sprints: Sprint[]; tasks: Task[] }
  | { ok: false; error: "kanban_state_corrupt"; detail: string };

function readKanbanState(openclawDir: string): KanbanReadResult {
  const p = path.join(openclawDir, "kanban-tasks", "state.json");
  if (!existsSync(p)) return { ok: true, sprints: [], tasks: [] };
  let raw: string;
  try {
    raw = readFileSync(p, "utf-8");
  } catch (err) {
    return { ok: false, error: "kanban_state_corrupt", detail: `read error: ${String(err)}` };
  }
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    return { ok: false, error: "kanban_state_corrupt", detail: `json parse error: ${String(err)}` };
  }
  const d = (data ?? {}) as Record<string, unknown>;
  return {
    ok: true,
    sprints: Array.isArray(d.sprints) ? (d.sprints as Sprint[]) : [],
    tasks: Array.isArray(d.tasks) ? (d.tasks as Task[]) : [],
  };
}

function workspaceFiles(dir: string): string[] {
  try {
    return readdirSync(dir)
      .filter((n) => !n.startsWith("."))
      .filter((n) => {
        try {
          return statSync(path.join(dir, n)).isFile();
        } catch {
          return false;
        }
      });
  } catch {
    return [];
  }
}

function countFiles(dir: string, ext: string = ".md"): number {
  if (!existsSync(dir)) return 0;
  try {
    return readdirSync(dir)
      .filter((n) => n !== ".gitkeep")
      .filter((n) => n.endsWith(ext)).length;
  } catch {
    return 0;
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const meta = readMeta();
  const metaEntry = meta.projects[id];
  const canonical = getCanonicalProject(id);

  // Accept canonical (10 ADR-002) OR user_created (factory wave). Reject if neither.
  if (!canonical && !metaEntry) {
    return NextResponse.json(
      { error: "project_not_found", detail: `${id} not in canonical or projects-meta` },
      { status: 404 },
    );
  }

  // Resolve display name + description from canonical OR meta entry
  const projectName = canonical?.name ?? metaEntry?.name ?? id;
  const projectDescription = canonical?.description ?? metaEntry?.description ?? "";
  const isCanonical = canonical !== null;

  const openclawDir = resolveOpenclawDir();
  const knowledgeDir = resolveBevoxKnowledgeDir();

  if (!knowledgeDir) {
    return NextResponse.json(
      {
        error: "canonical_not_configured",
        detail: "BEVOX_KNOWLEDGE_DIR env var not set",
      },
      { status: 503 },
    );
  }
  if (!openclawDir) {
    return NextResponse.json(
      {
        error: "canonical_not_configured",
        detail: "OPENCLAW_DIR / MC_HOME env not set",
      },
      { status: 503 },
    );
  }

  const kanban = readKanbanState(openclawDir);
  if (!kanban.ok) {
    return NextResponse.json(
      { error: kanban.error, detail: kanban.detail },
      { status: 500 },
    );
  }
  const { sprints, tasks } = kanban;

  const botEnv = path.join(openclawDir, "gateway", "bots", `${id}.env`);
  const wsDir = path.join(openclawDir, `workspace-${id}`);
  const specsDir = path.join(knowledgeDir, "35_specs", id);

  const botOk = checkBotHealth(id, openclawDir);
  const wsOk = checkWorkspaceHealth(id, openclawDir);
  const kbOk = checkKanbanHealth(id, openclawDir);
  const knOk = checkKnowledgeHealth(id, knowledgeDir);

  const projectSprints = sprints.filter((s) => s.project === id);
  const active = projectSprints.filter(
    (s) => s.state === "current" || s.state === "next",
  );
  const closed = projectSprints
    .filter((s) => s.state === "closed")
    .sort((a, b) => (b.closed_at ?? "").localeCompare(a.closed_at ?? ""))
    .slice(0, 5);

  const tasksInFlight = tasks
    .filter((t) => t.project === id)
    .filter((t) => t.status === "in_progress" || t.status === "blocked")
    .sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""));

  const enriched = mergeProjectMeta(id, meta);

  const personaPending = existsSync(
    path.join(openclawDir, `workspace-${id}`, "PERSONA_PENDING.md"),
  );

  const detail: ProjectDetail = {
    id,
    name: projectName,
    description: projectDescription,
    health: { bot: botOk, workspace: wsOk, kanban: kbOk, knowledge: knOk },
    counts: {
      sprints_active: active.length,
      tasks_in_progress: tasks.filter(
        (t) => t.project === id && t.status === "in_progress",
      ).length,
    },
    is_canonical: isCanonical,
    github_url: enriched?.github_url ?? metaEntry?.github_url ?? null,
    bot_id: enriched?.bot_id ?? metaEntry?.bot_id ?? null,
    created_at: enriched?.created_at ?? metaEntry?.created_at ?? null,
    health_details: {
      bot: {
        present: botOk === "ok",
        envPath: botOk === "ok" ? botEnv : null,
        systemdService: botOk === "ok" ? `openclaw-gateway@${id}.service` : null,
      },
      workspace: {
        present: wsOk !== "missing",
        dir: wsOk !== "missing" ? wsDir : null,
        files: wsOk !== "missing" ? workspaceFiles(wsDir) : [],
      },
      kanban: {
        present: kbOk === "ok",
        tasks_total: tasks.filter((t) => t.project === id).length,
      },
      knowledge: {
        present: knOk === "ok",
        specsCount: countFiles(specsDir, ".md"),
      },
    },
    links: {
      telegram_bot_env: botOk === "ok" ? botEnv : null,
      workspace_dir: wsOk !== "missing" ? wsDir : null,
      knowledge_specs_dir: knOk === "ok" ? specsDir : null,
      kanban_filter_url: `/kanban?project=${encodeURIComponent(id)}`,
    },
    sprints: { active, closed },
    tasks_in_flight: tasksInFlight,
    persona_pending: personaPending,
  };

  return NextResponse.json(detail);
}

/**
 * PATCH /api/projects/[id]
 *
 * Edit light-weight via CLI `project edit` (sem orchestration, timeout 10s).
 * Aceita partial: bot_id (Telegram regex), github_url, description.
 *
 * Spec: bevox-knowledge/35_specs/company-os/2026-04-26-mc-projects-factory.md
 */

const PATCH_CLI_PATH = `${os.homedir()}/.openclaw/kanban-tasks/cli.sh`;

function parseLastJsonLine(s: string): unknown {
  const trimmed = s.trim();
  if (!trimmed) return {};
  try {
    return JSON.parse(trimmed);
  } catch {
    /* fall through */
  }
  const lines = trimmed.split("\n").reverse();
  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith("{") || t.startsWith("[")) {
      try {
        return JSON.parse(t);
      } catch {
        /* keep trying */
      }
    }
  }
  throw new SyntaxError("no JSON found in stdout");
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const bb = (body ?? {}) as Record<string, unknown>;

  const args: string[] = ["project", "edit", id];
  // Note: bot_id, bot_username, bot_port are mutated exclusively via
  // /api/projects/[id]/bot/* routes — not editable via PATCH.
  if (typeof bb.github_url === "string" || bb.github_url === null) {
    args.push(
      "--github-url",
      bb.github_url === null ? "" : (bb.github_url as string),
    );
  }
  if (typeof bb.description === "string") {
    args.push("--description", bb.description);
  }
  if (args.length === 3) {
    return NextResponse.json(
      { error: "validation", reason: "no fields provided" },
      { status: 400 },
    );
  }
  args.push("--json");

  return new Promise<NextResponse>((resolve) => {
    const child = spawn(PATCH_CLI_PATH, args, { timeout: 10_000 });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => {
      stdout += d.toString();
    });
    child.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    child.on("close", (code) => {
      let result: unknown = null;
      try {
        result = parseLastJsonLine(stdout);
      } catch {
        /* keep null */
      }

      if (code === 0) {
        resolve(NextResponse.json(result ?? {}));
        return;
      }

      if (result && typeof result === "object") {
        resolve(NextResponse.json(result, { status: 400 }));
      } else {
        resolve(
          NextResponse.json(
            { error: "cli_failed", detail: stderr.trim() || `exit ${code}` },
            { status: 400 },
          ),
        );
      }
    });

    child.on("error", (err) => {
      resolve(
        NextResponse.json(
          { error: "cli_spawn_failed", detail: err.message },
          { status: 500 },
        ),
      );
    });
  });
}

/**
 * DELETE /api/projects/[id]
 *
 * Remove project cross-filesystem via CLI `project remove` (timeout 30s).
 * Block canonical (ADR-002 governance). 404 se ausente em meta.
 * Soft-fail GitHub retorna 200 com github_deleted: false + github_hint.
 *
 * Spec: bevox-knowledge/35_specs/company-os/2026-04-27-mc-projects-delete.md §3.6
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Block canonical projects (ADR-002 governance)
  if (isCanonicalProject(id)) {
    return NextResponse.json(
      {
        error: "cannot_delete_canonical",
        detail: `${id} is canonical (ADR-002); requires ADR + canonical.ts edit`,
      },
      { status: 400 },
    );
  }

  // Verify exists in meta (else 404)
  const meta = readMeta();
  if (!meta.projects[id]) {
    return NextResponse.json(
      { error: "project_not_found", detail: `${id} not in projects-meta.json` },
      { status: 404 },
    );
  }

  // Spawn CLI subprocess
  return new Promise<NextResponse>((resolve) => {
    const child = spawn(
      PATCH_CLI_PATH,
      ["project", "remove", id, "--json"],
      { timeout: 30_000 },
    );

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => {
      stdout += d.toString();
    });
    child.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    child.on("error", (err) => {
      resolve(
        NextResponse.json(
          { error: "cli_spawn_failed", detail: err.message },
          { status: 500 },
        ),
      );
    });
    child.on("close", (code) => {
      let result: unknown = null;
      try {
        result = parseLastJsonLine(stdout);
      } catch {
        /* keep null */
      }

      if (code === 0) {
        resolve(NextResponse.json(result ?? {}, { status: 200 }));
        return;
      }

      const status = code === 1 ? 400 : 500;
      if (result && typeof result === "object") {
        resolve(NextResponse.json(result, { status }));
      } else {
        resolve(
          NextResponse.json(
            { error: "cli_failed", detail: stderr.trim() || `exit ${code}` },
            { status },
          ),
        );
      }
    });
  });
}
