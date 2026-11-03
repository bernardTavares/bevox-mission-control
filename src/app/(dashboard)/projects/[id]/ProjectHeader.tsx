"use client";

import type { ProjectDetail, Dot } from "@/lib/projects/types";
import { getProjectColors } from "@/lib/projects/colors";

interface Props {
  detail: ProjectDetail;
}

const DOT_COLORS: Record<Dot, string> = {
  ok: "#7ec896",
  partial: "#e4a06e",
  missing: "#e46e6e",
};

/**
 * Sticky compact header pra /projects/[id] tabbed detail.
 * Chip color-coded + nome + 4 dots big + descricao sub-line.
 *
 * Spec: bevox-knowledge/35_specs/company-os/2026-04-25-mc-projects-redesign.md §3.2.2
 */
export default function ProjectHeader({ detail }: Props) {
  const colors = getProjectColors(detail.id);
  return (
    <div style={{
      position: "sticky",
      top: 0,
      zIndex: 10,
      background: "#161b22",
      border: "1px solid #2a2f3e",
      borderRadius: 8,
      padding: "0.85rem 1rem",
      marginBottom: "0.6rem",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.7rem" }}>
          <span style={{
            background: colors.bg,
            color: colors.fg,
            padding: "0.2rem 0.7rem",
            borderRadius: 14,
            fontSize: "0.85rem",
            fontWeight: 600,
          }}>{detail.id}</span>
          <h2 style={{ color: "#e0e0e0", fontSize: "1.3rem", margin: 0 }}>{detail.name}</h2>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <span title={`bot: ${detail.health.bot}`} style={{ width: 11, height: 11, borderRadius: "50%", background: DOT_COLORS[detail.health.bot] }} />
          <span title={`workspace: ${detail.health.workspace}`} style={{ width: 11, height: 11, borderRadius: "50%", background: DOT_COLORS[detail.health.workspace] }} />
          <span title={`kanban: ${detail.health.kanban}`} style={{ width: 11, height: 11, borderRadius: "50%", background: DOT_COLORS[detail.health.kanban] }} />
          <span title={`docs: ${detail.health.knowledge}`} style={{ width: 11, height: 11, borderRadius: "50%", background: DOT_COLORS[detail.health.knowledge] }} />
        </div>
      </div>
      <div style={{ color: "#888", fontSize: "0.78rem", marginTop: "0.3rem" }}>{detail.description}</div>
    </div>
  );
}
