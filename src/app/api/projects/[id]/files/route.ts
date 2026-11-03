import { NextRequest, NextResponse } from "next/server";
import {
  ALLOWED_FOLDERS,
  KnowledgeError,
  listProjectFolderFiles,
  readProjectFile,
} from "@/lib/projects/knowledge";

export const dynamic = "force-dynamic";

/**
 * GET /api/projects/<id>/files
 *
 * Variant 1 (no ?path query): returns tree of folders with counts + filenames.
 * Variant 2 (?path=<folder>/<id>/<file>): returns file content.
 *
 * Spec: bevox-knowledge/35_specs/company-os/2026-04-25-mc-projects-redesign.md §4.2
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const url = new URL(req.url);
  const queryPath = url.searchParams.get("path");

  try {
    if (queryPath) {
      // Variant 2: read file
      const content = readProjectFile(id, queryPath);
      return NextResponse.json(content);
    }

    // Variant 1: list tree
    const folders: Record<string, { count: number; files: string[] }> = {};
    for (const folder of ALLOWED_FOLDERS) {
      const entries = listProjectFolderFiles(id, folder);
      folders[folder] = {
        count: entries.length,
        files: entries.map((e) => e.name),
      };
    }
    return NextResponse.json({ folders });
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
