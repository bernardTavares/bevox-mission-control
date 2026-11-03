/**
 * Reader for ~/.openclaw/projects-meta.json (host-local metadata).
 *
 * Spec: bevox-knowledge/35_specs/company-os/2026-04-26-mc-projects-factory.md §3.5
 */
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

export interface ProjectMetaEntry {
  name: string;
  description: string;
  github_url: string | null;
  bot_id: string | null;
  bot_username: string | null;
  bot_port: number | null;
  created_at: string;
  source: "canonical" | "user_created";
}

export interface ProjectsMeta {
  version: number;
  projects: Record<string, ProjectMetaEntry>;
}

const DEFAULT_META: ProjectsMeta = { version: 1, projects: {} };

export function getMetaPath(): string {
  const root = process.env.OPENCLAW_DIR ?? path.join(os.homedir(), ".openclaw");
  return path.join(root, "projects-meta.json");
}

export function readMeta(metaPath: string = getMetaPath()): ProjectsMeta {
  if (!fs.existsSync(metaPath)) return DEFAULT_META;
  try {
    return JSON.parse(fs.readFileSync(metaPath, "utf-8"));
  } catch {
    return DEFAULT_META;
  }
}

export interface EnrichedProject {
  is_canonical: boolean;
  github_url: string | null;
  bot_id: string | null;
  created_at: string | null;
}

export function mergeProjectMeta(
  id: string,
  meta: ProjectsMeta,
): EnrichedProject | null {
  const entry = meta.projects[id];
  if (!entry) return null;
  return {
    is_canonical: entry.source === "canonical",
    github_url: entry.github_url,
    bot_id: entry.bot_id,
    created_at: entry.created_at,
  };
}
