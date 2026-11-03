/**
 * Reader for the Skill V2 knowledge-watcher state.json.
 *
 * The watcher (F1 commit-watcher cron + F2/F4 cli) writes a single state.json
 * at ~/.openclaw/knowledge-watcher/state.json. Schema:
 *
 *   { version: 2, repos: { <slug>: { last_commit_processed, last_run_at,
 *       gaps_open, gaps_dismissed_total, retirement_keep_until, gaps: { <id>: {...} } } },
 *     global: { last_full_audit_at, f1_telegram_digest_seq } }
 *
 * Each gap entry has source ∈ {f1, f4}, status ∈ {open, dismissed, snoozed,
 * accepted, retired, kept_permanent}, doc_type, path, draft_branch, ts.
 *
 * MC reads this on demand. File typically <100KB.
 */

import { promises as fs } from 'node:fs';
import { PATHS } from './paths';

export interface KwGap {
  gap_id: string;
  repo: string;
  source: 'f1' | 'f4';
  status: 'open' | 'dismissed' | 'snoozed' | 'accepted' | 'retired' | 'kept_permanent';
  doc_type: string | null;
  commit_sha: string | null;
  path: string;
  draft_branch: string | null;
  created_at: string;
  snooze_until: string | null;
}

export interface KwRepo {
  last_commit_processed: string | null;
  last_run_at: string | null;
  gaps_open: number;
  gaps_dismissed_total: number;
  retirement_keep_until: Record<string, string>;
  gaps: Record<string, KwGap>;
}

export interface KwState {
  version: number;
  repos: Record<string, KwRepo>;
  global: {
    last_full_audit_at: string | null;
    f1_telegram_digest_seq: number;
  };
}

export interface KwCostSummary {
  f3_cost_mtd_usd: number;
  f3_cost_lifetime_usd: number;
  budget_remaining_mtd_usd: number;
  budget_monthly_usd: number;
}

export interface KwSummary {
  state: KwState | null;
  totals: {
    repos: number;
    gaps_open: number;
    gaps_by_source: { f1: number; f4: number };
    gaps_by_doc_type: Record<string, number>;
    last_full_audit_at: string | null;
  };
  cost: KwCostSummary;
  per_repo: Array<{
    slug: string;
    last_run_at: string | null;
    gaps_open: number;
    gaps_dismissed_total: number;
  }>;
  recent_gaps: KwGap[];
}

export async function readKwState(
  filePath: string = PATHS.kwState,
): Promise<KwState | null> {
  let raw: string;
  try {
    raw = await fs.readFile(filePath, 'utf-8');
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') return null;
    throw err;
  }
  return JSON.parse(raw) as KwState;
}

const BUDGET_MONTHLY_USD = 5.0;

function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function computeCostSummary(state: KwState | null): KwCostSummary {
  const g = (state?.global ?? {}) as Record<string, unknown>;
  const history = (g.f3_cost_history ?? {}) as Record<string, number>;
  const lifetime = Number(g.f3_cost_total_lifetime_usd ?? 0);
  const mtd = Number(history[monthKey(new Date())] ?? 0);
  return {
    f3_cost_mtd_usd: Math.round(mtd * 10000) / 10000,
    f3_cost_lifetime_usd: Math.round(lifetime * 10000) / 10000,
    budget_remaining_mtd_usd: Math.round(Math.max(BUDGET_MONTHLY_USD - mtd, 0) * 10000) / 10000,
    budget_monthly_usd: BUDGET_MONTHLY_USD,
  };
}

export async function summarizeKwState(
  filePath: string = PATHS.kwState,
): Promise<KwSummary> {
  const state = await readKwState(filePath);
  if (!state) {
    return {
      state: null,
      totals: {
        repos: 0,
        gaps_open: 0,
        gaps_by_source: { f1: 0, f4: 0 },
        gaps_by_doc_type: {},
        last_full_audit_at: null,
      },
      cost: computeCostSummary(null),
      per_repo: [],
      recent_gaps: [],
    };
  }

  const repos = state.repos ?? {};
  const slugs = Object.keys(repos).sort();
  const allGaps: KwGap[] = [];
  const bySource = { f1: 0, f4: 0 };
  const byDocType: Record<string, number> = {};

  for (const slug of slugs) {
    const repoData = repos[slug];
    const gaps = Object.values(repoData.gaps ?? {});
    for (const g of gaps) {
      if (g.status !== 'open') continue;
      allGaps.push(g);
      bySource[g.source] = (bySource[g.source] ?? 0) + 1;
      const dt = g.doc_type ?? 'unknown';
      byDocType[dt] = (byDocType[dt] ?? 0) + 1;
    }
  }

  const recentGaps = [...allGaps]
    .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
    .slice(0, 20);

  return {
    state,
    totals: {
      repos: slugs.length,
      gaps_open: allGaps.length,
      gaps_by_source: bySource,
      gaps_by_doc_type: byDocType,
      last_full_audit_at: state.global?.last_full_audit_at ?? null,
    },
    cost: computeCostSummary(state),
    per_repo: slugs.map((slug) => {
      const r = repos[slug];
      return {
        slug,
        last_run_at: r.last_run_at,
        gaps_open: r.gaps_open ?? 0,
        gaps_dismissed_total: r.gaps_dismissed_total ?? 0,
      };
    }),
    recent_gaps: recentGaps,
  };
}
