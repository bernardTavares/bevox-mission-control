import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import path from "path";

import { BEVOX_SUBPATHS } from "@/lib/bevox/paths";
import { parseDeps } from "@/lib/roadmap/parse-deps";
import os from "os";

export const dynamic = "force-dynamic";

/**
 * GET /api/roadmap/deps
 *
 * E5 F2 — Roadmap technical view deps source.
 *
 * Reads the canonical roadmap narrative markdown from bevox-knowledge
 * and extracts epic-level `**Dependencias:**` lines per epic, returning
 * a map { epicId: depsList[] }.
 *
 * Fail modes:
 *   503 canonical_not_configured — prod + env unset
 *   404 roadmap_not_found        — markdown file absent
 *   500 parse_failed             — unexpected read/parse error
 *   200                          — { deps, generated_at, source }
 *
 * Spec: 35_specs/company-os/2026-04-24-e5-f1-f2-roadmap-views.md §6.1
 */

function resolveRoadmapPath(): string | null {
  const envDir = process.env.BEVOX_KNOWLEDGE_DIR;
  if (envDir && envDir.length > 0) {
    return path.join(envDir, BEVOX_SUBPATHS.roadmapNarrative);
  }
  if (process.env.NODE_ENV !== "production") {
    const home = process.env.HOME || os.homedir();
    return path.join(home, "bevox-knowledge", BEVOX_SUBPATHS.roadmapNarrative);
  }
  return null;
}

export async function GET() {
  const roadmapPath = resolveRoadmapPath();

  if (!roadmapPath) {
    return NextResponse.json(
      {
        error: "canonical_not_configured",
        detail: "BEVOX_KNOWLEDGE_DIR env var not set",
      },
      { status: 503 },
    );
  }

  if (!existsSync(roadmapPath)) {
    return NextResponse.json(
      { error: "roadmap_not_found", detail: `not found at ${roadmapPath}` },
      { status: 404 },
    );
  }

  let markdown: string;
  try {
    markdown = readFileSync(roadmapPath, "utf-8");
  } catch (err) {
    return NextResponse.json(
      { error: "parse_failed", detail: `read error: ${String(err)}` },
      { status: 500 },
    );
  }

  let deps: Record<string, string[]>;
  try {
    deps = parseDeps(markdown);
  } catch (err) {
    return NextResponse.json(
      { error: "parse_failed", detail: `parse error: ${String(err)}` },
      { status: 500 },
    );
  }

  return NextResponse.json({
    generated_at: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    source: roadmapPath,
    deps,
  });
}
