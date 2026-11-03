/**
 * Approval summary derivation from the indexed events.jsonl.
 *
 * The knowledge-sync skill writes one event per state transition of an
 * approval. We never mutate approvals from Mission Control — Telegram is
 * the source of truth (spec §2.2). This module only READS and projects
 * the event log into a list of `ApprovalSummary` objects ready for UI
 * consumption.
 *
 * State is derived strictly from EVENT NAME, not payload contents. The
 * transitions we follow:
 *
 *   pending  (canonical_approval_pending)
 *     ├─ granted  (canonical_approval_granted)
 *     │    └─ executed  (canonical_committed | canonical_pushed
 *     │                  | canonical_marker_created)
 *     ├─ rejected (canonical_approval_rejected)
 *     └─ expired  (TTL exceeded without any of the above)
 *
 * Derivation order (highest precedence first):
 *   executed > rejected > granted > expired > pending
 *
 * An approval that is both granted AND executed is reported as `executed`.
 * An approval that is granted but not yet executed is reported as `granted`
 * (real state of the world, useful for the "granted but not run" card).
 */

import { getDb } from './events-db';
import { indexEventsFile } from './events-indexer';
import type { ApprovalSummary, ApprovalState } from './types';

/** TTL for a pending approval before it is considered expired (seconds). */
export const APPROVAL_TTL_SECONDS = 3600;

const GRANT_EVENT = 'canonical_approval_granted';
const REJECT_EVENT = 'canonical_approval_rejected';
const EXECUTE_EVENTS = [
  'canonical_committed',
  'canonical_pushed',
  'canonical_marker_created',
] as const;

export type ApprovalFilter = 'pending' | 'all';

/**
 * Return approvals visible at this moment.
 *
 * @param filter `'pending'` keeps only rows whose derived state is pending;
 *               `'all'` returns every approval that has ever had a pending
 *               event, regardless of current state.
 * @returns Most-recent first (by created_at, descending).
 */
export async function listApprovals(
  filter: ApprovalFilter = 'pending',
): Promise<ApprovalSummary[]> {
  // Make sure the SQLite index is up-to-date with events.jsonl.
  await indexEventsFile();
  const db = getDb();

  // 1. Every approval_id that ever had a pending event (the universe).
  const pendingRows = db
    .prepare(
      `SELECT ts, payload FROM events
        WHERE event = 'canonical_approval_pending'
        ORDER BY ts DESC`,
    )
    .all() as Array<{ ts: string; payload: string }>;

  // 2. State transition sets, keyed by event NAME (not payload heuristics).
  const placeholders = EXECUTE_EVENTS.map(() => '?').join(', ');
  const resolvedRows = db
    .prepare(
      `SELECT event, payload FROM events
        WHERE event IN (?, ?, ${placeholders})`,
    )
    .all(GRANT_EVENT, REJECT_EVENT, ...EXECUTE_EVENTS) as Array<{
    event: string;
    payload: string;
  }>;

  const grantedIds = new Set<string>();
  const rejectedIds = new Set<string>();
  const executedIds = new Set<string>();

  for (const row of resolvedRows) {
    let approvalId: string | null = null;
    try {
      const payload = JSON.parse(row.payload);
      approvalId =
        typeof payload.approval_id === 'string' ? payload.approval_id : null;
    } catch {
      continue;
    }
    if (!approvalId) continue;

    if (row.event === GRANT_EVENT) grantedIds.add(approvalId);
    else if (row.event === REJECT_EVENT) rejectedIds.add(approvalId);
    else executedIds.add(approvalId); // one of EXECUTE_EVENTS
  }

  // 3. Project each pending row into an ApprovalSummary with derived state.
  const now = Math.floor(Date.now() / 1000);
  const result: ApprovalSummary[] = [];
  const seen = new Set<string>();

  for (const row of pendingRows) {
    let payload: {
      approval_id?: string;
      action?: string;
      card?: unknown;
    };
    try {
      payload = JSON.parse(row.payload);
    } catch {
      continue;
    }
    const approval_id = payload.approval_id;
    if (!approval_id || seen.has(approval_id)) continue;
    seen.add(approval_id);

    const createdEpoch = Math.floor(new Date(row.ts).getTime() / 1000);
    const age_seconds = Number.isFinite(createdEpoch)
      ? now - createdEpoch
      : 0;

    // Derivation order: executed > rejected > granted > expired > pending
    let state: ApprovalState;
    if (executedIds.has(approval_id)) state = 'executed';
    else if (rejectedIds.has(approval_id)) state = 'rejected';
    else if (grantedIds.has(approval_id)) state = 'granted';
    else if (age_seconds > APPROVAL_TTL_SECONDS) state = 'expired';
    else state = 'pending';

    if (filter === 'pending' && state !== 'pending') continue;

    result.push({
      approval_id,
      short_id: approval_id.slice(0, 8),
      action: typeof payload.action === 'string' ? payload.action : '',
      state,
      created_at: row.ts,
      age_seconds,
      card: payload.card ?? null,
    });
  }

  return result;
}
