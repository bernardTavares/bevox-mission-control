import { NextResponse, NextRequest } from "next/server";
import { runCli, respondCli } from "@/lib/kanban/cli";
import { resolveActor } from "@/lib/kanban/auth";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/kanban/sprints/[id]/project
 * body: { project: "openclaw" } ou { project: null } (clear)
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
  const args = ["sprint", "set-project", id];
  if (bb.project === null) {
    args.push("--clear");
  } else if (typeof bb.project === "string" && bb.project.length > 0) {
    args.push(bb.project);
  } else {
    return NextResponse.json(
      { error: "invalid_input", detail: "project must be string or null" },
      { status: 400 },
    );
  }
  return respondCli(runCli(args, resolveActor(req)));
}
