/**
 * Cloudflare Access trust helpers.
 *
 * Mission Control sits behind a Cloudflare Tunnel + Access policy. Cloudflare
 * authenticates the user at the edge and injects the verified email in the
 * `Cf-Access-Authenticated-User-Email` request header. The app does not run
 * its own login flow, password store, JWT issuer, session, or cookie.
 *
 * If the header is missing, the request did not come through Access (or the
 * Tunnel is misconfigured) and we deny it. If the header is present but the
 * email is not on our allowlist, we deny defensively even though Access should
 * have already filtered it.
 *
 * The allowlist comes from the env var `MC_ACCESS_ALLOWLIST` (comma-separated).
 * Empty allowlist = fail closed.
 */

export const ACCESS_HEADER = 'cf-access-authenticated-user-email';

export function isAllowedAccessUser(
  headers: Headers,
  allowlist: string[],
): boolean {
  if (allowlist.length === 0) return false;
  const raw = headers.get(ACCESS_HEADER);
  if (!raw) return false;
  const email = raw.trim().toLowerCase();
  return allowlist
    .map((entry) => entry.trim().toLowerCase())
    .includes(email);
}

export function getAllowlistFromEnv(): string[] {
  const raw = process.env.MC_ACCESS_ALLOWLIST ?? '';
  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}
