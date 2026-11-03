/**
 * Contract tests for BotPanel — Initialize topics button.
 *
 * Tests use ReactDOMServer.renderToStaticMarkup since this repo runs vitest in
 * node environment (no jsdom / @testing-library/react). Mirrors the contract-
 * style approach used by PersonaPendingBanner.test.tsx.
 *
 * Spec: bevox-knowledge/35_specs/openclaw/2026-04-28-mc-projects-factory-wave-2-vox-clone.md §3.2
 */
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { BotPanel, type BotStatus } from "@/components/projects/BotPanel";

const connectedStatus: BotStatus = {
  connected: true,
  bot_username: "test_bot",
  chat_id: -1001234567890,
  port: 8123,
  active_state: "active",
  skills: [],
};

describe("BotPanel — Initialize topics button", () => {
  it("renders the Initialize topics button when bot is connected", () => {
    const html = renderToStaticMarkup(
      <BotPanel
        projectId="my-proj"
        status={connectedStatus}
        onChanged={() => {}}
      />,
    );
    expect(html).toContain("Initialize topics");
  });

  it("mentions canonical topics in the helper text", () => {
    const html = renderToStaticMarkup(
      <BotPanel
        projectId="my-proj"
        status={connectedStatus}
        onChanged={() => {}}
      />,
    );
    expect(html).toContain("clarifications");
    expect(html).toContain("dispatcher");
  });

  it("preserves existing Restart and Disconnect controls", () => {
    const html = renderToStaticMarkup(
      <BotPanel
        projectId="my-proj"
        status={connectedStatus}
        onChanged={() => {}}
      />,
    );
    expect(html).toContain("Restart");
    expect(html).toContain("Disconnect");
  });
});
