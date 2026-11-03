import { NextResponse, NextRequest } from "next/server";
import { runCli, respondCli } from "@/lib/kanban/cli";

export const dynamic = "force-dynamic";

/**
 * GET /api/kanban/events/[seq]
 * Retorna evento específico por seq.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ seq: string }> },
) {
  const { seq } = await params;
  const n = parseInt(seq, 10);
  if (Number.isNaN(n) || n <= 0) {
    return NextResponse.json(
      { error: "invalid_input", detail: "seq must be positive integer" },
      { status: 400 },
    );
  }
  return respondCli(runCli(["events", "show", String(n)]));
}
