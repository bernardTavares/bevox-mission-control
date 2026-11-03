import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import path from "path";

import type { Dot } from "@/lib/projects/types";

/**
 * Health checks for a canonical project.
 *
 * Each check is pure: given a projectId + base dirs, returns a Dot
 * ("ok" | "partial" | "missing"). No side effects. Graceful on filesystem
 * errors (returns "missing" rather than throwing).
 *
 * Spec: bevox-knowledge/35_specs/company-os/2026-04-24-e2-projects-dashboard-w1.md §3.2
 */

export function checkBotHealth(projectId: string, openclawDir: string): Dot {
  const envFile = path.join(openclawDir, "gateway", "bots", `${projectId}.env`);
  try {
    return existsSync(envFile) && statSync(envFile).isFile() ? "ok" : "missing";
  } catch {
    return "missing";
  }
}

export function checkWorkspaceHealth(projectId: string, openclawDir: string): Dot {
  const wsDir = path.join(openclawDir, `workspace-${projectId}`);
  try {
    if (!existsSync(wsDir) || !statSync(wsDir).isDirectory()) return "missing";
    const identity = path.join(wsDir, "IDENTITY.md");
    return existsSync(identity) && statSync(identity).isFile() ? "ok" : "partial";
  } catch {
    return "missing";
  }
}

export function checkKanbanHealth(projectId: string, openclawDir: string): Dot {
  const yml = path.join(openclawDir, "kanban-tasks", "projects.yml");
  try {
    if (!existsSync(yml)) return "missing";
    const raw = readFileSync(yml, "utf-8");
    // Simple line match — avoids adding yaml dep for this one check.
    // Looks for lines like "  - bevox-mobile" at any indent.
    const lines = raw.split(/\r?\n/);
    for (const line of lines) {
      const m = line.match(/^\s*-\s+(\S+)\s*$/);
      if (m && m[1] === projectId) return "ok";
    }
    return "missing";
  } catch {
    return "missing";
  }
}

export function checkKnowledgeHealth(projectId: string, bevoxKnowledgeDir: string): Dot {
  const dir = path.join(bevoxKnowledgeDir, "35_specs", projectId);
  try {
    if (!existsSync(dir) || !statSync(dir).isDirectory()) return "missing";
    const entries = readdirSync(dir)
      .filter((n) => n !== ".gitkeep")
      .filter((n) => n.endsWith(".md"));
    return entries.length > 0 ? "ok" : "missing";
  } catch {
    return "missing";
  }
}
