"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ProjectSummary } from "@/lib/projects/types";
import Link from "next/link";
import ProjectCard from "./ProjectCard";
import { NewProjectModal } from "@/components/projects/NewProjectModal";

type State =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; projects: ProjectSummary[]; generatedAt: string };

export default function ProjectsPage() {
  const router = useRouter();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/projects", { cache: "no-store" });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          if (!cancelled)
            setState({
              kind: "error",
              message: `${res.status} ${err.error ?? "unknown"}`,
            });
          return;
        }
        const body = await res.json();
        if (!cancelled)
          setState({
            kind: "ready",
            projects: body.projects,
            generatedAt: body.generated_at,
          });
      } catch (err) {
        if (!cancelled) setState({ kind: "error", message: String(err) });
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.kind === "loading") {
    return <div className="p-6 text-sm text-gray-500">Carregando projetos…</div>;
  }
  if (state.kind === "error") {
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold text-red-700">Erro ao carregar projetos</h1>
        <pre className="mt-2 text-xs bg-red-50 p-2 rounded">{state.message}</pre>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-baseline gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
            <span className="text-xs text-gray-400">
              gerado em {new Date(state.generatedAt).toLocaleString("pt-BR")}
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            6 projetos canônicos (ADR-002). Cada card mostra health (bot, workspace,
            kanban, docs) e contagens ativas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/projects/health"
            className="rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            title="Capability drift dashboard (W6)"
          >
            Health / drift →
          </Link>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            style={{
              background: "#1e3a5f",
              color: "#6ec1e4",
              border: "none",
              padding: "0.5rem 1rem",
              borderRadius: 4,
              fontSize: "0.85rem",
              cursor: "pointer",
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            + New project
          </button>
        </div>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {state.projects.map((p) => (
          <ProjectCard key={p.id} project={p} />
        ))}
      </div>
      <NewProjectModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(id) => router.push(`/projects/${id}`)}
      />
    </div>
  );
}
