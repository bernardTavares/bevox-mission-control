/**
 * Canonical projects list aligned with ADR-002 topology.
 *
 * Hardcoded (stable by design — adding a project requires a new ADR).
 * Does NOT depend on kanban `projects.yml` which is a looser list
 * including transient entries like test-project, vox (agent), etc.
 *
 * Spec: bevox-knowledge/35_specs/company-os/2026-04-24-e2-projects-dashboard-w1.md §3.1
 */

export interface CanonicalProject {
  readonly id: string;
  readonly name: string;
  readonly description: string;
}

export const CANONICAL_PROJECTS: readonly CanonicalProject[] = [
  {
    id: "bevox-backend",
    name: "Bevox Backend",
    description: "Backend compartilhado (auth, tenants, agenda, pagamentos, notificações, auditoria)",
  },
  {
    id: "bevox-console",
    name: "Bevox Console",
    description: "Super-admin / backoffice interno da Bevox",
  },
  {
    id: "bevox-harness",
    name: "Bevox Harness",
    description: "Runtime agent-first da secretária IA",
  },
  {
    id: "bevox-mobile",
    name: "Bevox Mobile",
    description: "App mobile operador do cliente",
  },
  {
    id: "bevox-web",
    name: "Bevox Web",
    description: "App web do cliente",
  },
  {
    id: "company-os",
    name: "Company OS",
    description: "Mission Control, Vox, Knowledge-Sync, Agent Registry, Approval Center",
  },
  {
    id: "openclaw",
    name: "OpenClaw",
    description: "Runtime do Company OS — agentes, skills, governança, automações operacionais",
  },
  {
    id: "mission-control",
    name: "Mission Control",
    description: "Dashboard Next.js do Company OS — visualização e operação",
  },
  {
    id: "bevox-knowledge",
    name: "Bevox Knowledge",
    description: "Repo canônico de docs — ADRs, PRDs, roadmaps, specs, releases",
  },
  {
    id: "vox",
    name: "Vox",
    description: "Agente de voz/áudio — dispatcher principal do sistema agent-first",
  },
] as const;

export function isCanonicalProject(id: string): boolean {
  return CANONICAL_PROJECTS.some((p) => p.id === id);
}

export function getCanonicalProject(id: string): CanonicalProject | null {
  return CANONICAL_PROJECTS.find((p) => p.id === id) ?? null;
}
