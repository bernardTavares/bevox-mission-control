"use client";

import { useEffect, useState } from "react";
import type { ProjectDetail } from "@/lib/projects/types";

export interface DeleteProjectModalProps {
  open: boolean;
  project: ProjectDetail;
  onClose: () => void;
  onDeleted: () => void;
}

type Result =
  | { kind: "full" }
  | { kind: "partial"; hint: string }
  | { kind: "error"; message: string };

export function DeleteProjectModal({ open, project, onClose, onDeleted }: DeleteProjectModalProps) {
  const [confirmInput, setConfirmInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setConfirmInput("");
      setResult(null);
      setSubmitting(false);
    }
  }, [open]);

  // Esc closes (only if not submitting)
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, submitting, onClose]);

  if (!open) return null;

  const canSubmit = !submitting && confirmInput.trim() === project.id;

  const submit = async () => {
    setSubmitting(true);
    try {
      const r = await fetch(`/api/projects/${encodeURIComponent(project.id)}`, {
        method: "DELETE",
      });
      const data = await r.json();
      if (r.ok && data.success) {
        if (data.github_deleted) {
          setResult({ kind: "full" });
          setTimeout(onDeleted, 2000);
        } else {
          setResult({ kind: "partial", hint: data.github_hint ?? "GitHub repo not deleted" });
        }
      } else {
        setResult({
          kind: "error",
          message: data.error_message ?? data.detail ?? data.error ?? `HTTP ${r.status}`,
        });
      }
    } catch (e) {
      setResult({ kind: "error", message: e instanceof Error ? e.message : String(e) });
    } finally {
      setSubmitting(false);
    }
  };

  const sprintsCount = project.sprints.active.length + project.sprints.closed.length;
  const tasksCount = project.tasks_in_flight.length;

  return (
    <div onClick={submitting ? undefined : onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "#161b22", borderRadius: 8, padding: "1.25rem 1.5rem",
        width: "90%", maxWidth: 560, color: "#e0e0e0",
        border: "1px solid #5f1e1e",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 style={{ margin: 0, fontSize: "1.1rem", color: "#e46e6e" }}>⚠ Delete project</h2>
          {!submitting && (
            <button type="button" onClick={onClose} style={{ background: "transparent", border: "none", color: "#888", fontSize: "1.4rem", cursor: "pointer" }}>×</button>
          )}
        </div>

        {!result && (
          <>
            <div style={{ fontSize: "0.82rem", color: "#e0e0e0", lineHeight: 1.6, marginBottom: "1rem" }}>
              Esta ação é <strong style={{ color: "#e46e6e" }}>IRREVERSÍVEL</strong> e remove:
              <ul style={{ margin: "0.4rem 0 0", paddingLeft: "1.4rem", fontSize: "0.78rem", color: "#888" }}>
                <li>bevox-knowledge: 10_prd/{project.id}/, 40_roadmap/{project.id}/</li>
                <li>kanban-tasks: {sprintsCount} sprint(s) + {tasksCount} task(s)</li>
                <li>~/.openclaw/{project.id}/ + workspace-{project.id}/</li>
                <li>~/code/{project.id}/</li>
                <li>projects-meta.json entry</li>
                {project.github_url && <li>GitHub repo: {project.github_url}</li>}
              </ul>
            </div>

            <label style={{ display: "block", marginBottom: "0.6rem" }}>
              <div style={{ color: "#888", fontSize: "0.7rem", marginBottom: "0.2rem" }}>
                Para confirmar, digite o ID exato do projeto:
              </div>
              <input
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                disabled={submitting}
                placeholder={project.id}
                style={{
                  width: "100%", padding: "0.45rem 0.6rem",
                  background: "#1a2230",
                  border: `1px solid ${canSubmit ? "#5f1e1e" : "#2a2f3e"}`,
                  borderRadius: 4, color: "#e0e0e0", fontSize: "0.85rem",
                  fontFamily: "monospace",
                }}
              />
            </label>

            <div style={{ color: "#666", fontSize: "0.7rem", fontStyle: "italic", marginBottom: "1rem" }}>
              events.jsonl preservado (append-only audit)
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
              <button type="button" onClick={onClose} disabled={submitting} style={{
                background: "transparent", border: "1px solid #2a2f3e",
                color: "#888", padding: "0.4rem 0.85rem", borderRadius: 4,
                fontSize: "0.85rem", cursor: "pointer",
              }}>Abortar</button>
              <button type="button" onClick={submit} disabled={!canSubmit} style={{
                background: canSubmit ? "#3f1e1e" : "#2a2f3e",
                color: canSubmit ? "#e46e6e" : "#666",
                border: canSubmit ? "1px solid #5f1e1e" : "none",
                padding: "0.4rem 0.85rem", borderRadius: 4, fontSize: "0.85rem",
                cursor: canSubmit ? "pointer" : "not-allowed",
              }}>
                {submitting ? "Deleting…" : "Delete forever"}
              </button>
            </div>
          </>
        )}

        {result?.kind === "full" && (
          <div style={{ background: "#1e3a30", color: "#7ec896", padding: "1rem", borderRadius: 4, fontSize: "0.85rem" }}>
            ✓ Project deleted. Redirecting to /projects...
          </div>
        )}

        {result?.kind === "partial" && (
          <div>
            <div style={{ background: "#5f5a1e", color: "#e4dc6e", padding: "1rem", borderRadius: 4, fontSize: "0.82rem", marginBottom: "1rem" }}>
              <div style={{ fontWeight: 600, marginBottom: "0.4rem" }}>✓ Local cleanup ok</div>
              <div>⚠ GitHub repo NOT deleted: {result.hint}</div>
              {project.github_url && (
                <a href={`${project.github_url}/settings`} target="_blank" rel="noreferrer" style={{ color: "#e4dc6e", marginTop: "0.5rem", display: "inline-block" }}>
                  ↗ Delete on GitHub manually
                </a>
              )}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="button" onClick={onDeleted} style={{
                background: "#1e3a5f", color: "#6ec1e4", border: "none",
                padding: "0.4rem 0.85rem", borderRadius: 4, fontSize: "0.85rem", cursor: "pointer",
              }}>OK</button>
            </div>
          </div>
        )}

        {result?.kind === "error" && (
          <div style={{ background: "#3f1e1e", color: "#e46e6e", padding: "1rem", borderRadius: 4, fontSize: "0.82rem" }}>
            <div style={{ fontWeight: 600, marginBottom: "0.4rem" }}>✗ Delete failed</div>
            <div>{result.message}</div>
          </div>
        )}
      </div>
    </div>
  );
}
