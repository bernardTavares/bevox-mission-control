import { NextResponse, NextRequest } from "next/server";
import { readState } from "@/lib/kanban/stateReader";
import { runCli, respondCli } from "@/lib/kanban/cli";
import { resolveActor } from "@/lib/kanban/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/kanban/tasks/[id]/resprint
 * body: { sprint: "current" | "next" | "sprint-N" }
 *
 * Derives task.project from state before calling CLI so that "current"/"next"
 * aliases resolve against the correct project's sprint in v4 schema.
 * Sprint-project resolution happens in the CLI (task.move_sprint already
 * reads task.project internally); this route surfaces 404 early if the task
 * is missing and records the project derivation for observability.
 *
 * Spec: bevox-knowledge/35_specs/openclaw/2026-04-25-sprint-per-project.md §4.2
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
  if (typeof bb.sprint !== "string" || bb.sprint.length === 0) {
    return NextResponse.json(
      { error: "invalid_input", detail: "sprint (string) required" },
      { status: 400 },
    );
  }

  // Derive project from state for early 404 + v4 alias resolution context.
  const state = readState();
  const task = state.tasks.find((t) => t.id === id);
  if (!task) {
    return NextResponse.json(
      { error: "task_not_found", detail: `task ${id} not found` },
      { status: 404 },
    );
  }

  // CLI resolves sprint alias per task.project internally (v4-aware).
  return respondCli(
    runCli(["task", "resprint", id, bb.sprint], resolveActor(req)),
  );
}
