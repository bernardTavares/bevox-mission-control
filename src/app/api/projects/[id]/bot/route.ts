/**
 * DELETE /api/projects/[id]/bot — soft disconnect
 *
 * Spec: bevox-knowledge/35_specs/company-os/2026-04-27-mc-project-bot-connect.md §4.1
 */
import { NextResponse } from "next/server";
import * as os from "os";
import * as path from "path";
import { readMeta } from "@/lib/projects/meta";
import { systemctlUser, clearBotMeta } from "@/lib/bot/cli";
import { appendBotAudit } from "@/lib/bot/audit";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const meta = readMeta();
  const entry = meta.projects[id];
  if (!entry) {
    return NextResponse.json(
      { error: "project_not_found", detail: `${id} not in projects-meta.json` },
      { status: 404 },
    );
  }
  if (!entry.bot_id) {
    return NextResponse.json(
      { error: "bot_not_connected", detail: `${id} has no bot_id` },
      { status: 409 },
    );
  }

  const unit = `openclaw-gateway@${entry.bot_id}.service`;
  // Stop + disable (idempotent: ignore exit codes — both no-op if already stopped)
  await systemctlUser("stop", unit);
  await systemctlUser("disable", unit);

  // Clear bot fields in meta
  try {
    await clearBotMeta(id);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    appendBotAudit("bot_connect_failed", {
      project_id: id, success: false, error_code: "meta_update_failed",
    });
    return NextResponse.json(
      { error: "meta_update_failed", detail: msg },
      { status: 500 },
    );
  }

  appendBotAudit("bot_disconnected", { project_id: id, success: true });

  return NextResponse.json({
    success: true,
    kept_profile_dir: path.join(os.homedir(), `.openclaw-${entry.bot_id}`),
  });
}
