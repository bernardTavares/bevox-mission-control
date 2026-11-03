/**
 * Shared CLI spawn helpers for bot routes:
 *   - kanban-tasks project edit (set/clear bot meta)
 *   - systemctl --user (stop/restart/is-active)
 */
import { spawn } from "child_process";
import * as path from "path";
import * as os from "os";

export const KANBAN_CLI =
  process.env.KANBAN_CLI_PATH ??
  path.join(os.homedir(), ".openclaw", "kanban-tasks", "cli.sh");

export interface CliResult {
  exit: number;
  stdout: string;
  stderr: string;
}

export function runCli(
  bin: string,
  args: string[],
  timeoutMs = 10_000,
): Promise<CliResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { timeout: timeoutMs });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => { stdout += d.toString(); });
    child.stderr.on("data", (d) => { stderr += d.toString(); });
    child.on("error", reject);
    child.on("close", (code) => {
      resolve({ exit: code ?? 1, stdout, stderr });
    });
  });
}

export async function setBotMeta(
  id: string,
  patch: { bot_id: string; bot_username: string; bot_port: number },
): Promise<void> {
  const r = await runCli(KANBAN_CLI, [
    "project", "edit", id,
    "--bot-id", patch.bot_id,
    "--bot-username", patch.bot_username,
    "--bot-port", String(patch.bot_port),
    "--json",
  ]);
  if (r.exit !== 0) {
    throw new Error(`project edit failed (exit ${r.exit}): ${r.stderr.trim() || r.stdout.trim()}`);
  }
}

export async function clearBotMeta(id: string): Promise<void> {
  const r = await runCli(KANBAN_CLI, [
    "project", "edit", id,
    "--bot-id", "",
    "--bot-username", "",
    "--bot-port", "",
    "--json",
  ]);
  if (r.exit !== 0) {
    throw new Error(`project edit failed (exit ${r.exit}): ${r.stderr.trim() || r.stdout.trim()}`);
  }
}

export async function systemctlUser(...args: string[]): Promise<CliResult> {
  return runCli("systemctl", ["--user", ...args], 10_000);
}

export async function isUnitActive(unit: string): Promise<"active" | "failed" | "inactive"> {
  const r = await systemctlUser("is-active", unit);
  const s = r.stdout.trim();
  if (s === "active") return "active";
  if (s === "failed") return "failed";
  return "inactive";
}
