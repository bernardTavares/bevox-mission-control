import { NextRequest, NextResponse } from "next/server";
import { isCanonicalProject } from "@/lib/projects/canonical";
import { readMeta } from "@/lib/projects/meta";

export const dynamic = "force-dynamic";

/**
 * GET /api/projects/check-id?id=<slug>
 *
 * Live validation pro NewProjectModal — testa format/reserved/collision
 * sem invocar CLI (read-only meta + canonical).
 *
 * Spec: bevox-knowledge/35_specs/company-os/2026-04-26-mc-projects-factory.md
 */

const RESERVED = new Set(["_shared", "_retired", "templates"]);
const ID_RE = /^[a-z][a-z0-9-]*[a-z0-9]$/;

export async function GET(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ valid: false, reason: "format" });
  }
  if (id.length < 2 || id.length > 40 || !ID_RE.test(id)) {
    return NextResponse.json({ valid: false, reason: "format" });
  }
  if (RESERVED.has(id)) {
    return NextResponse.json({ valid: false, reason: "reserved" });
  }
  if (isCanonicalProject(id)) {
    return NextResponse.json({ valid: false, reason: "collision" });
  }
  const meta = readMeta();
  if (id in meta.projects) {
    return NextResponse.json({ valid: false, reason: "collision" });
  }
  return NextResponse.json({ valid: true });
}
