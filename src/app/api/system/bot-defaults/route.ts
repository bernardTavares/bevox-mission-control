/**
 * GET /api/system/bot-defaults
 *
 * Reads Vox config (~/.openclaw/openclaw.json) to provide:
 *  - default allow_from (channels.telegram.allowFrom)
 *  - available skills (plugins.installs keys)
 *
 * Spec: bevox-knowledge/35_specs/company-os/2026-04-27-mc-project-bot-connect.md §4.3
 */
import { NextResponse } from "next/server";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

export async function GET() {
  const cfgPath = path.join(
    process.env.OPENCLAW_DIR ?? path.join(os.homedir(), ".openclaw"),
    "openclaw.json",
  );
  let allowFrom: string[] = [];
  let skills: string[] = ["knowledge-sync-commands"];
  try {
    const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf-8")) as {
      channels?: { telegram?: { allowFrom?: string[] } };
      plugins?: { installs?: Record<string, unknown>; allow?: string[] };
    };
    if (Array.isArray(cfg.channels?.telegram?.allowFrom)) {
      allowFrom = cfg.channels.telegram.allowFrom.map((u) => String(u));
    }
    const installs = cfg.plugins?.installs;
    if (installs && typeof installs === "object") {
      skills = Object.keys(installs).filter((k) => k !== "anthropic");
      if (!skills.includes("knowledge-sync-commands")) {
        skills.unshift("knowledge-sync-commands");
      }
    }
  } catch {
    /* return defaults on error */
  }
  return NextResponse.json({
    vox_allow_from: allowFrom,
    available_skills: skills,
  });
}
