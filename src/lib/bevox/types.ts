/**
 * Shared TypeScript types for the Bevox data layer.
 *
 * These types describe the shapes of on-disk artifacts produced by the
 * knowledge-sync skill (state.json, snapshots index, events.jsonl). They are
 * derived from a real state.json captured at 2026-04-10 as the Task 5 fixture;
 * if the skill changes its output schema, update this file and the affected
 * fixtures in lockstep.
 *
 * SnapshotEntry and ApprovalSummary are defined here as the eventual contracts
 * for Tasks 6 and 9 — concrete fields get added when those tasks populate them.
 */

// ---------------------------------------------------------------------------
// knowledge-sync state.json
// ---------------------------------------------------------------------------

export type HealthLevel = 'ok' | 'degraded' | 'critical';
export type IssueSeverity = 'info' | 'warn' | 'error';

export interface KsHealthIssue {
  code: string;
  severity: IssueSeverity;
  message?: string;
}

export interface KsBranchInfo {
  current: string;
  tracking: string | null;
  head_sha: string;
  tracking_head_sha: string | null;
  detached: boolean;
  ahead: number;
  behind: number;
}

export interface KsWorkingTree {
  clean: boolean;
  modified: string[];
  untracked: string[];
  staged: string[];
}

export interface KsGitOperations {
  merge_in_progress: boolean;
  rebase_in_progress: boolean;
  cherry_pick_in_progress: boolean;
}

export interface KsConflicts {
  potential: boolean;
  files: string[];
  reason: string | null;
}

export interface KsDraftBranch {
  name: string;
  head_sha?: string;
  last_commit_at?: string;
  last_commit_age_days?: number;
}

export interface KsRemote {
  name: string;
  url: string;
}

export interface KsLast {
  fetch_at: string | null;
  fetch_status: 'ok' | 'failed' | null;
  pull_at: string | null;
  pull_status: 'ok' | 'failed' | null;
  commit_at: string | null;
  commit_sha: string | null;
  push_at: string | null;
  push_status: 'ok' | 'failed' | null;
}

export interface KsWatcher {
  ran_at: string;
  duration_ms: number;
  errors: string[];
}

/**
 * Full shape of ~/.openclaw/knowledge-sync/state.json.
 * Matches the real file at schema version 1.
 */
export interface KsState {
  version: number;
  observed_at: string;
  clone_path: string;
  remote: KsRemote;
  branch: KsBranchInfo;
  working_tree: KsWorkingTree;
  git_operations: KsGitOperations;
  draft_branches: KsDraftBranch[];
  conflicts: KsConflicts;
  health: {
    overall: HealthLevel;
    issues: KsHealthIssue[];
  };
  last: KsLast;
  watcher: KsWatcher;
}

// ---------------------------------------------------------------------------
// Snapshot index (shape aligned to the real snapshots-index.jsonl of the
// knowledge-sync skill — captured 2026-04-10. Delta vs original plan sketch:
// the real file uses `ts` not `created_at`, `path` as natural key instead of
// `id`, `auto-hourly` instead of `auto`, and adds head_sha/branches/tags/
// sha256/verified_at. There is no `pre_action` field — the pre-canonical
// commit type is encoded in the filename pattern.)
// ---------------------------------------------------------------------------

export type SnapshotType = 'auto-hourly' | 'manual' | 'pre-canonical';
export type SnapshotVerifyStatus = 'ok' | 'failed' | 'pending';

export interface SnapshotEntry {
  ts: string;
  type: SnapshotType;
  path: string;
  size_bytes: number;
  head_sha: string;
  branches: string[];
  tags: string[];
  sha256: string;
  verify_status: SnapshotVerifyStatus;
  verified_at: string | null;
}

// ---------------------------------------------------------------------------
// Approval summary (Task 9 will derive this from indexed events)
// ---------------------------------------------------------------------------

export type ApprovalState =
  | 'pending'
  | 'granted'
  | 'executed'
  | 'rejected'
  | 'expired';

export interface ApprovalSummary {
  approval_id: string;
  short_id: string;
  action: string;
  state: ApprovalState;
  created_at: string;
  age_seconds: number;
  /** Full card v2 JSON when available (rendered as 6-block inline). */
  card?: unknown;
}
