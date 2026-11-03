import { NextResponse } from 'next/server';
import { readHealthOverall } from '@/lib/bevox/health';

/**
 * GET /api/bevox/health
 * Aggregated health: level + warning/error counts + per-component breakdown.
 *
 * Note: this is DIFFERENT from the upstream /api/health route, which does URL
 * pings for "is the tunnel alive" style checks. /api/health is public (in the
 * middleware allowlist); /api/bevox/health requires Cloudflare Access.
 */
export const revalidate = 30;

export async function GET() {
  try {
    const health = await readHealthOverall();
    return NextResponse.json({ health });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
