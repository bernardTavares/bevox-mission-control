import { NextResponse, NextRequest } from "next/server";
import { runCli, respondCli } from "@/lib/kanban/cli";
import { resolveActor } from "@/lib/kanban/auth";

export const dynamic = "force-dynamic";

type CarryoverAction = "move_current" | "move_next" | "archive";

interface CarryoverEntry {
  task_id: string;
  action: CarryoverAction;
}

/**
 * POST /api/kanban/sprints/close
 * body:
 *   {
 *     project: string,                          // schema v4: per-project required
 *     carryover: [{ task_id, action }, ...]    // UI envia decisões individuais
 *   }
 *   OU
 *   { project: string, non_interactive: true } // fallback: tudo move_current
 */
export async function POST(req: NextRequest) {
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

  if (typeof bb.project !== "string" || !bb.project) {
    return NextResponse.json(
      { error: "invalid_input", detail: "body must include `project` (schema v4 requires per-project close)" },
      { status: 400 },
    );
  }

  const args = ["sprint", "close-current", "--project", bb.project];

  if (bb.non_interactive === true) {
    args.push("--non-interactive");
  } else if (Array.isArray(bb.carryover)) {
    const carryover = bb.carryover as unknown[];
    const valid: CarryoverEntry[] = [];
    for (const item of carryover) {
      const ii = (item ?? {}) as Record<string, unknown>;
      if (
        typeof ii.task_id !== "string" ||
        typeof ii.action !== "string" ||
        !["move_current", "move_next", "archive"].includes(ii.action)
      ) {
        return NextResponse.json(
          { error: "invalid_input", detail: `malformed carryover entry: ${JSON.stringify(item)}` },
          { status: 400 },
        );
      }
      valid.push({ task_id: ii.task_id, action: ii.action as CarryoverAction });
    }
    args.push("--carryover", JSON.stringify(valid));
  } else {
    return NextResponse.json(
      { error: "invalid_input", detail: "body must contain `carryover` array or `non_interactive: true`" },
      { status: 400 },
    );
  }

  return respondCli(runCli(args, resolveActor(req)));
}
