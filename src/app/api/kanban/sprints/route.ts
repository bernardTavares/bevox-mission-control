import { NextResponse } from "next/server";
import { readState } from "@/lib/kanban/stateReader";

export const dynamic = "force-dynamic";

/**
 * GET /api/kanban/sprints
 * Lista todos os sprints (current, next, closed...). Read direto de state.json.
 * Spec: 2026-04-17-e5-f4-sprint-planning-wave-1.md §5.1
 */
export async function GET() {
  const state = readState();
  return NextResponse.json({ sprints: state.sprints });
}
