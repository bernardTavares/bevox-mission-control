import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import path from "path";
import yaml from "js-yaml";

import { BEVOX_SUBPATHS } from "@/lib/bevox/paths";
import os from "os";

export const dynamic = "force-dynamic";

/**
 * GET /api/agents/canonical
 *
 * E2 — Canonical Agents Projection.
 *
 * Reads bevox-knowledge/20_architecture/agents/registry.yml and
 * returns a sorted list of agents with status === "ativo".
 *
 * Source of truth is the YAML file, read at request time (no cache).
 * Filtered + ordered server-side so the frontend renders in a stable
 * order regardless of editorial changes to the raw YAML.
 *
 * Ordering (spec §5.4):
 *   1. vox pinned first (always)
 *   2. others sorted by level ascending (L1 < L2 < L3 < L4)
 *   3. alphabetical by id within same level
 *
 * Read-only. No auth beyond MC session layer.
 *
 * Env var: BEVOX_KNOWLEDGE_DIR
 *   - Required in production
 *   - Dev fallback: $HOME/bevox-knowledge
 *
 * Fail modes (spec §5.1):
 *   503 canonical_not_configured — prod + env unset
 *   404 registry_not_found       — file missing
 *   500 registry_corrupt         — yaml parse error
 *   500 registry_shape_invalid   — shape validation error
 *   200                          — OK, payload in spec §5.2
 */

interface CanonicalAgent {
  id: string;
  status: string;
  level: string;
  owner: string;
  model: { primary: string; fallback: string };
  since: string;
  file: string;
}

interface RegistryShape {
  version: number;
  agents: Record<string, Omit<CanonicalAgent, "id">>;
}

function resolveRegistryPath(): string | null {
  const envDir = process.env.BEVOX_KNOWLEDGE_DIR;
  if (envDir && envDir.length > 0) {
    return path.join(envDir, BEVOX_SUBPATHS.agentsRegistry);
  }
  if (process.env.NODE_ENV !== "production") {
    const home = process.env.HOME || os.homedir();
    return path.join(home, "bevox-knowledge", BEVOX_SUBPATHS.agentsRegistry);
  }
  return null;
}

function sortAgents(agents: CanonicalAgent[]): CanonicalAgent[] {
  const vox = agents.find((a) => a.id === "vox");
  const rest = agents.filter((a) => a.id !== "vox");

  rest.sort((a, b) => {
    // Primary: level ascending (L1 < L2 < L3 < L4)
    const la = parseInt(a.level.slice(1), 10);
    const lb = parseInt(b.level.slice(1), 10);
    if (!Number.isNaN(la) && !Number.isNaN(lb) && la !== lb) {
      return la - lb;
    }
    // Secondary: id alphabetical
    return a.id.localeCompare(b.id);
  });

  return vox ? [vox, ...rest] : rest;
}

export async function GET() {
  const registryPath = resolveRegistryPath();

  if (!registryPath) {
    return NextResponse.json(
      {
        error: "canonical_not_configured",
        detail: "BEVOX_KNOWLEDGE_DIR env var not set",
      },
      { status: 503 },
    );
  }

  if (!existsSync(registryPath)) {
    return NextResponse.json(
      {
        error: "registry_not_found",
        detail: `registry.yml not found at ${registryPath}`,
      },
      { status: 404 },
    );
  }

  let raw: string;
  try {
    raw = readFileSync(registryPath, "utf-8");
  } catch (err) {
    console.error("canonical registry read error:", err);
    return NextResponse.json(
      {
        error: "registry_corrupt",
        detail: `cannot read ${registryPath}: ${String(err)}`,
      },
      { status: 500 },
    );
  }

  let parsed: unknown;
  try {
    parsed = yaml.load(raw);
  } catch (err) {
    console.error("canonical registry parse error:", err);
    return NextResponse.json(
      {
        error: "registry_corrupt",
        detail: `yaml parse error: ${String(err)}`,
      },
      { status: 500 },
    );
  }

  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("agents" in parsed) ||
    typeof (parsed as RegistryShape).agents !== "object"
  ) {
    return NextResponse.json(
      {
        error: "registry_shape_invalid",
        detail: "registry.yml missing or malformed `agents` mapping",
      },
      { status: 500 },
    );
  }

  const shape = parsed as RegistryShape;
  const version = typeof shape.version === "number" ? shape.version : 0;

  const allAgents: CanonicalAgent[] = Object.entries(shape.agents).map(
    ([id, entry]) => ({
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
    }),
  );

  const ativos = allAgents.filter((a) => a.status === "ativo");
  const sorted = sortAgents(ativos);

  return NextResponse.json({
    generated_at: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    source: registryPath,
    version,
    agents: sorted,
    total: sorted.length,
  });
}
