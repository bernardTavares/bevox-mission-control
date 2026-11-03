"use client";

import { useState } from "react";

export interface PersonaPendingBannerProps {
  slug: string;
  /** Called after a successful regenerate so parent can refresh detail. */
  onRegenerated?: () => void;
}

/**
 * Banner shown on /projects/[id] when ~/.openclaw/workspace-<slug>/PERSONA_PENDING.md
 * exists — i.e., the persona LLM step did not complete during project creation
 * (timeout, claude CLI unavailable, or LLM returned invalid output).
 *
 * Includes a "Regenerar agora" button that POSTs /api/projects/[id]/persona/regenerate.
 * Falls back to the terminal command on failure.
 *
 * Spec: bevox-knowledge/35_specs/openclaw/2026-04-28-mc-projects-factory-wave-2-vox-clone.md §3.1 (T+5s)
 */
export function PersonaPendingBanner({
  slug,
  onRegenerated,
}: PersonaPendingBannerProps) {
  const cmd = `openclaw project regenerate-persona ${slug}`;
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function regenerate() {
    setRunning(true);
    setError(null);
    try {
      const r = await fetch(
        `/api/projects/${slug}/persona/regenerate`,
        { method: "POST" },
      );
      const json = (await r.json()) as Record<string, unknown>;
      if (!r.ok || (typeof json.error === "string" && json.error)) {
        setError(
          (typeof json.error === "string" ? json.error : null)
          ?? `HTTP ${r.status}`,
        );
        return;
      }
      // Success — let parent refresh
      if (onRegenerated) onRegenerated();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div
      role="status"
      style={{
        borderLeft: "4px solid #d97706",
        background: "#231a0a",
        padding: "0.6rem 0.8rem",
        borderRadius: 4,
        fontSize: "0.85rem",
        color: "#f5e9c8",
        marginBottom: "0.8rem",
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: "0.3rem" }}>
        Persona Voz ainda não foi gerada
      </div>
      <p style={{ margin: 0, color: "#e6d8ad" }}>
        A geração da persona LLM não completou (timeout, claude CLI offline ou
        output inválido).
      </p>

      <div style={{ marginTop: "0.6rem", display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={regenerate}
          disabled={running}
          style={{
            background: "#3a2a0e",
            color: "#f5d27a",
            border: "1px solid #5a4015",
            padding: "0.35rem 0.75rem",
            borderRadius: 4,
            fontSize: "0.8rem",
            cursor: running ? "wait" : "pointer",
            opacity: running ? 0.7 : 1,
          }}
        >
          {running ? "Forjando persona Voz… (até 5min)" : "Regenerar agora"}
        </button>
        <span style={{ fontSize: "0.72rem", color: "#a89a78" }}>
          ou via terminal:
        </span>
      </div>

      <pre
        style={{
          marginTop: "0.4rem",
          background: "#1a1408",
          padding: "0.4rem 0.6rem",
          borderRadius: 4,
          fontFamily: "monospace",
          fontSize: "0.8rem",
          overflowX: "auto",
        }}
      >
        {cmd}
      </pre>

      {error && (
        <p style={{ marginTop: "0.4rem", color: "#e46e6e", fontSize: "0.78rem" }}>
          Erro: {error}
        </p>
      )}
    </div>
  );
}
