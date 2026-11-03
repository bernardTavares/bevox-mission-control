"use client";

import { useCallback, useEffect, useState } from "react";
import { MarkdownViewer } from "./MarkdownViewer";
import { RoadmapDocsList, type RoadmapDocEntry } from "./RoadmapDocsList";

export interface ProjectRoadmapTabProps {
  projectId: string;
}

interface RoadmapResponse {
  files: RoadmapDocEntry[];
  latest: { path: string; name: string; content: string; is_stub: boolean } | null;
}

interface FileResponse {
  path: string;
  content: string;
  is_stub: boolean;
}

/**
 * Split layout: esq lista de roadmap docs + atalho /roadmap; dir markdown viewer
 * do doc selecionado (default = latest).
 */
export function ProjectRoadmapTab({ projectId }: ProjectRoadmapTabProps) {
  const [meta, setMeta] = useState<RoadmapResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [selectedContent, setSelectedContent] = useState<FileResponse | null>(null);

  // Initial fetch: listing + latest
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/projects/${encodeURIComponent(projectId)}/roadmap`, { cache: "no-store" });
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error(typeof (j as Record<string, unknown>).detail === "string" ? String((j as Record<string, unknown>).detail) : `HTTP ${r.status}`);
        }
        const data = (await r.json()) as RoadmapResponse;
        if (!cancelled) {
          setMeta(data);
          setSelectedPath(data.latest?.path ?? null);
          if (data.latest) {
            setSelectedContent({ path: data.latest.path, content: data.latest.content, is_stub: data.latest.is_stub });
          }
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => { cancelled = true; };
  }, [projectId]);

  // When user selects a non-latest doc, fetch its content
  const onSelect = useCallback(async (path: string) => {
    setSelectedPath(path);
    if (selectedContent?.path === path) return;
    try {
      const r = await fetch(`/api/projects/${encodeURIComponent(projectId)}/files?path=${encodeURIComponent(path)}`, { cache: "no-store" });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(typeof (j as Record<string, unknown>).detail === "string" ? String((j as Record<string, unknown>).detail) : `HTTP ${r.status}`);
      }
      const data = (await r.json()) as FileResponse;
      setSelectedContent(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [projectId, selectedContent?.path]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "1rem", marginTop: "1rem" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        <div style={{ background: "#1a2230", padding: "0.7rem", borderRadius: 5 }}>
          <div style={{ color: "#888", fontSize: "0.6rem", textTransform: "uppercase", marginBottom: "0.3rem" }}>Roadmap docs</div>
          <RoadmapDocsList
            docs={meta?.files ?? []}
            selected={selectedPath}
            onSelect={onSelect}
          />
        </div>
        <div style={{ background: "#1a2230", padding: "0.7rem", borderRadius: 5 }}>
          <div style={{ color: "#888", fontSize: "0.6rem", textTransform: "uppercase", marginBottom: "0.3rem" }}>Atalho</div>
          <a href="/roadmap" style={{ color: "#4f9eff", fontSize: "0.7rem", textDecoration: "none" }}>→ /roadmap (visão global)</a>
        </div>
      </div>
      <div style={{ minHeight: 400 }}>
        {error && (
          <div style={{ background: "#3f1e1e", color: "#e46e6e", padding: "1rem", borderRadius: 4 }}>
            Failed to load roadmap: {error}
          </div>
        )}
        {!error && !meta && <div style={{ color: "#888", padding: "1rem" }}>Carregando roadmap…</div>}
        {!error && meta && !meta.latest && (
          <div style={{ background: "#1a2230", padding: "2rem", borderRadius: 6, textAlign: "center" }}>
            <div style={{ color: "#e4a06e", fontWeight: 600, marginBottom: "0.5rem" }}>Nenhum roadmap pra este projeto</div>
            <div style={{ color: "#888", fontSize: "0.78rem", fontFamily: "monospace" }}>
              Crie em bevox-knowledge/40_roadmap/{projectId}/
            </div>
          </div>
        )}
        {!error && selectedContent && (
          <MarkdownViewer
            source={selectedContent.content}
            filename={selectedContent.path}
            stub={selectedContent.is_stub}
          />
        )}
      </div>
    </div>
  );
}
