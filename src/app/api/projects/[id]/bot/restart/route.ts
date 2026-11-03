/**
 * POST /api/projects/[id]/bot/restart
 *
 * Spec: bevox-knowledge/35_specs/company-os/2026-04-27-mc-project-bot-connect.md §4.1
 */
import { NextResponse } from "next/server";
import { readMeta } from "@/lib/projects/meta";
import { systemctlUser, isUnitActive } from "@/lib/bot/cli";
import { appendBotAudit } from "@/lib/bot/audit";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const meta = readMeta();
  const entry = meta.projects[id];
  if (!entry) {
    return NextResponse.json(
      { error: "project_not_found" },
      { status: 404 },
    );
  }
  if (!entry.bot_id) {
    return NextResponse.json(
      { error: "bot_not_connected" },
      { status: 409 },
    );
  }
  const unit = `openclaw-gateway@${entry.bot_id}.service`;
  const r = await systemctlUser("restart", unit);
  if (r.exit !== 0) {
    return NextResponse.json(
      { error: "systemctl_failed", detail: r.stderr.trim() || `exit ${r.exit}` },
      { status: 500 },
    );
  }
  const active = await isUnitActive(unit);
  appendBotAudit("bot_restarted", {
    project_id: id, success: active === "active",
  });
  return NextResponse.json({
    success: true,
    active_state: active,
  });
}
