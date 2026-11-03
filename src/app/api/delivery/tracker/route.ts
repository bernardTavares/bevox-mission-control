import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import path from "path";
import yaml from "js-yaml";

import { BEVOX_SUBPATHS } from "@/lib/bevox/paths";
import os from "os";

export const dynamic = "force-dynamic";

/**
 * GET /api/delivery/tracker
 *
 * E5 wave 2 — Delivery tracker projection.
 *
 * Reads delivery-tracker.yml from bevox-knowledge and returns
 * structured execution status per epic/wave. Epic status is
 * DERIVED from wave statuses (not stored in YAML).
 *
 * Spec: 2026-04-16-e5-delivery-tracker-wave-2.md
 */

interface Wave {
  id: string;
  status: string;
  delivered_at?: string;
  features?: string[];
  spec?: string | null;
  reason?: string;
  blocker?: string;
}

interface Epic {
  id: string;
  name: string;
  status: string; // derived
  waves: Wave[];
}

// E5 refinement (spec 2026-04-17-e5-refinement-blockers-risks.md):
// blockers and risks as top-level siblings of epics[]. Refs in
// blocker.blocks are strings like "<epic_id>/<wave_id>" or the
// sentinel "global". No ref resolution here — stays as strings.
interface Blocker {
  id: string;
  summary: string;
  since: string;
  blocks: string[];
  status: string; // "active" | "resolved"
  notes?: string;
  unblocks_when?: string;
}

interface Risk {
  id: string;
  summary: string;
  since: string;
  severity: string; // "low" | "medium" | "high"
  status: string; // "open" | "mitigated" | "materialized"
  mitigation?: string;
  notes?: string;
}

interface TrackerShape {
  epics: Array<{ id: string; name: string; waves: Wave[] }>;
  blockers?: unknown;
  risks?: unknown;
}

// js-yaml parses unquoted YYYY-MM-DD as Date (YAML 1.1 implicit typing).
// Normalize to YYYY-MM-DD string for consistent JSON output.
function asIsoDateString(v: unknown): string {
  if (typeof v === "string") return v;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return "";
}

function resolveTrackerPath(): string | null {
  const envDir = process.env.BEVOX_KNOWLEDGE_DIR;
  if (envDir && envDir.length > 0) {
    return path.join(envDir, BEVOX_SUBPATHS.tracker);
  }
  if (process.env.NODE_ENV !== "production") {
    const home = process.env.HOME || os.homedir();
    return path.join(home, "bevox-knowledge", BEVOX_SUBPATHS.tracker);
  }
  return null;
}

function deriveEpicStatus(waves: Wave[]): string {
  if (waves.length === 0) return "not_started";
  const hasDelivered = waves.some(
    (w) => w.status === "delivered" || w.status === "partial",
  );
  const allDelivered = waves.every((w) => w.status === "delivered");
  if (allDelivered) return "delivered";
  if (hasDelivered) return "partial";
  return "not_started";
}

