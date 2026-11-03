import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import os from "os";

export const dynamic = "force-dynamic";

/**
 * GET /api/cost-alerts/state
 *
 * Returns the cost alert state (state.json) produced by the E9 wave 2
 * alert runner. Read-only. No auth beyond MC session layer.
 *
 * Reads path from process.env.COST_ALERTS_STATE_PATH.
 *
 * - 503 if env not set in production
 * - 404 if state file missing
 * - 500 if JSON corrupt
 */
export async function GET() {
  let statePath = process.env.COST_ALERTS_STATE_PATH;

  // Dev-mode fallback — never in production
  if (!statePath) {
    if (process.env.NODE_ENV !== "production") {
      const home = process.env.HOME || os.homedir();
      statePath = `${home}/.openclaw/cost/cost-alerts-state.json`;
    } else {
      return NextResponse.json(
        {
          error: "cost_alerts_not_configured",
          detail: "COST_ALERTS_STATE_PATH env var not set",
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
    console.error("cost alerts state read error:", err);
    return NextResponse.json(
      {
        error: "state_corrupt",
        detail: "state.json could not be parsed; run alert-runner.py --build",
      },
      { status: 500 },
    );
  }
}
