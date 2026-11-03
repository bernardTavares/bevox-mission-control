"use client";

import { useCallback, useEffect, useState } from "react";
import { DocTree, type FoldersTree } from "./DocTree";
import { MarkdownViewer } from "./MarkdownViewer";

export interface ProjectFicheirosTabProps {
  projectId: string;
  selectedFile?: string | null;
  onSelectFile?: (path: string | null) => void;
}

interface FileResponse {
  path: string;
  content: string;
  modified_at: string;
  size_bytes: number;
  is_stub: boolean;
}

/**
 * Split layout: esq DocTree dos 8 folders canonicos; dir MarkdownViewer
 * do arquivo selecionado. URL state via parent (?file=<relPath>).
 */
export function ProjectFicheirosTab({ projectId, selectedFile, onSelectFile }: ProjectFicheirosTabProps) {
  const [tree, setTree] = useState<FoldersTree | null>(null);
  const [content, setContent] = useState<FileResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initial fetch tree
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/projects/${encodeURIComponent(projectId)}/files`, { cache: "no-store" });
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error(typeof (j as Record<string, unknown>).detail === "string" ? String((j as Record<string, unknown>).detail) : `HTTP ${r.status}`);
        }
        const data = await r.json();
        if (!cancelled) { setTree(data.folders); setError(null); }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => { cancelled = true; };
  }, [projectId]);

  // Fetch selected file content
  useEffect(() => {
    if (!selectedFile) { setContent(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/projects/${encodeURIComponent(projectId)}/files?path=${encodeURIComponent(selectedFile)}`, { cache: "no-store" });
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error(typeof (j as Record<string, unknown>).detail === "string" ? String((j as Record<string, unknown>).detail) : `HTTP ${r.status}`);
        }
        const data = (await r.json()) as FileResponse;
        if (!cancelled) { setContent(data); setError(null); }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => { cancelled = true; };
  }, [projectId, selectedFile]);

  const handleSelect = useCallback((relPath: string) => {
    onSelectFile?.(relPath);
  }, [onSelectFile]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: "1rem", marginTop: "1rem" }}>
      <div style={{ background: "#1a2230", padding: "0.7rem", borderRadius: 5 }}>
        <div style={{ color: "#888", fontSize: "0.6rem", textTransform: "uppercase", marginBottom: "0.4rem" }}>
          bevox-knowledge / {projectId}
        </div>
        {error && <div style={{ color: "#e46e6e", fontSize: "0.7rem" }}>{error}</div>}
        {!error && !tree && <div style={{ color: "#888", fontSize: "0.7rem" }}>Carregando…</div>}
        {!error && tree && (
          <DocTree tree={tree} projectId={projectId} selected={selectedFile ?? null} onSelectFile={handleSelect} />
        )}
      </div>
      <div style={{ minHeight: 400 }}>
        {!selectedFile && (
          <div style={{ background: "#1a2230", padding: "2rem", borderRadius: 6, textAlign: "center", color: "#888", fontSize: "0.85rem" }}>
            Selecione um arquivo na árvore.
          </div>
        )}
        {selectedFile && !content && !error && (
          <div style={{ color: "#888", padding: "1rem" }}>Carregando arquivo…</div>
        )}
        {selectedFile && content && (
          <MarkdownViewer source={content.content} filename={content.path} stub={content.is_stub} />
        )}
      </div>
    </div>
  );
}
