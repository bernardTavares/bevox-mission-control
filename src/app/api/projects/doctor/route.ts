import { spawn } from "node:child_process";
import { NextResponse } from "next/server";
import type { DoctorReport } from "@/lib/projects/doctor-types";
import os from "os";

/**
 * GET /api/projects/doctor
 *
 * Spawns `openclaw project doctor --json` (or fallback to
 * ~/.openclaw/kanban-tasks/cli.sh project doctor --json) and returns the
 * parsed drift report.
 *
 * Spec: bevox-knowledge/35_specs/openclaw/2026-05-08-project-lifecycle-w6-v1.md §API
 *
 * Query string flags (all optional, default off):
 *   - skipKnowledge=1 → adds --skip-knowledge (no fetch origin/main)
 *   - skipRemote=1    → adds --skip-remote
 *   - skipOrphans=1   → adds --skip-orphans
 *
 * Errors:
 *   - 500 spawn_failed      — bin not found / process error
 *   - 504 timeout           — subprocess exceeded TIMEOUT_MS
 *   - 500 parse_failed      — stdout was not valid JSON
 *   - 500 doctor_failed     — exit non-zero
 */

const TIMEOUT_MS = 30_000;

function resolveDoctorBin(): { cmd: string; baseArgs: string[] } {
  if (process.env.OPENCLAW_DOCTOR_BIN) {
    return { cmd: process.env.OPENCLAW_DOCTOR_BIN, baseArgs: ["project", "doctor"] };
  }
  // Default to the kanban-tasks CLI which is the canonical entrypoint
  // installed under ~/.openclaw (per memory `reference_openclaw_repo.md`).
  return {
    cmd: process.env.HOME
      ? `${process.env.HOME}/.openclaw/kanban-tasks/cli.sh`
      : `${os.homedir()}/.openclaw/kanban-tasks/cli.sh`,
    baseArgs: ["project", "doctor"],
  };
}

export async function GET(req: Request): Promise<NextResponse> {
  const url = new URL(req.url);
  const skipKnowledge = url.searchParams.get("skipKnowledge") === "1";
  const skipRemote = url.searchParams.get("skipRemote") === "1";
  const skipOrphans = url.searchParams.get("skipOrphans") === "1";

  const { cmd, baseArgs } = resolveDoctorBin();
  const args = [...baseArgs, "--json"];
  if (skipKnowledge) args.push("--skip-knowledge");
  if (skipRemote) args.push("--skip-remote");
  if (skipOrphans) args.push("--skip-orphans");

  return await new Promise<NextResponse>((resolve) => {
    let timedOut = false;
    let child: ReturnType<typeof spawn>;
    try {
      child = spawn(cmd, args, {
        env: { ...process.env },
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (err) {
      resolve(
        NextResponse.json(
          {
            error: "spawn_failed",
            detail: err instanceof Error ? err.message : String(err),
          },
          { status: 500 },
        ),
      );
      return;
    }

    let stdout = "";
    let stderr = "";

    const timer = setTimeout(() => {
      timedOut = true;
      try {
        child.kill("SIGTERM");
      } catch {
        // ignore — child already gone
      }
    }, TIMEOUT_MS);

    child.stdout?.on("data", (d) => {
      stdout += d.toString();
    });
    child.stderr?.on("data", (d) => {
      stderr += d.toString();
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      resolve(
        NextResponse.json(
          { error: "spawn_failed", detail: err.message, cmd },
          { status: 500 },
        ),
      );
    });

    child.on("close", (code) => {
      clearTimeout(timer);

      if (timedOut) {
        resolve(
          NextResponse.json(
            { error: "timeout", detail: `doctor exceeded ${TIMEOUT_MS}ms`, cmd },
            { status: 504 },
          ),
        );
        return;
      }

      if (code !== 0) {
        resolve(
          NextResponse.json(
            {
              error: "doctor_failed",
              detail: stderr.trim() || `exit ${code}`,
              cmd,
              exitCode: code,
            },
            { status: 500 },
          ),
        );
        return;
      }

      const trimmed = stdout.trim();
      if (!trimmed) {
        resolve(
          NextResponse.json(
            { error: "empty_output", detail: stderr.trim() || "no stdout" },
            { status: 500 },
          ),
        );
        return;
      }

      try {
        const parsed = JSON.parse(trimmed) as DoctorReport;
        resolve(NextResponse.json(parsed, { status: 200 }));
      } catch (err) {
        resolve(
          NextResponse.json(
            {
              error: "parse_failed",
              detail: err instanceof Error ? err.message : String(err),
              raw: trimmed.slice(0, 500),
            },
            { status: 500 },
          ),
        );
      }
    });
  });
}
