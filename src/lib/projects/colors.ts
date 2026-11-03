/**
 * Color palette per canonical project (10 entries from projects.yml).
 * Used by SprintCard's project chip + future visual surfaces.
 *
 * Spec: bevox-knowledge/35_specs/company-os/2026-04-25-mc-sprints-page.md §3.4
 */

export const PROJECT_COLORS: Record<string, { bg: string; fg: string }> = {
  "bevox-mobile":    { bg: "#1e3a5f", fg: "#6ec1e4" },
  "bevox-backend":   { bg: "#2a4f30", fg: "#7ec896" },
  "bevox-web":       { bg: "#5f1e3a", fg: "#e46e9b" },
  "bevox-console":   { bg: "#4a1e5f", fg: "#b06ee4" },
  "bevox-harness":   { bg: "#5f5f1e", fg: "#e4e46e" },
  "openclaw":        { bg: "#5f3a1e", fg: "#e4a06e" },
  "company-os":      { bg: "#1e5f5a", fg: "#6ee4dc" },
  "mission-control": { bg: "#3a1e5f", fg: "#a06ee4" },
  "bevox-knowledge": { bg: "#1e5f3a", fg: "#6ee4a0" },
  "vox":             { bg: "#5f1e1e", fg: "#e46e6e" },
};

export function getProjectColors(project: string): { bg: string; fg: string } {
  return PROJECT_COLORS[project] ?? { bg: "#2a2f3e", fg: "#888" };
}
