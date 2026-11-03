/**
 * POST /api/projects/[id]/bot/connect
 *
 * Spec: bevox-knowledge/35_specs/company-os/2026-04-27-mc-project-bot-connect.md §4.1
 */
import { NextResponse } from "next/server";
import { readMeta } from "@/lib/projects/meta";
import {
  validateToken,
  telegramGetMe,
  pickFreePort,
  runBootstrap,
  BotConnectError,
} from "@/lib/bot/connect";
import { setBotMeta } from "@/lib/bot/cli";
import { appendBotAudit } from "@/lib/bot/audit";

interface ConnectBody {
  token?: unknown;
  chat_id?: unknown;
  allow_from?: unknown;
  skills?: unknown;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let body: ConnectBody;
  try {
    body = (await req.json()) as ConnectBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  // Validate body
  if (typeof body.token !== "string" || !validateToken(body.token)) {
    return NextResponse.json(
      { error: "invalid_token", detail: "token must match \\d+:[A-Za-z0-9_-]{30,}" },
      { status: 400 },
    );
  }
  const chatIdRaw = body.chat_id;
  const chatId =
    typeof chatIdRaw === "number"
      ? chatIdRaw
      : typeof chatIdRaw === "string" && /^-?\d+$/.test(chatIdRaw.trim())
        ? Number(chatIdRaw.trim())
        : NaN;
  if (!Number.isFinite(chatId)) {
    return NextResponse.json(
      { error: "invalid_chat_id", detail: "chat_id must be integer" },
      { status: 400 },
    );
  }
  if (!Array.isArray(body.allow_from) || body.allow_from.length === 0) {
    return NextResponse.json(
      { error: "invalid_allow_from", detail: "allow_from must be non-empty array of user_id strings" },
      { status: 400 },
    );
  }
  const allowFrom = body.allow_from.map((u) => String(u).trim()).filter(Boolean);
  if (!allowFrom.every((u) => /^\d+$/.test(u))) {
    return NextResponse.json(
      { error: "invalid_allow_from", detail: "user_ids must be numeric" },
      { status: 400 },
    );
  }
  if (!Array.isArray(body.skills) || body.skills.length === 0) {
    return NextResponse.json(
      { error: "skills_required" },
      { status: 400 },
    );
  }
  const skills = body.skills.map((s) => String(s));

  // Pre-flight: project exists + not yet connected
  const meta = readMeta();
  const entry = meta.projects[id];
  if (!entry) {
    return NextResponse.json(
      { error: "project_not_found", detail: `${id} not in projects-meta.json` },
      { status: 404 },
    );
  }
  if (entry.bot_id) {
    return NextResponse.json(
      { error: "bot_already_connected", detail: `${id} already has bot_id=${entry.bot_id}` },
      { status: 409 },
    );
  }

  // Validate token via Telegram getMe (5s timeout)
  let username: string;
  try {
    const r = await telegramGetMe(body.token);
    username = r.username;
  } catch (e) {
    const err = e as BotConnectError;
    appendBotAudit("bot_connect_failed", {
      project_id: id, success: false, error_code: err.code,
    });
    return NextResponse.json(
      { error: err.code, detail: err.message },
      { status: 502 },
    );
  }

  // Pick port
  let port: number;
  try {
    port = pickFreePort();
  } catch (e) {
    const err = e as BotConnectError;
    return NextResponse.json(
      { error: err.code, detail: err.message },
      { status: 500 },
    );
  }

  // Spawn bootstrap script
  try {
    const r = await runBootstrap({
      area: id,
      port,
      token: body.token,
      chatId,
      allowFrom,
      skills,
    });
    // Update meta atomically via CLI
    await setBotMeta(id, {
      bot_id: id,
      bot_username: username,
      bot_port: r.port,
    });
    appendBotAudit("bot_connected", {
      project_id: id, success: true, port: r.port, bot_username: username,
    });
    return NextResponse.json({
      success: true,
      bot_id: id,
      bot_username: username,
      port: r.port,
      systemd_unit: r.systemd_unit,
      profile_dir: r.profile_dir,
    });
  } catch (e) {
    const code = (e as BotConnectError).code ?? "bootstrap_failed";
    const msg = e instanceof Error ? e.message : String(e);
    const stderr = (e as BotConnectError).stderr;
    appendBotAudit("bot_connect_failed", {
      project_id: id, success: false, error_code: code,
    });
    return NextResponse.json(
      { error: code, detail: msg, stderr: stderr ? stderr.slice(0, 1000) : undefined },
      { status: 500 },
    );
  }
}
