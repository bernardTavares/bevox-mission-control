/**
 * Health aggregation for the Home dashboard widget and the /health module.
 *
 * Pulls together three inputs:
 *   1. knowledge-sync state.json   (branch / working tree / overall health)
 *   2. systemd user timers         (is the Watcher still running on schedule?)
 *   3. snapshots-index.jsonl       (is an auto-hourly snapshot still fresh?)
 *
 * The output is a small opinionated summary — semaforo level + warning /
 * error counts — that the UI can render without further processing. All
 * thresholds are explicit constants documented inline; the function itself
 * does not know anything about UI.
 */

import { readKsState } from './knowledge-sync-state';
import { readSnapshotsIndex } from './snapshots-index';
import { unitStatus, type UnitStatus } from './systemd';
import type { HealthLevel } from './types';

/** Hourly snapshots older than this count as stale per spec §5.2.4. */
const SNAPSHOT_STALE_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 hours

/** The knowledge-sync systemd timers the Health module watches. */
export const KS_TIMERS = [
  'knowledge-sync-refresh.timer',
  'knowledge-sync-snapshot-hourly.timer',
  'knowledge-sync-verify-daily.timer',
] as const;

export interface HealthTimerEntry {
  unit: string;
  status: UnitStatus;
}

export interface HealthSnapshotsSummary {
  last_auto: string | null;
  last_manual: string | null;
  last_pre_canonical: string | null;
  stale: boolean;
}

export interface HealthOverall {
  level: HealthLevel;
  warnings: number;
  errors: number;
  components: {
    knowledge_sync: HealthLevel;
    timers: HealthTimerEntry[];
    snapshots: HealthSnapshotsSummary;
  };
}

/**
 * Compute the current health snapshot. Never throws — every sub-read
 * degrades gracefully so the Home widget can render something even when
 * one input is broken.
 */
export async function readHealthOverall(): Promise<HealthOverall> {
  let ksLevel: HealthLevel = 'ok';
  let warnings = 0;
  let errors = 0;

  // 1. knowledge-sync state
  try {
    const state = await readKsState();
    ksLevel = state.health.overall;
    for (const issue of state.health.issues ?? []) {
      if (issue.severity === 'warn') warnings++;
      if (issue.severity === 'error') errors++;
    }
  } catch {
    ksLevel = 'critical';
    errors++;
  }

  // 2. systemd timers
  const timers: HealthTimerEntry[] = await Promise.all(
    KS_TIMERS.map(async (unit) => ({ unit, status: await unitStatus(unit) })),
  );
  for (const t of timers) {
    if (t.status === 'failed') errors++;
    else if (t.status === 'inactive') warnings++;
  }

  // 3. snapshots freshness
  let snapshots: HealthSnapshotsSummary = {
    last_auto: null,
    last_manual: null,
    last_pre_canonical: null,
    stale: true,
  };
  try {
    const entries = await readSnapshotsIndex();
    const mostRecentOf = (type: string): string | null => {
      const matches = entries
        .filter((s) => s.type === type)
        .sort((a, b) => b.ts.localeCompare(a.ts));
      return matches[0]?.ts ?? null;
    };
    const lastAuto = mostRecentOf('auto-hourly');
    const lastManual = mostRecentOf('manual');
    const lastPreCanonical = mostRecentOf('pre-canonical');
    const stale = lastAuto
      ? Date.now() - new Date(lastAuto).getTime() > SNAPSHOT_STALE_THRESHOLD_MS
      : true;
    if (stale) warnings++;
    snapshots = {
      last_auto: lastAuto,
      last_manual: lastManual,
      last_pre_canonical: lastPreCanonical,
      stale,
    };
  } catch {
    errors++;
  }

  const level: HealthLevel =
    errors > 0 ? 'critical' : warnings > 0 ? 'degraded' : 'ok';

  return {
    level,
    warnings,
    errors,
    components: {
      knowledge_sync: ksLevel,
      timers,
      snapshots,
    },
  };
}
