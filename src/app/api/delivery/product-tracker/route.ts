import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import path from "path";
import yaml from "js-yaml";

import { BEVOX_SUBPATHS } from "@/lib/bevox/paths";
import os from "os";

export const dynamic = "force-dynamic";

/**
 * GET /api/delivery/product-tracker
 *
 * Plano E.5 — Product-module delivery projection. Reads the SAME
 * delivery-tracker.yml (BEVOX_SUBPATHS.tracker) but the top-level
 * `product_modules:` key. Module status is DERIVED from work_items
 * (not stored). Spec: 2026-04-16-e5-delivery-tracker-wave-2.md
 * (Amendment 1). ADR: 30_adr/_shared/ADR-023-product-modules-in-delivery-tracker.md
 */

interface WorkItem {
  id: string;
  status: string;
  governed_by: string[];
  evidence: string;
  blocked_by?: string;
}

interface ProductModule {
  id: string;
  name: string;
  status: string; // derived
  work_items: WorkItem[];
}

interface TrackerShape {
  product_modules?: unknown;
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

function deriveModuleStatus(items: WorkItem[]): string {
  if (items.length === 0) return "not_started";
  const s = items.map((w) => w.status);
  if (s.every((x) => x === "delivered")) return "delivered";
  if (s.some((x) => x === "in_progress")) return "in_progress";
  if (s.every((x) => x === "not_started")) return "not_started";
  if (s.every((x) => x === "blocked" || x === "not_started")) return "blocked";
  return "partial";
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

  if (!parsed || typeof parsed !== "object") {
    return NextResponse.json(
      { error: "tracker_shape_invalid", detail: "delivery-tracker.yml not an object" },
      { status: 500 },
    );
  }

  const shape = parsed as TrackerShape;
  const rawModules = Array.isArray(shape.product_modules)
    ? (shape.product_modules as unknown[])
    : [];

  const product_modules: ProductModule[] = rawModules.map((m) => {
    const mm = (m ?? {}) as Record<string, unknown>;
    const rawItems = Array.isArray(mm.work_items) ? (mm.work_items as unknown[]) : [];
    const work_items: WorkItem[] = rawItems.map((w) => {
      const ww = (w ?? {}) as Record<string, unknown>;
      const out: WorkItem = {
        id: typeof ww.id === "string" ? ww.id : "",
        status: typeof ww.status === "string" ? ww.status : "not_started",
        governed_by: Array.isArray(ww.governed_by)
          ? (ww.governed_by as unknown[]).filter((x): x is string => typeof x === "string")
          : [],
        evidence: typeof ww.evidence === "string" ? ww.evidence : "",
      };
      if (typeof ww.blocked_by === "string") out.blocked_by = ww.blocked_by;
      return out;
    });
    return {
      id: typeof mm.id === "string" ? mm.id : "",
      name: typeof mm.name === "string" ? mm.name : "",
      status: deriveModuleStatus(work_items),
      work_items,
    };
  });

  const allItems = product_modules.flatMap((m) => m.work_items);

  return NextResponse.json({
    generated_at: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    source: trackerPath,
    product_modules,
    summary: {
      total_modules: product_modules.length,
      modules_delivered: product_modules.filter((m) => m.status === "delivered").length,
      modules_partial: product_modules.filter((m) => m.status === "partial").length,
      modules_blocked: product_modules.filter((m) => m.status === "blocked").length,
      modules_not_started: product_modules.filter((m) => m.status === "not_started").length,
      total_work_items: allItems.length,
      work_items_delivered: allItems.filter((w) => w.status === "delivered").length,
      work_items_blocked: allItems.filter((w) => w.status === "blocked").length,
      work_items_not_started: allItems.filter((w) => w.status === "not_started").length,
    },
  });
}
