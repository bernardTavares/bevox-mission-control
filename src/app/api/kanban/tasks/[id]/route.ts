import { NextResponse, NextRequest } from "next/server";
import { readState } from "@/lib/kanban/stateReader";
import { runCli, respondCli } from "@/lib/kanban/cli";
import { resolveActor } from "@/lib/kanban/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/kanban/tasks/[id]
 * Read direto de state.json.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const state = readState();
  const t = state.tasks.find((x) => x.id === id);
  if (!t) {
    return NextResponse.json(
      { error: "task_not_found", detail: `task ${id} not found` },
      { status: 404 },
    );
  }
  return NextResponse.json({ task: t });
}

/**
 * PATCH /api/kanban/tasks/[id]
 * body: { title?, description?, project?, epic_id?, wave_ref? }
 * project === null => clear project
 */
export async function PATCH(
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
  const args = ["task", "update", id];
  if (typeof bb.title === "string") args.push("--title", bb.title);
  if (typeof bb.description === "string") args.push("--description", bb.description);
  if (bb.project === null) {
    args.push("--clear-project");
  } else if (typeof bb.project === "string" && bb.project.length > 0) {
    args.push("--project", bb.project);
  }
  if (typeof bb.epic_id === "string") args.push("--epic", bb.epic_id);
  if (typeof bb.wave_ref === "string") args.push("--wave", bb.wave_ref);

  if (args.length === 3) {
    return NextResponse.json(
      { error: "invalid_input", detail: "no mutable fields provided" },
      { status: 400 },
    );
  }

  return respondCli(runCli(args, resolveActor(req)));
}
