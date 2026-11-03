/**
 * Local SQLite cache of the knowledge-sync events.jsonl.
 *
 * The skill writes an append-only JSONL stream that grows unbounded. Mission
 * Control needs to filter/paginate/query that stream from UI pages, which is
 * slow on a flat file. This module owns the small better-sqlite3 database
 * that caches the parsed events, and the offset bookkeeping that lets the
 * indexer tail the file incrementally.
 *
 * Principles:
 * - The SQLite file is NOT a source of truth. events.jsonl is. The DB can
 *   be deleted at any moment and rebuilt from scratch.
 * - One singleton connection per process. Callers access it via getDb().
 * - Tests can point to a throwaway DB by setting MC_DB_PATH before calling
 *   getDb(); resetDb() closes the singleton so the next call re-opens.
 * - No caching of queries. The indexer is the only writer; consumers read
 *   through the same db instance.
 */

import Database, { type Database as DatabaseType } from 'better-sqlite3';
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { PATHS } from './paths';

let _db: DatabaseType | null = null;

/**
 * Resolve the on-disk path of the events SQLite database.
 * Reads `process.env.MC_DB_PATH` at CALL time so tests that set the env
 * var in `beforeEach` see the override, falling back to the static default
 * from paths.ts.
 */
function resolveDbPath(): string {
  return process.env.MC_DB_PATH ?? PATHS.eventsDb;
}

/**
 * Open (or return the cached) SQLite connection. Creates the parent
 * directory if it does not exist. Runs schema migrations the first time.
 */
export function getDb(): DatabaseType {
  if (_db) return _db;
  const dbPath = resolveDbPath();
  mkdirSync(path.dirname(dbPath), { recursive: true });
  _db = new Database(dbPath);
  _db.pragma('journal_mode = WAL');
  initSchema(_db);
  return _db;
}

/**
 * Close and forget the singleton. Used by tests between runs so a fresh
 * MC_DB_PATH is honored on the next getDb() call.
 */
export function resetDb(): void {
  if (_db) {
    try {
      _db.close();
    } catch {
      // already closed — ignore
    }
  }
  _db = null;
}

/**
 * Create the `events` and `indexer_state` tables if they do not exist.
 * Idempotent — safe to call on every getDb().
 *
 * Schema:
 *   events:
 *     id          INTEGER PK AUTOINCREMENT
 *     ts          TEXT  ISO-8601 timestamp from the JSONL line
 *     event       TEXT  event name
 *     severity    TEXT? nullable — only set when the payload has `severity`
 *     payload     TEXT  JSON-stringified payload (full object)
 *     raw_line    TEXT  original JSONL line verbatim (for debugging)
 *     file_offset INTEGER byte offset in events.jsonl of the line start
 *
 *   indexer_state:
 *     key         TEXT PK
 *     value       TEXT
 *     (single key 'last_offset' tracks the last byte we consumed)
 */
function initSchema(db: DatabaseType): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts TEXT NOT NULL,
      event TEXT NOT NULL,
      severity TEXT,
      payload TEXT NOT NULL,
      raw_line TEXT NOT NULL,
      file_offset INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_events_ts ON events(ts);
    CREATE INDEX IF NOT EXISTS idx_events_event ON events(event);
    CREATE INDEX IF NOT EXISTS idx_events_severity ON events(severity);

    CREATE TABLE IF NOT EXISTS indexer_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

export function getLastIndexedOffset(db: DatabaseType): number {
  const row = db
    .prepare(`SELECT value FROM indexer_state WHERE key = 'last_offset'`)
    .get() as { value: string } | undefined;
  return row ? Number.parseInt(row.value, 10) : 0;
}

export function setLastIndexedOffset(db: DatabaseType, offset: number): void {
  db.prepare(
    `INSERT OR REPLACE INTO indexer_state (key, value) VALUES ('last_offset', ?)`,
  ).run(String(offset));
}
