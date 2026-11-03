/**
 * Thin wrappers around `git` commands targeting the bevox-knowledge clone.
 *
 * Only read operations. Mission Control never writes to the clone — the
 * knowledge-sync skill owns all mutations (per ADR-006). These helpers are
 * used by the Knowledge module and the Last Commit widget.
 *
 * Each call spawns a git subprocess with `execFile` (not `exec`) to avoid
 * shell interpolation. Output is parsed line-by-line into small TypeScript
 * structures. Timeouts are short (3–5s) because any command on the local
 * clone should be near-instant.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { PATHS } from './paths';

const execFileAsync = promisify(execFile);

const DEFAULT_GIT_TIMEOUT_MS = 5000;

export interface GitCommitInfo {
  sha: string;
  short_sha: string;
  subject: string;
  author: string;
  /** Unix commit time (seconds since epoch). */
  committed_at: number;
  /** Seconds since the commit. Computed from committed_at on each call. */
  age_seconds: number;
}

/**
 * Return info about the HEAD commit of a local clone.
 *
 * @param repo Path to a git repository. Defaults to PATHS.bevoxKnowledgeClone.
 * @returns Commit info parsed from `git log -1 --format=...`.
 * @throws if git is not installed, the path is not a repo, or the repo has
 *         no commits yet.
 */
export async function lastCommit(
  repo: string = PATHS.bevoxKnowledgeClone,
): Promise<GitCommitInfo> {
  const { stdout } = await execFileAsync(
    'git',
    ['-C', repo, 'log', '-1', '--format=%H%n%h%n%s%n%an%n%ct'],
    { timeout: DEFAULT_GIT_TIMEOUT_MS },
  );
  const [sha, short_sha, subject, author, ctStr] = stdout.trim().split('\n');
  const committed_at = Number.parseInt(ctStr, 10);
  const now = Math.floor(Date.now() / 1000);
  return {
    sha,
    short_sha,
    subject,
    author,
    committed_at,
    age_seconds: now - committed_at,
  };
}

/**
 * Return the current branch name of a local clone.
 *
 * Returns `'HEAD'` when the repository is in detached-HEAD state.
 */
export async function currentBranch(
  repo: string = PATHS.bevoxKnowledgeClone,
): Promise<string> {
  const { stdout } = await execFileAsync(
    'git',
    ['-C', repo, 'rev-parse', '--abbrev-ref', 'HEAD'],
    { timeout: 3000 },
  );
  return stdout.trim();
}
