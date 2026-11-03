/**
 * Wave-3: espelho TS da whitelist soft definida em
 * `~/.openclaw/kanban-tasks/lib/transitions.py`. Mantida sincronizada
 * manualmente (drift coberto por smoke E2E).
 *
 * Uso: D&D guard na UI MC. Erros HTTP finais vem da CLI Python.
 */

import { STATUS_ENUM, TERMINAL, type TaskStatus } from "./statusEnum";

type CanonicalStatus = Exclude<TaskStatus, "archived">;

export const WHITELIST: Record<CanonicalStatus, readonly CanonicalStatus[]> = {
  backlog: ["ready", "in_progress", "rejected"],
  ready: ["backlog", "in_progress", "rejected"],
  in_progress: ["ready", "testing", "rejected"],
  testing: ["in_progress", "done", "rejected"],
  done: [],
  rejected: [],
};

export function isValidTransition(from: TaskStatus, to: TaskStatus): boolean {
  if (from === "archived" || to === "archived") return false;
  const dests = WHITELIST[from as CanonicalStatus];
  if (!dests) return false;
  return dests.includes(to as CanonicalStatus);
}

/**
 * Helper para a UI: pode arrastar/dropar essa transicao sem precisar de force?
 * (UI conservadora: false = mostra toast e nao faz POST.)
 */
export function canDragMove(from: TaskStatus, to: TaskStatus): boolean {
  if (from === to) return false;
  if (TERMINAL.has(from)) return false; // terminal exige reopen, nao D&D
  return isValidTransition(from, to);
}

export { STATUS_ENUM };
