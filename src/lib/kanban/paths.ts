import path from "path";
import { OPENCLAW_DIR } from "@/lib/paths";

/**
 * Paths para o modulo kanban-tasks (host-local).
 * Convenção: segue OPENCLAW_DIR do paths.ts central (override via env).
 * Spec: bevox-knowledge/35_specs/company-os/2026-04-17-e5-f4-sprint-planning-wave-1.md
 */
export const KANBAN_ROOT =
  process.env.KANBAN_ROOT ||
  path.join(OPENCLAW_DIR, "kanban-tasks");

export const KANBAN_CLI = path.join(KANBAN_ROOT, "cli.sh");
export const KANBAN_STATE = path.join(KANBAN_ROOT, "state.json");
