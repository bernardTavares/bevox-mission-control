import { runCli, respondCli } from "@/lib/kanban/cli";

export const dynamic = "force-dynamic";

/**
 * GET /api/kanban/maintenance/status
 * Retorna health check do backend: invariantes (1 current + 1 next),
 * seq match state↔events, lock freshness, project.yml vs state.
 *
 * Status 500 se issues não-vazio (semantics EXIT_STATE).
 */
export async function GET() {
  return respondCli(runCli(["status"]));
}
