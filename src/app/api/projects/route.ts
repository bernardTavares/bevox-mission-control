import { NextResponse } from "next/server";
import { existsSync, readFileSync } from "fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { spawn } from "child_process";
import path from "path";
import os from "os";

import { PATHS } from "@/lib/bevox/paths";
import { CANONICAL_PROJECTS } from "@/lib/projects/canonical";
import {
  checkBotHealth,
  checkKanbanHealth,
  checkKnowledgeHealth,
  checkWorkspaceHealth,
} from "@/lib/projects/health";
import { readMeta, mergeProjectMeta } from "@/lib/projects/meta";
import type { ProjectSummary, Sprint, Task } from "@/lib/projects/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/projects
 *
 * Returns the 6 canonical projects (ADR-002) with 4 health checks
 * + derived counts from kanban state.json.
 *
 * Spec: bevox-knowledge/35_specs/company-os/2026-04-24-e2-projects-dashboard-w1.md §3
 */

function resolveOpenclawDir(): string | null {
  // MC_HOME override (test friendly); else PATHS.openclawHome (prod/dev).
  // Returns null if production + no valid resolution (matches tracker route pattern).
  const mcHome = process.env.MC_HOME;
  if (mcHome) return path.join(mcHome, "openclaw");
  if (process.env.NODE_ENV !== "production") return PATHS.openclawHome;
  // Production: require explicit env
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

export async function GET() {
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

  const meta = readMeta();

  const projects: ProjectSummary[] = CANONICAL_PROJECTS.map((p) => {
    const m = mergeProjectMeta(p.id, meta);
    return {
      id: p.id,
      name: p.name,
      description: p.description,
      health: {
        bot: checkBotHealth(p.id, openclawDir),
        workspace: checkWorkspaceHealth(p.id, openclawDir),
        kanban: checkKanbanHealth(p.id, openclawDir),
        knowledge: checkKnowledgeHealth(p.id, knowledgeDir),
      },
      counts: {
        sprints_active: sprints.filter(
          (s) => s.project === p.id && (s.state === "current" || s.state === "next"),
        ).length,
        tasks_in_progress: tasks.filter(
          (t) => t.project === p.id && t.status === "in_progress",
        ).length,
      },
      is_canonical: true,
      github_url: m?.github_url ?? null,
      bot_id: m?.bot_id ?? null,
      created_at: m?.created_at ?? null,
    };
  });

  // Append user_created projects from meta not in canonical list.
  const canonicalIds = new Set(projects.map((p) => p.id));
  for (const [id, entry] of Object.entries(meta.projects)) {
    if (entry.source === "user_created" && !canonicalIds.has(id)) {
      projects.push({
        id,
        name: entry.name,
        description: entry.description,
        health: {
          bot: "missing",
          workspace: "missing",
          kanban: "missing",
          knowledge: "missing",
        },
        counts: { sprints_active: 0, tasks_in_progress: 0 },
        is_canonical: false,
        github_url: entry.github_url,
        bot_id: entry.bot_id,
        created_at: entry.created_at,
      });
    }
  }

  return NextResponse.json({
    generated_at: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    projects,
  });
}

/**
 * POST /api/projects
 *
 * Cria projeto novo via openclaw CLI (`project create`). Validation server-side
 * + spawn subprocess (timeout 60s). Retorna JSON do CLI wrapped em status.
 *
 * Spec: bevox-knowledge/35_specs/company-os/2026-04-26-mc-projects-factory.md
 */

const CREATE_ID_RE = /^[a-z][a-z0-9-]*[a-z0-9]$/;
const CREATE_RESERVED = new Set(["_shared", "_retired", "templates"]);
const CLI_PATH = `${os.homedir()}/.openclaw/kanban-tasks/cli.sh`;

function parseLastJsonLine(s: string): unknown {
  const trimmed = s.trim();
  if (!trimmed) return {};
  // Try the whole thing first (single-line case).
  try {
    return JSON.parse(trimmed);
  } catch {
    /* fall through */
  }
  // Fallback: take the last non-empty line that looks like JSON.
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

function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "");
}

interface PRDInput {
  /** absolute path to a temporary PRD file the factory CLI can read */
  path: string;
  /** caller MUST invoke this in finally to cleanup */
  cleanup: () => Promise<void>;
}

/**
 * Persist multipart-supplied PRD content (file or text) to a tmp .md file.
 * Throws RangeError when prd is missing / too short.
 */
