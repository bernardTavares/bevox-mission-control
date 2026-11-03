"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Sprint } from "@/lib/kanban/stateReader";

async function api<T>(path: string): Promise<T> {
  const r = await fetch(path, { cache: "no-store" });
  let json: unknown;
  try {
    json = await r.json();
  } catch {
    throw new Error(`HTTP ${r.status}`);
  }
  if (!r.ok) {
    const j = (json ?? {}) as Record<string, unknown>;
    throw new Error(
      (typeof j.detail === "string" && j.detail) ||
        (typeof j.error === "string" && j.error) ||
        `HTTP ${r.status}`,
    );
  }
  return json as T;
}

export default function KanbanHistoryPage() {
  const [closed, setClosed] = useState<Sprint[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ sprints: Sprint[] }>(`/api/kanban/sprints`)
      .then((r) =>
        setClosed(
          r.sprints
            .filter((s) => s.state === "closed")
            .sort((a, b) =>
              (b.closed_at ?? "").localeCompare(a.closed_at ?? ""),
            ),
        ),
      )
      .catch((e) =>
        setError(e instanceof Error ? e.message : String(e)),
      );
  }, []);

  return (
    <div className="p-6">
      <div className="mb-3 flex items-center gap-2 border-b border-[var(--border)] pb-3">
        <Link
          href="/kanban"
          className="flex items-center gap-1 rounded border border-[var(--border)] px-2 py-1 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
        >
          <ArrowLeft size={14} /> Board
        </Link>
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">
          Sprint history{" "}
          <span className="font-normal text-[var(--text-muted)]">({closed.length})</span>
        </h1>
      </div>

      {error && (
        <div className="mb-3 rounded border border-[var(--error)] bg-[var(--error-bg)] p-2 text-sm text-[var(--error)]">
          Erro: {error}
        </div>
      )}

      <div className="space-y-2">
        {closed.map((s) => (
          <Link
            key={s.id}
            href={`/kanban/history/${s.id}`}
            className="flex flex-wrap items-center gap-3 rounded border border-[var(--border)] bg-[var(--card)] p-2 hover:bg-[var(--surface-hover)]"
          >
            <span className="font-mono text-sm text-[var(--text-secondary)]">{s.id}</span>
            <span className="text-sm text-[var(--text-primary)]">{s.name}</span>
            <span className="text-xs text-[var(--text-muted)]">
              project: {s.project ?? "mixed"}
            </span>
            <span className="ml-auto text-xs text-[var(--text-muted)]">
              closed: {s.closed_at}
            </span>
          </Link>
        ))}
        {closed.length === 0 && !error && (
          <div className="text-sm italic text-[var(--text-muted)]">
            Nenhum sprint fechado ainda.
          </div>
        )}
      </div>
    </div>
  );
}
