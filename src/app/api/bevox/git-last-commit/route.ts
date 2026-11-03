import { NextResponse } from 'next/server';
import { lastCommit, currentBranch } from '@/lib/bevox/git-ops';

/**
 * GET /api/bevox/git-last-commit
 * Returns the HEAD commit of the bevox-knowledge clone + current branch.
 * Short TTL so the Home Last Commit widget sees fresh data without spamming git.
 */
export const revalidate = 30;

export async function GET() {
  try {
    const [commit, branch] = await Promise.all([
      lastCommit(),
      currentBranch(),
    ]);
    return NextResponse.json({ commit, branch });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
