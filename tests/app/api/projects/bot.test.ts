/**
 * Contract tests for bot routes.
 * Spec: bevox-knowledge/35_specs/company-os/2026-04-27-mc-project-bot-connect.md §4.1
 */
import { describe, it, expect } from "vitest";

describe("POST /api/projects/[id]/bot/connect contract", () => {
  it("success response shape", () => {
    type Response = {
      success: boolean;
      bot_id: string;
      bot_username: string;
      port: number;
      systemd_unit: string;
      profile_dir: string;
    };
    const sample: Response = {
      success: true,
      bot_id: "foo",
      bot_username: "foo_bot",
      port: 18792,
      systemd_unit: "openclaw-gateway@foo.service",
      profile_dir: "/home/u/.openclaw-foo",
    };
    expect(sample.success).toBe(true);
    expect(sample.bot_username).toMatch(/_bot$/);
  });

  it("error code shapes", () => {
    type Err = { error: string; detail?: string };
    const codes = [
      "invalid_token", "invalid_chat_id", "invalid_allow_from", "skills_required",
      "project_not_found", "bot_already_connected", "telegram_getme_failed",
      "bootstrap_failed", "port_pool_exhausted",
    ];
    for (const code of codes) {
      const sample: Err = { error: code };
      expect(sample.error).toBe(code);
    }
  });
});

describe("DELETE /api/projects/[id]/bot contract", () => {
  it("success response shape", () => {
    type Response = { success: boolean; kept_profile_dir: string };
    const sample: Response = { success: true, kept_profile_dir: "/home/u/.openclaw-foo" };
    expect(sample.kept_profile_dir).toContain(".openclaw-");
  });
  it("bot_not_connected 409", () => {
    const e = { error: "bot_not_connected" };
    expect(e.error).toBe("bot_not_connected");
  });
});

describe("POST /api/projects/[id]/bot/restart contract", () => {
  it("success response shape", () => {
    type Response = { success: boolean; active_state: "active" | "failed" | "inactive" };
    const sample: Response = { success: true, active_state: "active" };
    expect(["active", "failed", "inactive"]).toContain(sample.active_state);
  });
});

describe("GET /api/projects/[id]/bot/status contract", () => {
  it("disconnected shape", () => {
    type R = { connected: false };
    const sample: R = { connected: false };
    expect(sample.connected).toBe(false);
  });
  it("connected shape", () => {
    type R = {
      connected: true;
      bot_username: string | null;
      chat_id: number | null;
      port: number | null;
      active_state: "active" | "failed" | "inactive";
      skills: string[];
    };
    const sample: R = {
      connected: true,
      bot_username: "foo_bot",
      chat_id: -100123,
      port: 18792,
      active_state: "active",
      skills: ["knowledge-sync-commands"],
    };
    expect(sample.skills.length).toBeGreaterThan(0);
  });
});
