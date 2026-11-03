import { NextResponse, NextRequest } from "next/server";
import {
  readFileSync,
  writeFileSync,
  renameSync,
  unlinkSync,
  existsSync,
  statSync,
} from "fs";
import path from "path";
import yaml from "js-yaml";

import { BEVOX_SUBPATHS } from "@/lib/bevox/paths";
import os from "os";

export const dynamic = "force-dynamic";

/**
 * GET /api/agents/canonical/[id]
 * Returns metadata from registry.yml + raw .md content for one agent.
 *
 * PUT /api/agents/canonical/[id]
 * Writes .md content atomically (tmp + rename). Path resolved from
 * registry.yml, never from request. First canonical write surface via MC.
 *
 * Spec: 2026-04-16-e2-canonical-agents-detail-edit.md
 */

interface RegistryAgent {
  status: string;
  level: string;
  owner: string;
  model: { primary: string; fallback: string };
  since: string;
  file: string;
}

interface RegistryShape {
  version: number;
  agents: Record<string, RegistryAgent>;
}

type RegistryResult =
  | { ok: true; data: RegistryShape }
  | { ok: false; error: string; status: number };

/**
 * Resolve the base directory of `20_architecture/` inside the bevox-knowledge clone.
 *
 * Per ADR-010 (wave-3), the canonical agents registry (`_shared/registry.yml`)
 * lives alongside project-scoped agent .md files (e.g. `openclaw/dispatcher-agent.md`,
 * `company-os/vox.md`). The `file:` field in registry.yml is a subpath relative
 * to this base (e.g. `openclaw/dispatcher-agent.md`).
 */
function resolveArchitectureDir(): string | null {
  const envDir = process.env.BEVOX_KNOWLEDGE_DIR;
  if (envDir && envDir.length > 0) {
    return path.join(envDir, BEVOX_SUBPATHS.architectureDir);
  }
  if (process.env.NODE_ENV !== "production") {
    const home = process.env.HOME || os.homedir();
    return path.join(
      home,
      "bevox-knowledge",
      BEVOX_SUBPATHS.architectureDir,
    );
  }
  return null;
}

function loadRegistry(architectureDir: string): RegistryResult {
  // registry.yml lives in _shared/ per ADR-010 wave-3.
  const registryPath = path.join(architectureDir, "_shared", "registry.yml");
  if (!existsSync(registryPath)) {
    return { ok: false, error: "registry_not_found", status: 404 };
  }
  let raw: string;
  try {
    raw = readFileSync(registryPath, "utf-8");
  } catch {
    return { ok: false, error: "registry_read_failed", status: 500 };
  }
  let parsed: unknown;
  try {
    parsed = yaml.load(raw);
  } catch {
    return { ok: false, error: "registry_corrupt", status: 500 };
  }
  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("agents" in parsed) ||
    typeof (parsed as RegistryShape).agents !== "object"
  ) {
    return { ok: false, error: "registry_shape_invalid", status: 500 };
  }
  return { ok: true, data: parsed as RegistryShape };
}

function lookupAgent(
  registry: RegistryShape,
  id: string,
): RegistryAgent | null {
  const entry = registry.agents[id];
  if (!entry || entry.status !== "ativo") return null;
  return entry;
}

function resolveAgentFilePath(
  architectureDir: string,
  entry: RegistryAgent,
): { filePath: string } | { error: string; status: number } {
  // entry.file is a subpath like "openclaw/dispatcher-agent.md" or "company-os/vox.md".
  const resolved = path.resolve(architectureDir, entry.file);
  if (
    !resolved.startsWith(architectureDir + path.sep) &&
    resolved !== architectureDir
  ) {
    return { error: "path_traversal_blocked", status: 403 };
  }
  return { filePath: resolved };
}

