import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import os from "os";

export const dynamic = "force-dynamic";

/**
 * GET /api/finance/state
 *
 * Returns the runway snapshot (state.json) produced by the E11 wave 1
 * finance runner. Read-only. No auth beyond MC session layer.
 *
 * Reads path from process.env.FINANCE_STATE_PATH.
 *
 * - 503 if env not set in production
 * - 404 if state file missing
 * - 500 if JSON corrupt
 */
export async function GET() {
  let statePath = process.env.FINANCE_STATE_PATH;

  // Dev-mode fallback — never in production
  if (!statePath) {
    if (process.env.NODE_ENV !== "production") {
      const home = process.env.HOME || os.homedir();
      statePath = `${home}/.openclaw/finance/state.json`;
    } else {
      return NextResponse.json(
        {
          error: "finance_not_configured",
          detail: "FINANCE_STATE_PATH env var not set",
        },
        { status: 503 },
      );
    }
  }

  if (!existsSync(statePath)) {
    return NextResponse.json(
      {
        error: "state_not_found",
        detail: `state.json not found at ${statePath}`,
      },
      { status: 404 },
    );
  }

  try {
    const raw = readFileSync(statePath, "utf-8");
    const state = JSON.parse(raw);
    return NextResponse.json(state);
  } catch (err) {
    console.error("finance state read error:", err);
    return NextResponse.json(
      {
        error: "state_corrupt",
        detail: "state.json could not be parsed; run runner.py --build",
      },
      { status: 500 },
    );
  }
}
