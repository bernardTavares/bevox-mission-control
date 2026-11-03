"use client";

import { SprintsPageInner } from "@/app/(dashboard)/sprints/page";

export interface ProjectSprintsTabProps {
  projectId: string;
}

/**
 * Thin wrapper: embed SprintsPageInner com forcedProject + hideProjectFilter.
 * SprintKanbanModal e drag-drop preservados via SprintsPageInner inalterado.
 *
 * Spec: bevox-knowledge/35_specs/company-os/2026-04-25-mc-projects-redesign.md §3.2.6
 */
export function ProjectSprintsTab({ projectId }: ProjectSprintsTabProps) {
  return (
    <div style={{ marginTop: "1rem" }}>
      <SprintsPageInner forcedProject={projectId} hideProjectFilter />
    </div>
  );
}
