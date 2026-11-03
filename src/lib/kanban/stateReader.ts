import { readFileSync, existsSync } from "fs";
import { KANBAN_STATE } from "./paths";
import type { TaskStatus } from "./statusEnum";

/**
 * Reads state.json directly (no subprocess) for GET endpoints.
 * Schema matches lib/store.py _empty_state() + mutations.
 */

export type SprintState = "current" | "next" | "closed";
export type { TaskStatus };

export interface Sprint {
  id: string;
  name: string;
  state: SprintState;
  project: string | null;
  created_at: string;
  closed_at: string | null;
  created_by: string;
}

/**
 * dispatch_payload shape consumed by agents (vox, tester, etc.).
 * Wave-3 introduced spec_ref + acceptance_criteria; wave-5 adds blocked_by.
 * Campos sao todos opcionais porque o payload evolui feature-a-feature;
 * consumidores devem defender com narrowing/validacao.
 */
export interface DispatchPayload {
  spec_ref?: string | string[];
  acceptance_criteria?: string[];
  blocked_by?: string[];
  [key: string]: unknown;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  sprint_id: string;
  project: string | null;
  epic_id: string | null;
  wave_ref: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
  archived_at: string | null;
  // Wave-3 fields (populados pelo rebuild; opcional no tipo pra back-compat
  // com states pre-bump que ainda nao foram rebuildados):
  blocked?: boolean;
  blocked_reason?: string | null;
  blocked_at?: string | null;
  rejected_reason?: string | null;
  dispatch_payload?: DispatchPayload | null;
  test_result?: unknown | null;
}

export interface State {
  schema_version: number;
  generated_at: string;
  last_event_seq: number;
  projects: string[];
  sprints: Sprint[];
  tasks: Task[];
}

export function emptyState(): State {
  return {
    schema_version: 1,
    generated_at: "",
    last_event_seq: 0,
    projects: [],
    sprints: [],
    tasks: [],
  };
}

export function readState(): State {
  if (!existsSync(KANBAN_STATE)) {
    return emptyState();
  }
  try {
    const raw = readFileSync(KANBAN_STATE, "utf-8");
    return JSON.parse(raw) as State;
  } catch {
    return emptyState();
  }
}

/** Resolve id alias 'current'/'next' or literal sprint-N. */
export function findSprint(state: State, id: string): Sprint | undefined {
  if (id === "current" || id === "next") {
    return state.sprints.find((s) => s.state === id);
  }
  return state.sprints.find((s) => s.id === id);
}
