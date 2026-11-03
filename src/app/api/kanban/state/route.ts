import { NextResponse } from "next/server";
import { readState } from "@/lib/kanban/stateReader";

export const dynamic = "force-dynamic";

/**
 * GET /api/kanban/state
 *
 * Returns full kanban state needed by cross-project surfaces (e.g. /sprints).
 * Single fetch instead of multiple round-trips to /sprints + /tasks.
 * `currentSprintByProject` is a computed convenience for the UI.
 *
 * Response shape:
 *   {
 *     schema_version: number,
 *     projects: string[],
 *     currentSprintByProject: Record<string, string>,  // project → current sprint id
 *     sprints: Sprint[],
 *     tasks: Task[],   // includes archived
 *   }
 *
 * Spec: bevox-knowledge/35_specs/openclaw/2026-04-25-sprint-per-project.md §4.2
 *       bevox-knowledge/35_specs/company-os/2026-04-25-mc-sprints-page.md §4.1
 */
export async function GET() {
  const state = readState();

  const currentSprintByProject: Record<string, string> = {};
  for (const sp of state.sprints) {
    if (sp.state === "current" && sp.project) {
      currentSprintByProject[sp.project] = sp.id;
    }
  }

  return NextResponse.json({
    schema_version: state.schema_version,
    projects: state.projects,
    currentSprintByProject,
    sprints: state.sprints,
    tasks: state.tasks,
  });
}
