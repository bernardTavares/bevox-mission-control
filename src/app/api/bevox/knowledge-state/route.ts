import { NextResponse } from 'next/server';
import {
  readKsState,
  readKsStatePrevious,
} from '@/lib/bevox/knowledge-sync-state';

export const dynamic = 'force-dynamic';

/**
 * GET /api/bevox/knowledge-state
 * Returns the current state.json snapshot plus the previous one for diff.
 */
export async function GET() {
  try {
    const state = await readKsState();
    const previous = await readKsStatePrevious();
    return NextResponse.json({ state, previous });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
