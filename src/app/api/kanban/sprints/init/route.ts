import { NextRequest } from "next/server";
import { runCli, respondCli } from "@/lib/kanban/cli";
import { resolveActor } from "@/lib/kanban/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/kanban/sprints/init
 * Idempotent bootstrap: cria sprint-1 (current) + sprint-2 (next) se ainda não existem.
 */
export async function POST(req: NextRequest) {
  return respondCli(runCli(["sprint", "init"], resolveActor(req)));
}
