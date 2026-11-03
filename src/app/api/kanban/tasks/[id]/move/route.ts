import { NextResponse, NextRequest } from "next/server";
import { runCli, respondCli } from "@/lib/kanban/cli";
import { resolveActor } from "@/lib/kanban/auth";
import { STATUS_SET } from "@/lib/kanban/statusEnum";

export const dynamic = "force-dynamic";

/**
 * POST /api/kanban/tasks/[id]/move
 * body: {
 *   status: "backlog" | "ready" | "in_progress" | "testing" | "done" | "rejected",
 *   force?: boolean,
 *   reason?: string
 * }
 * Uso archive/unarchive para virar ou sair de 'archived'.
 * Use POST .../reopen para reabrir done/rejected.
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
  if (typeof bb.status !== "string" || !STATUS_SET.has(bb.status)) {
    return NextResponse.json(
      {
        error: "invalid_input",
        detail: `status must be one of: ${[...STATUS_SET].join(", ")}`,
      },
      { status: 400 },
    );
  }
  const args = ["task", "move", id, bb.status];
  if (bb.force === true) args.push("--force");
  if (typeof bb.reason === "string" && bb.reason.trim()) {
    args.push("--reason", bb.reason);
  }
  return respondCli(runCli(args, resolveActor(req)));
}
