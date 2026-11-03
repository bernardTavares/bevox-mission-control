import { spawn } from "node:child_process";
import { NextResponse } from "next/server";
import os from "os";

const ID_RE = /^[a-z][a-z0-9-]*[a-z0-9]$/;

interface InitTopicsResult {
  created?: string[];
  existing?: string[];
  failed?: Array<{ topic: string; error: string }>;
  error?: string;
}

function resolveScriptPath(): string {
  return (
    process.env.INIT_TOPICS_SCRIPT
    ?? `${os.homedir()}/.openclaw/scripts/init_telegram_topics.py`
  );
}

/**
 * POST /api/projects/[id]/telegram/init-topics
 *
 * Idempotently creates the canonical Telegram forum topics
 * (clarifications, dispatcher) for the given project's bot/group.
 * Spawns ~/.openclaw/scripts/init_telegram_topics.py --slug <id>.
 *
 * Spec: bevox-knowledge/35_specs/openclaw/2026-04-28-mc-projects-factory-wave-2-vox-clone.md §3.2
 */
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await ctx.params;

  if (!id || id.length < 2 || id.length > 40 || !ID_RE.test(id)) {
    return NextResponse.json(
      { error: "invalid_id" },
      { status: 400 },
    );
  }

  const script = resolveScriptPath();

  return await new Promise<NextResponse>((resolve) => {
    const child = spawn("python3", [script, "--slug", id], {
      env: { ...process.env },
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 30_000,
    });
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
      let payload: InitTopicsResult | null = null;
      const trimmed = stdout.trim();
      if (trimmed) {
        try {
          payload = JSON.parse(trimmed) as InitTopicsResult;
        } catch {
          payload = null;
        }
      }

      if (code === 0 && payload && !payload.error) {
        resolve(NextResponse.json(payload, { status: 200 }));
        return;
      }

      // Script-side InitTopicsError → exit 2 + {"error": "..."}
      const status = code === 2 ? 400 : 500;
      const body = payload ?? {
        error: stderr.trim() || `script exit ${code}`,
      };
      resolve(NextResponse.json(body, { status }));
    });
  });
}
