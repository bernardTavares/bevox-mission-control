import { NextResponse, NextRequest } from "next/server";
import { runCli, respondCli } from "@/lib/kanban/cli";
import { resolveActor } from "@/lib/kanban/auth";

export const dynamic = "force-dynamic";

const VALID_STATUS = new Set(["backlog", "todo", "in_progress", "done"]);

/**
 * POST /api/kanban/tasks/[id]/unarchive
 * body: { status? }  default "backlog"
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: Record<string, unknown> = {};
  try {
    const parsed = await req.json();
    if (parsed && typeof parsed === "object") body = parsed as Record<string, unknown>;
  } catch {
    // empty body is OK
  }
  const args = ["task", "unarchive", id];
  if (body.status !== undefined) {
    if (typeof body.status !== "string" || !VALID_STATUS.has(body.status)) {
      return NextResponse.json(
        { error: "invalid_input", detail: `status must be one of: ${[...VALID_STATUS].join(", ")}` },
        { status: 400 },
      );
    }
    args.push("--status", body.status);
  }
  return respondCli(runCli(args, resolveActor(req)));
}
