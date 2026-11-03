import { NextRequest, NextResponse } from "next/server";
import { readState, type Task } from "@/lib/kanban/stateReader";

export const dynamic = "force-dynamic";

/**
 * GET /api/kanban/tasks/next-ready?project=<name>
 * Read-only. Retorna primeira task `ready` & nao-blocked do projeto,
 * ordenada por `created_at` ascendente. Sem ?project, retorna primeira
 * de qualquer projeto.
 *
 * Hook pra delivery-dispatcher-agent (nao consome / nao reserva).
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const project = url.searchParams.get("project");
  const state = readState();
  const candidates: Task[] = state.tasks.filter((t: Task) => {
    if (t.status !== "ready") return false;
    if (t.blocked) return false;
    if (project && t.project !== project) return false;
    return true;
  });
  candidates.sort((a, b) => a.created_at.localeCompare(b.created_at));
  return NextResponse.json({ task: candidates[0] ?? null });
}
