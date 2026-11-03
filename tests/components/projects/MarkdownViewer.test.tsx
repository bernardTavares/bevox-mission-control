/**
 * Contract tests for MarkdownViewer.
 *
 * Type-level + helpers (sem renderToStaticMarkup pra components com hooks).
 *
 * Spec: bevox-knowledge/35_specs/company-os/2026-04-25-mc-projects-redesign.md §3.3
 */
import { describe, it, expect } from "vitest";
import type { MarkdownViewerProps } from "@/components/projects/MarkdownViewer";

describe("MarkdownViewerProps contract", () => {
  it("requires source + filename; stub + onRawClick optional", () => {
    const props: MarkdownViewerProps = {
      source: "# Hello",
      filename: "foo.md",
    };
    expect(props.source).toBe("# Hello");
    expect(props.filename).toBe("foo.md");
  });

  it("accepts stub flag + onRawClick callback", () => {
    let clicked = false;
    const props: MarkdownViewerProps = {
      source: "x",
      filename: "y.md",
      stub: true,
      onRawClick: () => { clicked = true; },
    };
    props.onRawClick?.();
    expect(clicked).toBe(true);
    expect(props.stub).toBe(true);
  });
});
