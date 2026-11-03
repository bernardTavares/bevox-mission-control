import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { listApprovals, APPROVAL_TTL_SECONDS } from '@/lib/bevox/approvals';
import { resetDb } from '@/lib/bevox/events-db';

let tmpDir: string;
let eventsFile: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mc-approvals-'));
  eventsFile = path.join(tmpDir, 'events.jsonl');
  process.env.MC_DB_PATH = path.join(tmpDir, 'events.db');
  process.env.MC_EVENTS_FILE = eventsFile;
  resetDb();
  // Touch the file so the indexer does not bail on ENOENT.
  await fs.writeFile(eventsFile, '');
});

afterEach(() => {
  resetDb();
  delete process.env.MC_DB_PATH;
  delete process.env.MC_EVENTS_FILE;
});

async function appendEvent(obj: object): Promise<void> {
  await fs.appendFile(eventsFile, JSON.stringify(obj) + '\n');
}

function nowIso(offsetSeconds = 0): string {
  return new Date(Date.now() + offsetSeconds * 1000).toISOString();
}

describe('listApprovals — empty', () => {
  it('returns empty when no events exist', async () => {
    const result = await listApprovals('all');
    expect(result).toEqual([]);
  });
});

describe('listApprovals — pending', () => {
  it('returns a single pending approval', async () => {
    await appendEvent({
      ts: nowIso(),
      event: 'canonical_approval_pending',
      payload: {
        approval_id: 'aaaaaaaa-1111-2222-3333-444444444444',
        action: 'canonical commit',
        card: { summary: 'test' },
      },
    });

    const result = await listApprovals('pending');
    expect(result).toHaveLength(1);
    expect(result[0].approval_id).toBe('aaaaaaaa-1111-2222-3333-444444444444');
    expect(result[0].short_id).toBe('aaaaaaaa');
    expect(result[0].action).toBe('canonical commit');
    expect(result[0].state).toBe('pending');
    expect(result[0].card).toEqual({ summary: 'test' });
  });

  it('filters out resolved approvals when filter=pending', async () => {
    await appendEvent({
      ts: nowIso(-30),
      event: 'canonical_approval_pending',
      payload: { approval_id: 'aaaaaaaa-1111', action: 'canonical commit' },
    });
    await appendEvent({
      ts: nowIso(-20),
      event: 'canonical_approval_pending',
      payload: { approval_id: 'bbbbbbbb-2222', action: 'canonical commit' },
    });
    await appendEvent({
      ts: nowIso(-10),
      event: 'canonical_approval_granted',
      payload: { approval_id: 'aaaaaaaa-1111' },
    });

    const pending = await listApprovals('pending');
    expect(pending).toHaveLength(1);
    expect(pending[0].short_id).toBe('bbbbbbbb');
  });
});

describe('listApprovals — state derivation', () => {
  it('marks an approval granted when only granted event exists', async () => {
    await appendEvent({
      ts: nowIso(-100),
      event: 'canonical_approval_pending',
      payload: { approval_id: 'aaaaaaaa-1111', action: 'canonical commit' },
    });
    await appendEvent({
      ts: nowIso(-50),
      event: 'canonical_approval_granted',
      payload: { approval_id: 'aaaaaaaa-1111' },
    });

    const all = await listApprovals('all');
    expect(all).toHaveLength(1);
    expect(all[0].state).toBe('granted');
  });

  it('marks an approval executed when a canonical_committed exists', async () => {
    await appendEvent({
      ts: nowIso(-100),
      event: 'canonical_approval_pending',
      payload: { approval_id: 'aaaaaaaa-1111', action: 'canonical commit' },
    });
    await appendEvent({
      ts: nowIso(-50),
      event: 'canonical_approval_granted',
      payload: { approval_id: 'aaaaaaaa-1111' },
    });
    await appendEvent({
      ts: nowIso(-10),
      event: 'canonical_committed',
      payload: { approval_id: 'aaaaaaaa-1111', sha: 'deadbeef' },
    });

    const all = await listApprovals('all');
    expect(all).toHaveLength(1);
    expect(all[0].state).toBe('executed');
  });

  it('marks an approval executed for canonical_pushed', async () => {
    await appendEvent({
      ts: nowIso(-100),
      event: 'canonical_approval_pending',
      payload: { approval_id: 'cccccccc-3333', action: 'canonical push' },
    });
    await appendEvent({
      ts: nowIso(-10),
      event: 'canonical_pushed',
      payload: { approval_id: 'cccccccc-3333' },
    });

    const all = await listApprovals('all');
    expect(all[0].state).toBe('executed');
  });

  it('marks an approval rejected when reject event exists', async () => {
    await appendEvent({
      ts: nowIso(-100),
      event: 'canonical_approval_pending',
      payload: { approval_id: 'dddddddd-4444', action: 'canonical commit' },
    });
    await appendEvent({
      ts: nowIso(-50),
      event: 'canonical_approval_rejected',
      payload: { approval_id: 'dddddddd-4444', reason: 'wrong branch' },
    });

    const all = await listApprovals('all');
    expect(all[0].state).toBe('rejected');
  });

  it('marks an approval expired when older than TTL and unresolved', async () => {
    const wayInThePast = nowIso(-(APPROVAL_TTL_SECONDS + 60));
    await appendEvent({
      ts: wayInThePast,
      event: 'canonical_approval_pending',
      payload: { approval_id: 'eeeeeeee-5555', action: 'canonical commit' },
    });

    const all = await listApprovals('all');
    expect(all).toHaveLength(1);
    expect(all[0].state).toBe('expired');
  });

  it('executed beats granted when both events exist', async () => {
    await appendEvent({
      ts: nowIso(-100),
      event: 'canonical_approval_pending',
      payload: { approval_id: 'ffffffff-6666', action: 'canonical commit' },
    });
    await appendEvent({
      ts: nowIso(-80),
      event: 'canonical_approval_granted',
      payload: { approval_id: 'ffffffff-6666' },
    });
    await appendEvent({
      ts: nowIso(-10),
      event: 'canonical_committed',
      payload: { approval_id: 'ffffffff-6666', sha: 'cafebabe' },
    });

    const all = await listApprovals('all');
    expect(all[0].state).toBe('executed');
  });
});

describe('listApprovals — ordering', () => {
  it('returns most recent first', async () => {
    await appendEvent({
      ts: nowIso(-300),
      event: 'canonical_approval_pending',
      payload: { approval_id: 'oldest00-0000', action: 'canonical commit' },
    });
    await appendEvent({
      ts: nowIso(-200),
      event: 'canonical_approval_pending',
      payload: { approval_id: 'middle00-1111', action: 'canonical commit' },
    });
    await appendEvent({
      ts: nowIso(-100),
      event: 'canonical_approval_pending',
      payload: { approval_id: 'newest00-2222', action: 'canonical commit' },
    });

    const result = await listApprovals('pending');
    expect(result.map((a) => a.short_id)).toEqual([
      'newest00',
      'middle00',
      'oldest00',
    ]);
  });
});
