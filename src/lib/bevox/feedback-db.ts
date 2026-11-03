/**
 * Readonly access to the Skill V2 W8 feedback DB.
 *
 * Python skill is the sole writer (better-sqlite3 readonly + immutable=1
 * skips WAL coordination on this side). The DB lives at
 * `~/.openclaw/knowledge-watcher/feedback.db`. If the file does not exist
 * yet (no decisions recorded), returns empty arrays (not an error).
 *
 * Mirrors lib/knowledge_watcher/feedback_stats.py queries.
 */

import Database from 'better-sqlite3';
import fs from 'node:fs';
import { PATHS } from './paths';


export interface DocTypeStat {
  doc_type: string;
  n: number;
  keep_ratio: number;
  retire_ratio: number;
  keep_permanent_ratio: number;
  dismiss_ratio: number;
  accept_ratio: number;
  postpone_ratio: number;
}

export interface SignalComboStat {
  doc_type: string;
  signal_combo: string;
  n: number;
  keep_ratio: number;
  retire_ratio: number;
  keep_permanent_ratio: number;
}

export interface F3DistStat {
  generator: string;
  n: number;
  p50: number;
  p90: number;
  mean: number;
}

export interface FeedbackSummary {
  days: number;
  by_doc_type: DocTypeStat[];
  by_signal_combo: SignalComboStat[];
  f3_edit_distance: F3DistStat[];
}


function open(): Database.Database | null {
  if (!fs.existsSync(PATHS.kwFeedbackDb)) return null;
  try {
    return new Database(PATHS.kwFeedbackDb, { readonly: true, fileMustExist: true });
  } catch {
    return null;
  }
}


function sinceIso(days: number): string {
  return new Date(Date.now() - days * 24 * 3600 * 1000)
    .toISOString().replace(/\.\d{3}/, '');
}


function comboKey(signalsJson: string | null): string {
  if (!signalsJson) return 'none';
  try {
    const arr = JSON.parse(signalsJson) as Array<{ category?: string }>;
    const cats = Array.from(new Set(arr.map(s => (s.category ?? '').split('_')[0])))
      .filter(Boolean).sort();
    return cats.length === 0 ? 'none' : cats.join('+');
  } catch {
    return 'none';
  }
}


function statsByDocType(db: Database.Database, days: number): DocTypeStat[] {
  const rows = db.prepare(
    `SELECT doc_type, decision, COUNT(*) AS n
     FROM decisions
     WHERE ts >= ? AND doc_type IS NOT NULL
     GROUP BY doc_type, decision`,
  ).all(sinceIso(days)) as Array<{ doc_type: string; decision: string; n: number }>;

  const byType = new Map<string, Record<string, number>>();
  for (const r of rows) {
    const m = byType.get(r.doc_type) ?? {};
    m[r.decision] = r.n;
    byType.set(r.doc_type, m);
  }

  const out: DocTypeStat[] = [];
  for (const [dt, decs] of byType) {
    const total = Object.values(decs).reduce((a, b) => a + b, 0);
    if (total === 0) continue;
    const r = (k: string) => Math.round(((decs[k] ?? 0) / total) * 1000) / 1000;
    out.push({
      doc_type: dt, n: total,
      keep_ratio: r('keep'),
      retire_ratio: r('retire'),
      keep_permanent_ratio: r('keep_permanent'),
      dismiss_ratio: r('dismiss'),
      accept_ratio: r('accept'),
      postpone_ratio: r('postpone'),
    });
  }
  return out.sort((a, b) => b.n - a.n);
}


function statsBySignalCombo(
  db: Database.Database, days: number, minN: number,
): SignalComboStat[] {
  const rows = db.prepare(
    `SELECT doc_type, signals_json, decision FROM decisions
     WHERE ts >= ? AND doc_type IS NOT NULL`,
  ).all(sinceIso(days)) as Array<{ doc_type: string; signals_json: string | null; decision: string }>;

  const buckets = new Map<string, Record<string, number>>();
  for (const r of rows) {
    const key = `${r.doc_type}|${comboKey(r.signals_json)}`;
    const b = buckets.get(key) ?? {};
    b[r.decision] = (b[r.decision] ?? 0) + 1;
    buckets.set(key, b);
  }

  const out: SignalComboStat[] = [];
  for (const [key, decs] of buckets) {
    const total = Object.values(decs).reduce((a, b) => a + b, 0);
    if (total < minN) continue;
    const [dt, combo] = key.split('|');
    const r = (k: string) => Math.round(((decs[k] ?? 0) / total) * 1000) / 1000;
    out.push({
      doc_type: dt, signal_combo: combo, n: total,
      keep_ratio: r('keep'),
      retire_ratio: r('retire'),
      keep_permanent_ratio: r('keep_permanent'),
    });
  }
  return out.sort((a, b) => b.n - a.n);
}


function statsF3EditDistance(db: Database.Database, days: number): F3DistStat[] {
  const rows = db.prepare(
    `SELECT generator, edit_distance_ratio FROM f3_outputs
     WHERE accepted_at IS NOT NULL AND accepted_at >= ?
       AND edit_distance_ratio IS NOT NULL`,
  ).all(sinceIso(days)) as Array<{ generator: string; edit_distance_ratio: number }>;

  const byGen = new Map<string, number[]>();
  for (const r of rows) {
    const arr = byGen.get(r.generator) ?? [];
    arr.push(r.edit_distance_ratio);
    byGen.set(r.generator, arr);
  }

  const out: F3DistStat[] = [];
  for (const [gen, vals] of byGen) {
    if (vals.length === 0) continue;
    const sorted = [...vals].sort((a, b) => a - b);
    const n = sorted.length;
    const p50 = sorted[Math.min(Math.floor(n / 2), n - 1)];
    const p90 = sorted[Math.min(Math.floor(n * 0.9), n - 1)];
    const mean = vals.reduce((a, b) => a + b, 0) / n;
    out.push({
      generator: gen, n,
      p50: Math.round(p50 * 1000) / 1000,
      p90: Math.round(p90 * 1000) / 1000,
      mean: Math.round(mean * 1000) / 1000,
    });
  }
  return out.sort((a, b) => b.n - a.n);
}


export function readFeedbackSummary(days = 30, minN = 4): FeedbackSummary {
  const empty: FeedbackSummary = {
    days, by_doc_type: [], by_signal_combo: [], f3_edit_distance: [],
  };
  const db = open();
  if (!db) return empty;
  try {
    return {
      days,
      by_doc_type: statsByDocType(db, days),
      by_signal_combo: statsBySignalCombo(db, days, minN),
      f3_edit_distance: statsF3EditDistance(db, days),
    };
  } finally {
    db.close();
  }
}
