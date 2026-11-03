"use client";

import Link from "next/link";
import type { ProjectSummary, Dot } from "@/lib/projects/types";
import { getProjectColors } from "@/lib/projects/colors";

interface Props {
  project: ProjectSummary;
}

const DOT_COLORS: Record<Dot, string> = {
  ok: "#7ec896",
  partial: "#e4a06e",
  missing: "#e46e6e",
};

/** Abreviação curta do project id pra exibir no canto do card. */
function abbrev(id: string): string {
  if (id === "bevox-mobile") return "M";
  if (id === "bevox-backend") return "B";
  if (id === "bevox-web") return "W";
  if (id === "bevox-console") return "C";
  if (id === "bevox-harness") return "H";
  if (id === "openclaw") return "O";
  if (id === "company-os") return "CO";
  if (id === "mission-control") return "MC";
  if (id === "bevox-knowledge") return "K";
  if (id === "vox") return "V";
  return id.slice(0, 2).toUpperCase();
}

/**
 * Health-grid layout card pra /projects list.
 *
 * Spec: bevox-knowledge/35_specs/company-os/2026-04-25-mc-projects-redesign.md §3.1
 */
export default function ProjectCard({ project }: Props) {
  const colors = getProjectColors(project.id);
  return (
    <Link
      href={`/projects/${encodeURIComponent(project.id)}`}
      style={{
        display: "block",
        background: "#1a2230",
        borderLeft: `3px solid ${colors.fg}`,
        borderRadius: 4,
        padding: "0.6rem 0.75rem",
        textDecoration: "none",
        transition: "background-color 0.15s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "#222b3c")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "#1a2230")}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.2rem" }}>
        <span style={{
          background: colors.bg,
          color: colors.fg,
          padding: "0.1rem 0.45rem",
          borderRadius: 10,
          fontSize: "0.65rem",
          fontWeight: 600,
        }}>{project.id}</span>
        <span style={{ fontFamily: "monospace", color: "#555", fontSize: "0.6rem" }}>{abbrev(project.id)}</span>
      </div>
      <div style={{ color: "#e0e0e0", fontSize: "0.82rem", fontWeight: 600, margin: "0.1rem 0" }}>
        {project.name}
      </div>
      <div style={{ color: "#888", fontSize: "0.68rem", marginBottom: "0.4rem", lineHeight: 1.3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
        {project.description}
      </div>
      <div style={{ display: "flex", gap: "0.25rem", margin: "0.35rem 0" }}>
        <span title="bot" style={{ width: 8, height: 8, borderRadius: "50%", background: DOT_COLORS[project.health.bot] }} />
        <span title="workspace" style={{ width: 8, height: 8, borderRadius: "50%", background: DOT_COLORS[project.health.workspace] }} />
        <span title="kanban" style={{ width: 8, height: 8, borderRadius: "50%", background: DOT_COLORS[project.health.kanban] }} />
        <span title="docs" style={{ width: 8, height: 8, borderRadius: "50%", background: DOT_COLORS[project.health.knowledge] }} />
      </div>
      <div style={{ color: "#666", fontSize: "0.65rem", display: "flex", gap: "0.35rem" }}>
        <span>{project.counts.sprints_active} sprint(s)</span>
        <span>·</span>
        <span>{project.counts.tasks_in_progress} in_progress</span>
      </div>
    </Link>
  );
}
