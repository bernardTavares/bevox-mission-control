import { NextResponse } from "next/server";
import {
  findLatestFile,
  KnowledgeError,
  listProjectFolderFiles,
  readProjectFile,
} from "@/lib/projects/knowledge";

export const dynamic = "force-dynamic";

/**
 * GET /api/projects/<id>/prd
 *
 * Lists all PRD files for the project + returns content of latest.
 *
 * Spec: bevox-knowledge/35_specs/company-os/2026-04-25-mc-projects-redesign.md §4.2
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const files = listProjectFolderFiles(id, "10_prd");
    const latestEntry = findLatestFile(id, "10_prd");
    if (!latestEntry) {
      return NextResponse.json({ files: [], latest: null });
    }
    const content = readProjectFile(id, latestEntry.path);
    return NextResponse.json({
      files,
      latest: {
        path: latestEntry.path,
        name: latestEntry.name,
        content: content.content,
        is_stub: content.is_stub,
      },
    });
  } catch (e) {
    if (e instanceof KnowledgeError) {
      const status = e.code === "not_found" ? 404 : 400;
      return NextResponse.json({ error: e.code, detail: e.message }, { status });
    }
    return NextResponse.json(
      { error: "internal", detail: String(e) },
      { status: 500 },
    );
  }
}
