import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";

export const dynamic = "force-dynamic";

/**
 * GET /api/hardening/state
 *
 * Returns the operational snapshot (state.json) produced by the E8/F5
 * hardening runner. Read-only. No auth beyond MC session layer.
 *
 * Reads path from process.env.HARDENING_STATE_PATH.
 *
 * - 503 if env not set in production
 * - 404 if state file missing
 * - 500 if JSON corrupt
 *
 * Spec: bevox-knowledge/35_specs/2026-04-18-e8-f5-hardening-tracker-wave-1.md
 */
export async function GET() {
  let statePath = process.env.HARDENING_STATE_PATH;

  // Dev-mode fallback — never in production
  if (!statePath) {
    if (process.env.NODE_ENV !== "production") {
      const home = process.env.HOME || "/root";
      statePath = `${home}/.openclaw/hardening/state.json`;
    } else {
      return NextResponse.json(
        { error: "hardening_not_configured", detail: "HARDENING_STATE_PATH env var not set" },
        { status: 503 },
      );
    }
  }

  if (!existsSync(statePath)) {
    return NextResponse.json(
      { error: "state_not_found", detail: `state.json not found at ${statePath}` },
      { status: 404 },
    );
  }

  try {
    const raw = readFileSync(statePath, "utf-8");
    const state = JSON.parse(raw);
    return NextResponse.json(state);
  } catch (err) {
    console.error("hardening state read error:", err);
    return NextResponse.json(
      { error: "state_corrupt", detail: "state.json could not be parsed; run `~/.openclaw/hardening/runner.py --scan`" },
      { status: 500 },
    );
  }
}
