import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync, writeFileSync } from "fs";
import path from "path";
import os from "os";

import {
  validateToken,
  pickFreePort,
  parseLastJsonLine,
  telegramGetMe,
  runBootstrap,
  readProfileStatus,
  BotConnectError,
} from "@/lib/bot/connect";

const TMP = path.join(os.tmpdir(), `mc-bot-connect-${process.pid}`);

beforeEach(() => {
  rmSync(TMP, { recursive: true, force: true });
  mkdirSync(TMP, { recursive: true });
});
afterEach(() => {
  rmSync(TMP, { recursive: true, force: true });
});

describe("validateToken", () => {
  it("accepts well-formed bot tokens", () => {
    expect(validateToken("1234567890:AAFakeToken_FakeToken_FakeToken_xyz")).toBe(true);
    expect(validateToken("123:" + "A".repeat(35))).toBe(true);
  });
  it("rejects malformed", () => {
    expect(validateToken("notatoken")).toBe(false);
    expect(validateToken("123:short")).toBe(false);
    expect(validateToken("")).toBe(false);
    expect(validateToken("noprefix:" + "A".repeat(35))).toBe(false);
  });
});

describe("parseLastJsonLine", () => {
  it("parses single-line JSON", () => {
    expect(parseLastJsonLine('{"a":1}')).toEqual({ a: 1 });
  });
  it("falls back to last JSON line in multi-line stdout", () => {
    const stdout = "doing thing\nstill working\n{\"success\":true,\"port\":18999}\n";
    expect(parseLastJsonLine(stdout)).toEqual({ success: true, port: 18999 });
  });
  it("throws when no JSON found", () => {
    expect(() => parseLastJsonLine("plain text\nno json")).toThrow(SyntaxError);
  });
});

describe("pickFreePort", () => {
  it("returns base port when no profiles exist", () => {
    expect(pickFreePort(TMP)).toBe(18790);
  });
  it("skips Vox port + ports listed in systemd env files", () => {
    // Vox config (port 18789)
    mkdirSync(path.join(TMP, ".openclaw"), { recursive: true });
    writeFileSync(
      path.join(TMP, ".openclaw", "openclaw.json"),
      JSON.stringify({ gateway: { port: 18789 } }),
    );
    // Systemd env files are the SoT for live profile ports
    const envDir = path.join(TMP, ".openclaw", "gateway", "bots");
    mkdirSync(envDir, { recursive: true });
    writeFileSync(path.join(envDir, "foo.env"), "OPENCLAW_GATEWAY_PORT=18790\n");
    writeFileSync(path.join(envDir, "bar.env"), "OPENCLAW_GATEWAY_PORT=18791\n");
    expect(pickFreePort(TMP)).toBe(18792);
  });

  it("ignores stale gateway.port in profile openclaw.json (those copy Vox verbatim)", () => {
    mkdirSync(path.join(TMP, ".openclaw"), { recursive: true });
    writeFileSync(
      path.join(TMP, ".openclaw", "openclaw.json"),
      JSON.stringify({ gateway: { port: 18789 } }),
    );
    // Profile config copied from Vox — has stale 18789, must not double-block
    mkdirSync(path.join(TMP, ".openclaw-foo"), { recursive: true });
    writeFileSync(
      path.join(TMP, ".openclaw-foo", "openclaw.json"),
      JSON.stringify({ gateway: { port: 18789 } }),
    );
    // Env file defines real port
    const envDir = path.join(TMP, ".openclaw", "gateway", "bots");
    mkdirSync(envDir, { recursive: true });
    writeFileSync(path.join(envDir, "foo.env"), "OPENCLAW_GATEWAY_PORT=18790\n");
    expect(pickFreePort(TMP)).toBe(18791);
  });
});

describe("readProfileStatus", () => {
  it("returns null when profile dir missing", () => {
    expect(readProfileStatus("ghost", TMP)).toBeNull();
  });
  it("extracts chat_id, skills, port from connected profile", () => {
    mkdirSync(path.join(TMP, ".openclaw-foo"), { recursive: true });
    writeFileSync(
      path.join(TMP, ".openclaw-foo", "openclaw.json"),
      JSON.stringify({
        gateway: { port: 18792 },
        channels: { telegram: { groups: { "-100123456": { requireMention: false } } } },
        plugins: { allow: ["knowledge-sync-commands", "clarification-commands"] },
      }),
    );
    expect(readProfileStatus("foo", TMP)).toEqual({
      chat_id: -100123456,
      port: 18792,
      skills: ["knowledge-sync-commands", "clarification-commands"],
    });
  });
});

describe("telegramGetMe", () => {
  it("returns username on ok response", async () => {
    const fakeFetch = (async (_url: string) => ({
      ok: true,
      json: async () => ({ ok: true, result: { username: "test_bot", id: 123 } }),
    } as unknown as Response));
    const r = await telegramGetMe("1:" + "A".repeat(35), fakeFetch as typeof fetch);
    expect(r.username).toBe("test_bot");
  });
  it("throws BotConnectError on Telegram 401", async () => {
    const fakeFetch = (async () => ({
      ok: false,
      status: 401,
      json: async () => ({ ok: false, description: "Unauthorized" }),
    } as unknown as Response));
    await expect(
      telegramGetMe("1:" + "A".repeat(35), fakeFetch as typeof fetch),
    ).rejects.toMatchObject({ code: "telegram_getme_failed" });
  });
});

describe("runBootstrap", () => {
  it("invokes script with expected flags + returns parsed result (dry-run echo)", async () => {
    // Use a tiny bash echo as fake script
    const fakeScript = path.join(TMP, "fake-bootstrap.sh");
    writeFileSync(
      fakeScript,
      "#!/bin/bash\nprintf '{\"success\":true,\"area\":\"%s\",\"port\":%s,\"profile_dir\":\"/tmp/x\",\"systemd_unit\":\"openclaw-gateway@%s.service\",\"dry_run\":true}\\n' \"${@: -2:1}\" \"${@: -1:1}\" \"${@: -2:1}\"\n",
      { mode: 0o755 },
    );
    const r = await runBootstrap(
      {
        area: "testarea",
        port: 18999,
        token: "1:" + "A".repeat(35),
        chatId: -100123,
        allowFrom: ["111"],
        skills: ["knowledge-sync-commands"],
        dryRun: true,
      },
      fakeScript,
    );
    expect(r.area).toBe("testarea");
    expect(r.port).toBe(18999);
    expect(r.dry_run).toBe(true);
  });
  it("rejects with bootstrap_failed on non-zero exit", async () => {
    const fakeScript = path.join(TMP, "fake-fail.sh");
    writeFileSync(fakeScript, "#!/bin/bash\necho oops >&2\nexit 1\n", { mode: 0o755 });
    await expect(
      runBootstrap(
        { area: "a", port: 1, token: "t", chatId: 1, allowFrom: [], skills: [], dryRun: true },
        fakeScript,
      ),
    ).rejects.toMatchObject({ code: "bootstrap_failed" });
  });
});

describe("BotConnectError", () => {
  it("preserves code field", () => {
    const e = new BotConnectError("port_pool_exhausted", "msg");
    expect(e.code).toBe("port_pool_exhausted");
    expect(e.name).toBe("BotConnectError");
  });
});
