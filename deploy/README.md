# Deploy — Bevox Mission Control

Operational runbook for the local systemd deployment of Mission Control.

| | |
|---|---|
| **Service name** | `mission-control.service` |
| **Scope** | systemd user service (linger-enabled — no active login required) |
| **Port** | `127.0.0.1:4310` (loopback only — never `0.0.0.0`) |
| **Host** | Bernard's machine; one instance only |
| **Auth** | Cloudflare Tunnel + Access (Task 17). The service itself trusts `Cf-Access-Authenticated-User-Email` via `src/middleware.ts`. |
| **Env file** | `~/code/mission-control/.env.local` (gitignored). Holds `MC_ACCESS_ALLOWLIST` and the `NEXT_PUBLIC_*` branding overrides. |
| **Code** | `~/code/mission-control/` |
| **Upstream** | hard fork of `carlosazaustre/tenacitOS` at `b021506…` (see `LICENSE`) |

## Why port 4310

High, unprivileged, outside the 3000 / 4000-4099 range that upstream
TenacitOS uses for its dev tools. If you ever change it, edit:

1. `deploy/mission-control.service` (`ExecStart -p`)
2. `deploy/README.md` (this file)
3. `deploy/cloudflared-config.yml` (Task 17; will point at the new port)

## Prerequisites

- Linger enabled for the user: `loginctl show-user $USER | grep Linger`
  must report `Linger=yes`. If it doesn't, run `loginctl enable-linger
  $USER`.
- `~/code/mission-control/.env.local` exists with at least
  `MC_ACCESS_ALLOWLIST=<your-email>`. Copy the template from
  `.env.example` and fill in.
- Production build exists: `cd ~/code/mission-control && npm install &&
  npm run build`. The unit's `ExecStart` uses `next start`, which
  requires a prior `next build`.

## First-time install

```bash
cd ~/code/mission-control

# 1. Install the unit file to the systemd user directory.
mkdir -p ~/.config/systemd/user
cp deploy/mission-control.service ~/.config/systemd/user/

# 2. Tell systemd to re-read unit files.
systemctl --user daemon-reload

# 3. Enable (start on boot) and start now.
systemctl --user enable --now mission-control.service

# 4. Check status.
systemctl --user status mission-control.service
```

Expected: `active (running)` plus the `next start` log line showing
`▲ Next.js 16.1.6  - Local: http://127.0.0.1:4310`.

## Smoke test (local)

Before exposing via Cloudflare (Task 17), confirm the service responds
on loopback:

```bash
# Public endpoint — no Cf-Access header required
curl -i http://127.0.0.1:4310/api/health

# Protected endpoint — requires the Cf-Access header
curl -i -H "Cf-Access-Authenticated-User-Email: you@example.com" \
  http://127.0.0.1:4310/

# Denial (no header) — must be 403
curl -i http://127.0.0.1:4310/
```

## Update flow

```bash
cd ~/code/mission-control

git pull
npm install
npm run build

# Restart to pick up the new build + node_modules.
systemctl --user restart mission-control.service

# Tail logs to verify startup is clean.
journalctl --user -u mission-control.service -f
```

## Rollback

```bash
cd ~/code/mission-control

git log --oneline | head           # pick a known-good SHA
git checkout <previous-sha>

npm install
npm run build

systemctl --user restart mission-control.service
```

Rollback is also reversible the same way — `git checkout main` + rebuild
+ restart.

## Stop / disable

```bash
# Temporary stop — survives until next reboot / manual start.
systemctl --user stop mission-control.service

# Permanent disable — removes from default.target, no start on boot.
systemctl --user disable mission-control.service

# Remove entirely — delete the unit file and reload.
systemctl --user stop mission-control.service
systemctl --user disable mission-control.service
rm ~/.config/systemd/user/mission-control.service
systemctl --user daemon-reload
```

## Logs

```bash
# Tail live
journalctl --user -u mission-control.service -f

# Last 100 lines
journalctl --user -u mission-control.service -n 100

# Since a specific time
journalctl --user -u mission-control.service --since "2026-04-11 00:00"
```

The unit sets `SyslogIdentifier=mission-control`, so you can also filter
by identifier across all units:

```bash
journalctl --user -t mission-control -f
```

## Troubleshooting

### Service fails to start

1. `systemctl --user status mission-control.service` — look at the
   `Active:` line and the last few log lines.
2. `journalctl --user -u mission-control.service -n 100` — scan for
   stack traces from `next start`.
3. Common causes:
   - No production build: run `npm run build` and restart.
   - Missing `.env.local`: copy from `.env.example`.
   - `node_modules` mismatch: `rm -rf node_modules package-lock.json &&
     npm install && npm run build && systemctl --user restart
     mission-control.service`.
   - Port 4310 already taken: `ss -tlnp | grep 4310`. Kill the other
     process or change the port (see "Why port 4310").

### Service is running but HTTP fails

1. `curl -i http://127.0.0.1:4310/api/health` — should return 200 and
   a JSON body. If it hangs, the process is probably still booting
   (Next.js takes 1-5s).
2. Confirm the middleware trust works:
   `curl -i http://127.0.0.1:4310/` must return **403** without the
   Cf-Access header and **200** with a valid email header.
3. If `/api/health` returns 200 but `/` returns 403 even with a valid
   header, check that the allowlist in `.env.local` matches the email
   you're passing, case-insensitively.

### Reaching the service from outside

External reach is configured via Cloudflare Tunnel + Cloudflare Access
(see the next section). Before Task 17 landed, the service was only
reachable on `127.0.0.1:4310` from the host itself.

---

