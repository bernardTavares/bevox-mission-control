/**
 * Tests for projects-meta.json reader/merger in MC backend.
 *
 * Spec: bevox-knowledge/35_specs/company-os/2026-04-26-mc-projects-factory.md §3.5
 */
import { describe, it, expect } from "vitest";
import {
  readMeta,
  mergeProjectMeta,
  type ProjectsMeta,
} from "@/lib/projects/meta";

describe("readMeta", () => {
  it("returns empty schema when file missing", () => {
    const data = readMeta("/tmp/nonexistent-meta-test-12345.json");
    expect(data).toEqual({ version: 1, projects: {} });
  });
});

describe("mergeProjectMeta", () => {
  it("returns enriched object for canonical project", () => {
    const meta: ProjectsMeta = {
      version: 1,
      projects: {
        "openclaw": {
          name: "OpenClaw",
          description: "Runtime do Company OS",
          github_url: "https://github.com/bernardTavares/openclaw",
          bot_id: null,
          bot_username: null,
          bot_port: null,
          created_at: "2026-04-08T00:00:00Z",
          source: "canonical",
        },
      },
    };
    const enriched = mergeProjectMeta("openclaw", meta);
    expect(enriched?.github_url).toBe("https://github.com/bernardTavares/openclaw");
    expect(enriched?.is_canonical).toBe(true);
  });

  it("returns null for missing project id", () => {
    const meta: ProjectsMeta = { version: 1, projects: {} };
    expect(mergeProjectMeta("ghost", meta)).toBeNull();
  });

  it("flags user_created source", () => {
    const meta: ProjectsMeta = {
      version: 1,
      projects: {
        "customer-portal": {
          name: "Customer Portal",
          description: "App",
          github_url: "https://github.com/bernardTavares/customer-portal",
          bot_id: null,
          bot_username: null,
          bot_port: null,
          created_at: "2026-04-26T00:00:00Z",
          source: "user_created",
        },
      },
    };
    const enriched = mergeProjectMeta("customer-portal", meta);
    expect(enriched?.is_canonical).toBe(false);
    expect(enriched?.created_at).toBe("2026-04-26T00:00:00Z");
  });
});
