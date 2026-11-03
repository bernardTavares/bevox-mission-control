/**
 * Contract tests for NewProjectModal.
 *
 * Spec: bevox-knowledge/35_specs/company-os/2026-04-26-mc-projects-factory.md §3.4
 */
import { describe, it, expect } from "vitest";
import type { NewProjectModalProps } from "@/components/projects/NewProjectModal";

describe("NewProjectModalProps contract", () => {
  it("requires open + onClose + onCreated", () => {
    let createdId: string | null = null;
    const props: NewProjectModalProps = {
      open: true,
      onClose: () => {},
      onCreated: (id) => { createdId = id; },
    };
    props.onCreated("foo");
    expect(createdId).toBe("foo");
    expect(props.open).toBe(true);
  });
});

describe("slugify in modal", () => {
  it("derives kebab-case from name", async () => {
    const { slugify } = await import("@/components/projects/NewProjectModal");
    expect(slugify("Customer Portal")).toBe("customer-portal");
    expect(slugify("Foo & Bar!")).toBe("foo-bar");
    expect(slugify("Notação")).toBe("notacao");
  });
});
