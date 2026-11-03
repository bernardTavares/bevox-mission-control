import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/bevox/events-db';
import { indexEventsFile } from '@/lib/bevox/events-indexer';

export const dynamic = 'force-dynamic';

const MAX_LIMIT = 500;
const DEFAULT_LIMIT = 50;

/**
 * GET /api/bevox/events?limit=N&severity=warn|error
 * Reads the indexed events, optionally filtering by severity. Always tails
 * events.jsonl into SQLite first so the response reflects the latest state.
 *
 * Ordering: most recent first (by ts, descending).
 */
export async function GET(req: NextRequest) {
  try {
    await indexEventsFile();
    const db = getDb();

    const limitParam = req.nextUrl.searchParams.get('limit');
    const limit = Math.min(
      Math.max(Number.parseInt(limitParam ?? `${DEFAULT_LIMIT}`, 10) || DEFAULT_LIMIT, 1),
      MAX_LIMIT,
    );
    const severityParam = req.nextUrl.searchParams.get('severity');

    let sql =
      'SELECT ts, event, severity, payload FROM events';
    const params: unknown[] = [];
    if (severityParam) {
      sql += ' WHERE severity = ?';
      params.push(severityParam);
    }
    sql += ' ORDER BY ts DESC LIMIT ?';
    params.push(limit);

    const rows = db.prepare(sql).all(...params) as Array<{
      ts: string;
      event: string;
      severity: string | null;
      payload: string;
    }>;

    // Parse the payload JSON string into an object for the caller.
    const events = rows.map((row) => ({
      ts: row.ts,
      event: row.event,
      severity: row.severity,
      payload: safeParse(row.payload),
    }));

    return NextResponse.json({ events, count: events.length, limit });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}

function safeParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}
