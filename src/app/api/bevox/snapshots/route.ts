import { NextResponse } from 'next/server';
import { readSnapshotsIndex } from '@/lib/bevox/snapshots-index';

export const dynamic = 'force-dynamic';

/**
 * GET /api/bevox/snapshots
 * Returns all entries from snapshots-index.jsonl in file order.
 */
export async function GET() {
  try {
    const snapshots = await readSnapshotsIndex();
    return NextResponse.json({ snapshots });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
