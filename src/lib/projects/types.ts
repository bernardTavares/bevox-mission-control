/**
 * Shared types for /projects page (E2/F-projects-dashboard W1).
 *
 * Spec: bevox-knowledge/35_specs/company-os/2026-04-24-e2-projects-dashboard-w1.md
 */

export type Dot = "ok" | "partial" | "missing";

export interface ProjectHealth {
  bot: Dot;
  workspace: Dot;
  kanban: Dot;
  knowledge: Dot;
}

export interface ProjectCounts {
  sprints_active: number;
  tasks_in_progress: number;
}

export interface ProjectSummary {
  id: string;
  name: string;
  description: string;
  health: ProjectHealth;
  counts: ProjectCounts;
  is_canonical: boolean;
  github_url: string | null;
  bot_id: string | null;
  created_at: string | null;
}

/** Sprint shape from kanban state.json. */
export interface Sprint {
  id: string;
  name: string;
  state: "current" | "next" | "closed" | string;
  project: string | null;
  created_at: string;
  closed_at: string | null;
  created_by?: string;
}

/** Task shape (subset relevant to /projects UI). */
export interface Task {
  id: string;
  title: string;
  status: string;
  project: string | null;
  sprint_id: string | null;
  blocked: boolean;
  blocked_reason?: string | null;
  updated_at: string;
}

export interface HealthDetails {
  bot: {
    present: boolean;
    envPath: string | null;
    systemdService: string | null;
  };
  workspace: {
    present: boolean;
    dir: string | null;
    files: string[];
  };
  kanban: {
    present: boolean;
    tasks_total: number;
  };
  knowledge: {
    present: boolean;
    specsCount: number;
  };
}

export interface ProjectLinks {
  telegram_bot_env: string | null;
  workspace_dir: string | null;
  knowledge_specs_dir: string | null;
  kanban_filter_url: string;
}

export interface ProjectDetail extends ProjectSummary {
  health_details: HealthDetails;
  links: ProjectLinks;
  sprints: {
    active: Sprint[];
    closed: Sprint[];
  };
  tasks_in_flight: Task[];
  /** True when ~/.openclaw/workspace-<id>/PERSONA_PENDING.md exists. */
  persona_pending: boolean;
}
