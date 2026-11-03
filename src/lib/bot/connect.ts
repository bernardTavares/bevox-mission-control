/**
 * Helpers for Telegram bot connect flow (MC backend).
 *
 * Spec: bevox-knowledge/35_specs/company-os/2026-04-27-mc-project-bot-connect.md §4.1-4.3
 */
import { spawn } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

export const BOOTSTRAP_SCRIPT =
  process.env.OPENCLAW_BOOTSTRAP_SCRIPT ??
  path.join(os.homedir(), ".openclaw", "scripts", "bootstrap-telegram-agent.sh");

const TOKEN_RE = /^\d+:[A-Za-z0-9_-]{30,}$/;
const TELEGRAM_API = "https://api.telegram.org";
const PORT_BASE = 18790;
const PORT_CAP = 18999;

export function validateToken(t: string): boolean {
  return TOKEN_RE.test(t);
}

export class BotConnectError extends Error {
  constructor(
    public code:
      | "telegram_getme_failed"
      | "port_pool_exhausted"
      | "bootstrap_failed"
      | "cli_spawn_failed",
    message: string,
    public stderr?: string,
  ) {
    super(message);
    this.name = "BotConnectError";
  }
}

export async function telegramGetMe(
  token: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ username: string; id: number }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5000);
  try {
    const res = await fetchImpl(`${TELEGRAM_API}/bot${token}/getMe`, {
      signal: ctrl.signal,
    });
    if (!res.ok) {
      throw new BotConnectError(
        "telegram_getme_failed",
        `Telegram getMe returned ${res.status}`,
      );
    }
    const body = (await res.json()) as { ok: boolean; result?: { username: string; id: number }; description?: string };
    if (!body.ok || !body.result?.username) {
      throw new BotConnectError(
        "telegram_getme_failed",
        body.description ?? "Telegram getMe ok=false",
      );
    }
    return { username: body.result.username, id: body.result.id };
  } catch (e) {
    if (e instanceof BotConnectError) throw e;
    throw new BotConnectError(
      "telegram_getme_failed",
      e instanceof Error ? e.message : String(e),
    );
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Find next free port for a new bot profile. Returns PORT_BASE if no profiles exist.
 *
 * Source-of-truth for the *actual* listening port is `OPENCLAW_GATEWAY_PORT` in
 * each profile's systemd env file (~/.openclaw/gateway/bots/<area>.env), NOT
 * `gateway.port` in the profile's openclaw.json (which is copied verbatim from
 * Vox config and stays stale).
 *
 * We scan env files + reserve Vox's port (from its config). Cap at PORT_CAP;
 * throws BotConnectError("port_pool_exhausted") if exceeded.
 */
export function pickFreePort(home: string = os.homedir()): number {
  const used = new Set<number>();

  // Reserve Vox base port (from ~/.openclaw/openclaw.json gateway.port)
  try {
    const voxCfg = path.join(home, ".openclaw", "openclaw.json");
    if (fs.existsSync(voxCfg)) {
      const parsed = JSON.parse(fs.readFileSync(voxCfg, "utf-8")) as {
        gateway?: { port?: number };
      };
      if (typeof parsed.gateway?.port === "number") used.add(parsed.gateway.port);
    }
  } catch {
    /* skip */
  }

  // Scan systemd env files for OPENCLAW_GATEWAY_PORT — these are the live ports
  const envDir = path.join(home, ".openclaw", "gateway", "bots");
  if (fs.existsSync(envDir)) {
    let envEntries: string[] = [];
    try { envEntries = fs.readdirSync(envDir); } catch { /* skip */ }
    for (const name of envEntries) {
      if (!name.endsWith(".env")) continue;
      try {
        const contents = fs.readFileSync(path.join(envDir, name), "utf-8");
        const m = contents.match(/^OPENCLAW_GATEWAY_PORT=(\d+)\s*$/m);
        if (m) used.add(Number(m[1]));
      } catch {
        /* skip */
      }
    }
  }

  for (let p = PORT_BASE; p <= PORT_CAP; p++) {
    if (!used.has(p)) return p;
  }
  throw new BotConnectError(
    "port_pool_exhausted",
    `no free port in [${PORT_BASE}, ${PORT_CAP}]`,
  );
}

