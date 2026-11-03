import { spawnSync } from "child_process";
import { NextResponse } from "next/server";
import { KANBAN_CLI } from "./paths";

/**
 * Thin wrapper around kanban-tasks CLI. All mutations go through this.
 *
 * - Always passes --json so stdout is parseable.
 * - Inserts --actor BEFORE the subcommand to avoid collision with
 *   events-tail-specific --actor-filter.
 * - Maps python exit codes to HTTP status:
 *     0 -> 200 ok
 *     1 -> 400 invalid_input
 *     2 -> 500 state_error
 *     3 -> 409 lock_contention
 */

export interface CliOk<T = unknown> {
  ok: true;
  data: T;
  httpStatus: 200;
}

export interface CliErr {
  ok: false;
  error: string;
  code: string;
  httpStatus: 400 | 409 | 500;
}

export type CliResult<T = unknown> = CliOk<T> | CliErr;

const EXIT_TO_HTTP: Record<number, 400 | 409 | 500> = {
  1: 400,
  2: 500,
  3: 409,
};

export function runCli<T = unknown>(
  subcommandArgs: string[],
  actor?: string,
): CliResult<T> {
  // Order matters for argparse with parents=[common]:
  // common flags (--json, --actor) must come AFTER the leaf subcommand
  // (e.g. 'task add'), not before it. Appending them at the end works
  // because argparse accepts optional flags in any position once the
  // leaf parser is active.
  const args = [...subcommandArgs, "--json"];
  if (actor) {
    args.push("--actor", actor);
  }

  const res = spawnSync(KANBAN_CLI, args, {
    encoding: "utf-8",
    timeout: 15000,
  });

  const stdout = (res.stdout ?? "").toString().trim();
  const stderr = (res.stderr ?? "").toString().trim();

  if (res.status === 0) {
    try {
      const parsed = stdout ? (JSON.parse(stdout) as T) : ({} as T);
      return { ok: true, data: parsed, httpStatus: 200 };
    } catch {
      return {
        ok: false,
        error: `invalid JSON from CLI: ${stdout.slice(0, 200)}`,
        code: "cli_parse_error",
        httpStatus: 500,
      };
    }
  }

  // Non-zero exit: prefer parsing the JSON error payload from stdout
  let errorMsg = stderr || stdout || "unknown CLI error";
  let code = "state_error";
  if (stdout) {
    try {
      const parsed = JSON.parse(stdout);
      if (parsed && typeof parsed === "object") {
        if (typeof parsed.error === "string") errorMsg = parsed.error;
        if (typeof parsed.code === "string") code = parsed.code;
      }
    } catch {
      // keep stderr/stdout fallback
    }
  }

  const httpStatus =
    (res.status !== null && EXIT_TO_HTTP[res.status]) || 500;

  return { ok: false, error: errorMsg, code, httpStatus };
}

/**
 * Unwrap CliResult into a NextResponse matching MC conventions:
 *   ok -> raw payload, 200
 *   err -> { error, detail }, mapped status
 */
export function respondCli<T>(r: CliResult<T>): NextResponse {
  if (r.ok) {
    return NextResponse.json(r.data ?? {});
  }
  return NextResponse.json(
    { error: r.code, detail: r.error },
    { status: r.httpStatus },
  );
}

