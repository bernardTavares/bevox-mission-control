import { NextResponse, NextRequest } from "next/server";
import { runCli, respondCli } from "@/lib/kanban/cli";
import { resolveActor } from "@/lib/kanban/auth";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/kanban/sprints/[id]/name
 * body: { name: "Sprint 12 (follow-up)" }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
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
      { error: "invalid_input", detail: "name must be non-empty string" },
      { status: 400 },
    );
  }
  return respondCli(
    runCli(["sprint", "set-name", id, bb.name.trim()], resolveActor(req)),
  );
}
