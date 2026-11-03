import { describe, it, expect } from 'vitest';
import path from 'node:path';
import {
  readKsState,
  readKsStatePrevious,
} from '@/lib/bevox/knowledge-sync-state';

const FIXTURE = path.join(__dirname, '..', 'fixtures', 'state.json');

describe('readKsState', () => {
  it('reads a real state.json and returns a typed object', async () => {
    const state = await readKsState(FIXTURE);
    expect(state).toBeDefined();
    expect(state.version).toBeTypeOf('number');
    expect(state.observed_at).toBeTypeOf('string');
    expect(state.branch).toBeDefined();
    expect(state.branch.current).toBeTypeOf('string');
    expect(state.branch.ahead).toBeTypeOf('number');
    expect(state.branch.behind).toBeTypeOf('number');
    expect(state.working_tree).toBeDefined();
    expect(state.working_tree.clean).toBeTypeOf('boolean');
    expect(state.health).toBeDefined();
    expect(['ok', 'degraded', 'critical']).toContain(state.health.overall);
    expect(Array.isArray(state.health.issues)).toBe(true);
    expect(state.last).toBeDefined();
    expect(state.watcher).toBeDefined();
    expect(state.remote).toBeDefined();
  });

  it('preserves the clone_path field from the fixture', async () => {
    const state = await readKsState(FIXTURE);
    expect(state.clone_path).toBeTypeOf('string');
    expect(state.clone_path.length).toBeGreaterThan(0);
  });

  it('throws a clear error when the file does not exist', async () => {
    await expect(readKsState('/nonexistent/path/state.json')).rejects.toThrow(
      /state\.json/,
    );
  });

  it('propagates non-ENOENT errors without masking them', async () => {
    // A directory path will produce EISDIR, not ENOENT. We expect a throw
    // that is NOT our custom "not found" message.
    await expect(readKsState(path.join(__dirname, '..'))).rejects.toThrow();
  });
});

describe('readKsStatePrevious', () => {
  it('returns null when state.previous.json is not present', async () => {
    // By default it reads from PATHS.ksStatePrevious on the host; if that
    // file does not exist we should get null, not a throw.
    const result = await readKsStatePrevious('/nonexistent/path/state.previous.json');
    expect(result).toBeNull();
  });
});
