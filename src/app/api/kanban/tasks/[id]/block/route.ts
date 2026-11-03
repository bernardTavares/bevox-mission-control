import { NextResponse, NextRequest } from "next/server";
import { runCli, respondCli } from "@/lib/kanban/cli";
import { resolveActor } from "@/lib/kanban/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/kanban/tasks/[id]/block
 * body: { reason: string }
 */
export async function POST(
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
  if (typeof bb.reason !== "string" || !bb.reason.trim()) {
    return NextResponse.json(
      { error: "invalid_input", detail: "reason is required (non-empty string)" },
      { status: 400 },
    );
  }
  return respondCli(
    runCli(["task", "block", id, "--reason", bb.reason], resolveActor(req)),
  );
}
