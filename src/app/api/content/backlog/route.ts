import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import path from "path";
import yaml from "js-yaml";

import { BEVOX_SUBPATHS } from "@/lib/bevox/paths";
import os from "os";

export const dynamic = "force-dynamic";

/**
 * GET /api/content/backlog
 *
 * E12 wave 1 — Content backlog projection.
 *
 * Reads bevox-knowledge/20_architecture/content-backlog.yml and
 * returns entries as a flat JSON array sorted by created desc
 * (most recent first, as stored in the YAML).
 *
 * Read-only. No auth beyond MC session layer.
 *
 * Env var: BEVOX_KNOWLEDGE_DIR (reused from E2 canonical agents projection)
 *
 * Spec: 2026-04-16-e12-content-backlog-wave-1.md
 */

interface BacklogEntry {
  id: string;
  title: string;
  category: string;
  status: string;
  target_date: string | null;
  notes: string | null;
  created: string;
}

interface BacklogShape {
  entries: BacklogEntry[];
}

function resolveBacklogPath(): string | null {
  const envDir = process.env.BEVOX_KNOWLEDGE_DIR;
  if (envDir && envDir.length > 0) {
    return path.join(envDir, BEVOX_SUBPATHS.contentBacklog);
  }
  if (process.env.NODE_ENV !== "production") {
    const home = process.env.HOME || os.homedir();
    return path.join(home, "bevox-knowledge", BEVOX_SUBPATHS.contentBacklog);
  }
  return null;
}

export async function GET() {
  const backlogPath = resolveBacklogPath();

  if (!backlogPath) {
    return NextResponse.json(
      {
        error: "canonical_not_configured",
        detail: "BEVOX_KNOWLEDGE_DIR env var not set",
      },
      { status: 503 },
    );
  }

  if (!existsSync(backlogPath)) {
    return NextResponse.json(
      {
        error: "backlog_not_found",
        detail: `content-backlog.yml not found at ${backlogPath}`,
      },
      { status: 404 },
    );
  }

  let raw: string;
  try {
    raw = readFileSync(backlogPath, "utf-8");
  } catch (err) {
    return NextResponse.json(
      {
        error: "backlog_corrupt",
        detail: `cannot read ${backlogPath}: ${String(err)}`,
      },
      { status: 500 },
    );
  }

  let parsed: unknown;
  try {
    parsed = yaml.load(raw);
  } catch (err) {
    return NextResponse.json(
      {
        error: "backlog_corrupt",
        detail: `yaml parse error: ${String(err)}`,
      },
      { status: 500 },
    );
  }

  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("entries" in parsed) ||
    !Array.isArray((parsed as BacklogShape).entries)
  ) {
    return NextResponse.json(
      {
        error: "backlog_shape_invalid",
        detail: "content-backlog.yml missing or malformed `entries` array",
      },
      { status: 500 },
    );
  }

  const shape = parsed as BacklogShape;

  const entries: BacklogEntry[] = shape.entries.map((e) => ({
    id: e.id || "",
    title: e.title || "",
    category: e.category || "",
    status: e.status || "idea",
    target_date: e.target_date || null,
    notes: e.notes || null,
    created: e.created || "",
  }));

  return NextResponse.json({
    generated_at: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    source: backlogPath,
    entries,
    total: entries.length,
  });
}
