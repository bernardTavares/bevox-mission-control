import { describe, it, expect } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { readSnapshotsIndex } from '@/lib/bevox/snapshots-index';

const FIXTURE = path.join(__dirname, '..', 'fixtures', 'snapshots-index.jsonl');

describe('readSnapshotsIndex', () => {
  it('reads a real index and returns a populated array', async () => {
    const snapshots = await readSnapshotsIndex(FIXTURE);
    expect(Array.isArray(snapshots)).toBe(true);
    expect(snapshots.length).toBeGreaterThan(0);
    const first = snapshots[0];
    expect(first.ts).toBeTypeOf('string');
    expect(first.path).toBeTypeOf('string');
    expect(first.path.length).toBeGreaterThan(0);
    expect(first.size_bytes).toBeTypeOf('number');
    expect(first.head_sha).toMatch(/^[a-f0-9]{40}$/);
    expect(['auto-hourly', 'manual', 'pre-canonical']).toContain(first.type);
    expect(['ok', 'failed', 'pending']).toContain(first.verify_status);
    expect(Array.isArray(first.branches)).toBe(true);
    expect(Array.isArray(first.tags)).toBe(true);
  });

  it('returns an empty array when the file does not exist', async () => {
    const result = await readSnapshotsIndex('/nonexistent/path.jsonl');
    expect(result).toEqual([]);
  });

  it('skips malformed lines instead of throwing', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'mc-snapshots-'));
    const file = path.join(tmp, 'mixed.jsonl');
    const goodLine = JSON.stringify({
      ts: '2026-04-10T12:00:00Z',
      type: 'auto-hourly',
      path: 'auto/2026-04-10-12-00-auto-hourly.bundle',
      size_bytes: 1000,
      head_sha: 'a'.repeat(40),
      branches: ['main'],
      tags: [],
      sha256: 'b'.repeat(64),
      verify_status: 'ok',
      verified_at: '2026-04-10T12:00:05Z',
    });
    await fs.writeFile(
      file,
      [goodLine, 'not valid json', '', goodLine, '{invalid}'].join('\n') + '\n',
    );
    const result = await readSnapshotsIndex(file);
    expect(result).toHaveLength(2);
    expect(result.every((s) => s.path)).toBe(true);
  });

  it('returns an empty array for an empty file (no throw)', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'mc-snapshots-empty-'));
    const file = path.join(tmp, 'empty.jsonl');
    await fs.writeFile(file, '');
    const result = await readSnapshotsIndex(file);
    expect(result).toEqual([]);
  });
});
