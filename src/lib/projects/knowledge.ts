/**
 * Sandboxed reader for bevox-knowledge filesystem.
 *
 * Strict: validates folder ∈ ALLOWED_FOLDERS, project ∈ CANONICAL_PROJECTS,
 * path resolves inside KNOWLEDGE_ROOT (no traversal).
 *
 * Spec: bevox-knowledge/35_specs/company-os/2026-04-25-mc-projects-redesign.md §4.3
 */
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { isCanonicalProject } from "@/lib/projects/canonical";
import { readMeta } from "@/lib/projects/meta";

export const KNOWLEDGE_ROOT =
  process.env.BEVOX_KNOWLEDGE_DIR ?? path.join(os.homedir(), "bevox-knowledge");

export const ALLOWED_FOLDERS = [
  "10_prd",
  "20_architecture",
  "30_adr",
  "35_specs",
  "40_roadmap",
  "50_releases",
  "60_customer-feedback",
  "70_metrics",
] as const;

export type AllowedFolder = (typeof ALLOWED_FOLDERS)[number];

export interface FileEntry {
  /** Path relativo a KNOWLEDGE_ROOT (e.g., "10_prd/openclaw/2026-04-25-prd.md"). */
  path: string;
  /** Filename apenas (e.g., "2026-04-25-prd.md"). */
  name: string;
  modified_at: string;
  is_stub: boolean;
}

export interface FileContent {
  path: string;
  content: string;
  modified_at: string;
  size_bytes: number;
  is_stub: boolean;
}

export class KnowledgeError extends Error {
  constructor(public code: "invalid_input" | "not_found" | "io_error", message: string) {
    super(message);
    this.name = "KnowledgeError";
  }
}

/** Validates path resolves inside the root. Rejects traversal + absolutes outside. */
export function isPathSafe(root: string, candidate: string): boolean {
  if (!candidate) return false;
  const resolved = path.resolve(candidate);
  const rootResolved = path.resolve(root);
  return resolved === rootResolved || resolved.startsWith(rootResolved + path.sep);
}

/** Detects stub marker in markdown content. */
export function detectStub(content: string): boolean {
  // Match "**Status:** stub" (line) or frontmatter "status: stub"
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim().toLowerCase();
    if (/^\*\*status:\*\*\s*stub\s*$/i.test(line.trim())) return true;
    if (/^status:\s*stub\s*$/i.test(trimmed)) return true;
  }
  return false;
}

function assertValidFolder(folder: string): asserts folder is AllowedFolder {
  if (!(ALLOWED_FOLDERS as readonly string[]).includes(folder)) {
    throw new KnowledgeError("invalid_input", `folder must be one of ${ALLOWED_FOLDERS.join(", ")}`);
  }
}

function assertValidProject(projectId: string): void {
  // Accept canonical (10 ADR-002) OR user_created (factory wave projects-meta entries).
  // Mirror semantics of GET /api/projects/[id] (fix #19) — UI must work for both.
  if (isCanonicalProject(projectId)) return;
  const meta = readMeta();
  if (meta.projects[projectId]) return;
  throw new KnowledgeError(
    "invalid_input",
    `project ${projectId} not canonical or user_created`,
  );
}

/** List `.md` files in <root>/<folder>/<projectId>/. Returns [] if folder missing. */
export function listProjectFolderFiles(projectId: string, folder: string): FileEntry[] {
  assertValidProject(projectId);
  assertValidFolder(folder);
  const dir = path.join(KNOWLEDGE_ROOT, folder, projectId);
  if (!isPathSafe(KNOWLEDGE_ROOT, dir)) {
    throw new KnowledgeError("invalid_input", "path outside sandbox");
  }
  if (!fs.existsSync(dir)) return [];
  let names: string[];
  try {
    names = fs.readdirSync(dir).filter((n) => n.endsWith(".md"));
  } catch (e) {
    throw new KnowledgeError("io_error", String(e));
  }
  return names.map((name) => {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    let stubFlag = false;
    try {
      const head = fs.readFileSync(full, "utf-8").slice(0, 2048);
      stubFlag = detectStub(head);
    } catch { /* ignore stub detection failures */ }
    return {
      path: path.join(folder, projectId, name),
      name,
      modified_at: stat.mtime.toISOString(),
      is_stub: stubFlag,
    };
  });
}

/** Reads a file at relativePath (must be <folder>/<projectId>/<name>). */
export function readProjectFile(projectId: string, relativePath: string): FileContent {
  assertValidProject(projectId);
  // relativePath should be folder/projectId/filename
  const parts = relativePath.split("/").filter(Boolean);
  if (parts.length < 3) {
    throw new KnowledgeError("invalid_input", "path must be <folder>/<projectId>/<filename>");
  }
  const [folder, pathProject, ...rest] = parts;
  assertValidFolder(folder);
  if (pathProject !== projectId) {
    throw new KnowledgeError("invalid_input", "path projectId mismatch");
  }
  if (rest.some((seg) => seg === ".." || seg === "." || seg.includes("\0"))) {
    throw new KnowledgeError("invalid_input", "path segments must be plain names");
  }
  const full = path.join(KNOWLEDGE_ROOT, folder, pathProject, ...rest);
  const projectRoot = path.join(KNOWLEDGE_ROOT, folder, pathProject);
  if (!isPathSafe(projectRoot, full)) {
    throw new KnowledgeError("invalid_input", "path escapes project sandbox");
  }
  if (!fs.existsSync(full)) {
    throw new KnowledgeError("not_found", `file ${relativePath} not found`);
  }
  let content: string;
  let stat: fs.Stats;
  try {
    content = fs.readFileSync(full, "utf-8");
    stat = fs.statSync(full);
  } catch (e) {
    throw new KnowledgeError("io_error", String(e));
  }
  return {
    path: relativePath,
    content,
    modified_at: stat.mtime.toISOString(),
    size_bytes: stat.size,
    is_stub: detectStub(content),
  };
}

/** Returns the latest (lexicographic max name) file in folder/<projectId>/. */
export function findLatestFile(projectId: string, folder: string): FileEntry | null {
  const files = listProjectFolderFiles(projectId, folder);
  if (files.length === 0) return null;
  return [...files].sort((a, b) => b.name.localeCompare(a.name))[0];
}