async function persistPrd(args: {
  prdFile: File | null;
  prdText: string;
}): Promise<PRDInput> {
  const dir = await mkdtemp(path.join(tmpdir(), "mc-prd-"));
  const file = path.join(dir, "prd.md");

  if (args.prdFile) {
    const buf = Buffer.from(await args.prdFile.arrayBuffer());
    await writeFile(file, buf);
  } else {
    const text = args.prdText.trim();
    if (text.length < 200) {
      await rm(dir, { recursive: true, force: true });
      throw new RangeError(
        "prd_text must be at least 200 characters or use prd_file",
      );
    }
    await writeFile(file, text, "utf-8");
  }

  return {
    path: file,
    cleanup: async () => {
      await rm(dir, { recursive: true, force: true }).catch(() => {});
    },
  };
}

export async function POST(req: Request) {
  const ct = req.headers.get("content-type") ?? "";

  let name = "";
  let id = "";
  let description = "";
  let domain = "";
  let prd: PRDInput | null = null;

  try {
    if (ct.includes("multipart/form-data")) {
      const fd = await req.formData();
      name = String(fd.get("name") ?? "").trim();
      const rawId = String(fd.get("id") ?? "").trim();
      id = rawId || slugify(name);
      description = String(fd.get("description") ?? "");
      domain = String(fd.get("domain") ?? "").trim();

      const prdFile = fd.get("prd_file");
      const prdText = String(fd.get("prd_text") ?? "");
      const prdFileObj =
        prdFile instanceof File && prdFile.size > 0 ? prdFile : null;

      if (!prdFileObj && prdText.trim().length < 200) {
        return NextResponse.json(
          {
            error: "validation",
            field: "prd",
            reason: "prd_text >= 200 chars or prd_file required",
          },
          { status: 400 },
        );
      }

      try {
        prd = await persistPrd({ prdFile: prdFileObj, prdText });
      } catch (err) {
        return NextResponse.json(
          {
            error: "validation",
            field: "prd",
            reason: err instanceof Error ? err.message : "persist failed",
          },
          { status: 400 },
        );
      }
    } else {
      // Legacy JSON path (no PRD, no persona LLM step). Kept for backward
      // compatibility with non-UI callers.
      let body: unknown;
      try {
        body = await req.json();
      } catch {
        return NextResponse.json({ error: "invalid_json" }, { status: 400 });
      }
      const bb = (body ?? {}) as Record<string, unknown>;
      name = typeof bb.name === "string" ? bb.name.trim() : "";
      id =
        typeof bb.id === "string" && bb.id.trim()
          ? bb.id.trim()
          : slugify(name);
      description =
        typeof bb.description === "string" ? bb.description : "";
      domain = typeof bb.domain === "string" ? bb.domain.trim() : "";
    }

    // Validation (shared)
    if (!name || name.length < 2 || name.length > 50) {
      return NextResponse.json(
        { error: "validation", field: "name", reason: "length 2-50" },
        { status: 400 },
      );
    }
    if (
      !id ||
      id.length < 2 ||
      id.length > 40 ||
      !CREATE_ID_RE.test(id) ||
      CREATE_RESERVED.has(id)
    ) {
      return NextResponse.json(
        {
          error: "validation",
          field: "id",
          reason: "kebab-case 2-40 + non-reserved",
        },
        { status: 400 },
      );
    }

    // Build CLI args
    const args: string[] = [
      "project",
      "create",
      "--id",
      id,
      "--description",
      description,
    ];
    if (domain) {
      args.push("--domain", domain);
    }
    if (prd) {
      args.push("--prd", prd.path);
    }
    args.push("--json", name);

    return await new Promise<NextResponse>((resolve) => {
      // 360s = factory steps (~5-15s) + persona LLM via claude -p (up to 300s).
      const child = spawn(CLI_PATH, args, { timeout: 360_000 });

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
          resolve(NextResponse.json(result ?? {}, { status: 201 }));
          return;
        }

        const status = code === 1 ? 400 : 500;
        if (result && typeof result === "object") {
          resolve(NextResponse.json(result, { status }));
        } else {
          resolve(
            NextResponse.json(
              {
                error: "cli_failed",
                detail: stderr.trim() || `exit ${code}`,
              },
              { status },
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
  } finally {
    if (prd) {
      await prd.cleanup();
    }
  }
}
