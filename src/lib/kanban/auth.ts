import { NextRequest } from "next/server";

/**
 * Resolve actor identity for kanban mutations.
 *
 * - If `X-Agent-Identity: vox` (or another known agent name) is present,
 *   the request comes from a Hub-dispatch agent -> use that identity.
 * - Otherwise, fall back to "bernard" (the human operator).
 *
 * Cf-Access (bevox auth.ts) already guarded /api/kanban at the edge for
 * human access; we don't re-derive the email here — for audit purposes,
 * "bernard" is sufficient for the single-operator model. If multi-user
 * lands later, extract email from cf-access-authenticated-user-email.
 */

const KNOWN_AGENTS = new Set(["vox"]);

export function resolveActor(req: NextRequest): string {
  const agent = req.headers.get("x-agent-identity");
  if (agent && KNOWN_AGENTS.has(agent.trim().toLowerCase())) {
    return agent.trim().toLowerCase();
  }
  return "bernard";
}
