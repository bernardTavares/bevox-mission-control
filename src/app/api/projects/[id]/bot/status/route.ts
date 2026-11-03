/**
 * GET /api/projects/[id]/bot/status
 *
 * Spec: bevox-knowledge/35_specs/company-os/2026-04-27-mc-project-bot-connect.md §4.1
 */
import { NextResponse } from "next/server";
import { readMeta } from "@/lib/projects/meta";
import { isCanonicalProject } from "@/lib/projects/canonical";
import { readProfileStatus } from "@/lib/bot/connect";
import { isUnitActive } from "@/lib/bot/cli";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const meta = readMeta();
  const entry = meta.projects[id];
  // Accept canonical (ADR-002) even without a projects-meta.json entry —
  // it just means no bot has been connected yet. 404 only when the id is
  // neither canonical nor a user_created entry (matches detail route).
  if (!entry && !isCanonicalProject(id)) {
    return NextResponse.json(
      { error: "project_not_found" },
      { status: 404 },
    );
  }
  if (!entry?.bot_id) {
    return NextResponse.json({ connected: false });
  }
  const profile = readProfileStatus(entry.bot_id);
  const unit = `openclaw-gateway@${entry.bot_id}.service`;
  const active = await isUnitActive(unit);
  return NextResponse.json({
    connected: true,
    bot_username: entry.bot_username,
    chat_id: profile?.chat_id ?? null,
    port: entry.bot_port ?? profile?.port ?? null,
    active_state: active,
    skills: profile?.skills ?? [],
  });
}