## Cloudflare Tunnel + Access

The Mission Control is exposed externally at **`https://mc.example.com`**
behind Cloudflare Tunnel + Cloudflare Access. There is no app-level
login — the trust boundary is at the Cloudflare edge and the middleware
in `src/middleware.ts` validates the
`Cf-Access-Authenticated-User-Email` header against `MC_ACCESS_ALLOWLIST`.

### Deployment layout

```
Browser  →  Cloudflare edge  →  Cloudflare Access policy (email allowlist)
                ↓  adds Cf-Access-Authenticated-User-Email header
                ↓  drops anyone else
Cloudflare Tunnel (cloudflared.service, system-wide)
                ↓  ingress rule for hostname: mc.example.com
Localhost http://127.0.0.1:4310
                ↓
mission-control.service (systemd user unit — Task 16)
```

### Tunnel — current setup on Bernard's host

On Bernard's machine we **reuse** the existing `my-tunnel` tunnel
(already serving `chat.example.com`, `ssh.example.com`, `example.com` and the
`*.example.com` wildcard) rather than creating a new tunnel. The edit is
a single ingress rule inserted BEFORE the wildcard in
`/etc/cloudflared/config.yml`:

```yaml
  - hostname: mc.example.com
    service: http://localhost:4310
```

**Order matters** — cloudflared evaluates ingress rules top-to-bottom
and the first match wins. If `mc.example.com` were added after the
`*.example.com` wildcard, all traffic would be routed to port 8080
(the example.com main site) instead.

A sanitized template of the ingress block lives in this directory as
`deploy/cloudflared-config.yml`. The live file is at
`/etc/cloudflared/config.yml` (root-owned).

DNS route was added with:

```bash
cloudflared tunnel route dns my-tunnel mc.example.com
```

Apply config changes with:

```bash
sudo systemctl restart cloudflared
sudo systemctl status cloudflared   # expect: active (running)
```

### Cloudflare Access — policy setup (manual, dashboard)

This is the ONLY part of Task 17 that is not scripted. Cloudflare Access
applications must be created via the Cloudflare dashboard (or via the
Cloudflare API with a token — which Bernard does not currently have
configured). Follow these steps exactly:

1. Go to **Cloudflare dashboard → Zero Trust → Access → Applications**.
2. Click **Add an application** → choose **Self-hosted**.
3. **Application configuration:**
   - **Application name:** `Bevox Mission Control`
   - **Session Duration:** `24 hours` (adjust later if noisy)
   - **Application domain:** `mc.example.com`
   - Leave path/subdomain blank.
4. Click **Next**.
5. **Identity providers:** at least one of Google SSO or One-Time PIN
   must be enabled in the Zero Trust account. If neither is, set up
   One-Time PIN first (Zero Trust → Settings → Authentication →
   Login methods).
6. **Add a policy:**
   - **Policy name:** `Allow Bernard`
   - **Action:** `Allow`
   - **Rules / Include / Selector:** `Emails`
   - **Value:** `you@example.com`
7. Click **Next** → **Add application**.
8. Back in the application list, confirm `mc.example.com` shows up with
   the `Allow Bernard` policy attached.

> **Security note**: **until this policy is saved**, the only thing
> gating `mc.example.com` is the app's middleware — which trusts the
> `Cf-Access-Authenticated-User-Email` header. Anyone who knows the
> hostname and a valid email could spoof the header and get in. The
> window of exposure is the time between adding the ingress rule and
> saving the Access application. Keep it short.

### Validation (3 scenarios)

Run these after the Access policy is saved:

```bash
# 1. Anonymous access — must land on a Cloudflare Access login page,
#    NOT on the app's 403. Expected: HTTP 302 redirect to an Access URL.
curl -i https://mc.example.com/ | head -5

# 2. Spoofed Cf-Access header — must be overridden by Cloudflare Access.
#    Expected: same as anonymous. A raw curl cannot "log in" without a
#    service token; this is the important test that the app is NOT
#    reachable by forging the header.
curl -i -H "Cf-Access-Authenticated-User-Email: you@example.com" \
  https://mc.example.com/ | head -5

# 3. Correct login via a browser — open https://mc.example.com, complete
#    the Google/OTP login, verify the Bevox Mission Control home page
#    loads. All 6 widgets should populate within a few seconds.
```

For curl-based testing of the authenticated path after Access is set
up, you need a **Cloudflare Access service token** (Zero Trust →
Access → Service Auth → Service Tokens → Create Service Token) and
attach it to the application's policy with an additional Include rule.
For v1 we skip this — browser login is enough.

### Logs

```bash
# cloudflared
sudo journalctl -u cloudflared -f

# mission-control app
journalctl --user -u mission-control.service -f
```

### Troubleshooting

**`mc.example.com` returns Cloudflare error 502 / 1033** — cloudflared
config is wrong or the tunnel is not running. Check:
```bash
sudo systemctl status cloudflared
sudo cloudflared --config /etc/cloudflared/config.yml tunnel ingress validate
```

**Anonymous access still reaches the app (returns 403 from our
middleware, not 302 to Access login)** — the Access application is not
yet configured or is not scoped to `mc.example.com`. Re-check the
dashboard: the application domain field must be exactly
`mc.example.com` (no https://, no path).

**Spoofed header works** — same as the previous case. Access is not
saving the policy for this hostname.

**Correct browser login gets `Forbidden: Cloudflare Access required`**
from the app — Access is working but the email Cloudflare injects does
not match the allowlist in `.env.local`. Re-check `MC_ACCESS_ALLOWLIST`
(case-insensitive match) and restart the service.