export function parseLastJsonLine(s: string): unknown {
  const trimmed = s.trim();
  if (!trimmed) return {};
  try {
    return JSON.parse(trimmed);
  } catch {
    /* fall through */
  }
  const lines = trimmed.split("\n").reverse();
  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith("{") || t.startsWith("[")) {
      try {
        return JSON.parse(t);
      } catch {
        /* keep trying */
      }
    }
  }
  throw new SyntaxError("no JSON found in stdout");
}

export interface BootstrapArgs {
  area: string;
  port: number;
  token: string;
  chatId: number;
  allowFrom: string[];
  skills: string[];
  /** Test hook — when true passes --dry-run to the script (skips systemd). */
  dryRun?: boolean;
}

export interface BootstrapResult {
  area: string;
  port: number;
  profile_dir: string;
  systemd_unit: string;
  dry_run: boolean;
}

export function runBootstrap(
  args: BootstrapArgs,
  scriptPath: string = BOOTSTRAP_SCRIPT,
): Promise<BootstrapResult> {
  return new Promise((resolve, reject) => {
    const flags: string[] = [
      "--token", args.token,
      "--chat-id", String(args.chatId),
      "--allow-from", args.allowFrom.join(","),
      "--skills", args.skills.join(","),
      "--non-interactive", "--json",
    ];
    if (args.dryRun) flags.push("--dry-run");
    flags.push(args.area, String(args.port));
    const child = spawn(scriptPath, flags, { timeout: 60_000 });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => { stdout += d.toString(); });
    child.stderr.on("data", (d) => { stderr += d.toString(); });
    child.on("error", (err) => {
      reject(new BotConnectError("cli_spawn_failed", err.message));
    });
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new BotConnectError(
          "bootstrap_failed",
          `bootstrap exit ${code}`,
          stderr.slice(0, 4000),
        ));
        return;
      }
      try {
        const payload = parseLastJsonLine(stdout) as Partial<BootstrapResult> & {
          success?: boolean;
        };
        if (!payload.success || !payload.area || !payload.profile_dir) {
          throw new Error("malformed bootstrap output");
        }
        resolve({
          area: payload.area,
          port: payload.port ?? args.port,
          profile_dir: payload.profile_dir,
          systemd_unit: payload.systemd_unit ?? `openclaw-gateway@${args.area}.service`,
          dry_run: payload.dry_run ?? false,
        });
      } catch (e) {
        reject(new BotConnectError(
          "bootstrap_failed",
          `parse output failed: ${e instanceof Error ? e.message : String(e)}`,
          stderr.slice(0, 4000),
        ));
      }
    });
  });
}

/**
 * Read a connected profile's openclaw.json and extract status fields.
 * Returns null if profile dir / config missing.
 */
export function readProfileStatus(area: string, home: string = os.homedir()): {
  chat_id: number | null;
  skills: string[];
  port: number | null;
} | null {
  const cfgPath = path.join(home, `.openclaw-${area}`, "openclaw.json");
  if (!fs.existsSync(cfgPath)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(cfgPath, "utf-8")) as {
      gateway?: { port?: number };
      channels?: { telegram?: { groups?: Record<string, unknown> } };
      plugins?: { allow?: string[] };
    };
    const groups = parsed.channels?.telegram?.groups ?? {};
    const firstChat = Object.keys(groups)[0];
    return {
      chat_id: firstChat ? Number(firstChat) : null,
      skills: parsed.plugins?.allow ?? [],
      port: parsed.gateway?.port ?? null,
    };
  } catch {
    return null;
  }
}
