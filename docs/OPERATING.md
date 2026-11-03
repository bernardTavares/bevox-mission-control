# Mission Control — Operating Notes

> Operational gotchas observed running Mission Control in production
> on Bernard's host. Tom operacional, nao arquitetural. Atualizar so
> com findings reais ja documentados.

## 1. systemd user PATH does not include `~/.npm-global/bin`

The systemd user manager exposes a minimal PATH that does **not** include
`~/.npm-global/bin`. Any user unit that invokes a binary installed via
`npm install -g` (for example the `openclaw` CLI symlinked at
`~/.npm-global/bin/openclaw`) will fail with:

```
/bin/sh: 1: openclaw: not found
```

**Fix:** add an explicit `Environment=PATH=...` to the unit:

```ini
[Service]
Environment=PATH=/home/you/.npm-global/bin:/home/you/.local/bin:/usr/local/bin:/usr/bin:/bin
```

**Pattern observed in:** `openclaw-cost-collector.service` (E9 wave 1).

## 2. Cloudflare Access requires header in local smokes

The host is behind Cloudflare Access in dev. Plain `curl` against any
Mission Control endpoint returns `403 Forbidden` with body
`{"error":"Forbidden","message":"Cloudflare Access required"}`.

**Fix:** pass the trusted email header (matches `MC_ACCESS_ALLOWLIST` in
`.env.local`):

```bash
curl -H "Cf-Access-Authenticated-User-Email: you@example.com" \
     http://127.0.0.1:4310/api/<endpoint>
```

The same applies to all `/api/*` and dashboard routes (`/health`,
`/costs`, `/finance`) when smoke-testing locally.

## 3. `next start` uses a frozen build — rebuild before restart

`mission-control.service` runs `next start` against the prebuilt
`.next/` directory. A plain `systemctl --user restart mission-control.service`
**does not** pick up TS edits — the bundle stays frozen at the last
build.

Symptom observed in E9 wave 1: `usage-queries.ts` was edited to read
`USAGE_DB_PATH` from env, but `/api/costs` continued returning the
"No usage data collected yet" branch because the running bundle still
had the old hardcoded `process.cwd()/data/usage-tracking.db`.

**Correct procedure for any TS edit deploy:**

```bash
cd /home/you/code/mission-control && \
  npm run build && \
  systemctl --user restart mission-control.service
```

`npm run build` is mandatory before `restart`.

---

**References:**
- E9 wave 1 spec §12 (operational findings):
  `bevox-knowledge/35_specs/openclaw/2026-04-14-e9-cost-usage-wave-1.md`
