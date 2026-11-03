"use client";

import { useEffect, useState } from "react";
import { FileText } from "lucide-react";

interface BacklogEntry {
  id: string;
  title: string;
  category: string;
  status: string;
  target_date: string | null;
  notes: string | null;
  created: string;
}

interface BacklogResponse {
  generated_at: string;
  source: string;
  entries: BacklogEntry[];
  total: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  institucional: "#3b82f6",
  tecnico: "#8b5cf6",
  bastidor: "#f59e0b",
  "founder-led": "#ef4444",
};

const STATUS_COLORS: Record<string, string> = {
  idea: "var(--text-muted)",
  draft: "#f59e0b",
  published: "#4ade80",
};

export default function ContentPage() {
  const [data, setData] = useState<BacklogResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/content/backlog")
      .then((r) => {
        if (!r.ok) {
          return r.json().then((body) => {
            throw new Error(`${r.status}: ${body.error || "unknown"}`);
          });
        }
        return r.json();
      })
      .then((d: BacklogResponse) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(String(e)));
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="p-4 md:p-8">
        <h1
          className="text-3xl font-bold mb-4"
          style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}
        >
          Content Backlog
        </h1>
        <div
          className="p-4 rounded-xl"
          style={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            color: "var(--error, #ef4444)",
            fontSize: "13px",
          }}
        >
          Failed to load content backlog: {error}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-4 md:p-8">
        <h1
          className="text-3xl font-bold mb-4"
          style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}
        >
          Content Backlog
        </h1>
        <div style={{ color: "var(--text-muted)" }}>Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1
          className="text-3xl font-bold mb-2"
          style={{
            fontFamily: "var(--font-heading)",
            color: "var(--text-primary)",
            letterSpacing: "-1.5px",
          }}
        >
          <FileText className="inline-block w-8 h-8 mr-2 mb-1" />
          Content Backlog
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
          {data.total} {data.total === 1 ? "idea" : "ideas"} captured ·
          E12 wave 1 read-only
        </p>
      </div>

      {data.entries.length === 0 && (
        <div
          className="p-4 rounded-xl"
          style={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            color: "var(--text-muted)",
            fontSize: "13px",
          }}
        >
          Nenhuma ideia no backlog ainda. Edite{" "}
          <code>bevox-knowledge/20_architecture/content-backlog.yml</code>{" "}
          para adicionar entries.
        </div>
      )}

      {data.entries.length > 0 && (
        <div className="space-y-3">
          {data.entries.map((entry) => (
            <div
              key={entry.id}
              className="rounded-xl overflow-hidden"
              style={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
              }}
            >
              <div className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3
                      className="text-base font-semibold"
                      style={{
                        fontFamily: "var(--font-heading)",
                        color: "var(--text-primary)",
                      }}
                    >
                      {entry.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span
                        className="text-[10px] px-2 py-0.5 rounded font-medium"
                        style={{
                          backgroundColor: `${CATEGORY_COLORS[entry.category] || "var(--border)"}20`,
                          color: CATEGORY_COLORS[entry.category] || "var(--text-muted)",
                          border: `1px solid ${CATEGORY_COLORS[entry.category] || "var(--border)"}40`,
                        }}
                      >
                        {entry.category}
                      </span>
                      <span
                        className="text-[10px] px-2 py-0.5 rounded font-medium"
                        style={{
                          backgroundColor: "var(--border)",
                          color: STATUS_COLORS[entry.status] || "var(--text-muted)",
                        }}
                      >
                        {entry.status}
                      </span>
                      {entry.target_date && (
                        <span
                          className="text-[10px] px-2 py-0.5 rounded"
                          style={{ color: "var(--text-muted)" }}
                        >
                          target: {entry.target_date}
                        </span>
                      )}
                      <span
                        className="text-[10px]"
                        style={{ color: "var(--text-muted)" }}
                      >
                        created: {entry.created}
                      </span>
                    </div>
                    {entry.notes && (
                      <p
                        className="mt-2 text-sm"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {entry.notes}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit hint + debug footer */}
      <div
        className="mt-6 text-xs"
        style={{ color: "var(--text-muted)" }}
      >
        Para adicionar ou editar ideias:{" "}
        <code>vim ~/bevox-knowledge/20_architecture/content-backlog.yml</code>
        {" + "}
        <code>git commit</code>
        <br />
        source: <code>{data.source}</code>
        {" · "}
        generated_at: <code>{data.generated_at}</code>
      </div>
    </div>
  );
}
