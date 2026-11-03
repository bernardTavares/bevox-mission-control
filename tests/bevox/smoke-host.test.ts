/**
 * Smoke test: hits the live host for git-ops + systemd readers.
 *
 * Not a unit test — validates the wrappers actually work against the real
 * bevox-knowledge clone and the real systemd user manager on Bernard's host.
 * Will be skipped by environments that do not have git/systemctl or the
 * default clone path (CI, containers without the host layout).
 *
 * Keep this file lean. Anything that needs mocking or fixtures belongs in
 * a regular unit test.
 */

import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { lastCommit, currentBranch } from '@/lib/bevox/git-ops';
import { listUserTimers, unitStatus } from '@/lib/bevox/systemd';
import { PATHS } from '@/lib/bevox/paths';

const HAS_CLONE = existsSync(PATHS.bevoxKnowledgeClone);

describe.skipIf(!HAS_CLONE)('git-ops smoke (live host)', () => {
  it('currentBranch returns a non-empty string on the real clone', async () => {
    const branch = await currentBranch();
    console.log('[smoke] currentBranch ->', branch);
    expect(typeof branch).toBe('string');
    expect(branch.length).toBeGreaterThan(0);
  });

  it('lastCommit returns a plausible HEAD', async () => {
    const c = await lastCommit();
    console.log('[smoke] lastCommit ->', JSON.stringify(c));
    expect(c.sha).toMatch(/^[a-f0-9]{40}$/);
    expect(c.short_sha.length).toBeGreaterThanOrEqual(7);
    expect(c.subject.length).toBeGreaterThan(0);
    expect(c.committed_at).toBeGreaterThan(0);
    expect(c.age_seconds).toBeGreaterThanOrEqual(0);
  });
});

describe('systemd smoke (live host, degrades gracefully)', () => {
  it('listUserTimers returns an array (empty or not)', async () => {
    const timers = await listUserTimers();
    console.log('[smoke] listUserTimers count ->', timers.length);
    console.log(
      '[smoke] knowledge-sync timers ->',
      timers
        .filter((t) => t.unit.includes('knowledge-sync'))
        .map((t) => t.unit),
    );
    expect(Array.isArray(timers)).toBe(true);
  });

  it('unitStatus returns a narrow union for a known unit', async () => {
    const status = await unitStatus('knowledge-sync-refresh.timer');
    console.log('[smoke] unitStatus(knowledge-sync-refresh.timer) ->', status);
    expect(['active', 'inactive', 'failed', 'unknown']).toContain(status);
  });

  it('unitStatus returns inactive/unknown for a nonexistent unit', async () => {
    const status = await unitStatus('totally-not-a-real-unit.timer');
    console.log('[smoke] unitStatus(bogus) ->', status);
    expect(['inactive', 'unknown', 'failed']).toContain(status);
  });
});
