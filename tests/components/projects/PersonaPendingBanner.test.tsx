/**
 * Contract tests for PersonaPendingBanner.
 *
 * Tests use ReactDOMServer.renderToStaticMarkup since this repo runs vitest in
 * node environment (no jsdom / @testing-library/react). Mirrors the contract-
 * style approach used by NewProjectModal.test.tsx and DeleteProjectModal.test.tsx.
 *
 * Spec: bevox-knowledge/35_specs/company-os/2026-04-26-mc-projects-factory.md
 */
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import {
  PersonaPendingBanner,
  type PersonaPendingBannerProps,
} from "@/components/projects/PersonaPendingBanner";

describe("PersonaPendingBanner", () => {
  it("renders the regenerate-persona command with the given slug", () => {
    const html = renderToStaticMarkup(
      <PersonaPendingBanner slug="my-project" />,
    );
    expect(html).toContain("openclaw project regenerate-persona my-project");
  });

  it("renders a header indicating persona is pending", () => {
    const html = renderToStaticMarkup(<PersonaPendingBanner slug="x" />);
    expect(html).toMatch(/Persona Voz ainda não foi gerada/);
  });

  it("uses role=status for accessibility", () => {
    const html = renderToStaticMarkup(<PersonaPendingBanner slug="x" />);
    expect(html).toContain('role="status"');
  });

  it("substitutes slug into the CLI command verbatim", () => {
    const html = renderToStaticMarkup(
      <PersonaPendingBanner slug="customer-portal" />,
    );
    expect(html).toContain(
      "openclaw project regenerate-persona customer-portal",
    );
  });

  it("type contract: requires slug prop", () => {
    const props: PersonaPendingBannerProps = { slug: "foo" };
    expect(props.slug).toBe("foo");
  });
});
