import { NextResponse, NextRequest } from "next/server";
import { runCli, respondCli } from "@/lib/kanban/cli";
import { resolveActor } from "@/lib/kanban/auth";

export const dynamic = "force-dynamic";

/**
 * PUT /api/kanban/tasks/[id]/blocked-by
 * body: { preds?: string[] } | { add?: string } | { remove?: string }
 *
 * Exatamente um dos tres flags obrigatorio. Forward pro CLI
 * `task set-blocked-by`. Error code override: CYCLE_DETECTED /
 * PRED_NOT_FOUND / BLOCKED_BY_INVALID → HTTP 422 (defaults to 400 via cli.ts).
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id || !id.startsWith("T-")) {
    return NextResponse.json(
      { error: "invalid_input", detail: "task id deve ser T-NNNN" },
      { status: 400 },
    );
  }

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
  const hasPreds = Array.isArray(bb.preds);
  const hasAdd = typeof bb.add === "string";
  const hasRemove = typeof bb.remove === "string";
  const count = [hasPreds, hasAdd, hasRemove].filter(Boolean).length;
  if (count !== 1) {
    return NextResponse.json(
      {
        error: "invalid_input",
        detail: "exatamente um de preds | add | remove obrigatorio",
      },
      { status: 400 },
    );
  }

  const args = ["task", "set-blocked-by", id];
  if (hasPreds) {
    const preds = (bb.preds as unknown[]).filter(
      (p): p is string => typeof p === "string",
    );
    args.push("--preds", preds.join(","));
  } else if (hasAdd) {
    args.push("--add", bb.add as string);
  } else if (hasRemove) {
    args.push("--remove", bb.remove as string);
  }

  const result = runCli(args, resolveActor(req));

  // Override 400 → 422 para codigos wave-5 semanticamente "unprocessable entity"
  if (!result.ok) {
    const code = result.code;
    if (
      code === "CYCLE_DETECTED" ||
      code === "PRED_NOT_FOUND" ||
      code === "BLOCKED_BY_INVALID"
    ) {
      return NextResponse.json(
        { error: "blocked_by_invalid", code, detail: result.error },
        { status: 422 },
      );
    }
  }
  return respondCli(result);
}
