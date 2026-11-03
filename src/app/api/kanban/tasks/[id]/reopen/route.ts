import { NextResponse, NextRequest } from "next/server";
import { runCli, respondCli } from "@/lib/kanban/cli";
import { resolveActor } from "@/lib/kanban/auth";

export const dynamic = "force-dynamic";

const REOPEN_TARGETS = new Set(["backlog", "ready", "in_progress", "testing"]);

/**
 * POST /api/kanban/tasks/[id]/reopen
 * body: { to: "backlog"|"ready"|"in_progress"|"testing", reason: string }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_input", detail: "expected JSON body" },
      { status: 400 },
    );
  }
  const bb = (body ?? {}) as Record<string, unknown>;
  if (typeof bb.to !== "string" || !REOPEN_TARGETS.has(bb.to)) {
    return NextResponse.json(
      {
        error: "invalid_input",
        detail: `to must be one of: ${[...REOPEN_TARGETS].join(", ")}`,
      },
      { status: 400 },
    );
  }
  if (typeof bb.reason !== "string" || !bb.reason.trim()) {
    return NextResponse.json(
      { error: "invalid_input", detail: "reason is required" },
      { status: 400 },
    );
  }
  return respondCli(
    runCli(
      ["task", "reopen", id, "--to", bb.to, "--reason", bb.reason],
      resolveActor(req),
    ),
  );
}