// ─── GET ────────────────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const architectureDir = resolveArchitectureDir();

  if (!architectureDir) {
    return NextResponse.json(
      { error: "canonical_not_configured", detail: "BEVOX_KNOWLEDGE_DIR env var not set" },
      { status: 503 },
    );
  }

  const registryResult = loadRegistry(architectureDir);
  if (!registryResult.ok) {
    return NextResponse.json(
      { error: registryResult.error },
      { status: registryResult.status },
    );
  }
  const registry = registryResult.data;

  const entry = lookupAgent(registry, id);
  if (!entry) {
    return NextResponse.json(
      { error: "agent_not_found", detail: `Agent "${id}" not found or not ativo` },
      { status: 404 },
    );
  }

  const pathResult = resolveAgentFilePath(architectureDir, entry);
  if ("error" in pathResult) {
    return NextResponse.json(
      { error: pathResult.error },
      { status: pathResult.status },
    );
  }
  const { filePath } = pathResult;

  if (!existsSync(filePath)) {
    return NextResponse.json(
      { error: "agent_file_not_found", detail: `${entry.file} not found on disk` },
      { status: 404 },
    );
  }

  try {
    const content = readFileSync(filePath, "utf-8");
    const stat = statSync(filePath);
    return NextResponse.json({
      agent: {
        id,
        status: entry.status,
        level: entry.level,
        owner: entry.owner,
        model: {
          primary: entry.model?.primary ?? "",
          fallback: entry.model?.fallback ?? "",
        },
        since: entry.since,
        file: entry.file,
      },
      content,
      file_path: filePath,
      file_size: stat.size,
      file_modified: stat.mtime.toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: "file_read_failed", detail: String(err) },
      { status: 500 },
    );
  }
}

// ─── PUT ────────────────────────────────────────────────────────────

const MAX_CONTENT_SIZE = 100 * 1024; // 100KB

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const architectureDir = resolveArchitectureDir();

  if (!architectureDir) {
    return NextResponse.json(
      { error: "canonical_not_configured", detail: "BEVOX_KNOWLEDGE_DIR env var not set" },
      { status: 503 },
    );
  }

  const registryResult = loadRegistry(architectureDir);
  if (!registryResult.ok) {
    return NextResponse.json(
      { error: registryResult.error },
      { status: registryResult.status },
    );
  }
  const registry = registryResult.data;

  const entry = lookupAgent(registry, id);
  if (!entry) {
    return NextResponse.json(
      { error: "agent_not_found", detail: `Agent "${id}" not found or not ativo` },
      { status: 404 },
    );
  }

  const pathResult = resolveAgentFilePath(architectureDir, entry);
  if ("error" in pathResult) {
    return NextResponse.json(
      { error: pathResult.error },
      { status: pathResult.status },
    );
  }
  const { filePath } = pathResult;

  let body: { content?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_body", detail: "Request body must be JSON" },
      { status: 400 },
    );
  }

  if (typeof body.content !== "string") {
    return NextResponse.json(
      { error: "content_missing", detail: "Body must include { content: string }" },
      { status: 400 },
    );
  }

  const contentBytes = Buffer.byteLength(body.content, "utf-8");
  if (contentBytes > MAX_CONTENT_SIZE) {
    return NextResponse.json(
      {
        error: "content_too_large",
        detail: `Content is ${contentBytes} bytes, max is ${MAX_CONTENT_SIZE}`,
      },
      { status: 400 },
    );
  }

  // Atomic write: tmp in same directory + rename
  const tmpPath = filePath + ".tmp";
  try {
    writeFileSync(tmpPath, body.content, "utf-8");
    renameSync(tmpPath, filePath);
  } catch (err) {
    // Attempt cleanup of tmp
    try {
      unlinkSync(tmpPath);
    } catch {
      // tmp cleanup best-effort
    }
    console.error("canonical agent write failed:", err);
    return NextResponse.json(
      { error: "write_failed", detail: String(err) },
      { status: 500 },
    );
  }

  const stat = statSync(filePath);
  return NextResponse.json({
    ok: true,
    file_path: filePath,
    bytes_written: stat.size,
    modified_at: stat.mtime.toISOString(),
    uncommitted: true,
  });
}
