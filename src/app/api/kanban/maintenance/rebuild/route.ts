import { NextRequest } from "next/server";
import { runCli, respondCli } from "@/lib/kanban/cli";
import { resolveActor } from "@/lib/kanban/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/kanban/maintenance/rebuild
 * Reconstrói state.json a partir de events.jsonl. Idempotente.
 */
export async function POST(req: NextRequest) {
  return respondCli(runCli(["rebuild"], resolveActor(req)));
}
