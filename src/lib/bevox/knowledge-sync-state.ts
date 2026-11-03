/**
 * Reader for the knowledge-sync state.json.
 *
 * The Watcher of the knowledge-sync skill atomically writes a small JSON
 * snapshot of the operational state of the bevox-knowledge clone (branch,
 * ahead/behind, working tree, health, last fetch/commit/push, etc). Mission
 * Control reads this file on demand — it is the source of truth for the
 * Home status widget and the Knowledge module.
 *
 * The file is small (single-digit KB) and re-read on every request. No
 * caching here; that would just paper over a stale file problem.
 */

import { promises as fs } from 'node:fs';
import { PATHS } from './paths';
import type { KsState } from './types';

/**
 * Read and parse the knowledge-sync state.json.
 *
 * @param filePath Absolute path to state.json. Defaults to PATHS.ksState.
 * @throws with a clear message when the file is missing (ENOENT).
 * @throws the underlying error for any other filesystem or parse failure.
 */
export async function readKsState(
  filePath: string = PATHS.ksState,
): Promise<KsState> {
  let raw: string;
  try {
    raw = await fs.readFile(filePath, 'utf-8');
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      throw new Error(
        `knowledge-sync state.json not found at ${filePath}`,
      );
    }
    throw err;
  }
  return JSON.parse(raw) as KsState;
}

/**
 * Read the previous state.json snapshot, used to diff against the current one.
 *
 * Returns null when the previous file does not exist yet (first Watcher run
 * or after a manual reset). Any other error propagates.
 *
 * @param filePath Absolute path. Defaults to PATHS.ksStatePrevious.
 */
export async function readKsStatePrevious(
  filePath: string = PATHS.ksStatePrevious,
): Promise<KsState | null> {
  try {
    return await readKsState(filePath);
  } catch (err) {
    // readKsState wraps ENOENT in a "not found at <path>" Error — match on
    // that wording to distinguish "no previous snapshot yet" from real errors.
    if (err instanceof Error && /not found at/.test(err.message)) {
      return null;
    }
    throw err;
  }
}
