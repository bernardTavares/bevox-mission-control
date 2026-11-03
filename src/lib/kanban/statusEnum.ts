/**
 * Wave-3: status canonico do kanban-tasks (espelho TS).
 * Whitelist + helpers vivem em `transitions.ts`.
 */

export const STATUS_ENUM = [
  "backlog",
  "ready",
  "in_progress",
  "testing",
  "done",
  "rejected",
] as const;

export type TaskStatus = (typeof STATUS_ENUM)[number] | "archived";

export const STATUS_SET = new Set<string>(STATUS_ENUM);

export const TERMINAL = new Set<TaskStatus>(["done", "rejected"]);

export const BLOCKABLE = new Set<TaskStatus>([
  "backlog",
  "ready",
  "in_progress",
  "testing",
]);

export function isTerminal(s: TaskStatus): boolean {
  return TERMINAL.has(s);
}

export function isBlockable(s: TaskStatus): boolean {
  return BLOCKABLE.has(s);
}
