import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { indexEventsFile } from '@/lib/bevox/events-indexer';
import { getDb, resetDb } from '@/lib/bevox/events-db';

const FIXTURE = path.join(__dirname, '..', 'fixtures', 'events-sample.jsonl');

let tmpDir: string;
let tmpDb: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mc-events-test-'));
  tmpDb = path.join(tmpDir, 'events.db');
  process.env.MC_DB_PATH = tmpDb;
  resetDb();
});

afterEach(() => {
  resetDb();
  delete process.env.MC_DB_PATH;
  delete process.env.MC_EVENTS_FILE;
});

function countRows(): number {
  const db = getDb();
  const row = db
    .prepare('SELECT COUNT(*) as c FROM events')
    .get() as { c: number };
  return row.c;
}

describe('indexEventsFile — real fixture', () => {
  it('indexes all valid lines on a fresh DB', async () => {
    const result = await indexEventsFile(FIXTURE);
    expect(result.indexed).toBeGreaterThan(0);
    expect(countRows()).toBe(result.indexed);
  });

  it('extracts ts, event, and severity from real payload shapes', async () => {
    await indexEventsFile(FIXTURE);
    const db = getDb();
    // notification_sent rows carry severity in the payload
    const notificationRow = db
      .prepare(
        `SELECT ts, event, severity FROM events
           WHERE event = 'notification_sent' LIMIT 1`,
      )
      .get() as { ts: string; event: string; severity: string | null } | undefined;
    expect(notificationRow).toBeDefined();
    expect(notificationRow!.event).toBe('notification_sent');
    expect(notificationRow!.ts).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(notificationRow!.severity).toBe('warn');

    // watcher_ran rows do not have severity — should be null
    const watcherRow = db
      .prepare(
        `SELECT severity FROM events WHERE event = 'watcher_ran' LIMIT 1`,
      )
      .get() as { severity: string | null } | undefined;
    if (watcherRow) {
      expect(watcherRow.severity).toBeNull();
    }
  });

  it('is idempotent: running twice does not duplicate rows', async () => {
    const first = await indexEventsFile(FIXTURE);
    const countAfterFirst = countRows();
    expect(countAfterFirst).toBe(first.indexed);

    const second = await indexEventsFile(FIXTURE);
    expect(second.indexed).toBe(0);
    expect(countRows()).toBe(countAfterFirst);
  });
});

describe('indexEventsFile — synthetic append', () => {
  it('appends new lines after the stored offset', async () => {
    const file = path.join(tmpDir, 'events.jsonl');
    await fs.writeFile(
      file,
      JSON.stringify({
        ts: '2026-04-10T10:00:00Z',
        event: 'test_one',
        payload: { foo: 'bar' },
      }) + '\n',
    );
    const r1 = await indexEventsFile(file);
    expect(r1.indexed).toBe(1);
    expect(countRows()).toBe(1);

    await fs.appendFile(
      file,
      JSON.stringify({
        ts: '2026-04-10T10:00:01Z',
        event: 'test_two',
        payload: { severity: 'error' },
      }) + '\n',
    );
    const r2 = await indexEventsFile(file);
    expect(r2.indexed).toBe(1);
    expect(countRows()).toBe(2);

    const db = getDb();
    const events = db
      .prepare('SELECT event, severity FROM events ORDER BY id ASC')
      .all() as Array<{ event: string; severity: string | null }>;
    expect(events[0].event).toBe('test_one');
    expect(events[0].severity).toBeNull();
    expect(events[1].event).toBe('test_two');
    expect(events[1].severity).toBe('error');
  });
});

describe('indexEventsFile — truncation rebuild', () => {
  it('rebuilds from scratch when the file shrinks below the stored offset', async () => {
    const file = path.join(tmpDir, 'events.jsonl');
    // Write 3 lines
    const lines = [1, 2, 3]
      .map((n) =>
        JSON.stringify({
          ts: `2026-04-10T10:00:0${n}Z`,
          event: `evt_${n}`,
          payload: {},
        }),
      )
      .join('\n') + '\n';
    await fs.writeFile(file, lines);
    const r1 = await indexEventsFile(file);
    expect(r1.indexed).toBe(3);

    // Truncate + rewrite with ONE line
    const shorter = JSON.stringify({
      ts: '2026-04-10T11:00:00Z',
      event: 'fresh_start',
      payload: {},
    }) + '\n';
    await fs.writeFile(file, shorter);

    const r2 = await indexEventsFile(file);
    // Should detect truncation, wipe events, and reindex from 0.
    expect(r2.indexed).toBe(1);
    expect(countRows()).toBe(1);

    const db = getDb();
    const row = db
      .prepare('SELECT event FROM events')
      .get() as { event: string };
    expect(row.event).toBe('fresh_start');
  });
});

describe('indexEventsFile — incomplete trailing line', () => {
  it('does not index a line that is not terminated by a newline', async () => {
    const file = path.join(tmpDir, 'events.jsonl');
    const complete =
      JSON.stringify({ ts: '2026-04-10T10:00:00Z', event: 'done', payload: {} }) +
      '\n';
    const partial = JSON.stringify({
      ts: '2026-04-10T10:00:01Z',
      event: 'half_written',
      payload: {},
    });
    // Note: no trailing \n on partial — simulates a mid-write state.
    await fs.writeFile(file, complete + partial);

    const r1 = await indexEventsFile(file);
    expect(r1.indexed).toBe(1);
    expect(countRows()).toBe(1);

    // Now finish the partial line and add a third
    await fs.appendFile(
      file,
      '\n' +
        JSON.stringify({
          ts: '2026-04-10T10:00:02Z',
          event: 'third',
          payload: {},
        }) +
        '\n',
    );

    const r2 = await indexEventsFile(file);
    expect(r2.indexed).toBe(2);
    expect(countRows()).toBe(3);
  });
});

describe('indexEventsFile — missing file', () => {
  it('returns zero without throwing', async () => {
    const result = await indexEventsFile('/nonexistent/path/events.jsonl');
    expect(result.indexed).toBe(0);
    expect(result.total_offset).toBe(0);
  });
});
