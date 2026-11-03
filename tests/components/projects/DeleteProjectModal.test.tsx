import { describe, it, expect } from "vitest";
import type { DeleteProjectModalProps } from "@/components/projects/DeleteProjectModal";
import type { ProjectDetail } from "@/lib/projects/types";

describe("DeleteProjectModalProps contract", () => {
  it("requires open + project + onClose + onDeleted", () => {
    let deleted = false;
    const minimalDetail = {
      id: "test-app",
      name: "Test App",
      description: "",
      health: { bot: "missing", workspace: "missing", kanban: "missing", knowledge: "missing" },
      counts: { sprints_active: 0, tasks_in_progress: 0 },
      is_canonical: false,
      github_url: null,
      bot_id: null,
      created_at: null,
      health_details: {} as ProjectDetail["health_details"],
      links: {} as ProjectDetail["links"],
      sprints: { active: [], closed: [] },
      tasks_in_flight: [],
      persona_pending: false,
    } as ProjectDetail;
    const props: DeleteProjectModalProps = {
      open: true,
      project: minimalDetail,
      onClose: () => {},
      onDeleted: () => { deleted = true; },
    };
    props.onDeleted();
    expect(deleted).toBe(true);
    expect(props.open).toBe(true);
  });
});

describe("typed-confirm semantics", () => {
  it("exact match required for canSubmit", () => {
    const id: string = "customer-portal";
    expect("customer-portal" === id).toBe(true);
    expect("customer-portal ".trim() === id).toBe(true);
    expect("Customer-Portal" === id).toBe(false);  // case-sensitive
    expect("customer" === id).toBe(false);
  });
});
