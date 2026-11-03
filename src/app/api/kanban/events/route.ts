import { NextRequest } from "next/server";
import { runCli, respondCli } from "@/lib/kanban/cli";

export const dynamic = "force-dynamic";

/**
 * GET /api/kanban/events?n=20&since=<iso>&actor=<a>&type=<t>&task=<id>&sprint=<id>
 * (Note: query param `actor` maps to CLI --actor-filter.)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const args = ["events", "tail"];
  const n = searchParams.get("n");
  if (n) args.push("--n", n);
  const since = searchParams.get("since");
  if (since) args.push("--since", since);
  const actor = searchParams.get("actor");
  if (actor) args.push("--actor-filter", actor);
  const type = searchParams.get("type");
  if (type) args.push("--type", type);
  const task = searchParams.get("task");
  if (task) args.push("--task", task);
  const sprint = searchParams.get("sprint");
  if (sprint) args.push("--sprint", sprint);
  return respondCli(runCli(args));
}
