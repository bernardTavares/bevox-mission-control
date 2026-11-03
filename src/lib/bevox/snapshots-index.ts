/**
 * Reader for the knowledge-sync snapshots index.
 *
 * The snapshot subsystem of the skill writes one JSON line per snapshot to
 * ~/.openclaw/backups/knowledge-snapshots/meta/snapshots-index.jsonl. Each
 * line is a full `SnapshotEntry` (ts, type, path, size, head_sha, branches,
 * tags, sha256, verify_status, verified_at).
 *
 * The file grows over time (hourly snapshots) but stays small at v1 scales.
 * We read all of it on demand and return a plain array. Malformed lines are
 * skipped rather than throwing — the index is append-only and a half-written
 * trailing line during a read is possible.
 */

import { promises as fs } from 'node:fs';
import { PATHS } from './paths';
import type { SnapshotEntry } from './types';

/**
 * Read and parse the snapshots index.
 *
 * @param filePath Absolute path to snapshots-index.jsonl. Defaults to
 *                 PATHS.snapshotsIndex.
 * @returns All valid snapshot entries, in file order. Empty array if the
 *          file does not exist or is empty.
 * @throws only on unexpected filesystem errors (not ENOENT, not parse).
 */
export async function readSnapshotsIndex(
  filePath: string = PATHS.snapshotsIndex,
): Promise<SnapshotEntry[]> {
  let raw: string;
  try {
    raw = await fs.readFile(filePath, 'utf-8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw err;
  }

  const lines = raw.split('\n').filter((line) => line.trim().length > 0);
  const result: SnapshotEntry[] = [];
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line) as SnapshotEntry;
      if (parsed.path && parsed.ts) {
        result.push(parsed);
      }
    } catch {
      // Malformed line — skip silently. The index is append-only, so a
      // partial last line during a concurrent write is expected occasionally.
    }
  }
  return result;
}
