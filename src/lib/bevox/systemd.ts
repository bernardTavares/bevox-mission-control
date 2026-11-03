/**
 * Thin wrappers around `systemctl --user` for read-only introspection.
 *
 * Used by the Health module to surface the state of knowledge-sync timers
 * and (eventually) the mission-control.service itself. No mutation here —
 * start/stop/restart live outside the app's trust boundary.
 *
 * `systemctl --user list-timers --output=json` returns an array of objects
 * with microsecond-precision epoch timestamps for next/left/last/passed.
 * We pass them through as-is; formatting and "stale?" judgement happen in
 * the Health aggregator (Task 9), not here.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const DEFAULT_SYSTEMCTL_TIMEOUT_MS = 3000;

/**
 * A single entry from `systemctl --user list-timers --all --output=json`.
 * The numeric fields are microseconds since unix epoch (systemd convention).
 */
export interface TimerInfo {
  unit: string;
  activates: string;
  next: number;
  left: number;
  last: number;
  passed: number;
}

/**
 * List all user timers visible to the current user.
 *
 * Returns an empty array when systemctl is not present or the call fails —
 * the caller decides what to do with an empty list. A hard failure would
 * make the Health page unusable just because, for example, the service
 * manager is not available in a dev environment.
 */
export async function listUserTimers(): Promise<TimerInfo[]> {
  try {
    const { stdout } = await execFileAsync(
      'systemctl',
      ['--user', 'list-timers', '--all', '--output=json'],
      { timeout: DEFAULT_SYSTEMCTL_TIMEOUT_MS },
    );
    const parsed = JSON.parse(stdout) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as TimerInfo[];
  } catch {
    return [];
  }
}

/**
 * Active-state of a single unit.
 * Maps systemctl's output to a narrow union; everything else becomes 'unknown'.
 */
export type UnitStatus = 'active' | 'inactive' | 'failed' | 'unknown';

export async function unitStatus(unit: string): Promise<UnitStatus> {
  try {
    const { stdout } = await execFileAsync(
      'systemctl',
      ['--user', 'is-active', unit],
      { timeout: DEFAULT_SYSTEMCTL_TIMEOUT_MS },
    );
    const s = stdout.trim();
    if (s === 'active' || s === 'inactive' || s === 'failed') return s;
    return 'unknown';
  } catch (err) {
    // `systemctl is-active` exits non-zero when the unit is inactive/failed.
    // Parse the stdout if the error carries it, otherwise fall back.
    const stdout = (err as { stdout?: string | Buffer } | undefined)?.stdout;
    if (stdout) {
      const s = stdout.toString().trim();
      if (s === 'active' || s === 'inactive' || s === 'failed') return s;
    }
    return 'inactive';
  }
}
