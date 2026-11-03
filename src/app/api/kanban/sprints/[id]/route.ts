import { NextResponse, NextRequest } from "next/server";
import { readState, findSprint } from "@/lib/kanban/stateReader";

export const dynamic = "force-dynamic";

/**
 * GET /api/kanban/sprints/[id]
 * id aceita "current", "next", ou sprint-N literal.
 * Retorna { sprint, tasks } (tasks filtered por sprint_id).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const state = readState();
  const sp = findSprint(state, id);
  if (!sp) {
    return NextResponse.json(
      { error: "sprint_not_found", detail: `sprint ${id} not found` },
      { status: 404 },
    );
  }
  const tasks = state.tasks.filter((t) => t.sprint_id === sp.id);
  return NextResponse.json({ sprint: sp, tasks });
}
