/**
 * Contract tests for TabNav.
 *
 * Spec: bevox-knowledge/35_specs/company-os/2026-04-25-mc-projects-redesign.md §3.2
 */
import { describe, it, expect } from "vitest";
import type { TabNavProps, TabKey } from "@/components/projects/TabNav";

describe("TabNavProps contract", () => {
  it("active key + onChange callback", () => {
    let lastChosen: TabKey | null = null;
    const props: TabNavProps = {
      active: "geral",
      onChange: (t) => { lastChosen = t; },
      sprintCount: 10,
    };
    props.onChange("roadmap");
    expect(lastChosen).toBe("roadmap");
    expect(props.active).toBe("geral");
    expect(props.sprintCount).toBe(10);
  });

  it("TabKey type allows the 4 known tabs", () => {
    const tabs: TabKey[] = ["geral", "roadmap", "ficheiros", "sprints"];
    expect(tabs).toHaveLength(4);
  });
});
