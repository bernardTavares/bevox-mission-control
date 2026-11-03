import { NextRequest, NextResponse } from 'next/server';
import { listApprovals } from '@/lib/bevox/approvals';

export const dynamic = 'force-dynamic';

/**
 * GET /api/bevox/approvals?state=pending|all
 * Read-only projection of the approval state derived from events.jsonl.
 * Default filter is `pending`. Telegram remains the source of truth — this
 * endpoint never mutates anything (spec §2.2).
 */
export async function GET(req: NextRequest) {
  const stateParam = req.nextUrl.searchParams.get('state');
  const filter = stateParam === 'all' ? 'all' : 'pending';
  try {
    const approvals = await listApprovals(filter);
    return NextResponse.json({
      approvals,
      count: approvals.length,
      filter,
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
