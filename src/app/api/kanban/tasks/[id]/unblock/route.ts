import { NextRequest } from "next/server";
import { runCli, respondCli } from "@/lib/kanban/cli";
import { resolveActor } from "@/lib/kanban/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/kanban/tasks/[id]/unblock
 * body: {} (vazio)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return respondCli(runCli(["task", "unblock", id], resolveActor(req)));
}
