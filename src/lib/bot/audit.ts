/**
 * Append-only JSONL audit log for bot connect/disconnect/restart events.
 *
 * Spec: bevox-knowledge/35_specs/company-os/2026-04-27-mc-project-bot-connect.md §11
 *
 * NEVER include token in payload. Mirror ~/.openclaw/projects-delete.jsonl pattern.
 */
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

export type BotAuditAction =
  | "bot_connected"
  | "bot_disconnected"
  | "bot_restarted"
  | "bot_connect_failed";

export interface BotAuditPayload {
  project_id: string;
  success: boolean;
  port?: number;
  error_code?: string;
  bot_username?: string;
}

export function getAuditPath(): string {
  const root = process.env.OPENCLAW_DIR ?? path.join(os.homedir(), ".openclaw");
  return path.join(root, "projects-bot.jsonl");
}

export function appendBotAudit(
  action: BotAuditAction,
  payload: BotAuditPayload,
  auditPath: string = getAuditPath(),
): void {
  // Whitelist explicit fields; never spread arbitrary input (defense-in-depth
  // against accidental token leakage if a caller ever passes it).
  const safe = {
    ts: new Date().toISOString(),
    action,
    project_id: payload.project_id,
    success: payload.success,
    port: payload.port,
    error_code: payload.error_code,
    bot_username: payload.bot_username,
  };
  const line = JSON.stringify(safe) + "\n";
  fs.mkdirSync(path.dirname(auditPath), { recursive: true });
  fs.appendFileSync(auditPath, line, { mode: 0o600 });
}
