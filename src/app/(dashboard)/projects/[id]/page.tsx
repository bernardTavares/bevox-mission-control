"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import type { ProjectDetail } from "@/lib/projects/types";
import ProjectHeader from "./ProjectHeader";
import { TabNav, type TabKey } from "@/components/projects/TabNav";
import { ProjectGeralTab } from "@/components/projects/ProjectGeralTab";
import { ProjectRoadmapTab } from "@/components/projects/ProjectRoadmapTab";
import { ProjectFicheirosTab } from "@/components/projects/ProjectFicheirosTab";
import { ProjectSprintsTab } from "@/components/projects/ProjectSprintsTab";
import { PersonaPendingBanner } from "@/components/projects/PersonaPendingBanner";

type State =
  | { kind: "loading" }
  | { kind: "not_found" }
  | { kind: "error"; message: string }
  | { kind: "ready"; detail: ProjectDetail };

const VALID_TABS: readonly TabKey[] = ["geral", "roadmap", "ficheiros", "sprints"];

function ProjectDetailPageInner() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const fileParam = searchParams.get("file");

  const tab: TabKey = (VALID_TABS as readonly string[]).includes(tabParam ?? "")
    ? (tabParam as TabKey)
    : "geral";

  const [state, setState] = useState<State>({ kind: "loading" });

  const refetch = useCallback(async () => {
    if (!id) return;
    try {
      const r = await fetch(`/api/projects/${encodeURIComponent(id)}`, { cache: "no-store" });
      if (r.status === 404) { setState({ kind: "not_found" }); return; }
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setState({ kind: "error", message: `${r.status} ${(j as Record<string, unknown>).error ?? "unknown"}` });
        return;
      }
      const body = (await r.json()) as ProjectDetail;
      setState({ kind: "ready", detail: body });
    } catch (e) {
      setState({ kind: "error", message: String(e) });
    }
  }, [id]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const setTab = useCallback((next: TabKey) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next);
    if (next !== "ficheiros") params.delete("file");
    router.replace(`/projects/${encodeURIComponent(id)}?${params.toString()}`, { scroll: false });
  }, [id, router, searchParams]);

  const setSelectedFile = useCallback((path: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (path) params.set("file", path);
    else params.delete("file");
    const qs = params.toString();
    router.replace(qs ? `/projects/${encodeURIComponent(id)}?${qs}` : `/projects/${encodeURIComponent(id)}`, { scroll: false });
  }, [id, router, searchParams]);

  if (state.kind === "loading") {
    return <div style={{ padding: "2rem", color: "#888" }}>Carregando projeto…</div>;
  }
  if (state.kind === "not_found") {
    return (
      <div style={{ padding: "2rem" }}>
        <h1 style={{ color: "#e0e0e0" }}>Projeto não encontrado</h1>
        <p style={{ color: "#888", fontSize: "0.85rem", marginTop: "0.5rem" }}>
          <span style={{ fontFamily: "monospace" }}>{id}</span> não é um projeto canônico.
        </p>
        <Link href="/projects" style={{ color: "#4f9eff", fontSize: "0.85rem" }}>← voltar para Projects</Link>
      </div>
    );
  }
  if (state.kind === "error") {
    return (
      <div style={{ padding: "2rem" }}>
        <h1 style={{ color: "#e46e6e" }}>Erro ao carregar projeto</h1>
        <pre style={{ color: "#888", fontSize: "0.78rem", marginTop: "0.5rem" }}>{state.message}</pre>
      </div>
    );
  }

  const detail = state.detail;
  const sprintCount = detail.sprints.active.length + detail.sprints.closed.length;

  return (
    <div style={{ padding: "1rem 1.5rem", color: "#e0e0e0" }}>
      <Link href="/projects" style={{ color: "#888", fontSize: "0.7rem", textDecoration: "none" }}>← Projects</Link>
      <ProjectHeader detail={detail} />
      {detail.persona_pending && (
        <PersonaPendingBanner slug={detail.id} onRegenerated={refetch} />
      )}
      <TabNav active={tab} onChange={setTab} sprintCount={sprintCount} />
      {tab === "geral"     && <ProjectGeralTab    detail={detail} />}
      {tab === "roadmap"   && <ProjectRoadmapTab  projectId={detail.id} />}
      {tab === "ficheiros" && <ProjectFicheirosTab projectId={detail.id} selectedFile={fileParam} onSelectFile={setSelectedFile} />}
      {tab === "sprints"   && <ProjectSprintsTab  projectId={detail.id} />}
    </div>
  );
}

/** Suspense wrapper required by Next.js 15: inner uses useSearchParams. */
export default function ProjectDetailPage() {
  return (
    <Suspense fallback={<div style={{ padding: "2rem", color: "#888" }}>Carregando…</div>}>
      <ProjectDetailPageInner />
    </Suspense>
  );
}
