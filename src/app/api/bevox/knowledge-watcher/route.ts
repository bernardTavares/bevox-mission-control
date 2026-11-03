import { NextResponse } from 'next/server';
import { summarizeKwState } from '@/lib/bevox/knowledge-watcher-state';

export const dynamic = 'force-dynamic';

/**
 * GET /api/bevox/knowledge-watcher
 * Returns a summary of the Skill V2 knowledge-watcher state.json:
 *   { state, totals, per_repo, recent_gaps }
 *
 * Returns state=null when the file does not exist (cron has not run yet).
 */
export async function GET() {
  try {
    const summary = await summarizeKwState();
    return NextResponse.json(summary);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
