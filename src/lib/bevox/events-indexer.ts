/**
 * Tail-incremental indexer for the knowledge-sync events.jsonl.
 *
 * Reads new bytes since the last persisted offset and inserts them into the
 * events SQLite cache in a single transaction. Handles three append-only
 * edge cases that matter at our scale:
 *
 *   1. Fresh DB, existing file        → read everything, persist final offset
 *   2. DB in sync, file grew          → read only the new tail, append
 *   3. DB in sync, file shrank/rotated → wipe DB, rebuild from byte 0
 *
 * Partial trailing line (a write in progress without a terminating \n) is
 * NOT indexed this pass — we store the offset at the last complete line
 * boundary so the next call picks up the rest once the writer finishes.
 *
 * Malformed lines (invalid JSON) are skipped silently but DO advance the
 * offset. The skill is the only writer; we assume its lines are well-formed
 * and only defend against half-written tails.
 */

import { promises as fs } from 'node:fs';
import {
  getDb,
  getLastIndexedOffset,
  setLastIndexedOffset,
} from './events-db';
import { PATHS } from './paths';

export interface IndexResult {
  /** How many new rows were inserted during this call. */
  indexed: number;
  /** Final byte offset after this call (= file size if fully caught up). */
  total_offset: number;
}

/** Resolve the events.jsonl path at CALL time so MC_EVENTS_FILE in tests works. */
function resolveEventsFilePath(explicit?: string): string {
  if (explicit) return explicit;
  return process.env.MC_EVENTS_FILE ?? PATHS.ksEvents;
}

/**
 * Bring the SQLite events cache into sync with the current events.jsonl.
 *
 * @param filePath Optional explicit path. Defaults to MC_EVENTS_FILE env or
 *                 PATHS.ksEvents.
 * @returns IndexResult with the number of rows inserted this call and the
 *          total byte offset now recorded.
 */
export async function indexEventsFile(
  filePath?: string,
): Promise<IndexResult> {
  const resolved = resolveEventsFilePath(filePath);
  const db = getDb();
  let lastOffset = getLastIndexedOffset(db);

  // Stat first — cheaper than a read and tells us whether to shrink-rebuild.
  let size: number;
  try {
    const stat = await fs.stat(resolved);
    size = stat.size;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return { indexed: 0, total_offset: lastOffset };
    }
    throw err;
  }

  if (size === lastOffset) {
    return { indexed: 0, total_offset: lastOffset };
  }

  let raw: string;
  if (size < lastOffset) {
    // File shrank or was rotated — rebuild from scratch.
    db.prepare('DELETE FROM events').run();
    setLastIndexedOffset(db, 0);
    lastOffset = 0;
    raw = await fs.readFile(resolved, 'utf-8');
  } else {
    // Tail-read from lastOffset to size.
    const fh = await fs.open(resolved, 'r');
    try {
      const buf = Buffer.alloc(size - lastOffset);
      await fh.read(buf, 0, buf.length, lastOffset);
      raw = buf.toString('utf-8');
    } finally {
      await fh.close();
    }
  }

  // We only index lines that are terminated by \n. A trailing unterminated
  // segment is left for the next call. `completeLines` are the lines we
  // actually process; `consumedBytes` is how many bytes of `raw` end at a
  // complete line (so the next offset = lastOffset + consumedBytes).
  let completeLines: string[];
  let consumedBytes: number;
  if (raw.endsWith('\n')) {
    completeLines = raw.slice(0, -1).split('\n');
    consumedBytes = raw.length;
  } else {
    const lastNewline = raw.lastIndexOf('\n');
    if (lastNewline === -1) {
      // Single partial line, nothing to index this pass.
      return { indexed: 0, total_offset: lastOffset };
    }
    completeLines = raw.slice(0, lastNewline).split('\n');
    consumedBytes = lastNewline + 1; // include the newline byte
  }

  const insert = db.prepare(
    `INSERT INTO events (ts, event, severity, payload, raw_line, file_offset)
       VALUES (?, ?, ?, ?, ?, ?)`,
  );

  let indexed = 0;
  const tx = db.transaction((rows: string[]) => {
    // Track per-line offset so each row carries its byte position.
    let localOffset = 0;
    for (const line of rows) {
      const lineStartOffset = lastOffset + localOffset;
      // +1 for the newline we stripped during split
      localOffset += line.length + 1;

      if (!line.trim()) continue;
      try {
        const parsed = JSON.parse(line);
        const payload = parsed.payload ?? {};
        insert.run(
          parsed.ts ?? '',
          parsed.event ?? '',
          typeof payload.severity === 'string' ? payload.severity : null,
          JSON.stringify(payload),
          line,
          lineStartOffset,
        );
        indexed++;
      } catch {
        // malformed line — skip, offset still advances
      }
    }
  });
  tx(completeLines);

  const newOffset = lastOffset + consumedBytes;
  setLastIndexedOffset(db, newOffset);
  return { indexed, total_offset: newOffset };
}
