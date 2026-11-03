import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync } from "fs";
import path from "path";
import os from "os";

import {
  checkBotHealth,
  checkWorkspaceHealth,
  checkKanbanHealth,
  checkKnowledgeHealth,
} from "@/lib/projects/health";

const TMP_OPENCLAW = path.join(os.tmpdir(), `mc-projects-oc-${process.pid}`);
const TMP_KNOWLEDGE = path.join(os.tmpdir(), `mc-projects-kn-${process.pid}`);

function reset() {
  rmSync(TMP_OPENCLAW, { recursive: true, force: true });
  rmSync(TMP_KNOWLEDGE, { recursive: true, force: true });
  mkdirSync(TMP_OPENCLAW, { recursive: true });
  mkdirSync(TMP_KNOWLEDGE, { recursive: true });
}

beforeEach(reset);
afterEach(reset);

describe("checkBotHealth", () => {
  it("returns ok when bot env file exists", () => {
    mkdirSync(path.join(TMP_OPENCLAW, "gateway", "bots"), { recursive: true });
    writeFileSync(path.join(TMP_OPENCLAW, "gateway", "bots", "bevox-mobile.env"), "TOKEN=x\n");
    expect(checkBotHealth("bevox-mobile", TMP_OPENCLAW)).toBe("ok");
  });

  it("returns missing when bot env file absent", () => {
    expect(checkBotHealth("bevox-mobile", TMP_OPENCLAW)).toBe("missing");
  });

  it("returns missing when gateway dir absent", () => {
    expect(checkBotHealth("bevox-mobile", TMP_OPENCLAW)).toBe("missing");
  });
});

describe("checkWorkspaceHealth", () => {
  it("returns ok when workspace dir + IDENTITY.md exist", () => {
    const ws = path.join(TMP_OPENCLAW, "workspace-bevox-mobile");
    mkdirSync(ws, { recursive: true });
    writeFileSync(path.join(ws, "IDENTITY.md"), "# bevox-mobile\n");
    expect(checkWorkspaceHealth("bevox-mobile", TMP_OPENCLAW)).toBe("ok");
  });

  it("returns partial when workspace dir exists but no IDENTITY.md", () => {
    mkdirSync(path.join(TMP_OPENCLAW, "workspace-bevox-mobile"), { recursive: true });
    expect(checkWorkspaceHealth("bevox-mobile", TMP_OPENCLAW)).toBe("partial");
  });

  it("returns missing when workspace dir absent", () => {
    expect(checkWorkspaceHealth("bevox-mobile", TMP_OPENCLAW)).toBe("missing");
  });
});

describe("checkKanbanHealth", () => {
  it("returns ok when id in projects.yml", () => {
    mkdirSync(path.join(TMP_OPENCLAW, "kanban-tasks"), { recursive: true });
    writeFileSync(
      path.join(TMP_OPENCLAW, "kanban-tasks", "projects.yml"),
      "projects:\n  - bevox-mobile\n  - bevox-backend\n",
    );
    expect(checkKanbanHealth("bevox-mobile", TMP_OPENCLAW)).toBe("ok");
  });

  it("returns missing when id absent from projects.yml", () => {
    mkdirSync(path.join(TMP_OPENCLAW, "kanban-tasks"), { recursive: true });
    writeFileSync(
      path.join(TMP_OPENCLAW, "kanban-tasks", "projects.yml"),
      "projects:\n  - bevox-backend\n",
    );
    expect(checkKanbanHealth("bevox-mobile", TMP_OPENCLAW)).toBe("missing");
  });

  it("returns missing when projects.yml absent", () => {
    expect(checkKanbanHealth("bevox-mobile", TMP_OPENCLAW)).toBe("missing");
  });
});

describe("checkKnowledgeHealth", () => {
  it("returns ok when 35_specs/<id>/ has .md files (non-gitkeep)", () => {
    const dir = path.join(TMP_KNOWLEDGE, "35_specs", "bevox-mobile");
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, "2026-04-24-some-spec.md"), "# spec\n");
    expect(checkKnowledgeHealth("bevox-mobile", TMP_KNOWLEDGE)).toBe("ok");
  });

  it("returns missing when only .gitkeep", () => {
    const dir = path.join(TMP_KNOWLEDGE, "35_specs", "bevox-mobile");
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, ".gitkeep"), "");
    expect(checkKnowledgeHealth("bevox-mobile", TMP_KNOWLEDGE)).toBe("missing");
  });

  it("returns missing when subfolder absent", () => {
    mkdirSync(path.join(TMP_KNOWLEDGE, "35_specs"), { recursive: true });
    expect(checkKnowledgeHealth("bevox-mobile", TMP_KNOWLEDGE)).toBe("missing");
  });
});
