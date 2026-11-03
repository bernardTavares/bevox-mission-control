import { NextResponse } from 'next/server';
import { readFeedbackSummary } from '@/lib/bevox/feedback-db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/bevox/knowledge-watcher/feedback?days=30
 * Returns aggregated feedback stats from feedback.db (W8.P5).
 *
 * Returns empty arrays when DB does not exist yet (no decisions recorded).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const daysRaw = url.searchParams.get('days');
  const days = daysRaw ? Math.max(1, parseInt(daysRaw, 10)) : 30;
  try {
    const summary = readFeedbackSummary(days);
    return NextResponse.json(summary);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
