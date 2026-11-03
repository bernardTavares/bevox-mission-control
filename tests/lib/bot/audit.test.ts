import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync, readFileSync, existsSync } from "fs";
import path from "path";
import os from "os";

import { appendBotAudit } from "@/lib/bot/audit";

const TMP = path.join(os.tmpdir(), `mc-bot-audit-${process.pid}`);
const AUDIT = path.join(TMP, "projects-bot.jsonl");

beforeEach(() => {
  rmSync(TMP, { recursive: true, force: true });
  mkdirSync(TMP, { recursive: true });
});
afterEach(() => {
  rmSync(TMP, { recursive: true, force: true });
});

describe("appendBotAudit", () => {
  it("appends one JSON line per call with ts + action + payload", () => {
    appendBotAudit("bot_connected", { project_id: "foo", success: true, port: 18792 }, AUDIT);
    appendBotAudit("bot_disconnected", { project_id: "foo", success: true }, AUDIT);
    const lines = readFileSync(AUDIT, "utf-8").trim().split("\n");
    expect(lines).toHaveLength(2);
    const a = JSON.parse(lines[0]);
    expect(a.action).toBe("bot_connected");
    expect(a.project_id).toBe("foo");
    expect(a.port).toBe(18792);
    expect(typeof a.ts).toBe("string");
    const b = JSON.parse(lines[1]);
    expect(b.action).toBe("bot_disconnected");
  });

  it("never includes a 'token' field even if accidentally provided", () => {
    // Type system blocks it, but verify runtime behavior with a coerced cast
    const sneaky = { project_id: "foo", success: true, token: "SECRET" } as unknown as Parameters<typeof appendBotAudit>[1];
    appendBotAudit("bot_connect_failed", sneaky, AUDIT);
    const raw = readFileSync(AUDIT, "utf-8");
    // Token DOES appear because the helper spreads payload — this asserts current behavior
    // and serves as a guard if we ever regress to allowing token by name.
    // The contract: caller MUST never pass token. To enforce we strip explicitly:
    expect(raw).not.toContain("SECRET");
  });

  it("creates the parent directory if missing", () => {
    const nested = path.join(TMP, "sub", "dir", "audit.jsonl");
    appendBotAudit("bot_restarted", { project_id: "foo", success: true }, nested);
    expect(existsSync(nested)).toBe(true);
  });
});
