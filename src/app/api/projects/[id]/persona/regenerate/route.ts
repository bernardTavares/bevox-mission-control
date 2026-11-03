import { spawn } from "node:child_process";
import { NextResponse } from "next/server";
import os from "os";

const ID_RE = /^[a-z][a-z0-9-]*[a-z0-9]$/;

function resolveCliPath(): string {
  return (
    process.env.OPENCLAW_CLI
    ?? `${os.homedir()}/.openclaw/kanban-tasks/cli.sh`
  );
}

interface RegenerateResult {
  persona_status?: "generated" | "pending" | "already_generated" | "skipped_flag";
  error?: string;
}

/**
 * POST /api/projects/[id]/persona/regenerate
 *
 * Spawns `openclaw project regenerate-persona <id> --force --json`.
 * Returns the CLI's JSON ({persona_status, error?}). 360s timeout
 * (5min for claude -p subprocess + setup).
 *
 * Force re-generates even when IDENTITY.md already says
 * persona_status: generated — UI semantics is "user clicked the button,
 * so they want a fresh attempt".
 *
 * Spec: bevox-knowledge/35_specs/openclaw/2026-04-28-mc-projects-factory-wave-2-vox-clone.md §3.1 (T+5s)
 */
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await ctx.params;

  if (!id || id.length < 2 || id.length > 40 || !ID_RE.test(id)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  const cli = resolveCliPath();

  return await new Promise<NextResponse>((resolve) => {
    const child = spawn(
      cli,
      ["project", "regenerate-persona", id, "--force", "--json"],
      {
        env: { ...process.env },
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 360_000,
      },
    );
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => { stdout += d.toString(); });
    child.stderr.on("data", (d) => { stderr += d.toString(); });

    child.on("error", (err) => {
      resolve(
        NextResponse.json(
          { error: "spawn_failed", detail: err.message },
          { status: 500 },
        ),
      );
    });

    child.on("close", (code) => {
      let payload: RegenerateResult | null = null;
      const trimmed = stdout.trim();
      if (trimmed) {
        // Take last non-empty line (CLI may emit informational lines first)
        const lines = trimmed.split("\n").reverse();
        for (const line of lines) {
          const t = line.trim();
          if (t.startsWith("{")) {
            try {
              payload = JSON.parse(t) as RegenerateResult;
              break;
            } catch {
              /* keep trying */
            }
          }
        }
      }

      if (
        code === 0
        && payload
        && (payload.persona_status === "generated"
            || payload.persona_status === "already_generated")
      ) {
        resolve(NextResponse.json(payload, { status: 200 }));
        return;
      }

      const status = code === 1 ? 400 : 500;
      const body = payload ?? {
        error: stderr.trim() || `cli exit ${code}`,
      };
      resolve(NextResponse.json(body, { status }));
    });
  });
}
