/**
 * Contract tests for doctor-types and the W6 drift report shape.
 *
 * Validates that a real-world fixture from `openclaw project doctor --json`
 * matches the TypeScript surface we depend on in DriftMatrix and friends.
 *
 * Spec: bevox-knowledge/35_specs/openclaw/2026-05-08-project-lifecycle-w6-v1.md
 */
import { describe, it, expect } from "vitest";
import {
  CAPABILITY_KEYS,
  CAPABILITY_LABELS,
  type DoctorReport,
} from "@/lib/projects/doctor-types";

const FIXTURE: DoctorReport = {
  schema_version: 1,
  generated_at: "2026-05-08T09:29:14Z",
  projects: {
    "bevox-mobile": {
      capabilities: {
        code_repo: {
          declared: "drifted",
          detected: "absent",
          drift: true,
          drift_reason: "declared=drifted, detected=absent",
        },
        knowledge_slot: {
          declared: "provisioned",
          detected: "skipped",
          drift: false,
          drift_reason: "knowledge_slot detection skipped via flag",
        },
        kanban_sprints: { declared: "absent", detected: "absent", drift: false },
        workspace: {
          declared: "provisioned",
          detected: "provisioned",
          drift: false,
        },
        persona: { declared: "absent", detected: "absent", drift: false },
        bot: {
          declared: "provisioned",
          detected: "provisioned",
          drift: false,
        },
        telegram_topics: {
          declared: "partial",
          detected: "partial",
          drift: false,
        },
        mission_control: {
          declared: "absent",
          detected: "absent",
          drift: false,
        },
      },
      drifts: ["code_repo"],
      source: null,
    },
  },
  orphans: {
    code_dirs: ["/home/you/code/foo"],
    bot_profiles: [],
    workspaces: [],
    bevox_knowledge_slots: [],
  },
  drafts_pending: [],
  summary: {
    projects_scanned: 1,
    projects_with_drift: 1,
    total_drifts: 1,
    total_orphans: 1,
    drafts_pending: 0,
  },
};

describe("DoctorReport contract", () => {
  it("fixture parses against the typed schema", () => {
    expect(FIXTURE.schema_version).toBe(1);
    expect(Object.keys(FIXTURE.projects)).toContain("bevox-mobile");
    expect(FIXTURE.summary.total_drifts).toBe(1);
  });

  it("CAPABILITY_KEYS covers the 8 ADR-013 capabilities", () => {
    expect(CAPABILITY_KEYS).toHaveLength(8);
    expect(new Set(CAPABILITY_KEYS)).toEqual(
      new Set([
        "code_repo",
        "knowledge_slot",
        "kanban_sprints",
        "workspace",
        "persona",
        "bot",
        "telegram_topics",
        "mission_control",
      ]),
    );
  });

  it("every CAPABILITY_KEY has a human label", () => {
    for (const k of CAPABILITY_KEYS) {
      expect(CAPABILITY_LABELS[k]).toBeTruthy();
    }
  });

  it("fixture project has cells for every canonical capability", () => {
    const project = FIXTURE.projects["bevox-mobile"];
    for (const k of CAPABILITY_KEYS) {
      expect(project.capabilities[k]).toBeDefined();
    }
  });

  it("drifted cells carry drift=true and drifts list reflects them", () => {
    const project = FIXTURE.projects["bevox-mobile"];
    const driftedCaps = Object.entries(project.capabilities)
      .filter(([, cell]) => cell.drift)
      .map(([k]) => k);
    expect(driftedCaps.sort()).toEqual(project.drifts.sort());
  });
});
