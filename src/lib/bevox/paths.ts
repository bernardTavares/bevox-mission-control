/**
 * Central path registry for Mission Control.
 *
 * All filesystem locations the app needs to read live here. Downstream modules
 * (readers, indexers, API routes) import from this single source so there is
 * exactly one place to edit if a path moves.
 *
 * Overrides are honored for testing and for non-standard host layouts:
 *   - MC_HOME              overrides the user home directory (defaults to os.homedir())
 *   - MC_KNOWLEDGE_CLONE   overrides the bevox-knowledge clone path
 *   - MC_EVENTS_FILE       overrides the events.jsonl location (used by the
 *                          SQLite indexer in a later task)
 *   - MC_DB_PATH           overrides the local events cache DB path (later task)
 *
 * Nothing in this file touches the filesystem — it only computes strings.
 */

import path from 'node:path';
import os from 'node:os';

const HOME = process.env.MC_HOME ?? os.homedir();

export const PATHS = {
  /** User home directory (resolvable via MC_HOME). */
  home: HOME,

  /** Root of the OpenClaw data directory on the host. */
  openclawHome: path.join(HOME, '.openclaw'),

  /** knowledge-sync skill state directory. */
  ksDir: path.join(HOME, '.openclaw', 'knowledge-sync'),

  /** Current operational snapshot written by the Watcher. */
  ksState: path.join(HOME, '.openclaw', 'knowledge-sync', 'state.json'),

  /** Previous operational snapshot, kept for diff comparison. */
  ksStatePrevious: path.join(HOME, '.openclaw', 'knowledge-sync', 'state.previous.json'),

  /** Skill V2 knowledge-watcher state.json (F1/F2/F4 runs + gaps map). */
  kwState: path.join(HOME, '.openclaw', 'knowledge-watcher', 'state.json'),

  /** Skill V2 W8 feedback DB (decisions + F3 outputs). Readonly from MC. */
  kwFeedbackDb: path.join(HOME, '.openclaw', 'knowledge-watcher', 'feedback.db'),

  /**
   * Append-only event log of the knowledge-sync skill.
   * Static production default — runtime override via MC_EVENTS_FILE is
   * resolved at call time by the indexer consumer (not at module load),
   * so tests that set the env var in beforeEach see the override.
   */
  ksEvents: path.join(HOME, '.openclaw', 'knowledge-sync', 'events.jsonl'),

  /**
   * Local SQLite cache where events.jsonl is indexed for queries.
   * Static production default — runtime override via MC_DB_PATH is resolved
   * at call time by events-db.ts. NOT a source of truth — the file can be
   * deleted at any time and the indexer rebuilds from events.jsonl.
   */
  eventsDb: path.join(HOME, '.openclaw', 'mission-control', 'events.db'),

  /** JSONL index of knowledge-sync snapshots (auto / manual / pre-canonical). */
  snapshotsIndex: path.join(
    HOME,
    '.openclaw',
    'backups',
    'knowledge-snapshots',
    'meta',
    'snapshots-index.jsonl',
  ),

  /** Clone of bevox-knowledge (the canonical repo). */
  bevoxKnowledgeClone:
    process.env.MC_KNOWLEDGE_CLONE ?? path.join(HOME, 'bevox-knowledge'),

  /** Main OpenClaw config file. */
  openclawConfig: path.join(HOME, '.openclaw', 'openclaw.json'),

  /** Vox agent auth profiles (OAuth tokens, API keys). */
  authProfiles: path.join(
    HOME,
    '.openclaw',
    'agents',
    'main',
    'agent',
    'auth-profiles.json',
  ),
} as const;

export type BevoxPaths = typeof PATHS;

/**
 * Canonical sub-paths inside `bevoxKnowledgeClone`.
 *
 * Centralize artifact locations here so API routes don't hardcode
 * folder/filename strings. Paths reflect the ADR-010 convention
 * (shared governance under `_shared/`, project-scoped content under
 * `<project>/`). Adding new entries is preferable to inlining a
 * `path.join(clone, "...", "...")` call in a route.
 */
export const BEVOX_SUBPATHS = {
  /** Delivery tracker — cross-project aggregate. Moved in reorg wave-2. */
  tracker: "40_roadmap/_shared/delivery-tracker.yml",
  /** Canonical agents registry (YAML source of truth). Moved in reorg wave-3. */
  agentsRegistry: "20_architecture/_shared/registry.yml",
  /** Content backlog entries. Moved in reorg wave-3. */
  contentBacklog: "20_architecture/_shared/content-backlog.yml",
  /** Base directory for resolving agent `.md` files referenced by `registry.yml`'s `file:` field. ADR-010 wave-3: files agora vivem em openclaw/ ou company-os/ sob 20_architecture/. */
  architectureDir: "20_architecture",
  /** Roadmap narrativo estratégico (parser consumer). Adicionado em wave E5/F1+F2. */
  roadmapNarrative: "40_roadmap/company-os/2026-04-09-openclaw-company-os-roadmap.md",
} as const;

export type BevoxSubpathKey = keyof typeof BEVOX_SUBPATHS;
