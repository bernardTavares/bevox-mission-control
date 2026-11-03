/**
 * TypeScript types for `openclaw project doctor --json` output.
 *
 * Mirrors the contract from W5 spec
 * (bevox-knowledge/35_specs/openclaw/2026-05-07-project-lifecycle-w5-v1.md)
 * and consumed by W6 MC UI drift dashboard
 * (bevox-knowledge/35_specs/openclaw/2026-05-08-project-lifecycle-w6-v1.md).
 *
 * Schema versioning: bump when shape changes; client should warn (not crash)
 * if schema_version is unexpected.
 */

export type CapabilityState =
  | "absent"
  | "partial"
  | "provisioned"
  | "drifted"
  | "skipped";

export interface CapabilityCell {
  declared: CapabilityState;
  detected: CapabilityState;
  drift: boolean;
  drift_reason?: string;
}

export interface ProjectDoctor {
  capabilities: Record<string, CapabilityCell>;
  drifts: string[];
  source: string | null;
}

export interface DoctorOrphans {
  code_dirs: string[];
  bot_profiles: string[];
  workspaces: string[];
  bevox_knowledge_slots: string[];
}

export interface DoctorDraft {
  branch: string;
  slug?: string;
  age_days?: number | null;
  pr_url?: string;
}

export interface DoctorReport {
  schema_version: number;
  generated_at: string;
  projects: Record<string, ProjectDoctor>;
  orphans: Partial<DoctorOrphans> & Record<string, string[]>;
  drafts_pending: DoctorDraft[];
  summary: {
    projects_scanned: number;
    projects_with_drift: number;
    total_drifts: number;
    total_orphans: number;
    drafts_pending: number;
  };
}

/**
 * Canonical capability ordering for matrix rendering.
 * Mirrors ADR-013 8-capability list.
 */
export const CAPABILITY_KEYS = [
  "code_repo",
  "knowledge_slot",
  "kanban_sprints",
  "workspace",
  "persona",
  "bot",
  "telegram_topics",
  "mission_control",
] as const;

export type CapabilityKey = (typeof CAPABILITY_KEYS)[number];

export const CAPABILITY_LABELS: Record<string, string> = {
  code_repo: "Code repo",
  knowledge_slot: "Knowledge slot",
  kanban_sprints: "Kanban / sprints",
  workspace: "Workspace",
  persona: "Persona",
  bot: "Bot",
  telegram_topics: "Telegram topics",
  mission_control: "Mission Control",
};