export async function GET() {
  const trackerPath = resolveTrackerPath();

  if (!trackerPath) {
    return NextResponse.json(
      { error: "canonical_not_configured", detail: "BEVOX_KNOWLEDGE_DIR env var not set" },
      { status: 503 },
    );
  }

  if (!existsSync(trackerPath)) {
    return NextResponse.json(
      { error: "tracker_not_found", detail: `delivery-tracker.yml not found at ${trackerPath}` },
      { status: 404 },
    );
  }

  let raw: string;
  try {
    raw = readFileSync(trackerPath, "utf-8");
  } catch (err) {
    return NextResponse.json(
      { error: "tracker_corrupt", detail: `cannot read: ${String(err)}` },
      { status: 500 },
    );
  }

  let parsed: unknown;
  try {
    parsed = yaml.load(raw);
  } catch (err) {
    return NextResponse.json(
      { error: "tracker_corrupt", detail: `yaml parse error: ${String(err)}` },
      { status: 500 },
    );
  }

  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("epics" in parsed) ||
    !Array.isArray((parsed as TrackerShape).epics)
  ) {
    return NextResponse.json(
      { error: "tracker_shape_invalid", detail: "delivery-tracker.yml missing or malformed `epics` array" },
      { status: 500 },
    );
  }

  const shape = parsed as TrackerShape;

  const epics: Epic[] = shape.epics.map((e) => {
    const waves: Wave[] = (e.waves || []).map((w) => ({
      id: w.id || "",
      status: w.status || "not_started",
      delivered_at: w.delivered_at || undefined,
      features: w.features || undefined,
      spec: w.spec || undefined,
      reason: w.reason || undefined,
      blocker: w.blocker || undefined,
    }));

    return {
      id: e.id || "",
      name: e.name || "",
      status: deriveEpicStatus(waves),
      waves,
    };
  });

  // E5 refinement: parse blockers[] and risks[] top-level keys.
  // Missing keys → empty array (non-breaking). Malformed non-array → empty too.
  // Only required fields are passed through structurally; optional fields pass
  // through only when present in the YAML.
  const blockers: Blocker[] = Array.isArray(shape.blockers)
    ? (shape.blockers as unknown[]).map((b) => {
        const bb = (b ?? {}) as Record<string, unknown>;
        const blocksArr = Array.isArray(bb.blocks) ? (bb.blocks as unknown[]) : [];
        const out: Blocker = {
          id: typeof bb.id === "string" ? bb.id : "",
          summary: typeof bb.summary === "string" ? bb.summary : "",
          since: asIsoDateString(bb.since),
          blocks: blocksArr.filter((x): x is string => typeof x === "string"),
          status: typeof bb.status === "string" ? bb.status : "",
        };
        if (typeof bb.notes === "string") out.notes = bb.notes;
        if (typeof bb.unblocks_when === "string") out.unblocks_when = bb.unblocks_when;
        return out;
      })
    : [];

  const risks: Risk[] = Array.isArray(shape.risks)
    ? (shape.risks as unknown[]).map((r) => {
        const rr = (r ?? {}) as Record<string, unknown>;
        const out: Risk = {
          id: typeof rr.id === "string" ? rr.id : "",
          summary: typeof rr.summary === "string" ? rr.summary : "",
          since: asIsoDateString(rr.since),
          severity: typeof rr.severity === "string" ? rr.severity : "",
          status: typeof rr.status === "string" ? rr.status : "",
        };
        if (typeof rr.mitigation === "string") out.mitigation = rr.mitigation;
        if (typeof rr.notes === "string") out.notes = rr.notes;
        return out;
      })
    : [];

  // Summary
  const totalEpics = epics.length;
  const epicsDelivered = epics.filter((e) => e.status === "delivered").length;
  const epicsPartial = epics.filter((e) => e.status === "partial").length;
  const epicsNotStarted = epics.filter((e) => e.status === "not_started").length;

  const allWaves = epics.flatMap((e) => e.waves);
  const wavesDelivered = allWaves.filter((w) => w.status === "delivered").length;
  const wavesParked = allWaves.filter((w) => w.status === "parked").length;
  const wavesBlocked = allWaves.filter((w) => w.status === "blocked").length;
  const wavesInProgress = allWaves.filter((w) => w.status === "in_progress").length;

  return NextResponse.json({
    generated_at: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    source: trackerPath,
    epics,
    blockers,
    risks,
    summary: {
      total_epics: totalEpics,
      epics_delivered: epicsDelivered,
      epics_partial: epicsPartial,
      epics_not_started: epicsNotStarted,
      total_waves: allWaves.length,
      waves_delivered: wavesDelivered,
      waves_in_progress: wavesInProgress,
      waves_parked: wavesParked,
      waves_blocked: wavesBlocked,
      blockers_active: blockers.filter((b) => b.status === "active").length,
      blockers_resolved: blockers.filter((b) => b.status === "resolved").length,
      risks_open: risks.filter((r) => r.status === "open").length,
      risks_mitigated: risks.filter((r) => r.status === "mitigated").length,
      risks_materialized: risks.filter((r) => r.status === "materialized").length,
    },
  });
}
