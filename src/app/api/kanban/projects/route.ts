import { NextResponse, NextRequest } from "next/server";
import { readState } from "@/lib/kanban/stateReader";
import { runCli, respondCli } from "@/lib/kanban/cli";
import { resolveActor } from "@/lib/kanban/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/kanban/projects — lista de projects.yml (via state.json snapshot).
 */
export async function GET() {
  return NextResponse.json({ projects: readState().projects });
}

/**
 * POST /api/kanban/projects
 * body: { name: "bevox-api" }
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
  if (typeof bb.name !== "string" || bb.name.trim().length === 0) {
    return NextResponse.json(
      { error: "invalid_input", detail: "name (non-empty string) required" },
      { status: 400 },
    );
  }
  return respondCli(
    runCli(["project", "add", bb.name.trim()], resolveActor(req)),
  );
}
