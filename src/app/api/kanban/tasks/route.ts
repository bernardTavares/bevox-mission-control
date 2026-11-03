import { NextResponse, NextRequest } from "next/server";
import { readState, findSprint, Task } from "@/lib/kanban/stateReader";
import { runCli, respondCli } from "@/lib/kanban/cli";
import { resolveActor } from "@/lib/kanban/auth";
import {
  validatePayload,
  PAYLOAD_GATE_ERROR_CODE,
  type Payload,
} from "@/lib/kanban/payload-gate";

export const dynamic = "force-dynamic";

/**
 * GET /api/kanban/tasks?sprint=current&status=todo&project=openclaw&epic=E5&archived=false
 * Read direto de state.json.
 */
export async function GET(req: NextRequest) {
  const state = readState();
  const { searchParams } = new URL(req.url);
  const sprint = searchParams.get("sprint");
  const status = searchParams.get("status");
  const project = searchParams.get("project");
  const epic = searchParams.get("epic");
  const archived = searchParams.get("archived") === "true";

  let items: Task[] = state.tasks;

  if (sprint) {
    const sp = findSprint(state, sprint);
    if (!sp) {
      return NextResponse.json(
        { error: "sprint_not_found", detail: `sprint ${sprint} not found` },
        { status: 400 },
      );
    }
    items = items.filter((t) => t.sprint_id === sp.id);
  }

  if (status) {
    items = items.filter((t) => t.status === status);
  } else if (archived) {
    items = items.filter((t) => t.status === "archived");
  } else {
    items = items.filter((t) => t.status !== "archived");
  }

  if (project) items = items.filter((t) => t.project === project);
  if (epic) items = items.filter((t) => t.epic_id === epic);

  return NextResponse.json({ tasks: items });
}

/**
 * POST /api/kanban/tasks
 * body: { title (req), sprint?, project?, epic_id?, wave_ref?, description? }
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
  if (typeof bb.title !== "string" || bb.title.trim().length === 0) {
    return NextResponse.json(
      { error: "invalid_input", detail: "title (non-empty string) required" },
      { status: 400 },
    );
  }

  // Wave-4 gate: dispatch_payload obrigatorio com spec_ref + acceptance_criteria
  const payload = (bb.dispatch_payload ?? null) as Payload | null;
  const missing = validatePayload(payload);
  if (missing.length > 0) {
    return NextResponse.json(
      {
        error: "payload_incomplete",
        code: PAYLOAD_GATE_ERROR_CODE,
        missing,
        detail: `dispatch_payload incomplete: missing ${missing.join(", ")}`,
      },
      { status: 422 },
    );
  }

  const args = ["task", "add", bb.title.trim()];
  if (typeof bb.sprint === "string") args.push("--sprint", bb.sprint);
  if (typeof bb.project === "string" && bb.project.length > 0) args.push("--project", bb.project);
  if (typeof bb.epic_id === "string" && bb.epic_id.length > 0) args.push("--epic", bb.epic_id);
  if (typeof bb.wave_ref === "string" && bb.wave_ref.length > 0) args.push("--wave", bb.wave_ref);
  if (typeof bb.description === "string" && bb.description.length > 0) args.push("--description", bb.description);
  // Payload atomico com a criacao (wave-4 gate):
  args.push("--payload", JSON.stringify(payload));

  return respondCli(runCli(args, resolveActor(req)));
}
