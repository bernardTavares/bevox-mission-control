/**
 * Contract tests for ProjectGeralTab.
 *
 * Spec: bevox-knowledge/35_specs/company-os/2026-04-25-mc-projects-redesign.md §3.2
 */
import { describe, it, expect } from "vitest";
import type { ProjectGeralTabProps } from "@/components/projects/ProjectGeralTab";
import type { ProjectDetail } from "@/lib/projects/types";

describe("ProjectGeralTabProps contract", () => {
  it("requires detail prop with ProjectDetail shape", () => {
    const detail: ProjectDetail = {
      id: "openclaw",
      name: "OpenClaw",
      description: "Test",
      health: { bot: "ok", workspace: "ok", kanban: "ok", knowledge: "ok" },
      counts: { sprints_active: 1, tasks_in_progress: 0 },
      is_canonical: true,
      github_url: null,
      bot_id: null,
      created_at: null,
      health_details: {
        bot: { present: true, envPath: null, systemdService: null },
        workspace: { present: true, dir: null, files: [] },
        kanban: { present: true, tasks_total: 0 },
        knowledge: { present: true, specsCount: 0 },
      },
      links: {
        telegram_bot_env: null,
        workspace_dir: null,
        knowledge_specs_dir: null,
        kanban_filter_url: "/kanban?project=openclaw",
      },
      sprints: { active: [], closed: [] },
      tasks_in_flight: [],
      persona_pending: false,
    };
    const props: ProjectGeralTabProps = { detail };
    expect(props.detail.id).toBe("openclaw");
  });
});
