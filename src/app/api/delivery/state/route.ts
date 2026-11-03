import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";

export const dynamic = "force-dynamic";

/**
 * GET /api/delivery/state
 *
 * Returns the operational projection (state.json) of the E5 wave 1
 * delivery agent. Read-only. No auth beyond the MC session layer.
 *
 * Reads path from process.env.DELIVERY_STATE_PATH.
 *
 * - 503 if env not set in production
 * - 404 if state file missing
 * - 500 if JSON corrupt
 */
export async function GET() {
  let statePath = process.env.DELIVERY_STATE_PATH;

  // Dev-mode fallback — never in production
  if (!statePath) {
    if (process.env.NODE_ENV !== "production") {
      const home = process.env.HOME || "/root";
      statePath = `${home}/.openclaw/delivery/state.json`;
    } else {
      return NextResponse.json(
        { error: "delivery_not_configured", detail: "DELIVERY_STATE_PATH env var not set" },
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
    console.error("delivery state read error:", err);
    return NextResponse.json(
      { error: "state_corrupt", detail: "state.json could not be parsed; run `openclaw-delivery rebuild-state`" },
      { status: 500 },
    );
  }
}
