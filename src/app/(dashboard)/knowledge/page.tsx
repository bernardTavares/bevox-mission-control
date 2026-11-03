"use client";

/**
 * Knowledge module page.
 *
 * Per spec 35_specs/2026-04-10-e2-mission-control.md §5.2.2: a vertical
 * stream of four read-only sections — STATUS, DRAFTS, SNAPSHOTS, EVENTS.
 * No mutations, no action buttons, no "restore" / "create snapshot" /
 * "pull-ff" surfaces. Those operations remain in the knowledge-sync skill
 * CLI; Mission Control is for INSPECTION only at v1.
 *
 * All data comes from Task 9 endpoints:
 *   - /api/bevox/knowledge-state  → STATUS + DRAFTS (both live in state.json)
 *   - /api/bevox/snapshots        → SNAPSHOTS
 *   - /api/bevox/events?limit=100 → EVENTS (all events.jsonl lines are
 *       already knowledge-sync subsystem events in v1 — no extra filter)
 */

import { useEffect, useState } from "react";
import { ModuleStream } from "@/components/bevox/ModuleStream";
import { ModuleSection } from "@/components/bevox/ModuleSection";
import type { KsState, SnapshotEntry } from "@/lib/bevox/types";
import type { KwSummary, KwGap } from "@/lib/bevox/knowledge-watcher-state";
import type { FeedbackSummary } from "@/lib/bevox/feedback-db";

// ----- response types --------------------------------------------------------

interface KsStateResponse {
  state: KsState | null;
  previous: KsState | null;
}

interface SnapshotsResponse {
  snapshots: SnapshotEntry[];
}

interface EventRow {
  ts: string;
  event: string;
  severity: string | null;
  payload: unknown;
}

interface EventsResponse {
  events: EventRow[];
  count: number;
  limit: number;
}

// ----- shared helpers --------------------------------------------------------

const MUTED: React.CSSProperties = {
  color: "var(--text-muted)",
  fontSize: "13px",
};

const ERROR_STYLE: React.CSSProperties = {
  color: "var(--error, #ef4444)",
  fontSize: "13px",
};

const MONO_SMALL: React.CSSProperties = {
  fontFamily: "var(--font-jetbrains)",
  fontSize: "12px",
};

function humanTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  // Display UTC hh:mm:ss for brevity (matches widget convention).
  return iso.length >= 19 ? iso.slice(11, 19) + " UTC" : iso;
}

function humanDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return iso.length >= 16 ? iso.replace("T", " ").slice(0, 16) + " UTC" : iso;
}

function humanBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

// ----- individual section bodies --------------------------------------------

function StatusBody({
  state,
  error,
}: {
  state: KsState | null;
  error?: string;
}) {
  if (error) return <div style={ERROR_STYLE}>error: {error}</div>;
  if (!state) return <div style={MUTED}>…</div>;

  const wt = state.working_tree.clean ? "clean" : "dirty";
  const healthColor =
    state.health.overall === "ok"
      ? "var(--success, #16a34a)"
      : state.health.overall === "degraded"
        ? "var(--warning, #eab308)"
        : "var(--error, #ef4444)";

  return (
    <dl
      style={{
        display: "grid",
        gridTemplateColumns: "max-content 1fr",
        rowGap: "6px",
        columnGap: "20px",
        fontSize: "13px",
        margin: 0,
      }}
    >
      <dt style={{ color: "var(--text-muted)" }}>branch</dt>
      <dd style={{ margin: 0, ...MONO_SMALL }}>
        {state.branch.current}
        {state.branch.tracking ? ` → ${state.branch.tracking}` : ""}
      </dd>

      <dt style={{ color: "var(--text-muted)" }}>HEAD</dt>
      <dd style={{ margin: 0, ...MONO_SMALL }}>
        {state.branch.head_sha.slice(0, 10)}
      </dd>

      <dt style={{ color: "var(--text-muted)" }}>ahead / behind</dt>
      <dd style={{ margin: 0, ...MONO_SMALL }}>
        {state.branch.ahead} / {state.branch.behind}
      </dd>

      <dt style={{ color: "var(--text-muted)" }}>working tree</dt>
      <dd style={{ margin: 0 }}>
        {wt}
        {!state.working_tree.clean && (
          <span style={{ color: "var(--text-muted)", marginLeft: "8px" }}>
            (modified {state.working_tree.modified.length} · untracked{" "}
            {state.working_tree.untracked.length} · staged{" "}
            {state.working_tree.staged.length})
          </span>
        )}
      </dd>

      <dt style={{ color: "var(--text-muted)" }}>last fetch</dt>
      <dd style={{ margin: 0 }}>
        {state.last.fetch_status ?? "unknown"}
        {state.last.fetch_at ? ` · ${humanTime(state.last.fetch_at)}` : ""}
      </dd>

      <dt style={{ color: "var(--text-muted)" }}>conflict potential</dt>
      <dd style={{ margin: 0 }}>
        {state.conflicts.potential ? (
          <span style={{ color: "var(--error, #ef4444)" }}>
            yes ({state.conflicts.reason ?? "unknown"})
          </span>
        ) : (
          "no"
        )}
      </dd>

      <dt style={{ color: "var(--text-muted)" }}>health</dt>
      <dd style={{ margin: 0, color: healthColor, fontWeight: 600 }}>
        {state.health.overall.toUpperCase()}
        {state.health.issues.length > 0 && (
          <span
            style={{
              color: "var(--text-muted)",
              marginLeft: "8px",
              fontWeight: 400,
            }}
          >
            ({state.health.issues.length} issue
            {state.health.issues.length === 1 ? "" : "s"})
          </span>
        )}
      </dd>

      <dt style={{ color: "var(--text-muted)" }}>watcher</dt>
      <dd style={{ margin: 0 }}>
        last run {humanTime(state.watcher.ran_at)} ·{" "}
        {state.watcher.duration_ms}ms
      </dd>
    </dl>
  );
}

function DraftsBody({
  state,
  error,
}: {
  state: KsState | null;
  error?: string;
}) {
  if (error) return <div style={ERROR_STYLE}>error: {error}</div>;
  if (!state) return <div style={MUTED}>…</div>;

  const drafts = state.draft_branches;
  if (drafts.length === 0) {
    return <div style={MUTED}>Sem branches draft ativas.</div>;
  }

  return (
    <ul
      style={{
        listStyle: "none",
        padding: 0,
        margin: 0,
        display: "flex",
        flexDirection: "column",
        gap: "6px",
      }}
    >
      {drafts.map((b) => (
        <li
          key={b.name}
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "12px",
            ...MONO_SMALL,
          }}
        >
          <span style={{ color: "var(--text-primary)" }}>{b.name}</span>
          <span style={{ color: "var(--text-muted)" }}>
            {b.last_commit_age_days != null
              ? `${b.last_commit_age_days}d ago`
              : ""}
          </span>
        </li>
      ))}
    </ul>
  );
}

const MAX_SNAPSHOTS_RENDERED = 20;

function SnapshotsBody({
  snapshots,
  error,
}: {
  snapshots: SnapshotEntry[] | null;
  error?: string;
}) {
  if (error) return <div style={ERROR_STYLE}>error: {error}</div>;
  if (!snapshots) return <div style={MUTED}>…</div>;
  if (snapshots.length === 0) {
    return <div style={MUTED}>Sem snapshots no índice.</div>;
  }

  // Most recent first (index is append-only, so reverse chronological).
  const sorted = [...snapshots]
    .sort((a, b) => b.ts.localeCompare(a.ts))
    .slice(0, MAX_SNAPSHOTS_RENDERED);

  return (
    <>
      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "flex",
          flexDirection: "column",
          gap: "4px",
        }}
      >
        {sorted.map((s) => {
          const verifyColor =
            s.verify_status === "ok"
              ? "var(--success, #16a34a)"
              : s.verify_status === "failed"
                ? "var(--error, #ef4444)"
                : "var(--text-muted)";
          return (
            <li
              key={s.path}
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) max-content max-content max-content",
                gap: "12px",
                alignItems: "baseline",
                ...MONO_SMALL,
              }}
            >
              <span
                style={{
                  color: "var(--text-primary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={s.path}
              >
                {s.path}
              </span>
              <span style={{ color: "var(--text-muted)" }}>{s.type}</span>
              <span style={{ color: "var(--text-muted)" }}>
                {humanBytes(s.size_bytes)}
              </span>
              <span style={{ color: verifyColor, fontWeight: 600 }}>
                {s.verify_status}
              </span>
            </li>
          );
        })}
      </ul>
      {snapshots.length > MAX_SNAPSHOTS_RENDERED && (
        <div style={{ ...MUTED, marginTop: "8px" }}>
          showing most recent {MAX_SNAPSHOTS_RENDERED} of {snapshots.length}
        </div>
      )}
    </>
  );
}

const MAX_EVENTS_RENDERED = 50;

function EventsBody({
  events,
  error,
}: {
  events: EventRow[] | null;
  error?: string;
}) {
  if (error) return <div style={ERROR_STYLE}>error: {error}</div>;
  if (!events) return <div style={MUTED}>…</div>;
  if (events.length === 0) {
    return <div style={MUTED}>Nenhum evento indexado.</div>;
  }

  const recent = events.slice(0, MAX_EVENTS_RENDERED);

  return (
    <>
      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "flex",
          flexDirection: "column",
          gap: "2px",
          maxHeight: "500px",
          overflowY: "auto",
        }}
      >
        {recent.map((e, i) => {
          const severityColor =
            e.severity === "error"
              ? "var(--error, #ef4444)"
              : e.severity === "warn"
                ? "var(--warning, #eab308)"
                : "var(--text-muted)";
          return (
            <li
              key={`${e.ts}-${i}`}
              style={{
                display: "grid",
                gridTemplateColumns: "max-content minmax(0, 1fr) max-content",
                gap: "12px",
                ...MONO_SMALL,
              }}
            >
              <span style={{ color: "var(--text-muted)" }}>
                {humanDateTime(e.ts)}
              </span>
              <span
                style={{
                  color: "var(--text-primary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={e.event}
              >
                {e.event}
              </span>
              <span style={{ color: severityColor }}>
                {e.severity ?? ""}
              </span>
            </li>
          );
        })}
      </ul>
      {events.length > MAX_EVENTS_RENDERED && (
        <div style={{ ...MUTED, marginTop: "8px" }}>
          showing most recent {MAX_EVENTS_RENDERED} of {events.length}
        </div>
      )}
    </>
  );
}

// ----- Skill V2 watcher sections -------------------------------------------

function WatcherStatusBody({
  summary,
  error,
}: {
  summary: KwSummary | null;
  error?: string;
}) {
  if (error) return <div style={ERROR_STYLE}>error: {error}</div>;
  if (!summary) return <div style={MUTED}>…</div>;
  if (!summary.state) {
    return (
      <div style={MUTED}>
        knowledge-watcher state.json não existe ainda (cron F1 ainda não rodou).
      </div>
    );
  }

  const { totals } = summary;
  return (
    <dl
      style={{
        display: "grid",
        gridTemplateColumns: "max-content 1fr",
        rowGap: "6px",
        columnGap: "20px",
        fontSize: "13px",
        margin: 0,
      }}
    >
      <dt style={{ color: "var(--text-muted)" }}>repos opted-in</dt>
      <dd style={{ margin: 0 }}>{totals.repos}</dd>

      <dt style={{ color: "var(--text-muted)" }}>open gaps total</dt>
      <dd style={{ margin: 0 }}>
        {totals.gaps_open}
        <span style={{ color: "var(--text-muted)", marginLeft: "8px" }}>
          (F1: {totals.gaps_by_source.f1} · F4: {totals.gaps_by_source.f4})
        </span>
      </dd>

      <dt style={{ color: "var(--text-muted)" }}>last full audit</dt>
      <dd style={{ margin: 0 }}>{humanDateTime(totals.last_full_audit_at)}</dd>

      <dt style={{ color: "var(--text-muted)" }}>F1 digest seq</dt>
      <dd style={{ margin: 0 }}>{summary.state.global?.f1_telegram_digest_seq ?? 0}</dd>

      <dt style={{ color: "var(--text-muted)" }}>F3 cost MTD</dt>
      <dd style={{ margin: 0 }}>
        ${summary.cost.f3_cost_mtd_usd.toFixed(2)}
        <span style={{ color: "var(--text-muted)", marginLeft: "8px" }}>
          / ${summary.cost.budget_monthly_usd.toFixed(2)} budget · lifetime ${summary.cost.f3_cost_lifetime_usd.toFixed(2)}
        </span>
      </dd>
    </dl>
  );
}

function WatcherPerRepoBody({
  summary,
  error,
}: {
  summary: KwSummary | null;
  error?: string;
}) {
  if (error) return <div style={ERROR_STYLE}>error: {error}</div>;
  if (!summary) return <div style={MUTED}>…</div>;
  if (summary.per_repo.length === 0) {
    return <div style={MUTED}>Sem repos com state ainda.</div>;
  }

  return (
    <ul
      style={{
        listStyle: "none",
        padding: 0,
        margin: 0,
        display: "flex",
        flexDirection: "column",
        gap: "4px",
      }}
    >
      {summary.per_repo.map((r) => (
        <li
          key={r.slug}
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) max-content max-content max-content",
            gap: "12px",
            alignItems: "baseline",
            ...MONO_SMALL,
          }}
        >
          <span style={{ color: "var(--text-primary)" }}>{r.slug}</span>
          <span style={{ color: "var(--text-muted)" }}>
            last {humanTime(r.last_run_at)}
          </span>
          <span style={{ color: r.gaps_open > 0 ? "var(--warning, #eab308)" : "var(--text-muted)" }}>
            {r.gaps_open} open
          </span>
          <span style={{ color: "var(--text-muted)" }}>
            {r.gaps_dismissed_total} dismissed
          </span>
        </li>
      ))}
    </ul>
  );
}

function WatcherDocTypeBody({
  summary,
  error,
}: {
  summary: KwSummary | null;
  error?: string;
}) {
  if (error) return <div style={ERROR_STYLE}>error: {error}</div>;
  if (!summary) return <div style={MUTED}>…</div>;
  const entries = Object.entries(summary.totals.gaps_by_doc_type).sort(
    (a, b) => b[1] - a[1],
  );
  if (entries.length === 0) {
    return <div style={MUTED}>Sem gaps abertos.</div>;
  }
  return (
    <ul
      style={{
        listStyle: "none",
        padding: 0,
        margin: 0,
        display: "flex",
        flexDirection: "column",
        gap: "4px",
      }}
    >
      {entries.map(([docType, count]) => (
        <li
          key={docType}
          style={{
            display: "grid",
            gridTemplateColumns: "max-content 1fr",
            gap: "12px",
            ...MONO_SMALL,
          }}
        >
          <span style={{ color: "var(--text-muted)", minWidth: "120px" }}>
            {docType}
          </span>
          <span style={{ color: "var(--text-primary)" }}>{count}</span>
        </li>
      ))}
    </ul>
  );
}

const MAX_RECENT_GAPS = 20;

function WatcherRecentGapsBody({
  summary,
  error,
}: {
  summary: KwSummary | null;
  error?: string;
}) {
  if (error) return <div style={ERROR_STYLE}>error: {error}</div>;
  if (!summary) return <div style={MUTED}>…</div>;
  if (summary.recent_gaps.length === 0) {
    return <div style={MUTED}>Sem gaps recentes.</div>;
  }
  return (
    <ul
      style={{
        listStyle: "none",
        padding: 0,
        margin: 0,
        display: "flex",
        flexDirection: "column",
        gap: "2px",
        maxHeight: "400px",
        overflowY: "auto",
      }}
    >
      {summary.recent_gaps.slice(0, MAX_RECENT_GAPS).map((g: KwGap) => (
        <li
          key={g.gap_id}
          style={{
            display: "grid",
            gridTemplateColumns: "max-content max-content minmax(0, 1fr) max-content",
            gap: "10px",
            ...MONO_SMALL,
          }}
          title={g.path}
        >
          <span style={{ color: "var(--text-muted)" }}>
            {humanDateTime(g.created_at)}
          </span>
          <span style={{ color: "var(--text-muted)" }}>{g.source}</span>
          <span
            style={{
              color: "var(--text-primary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {g.path}
          </span>
          <span style={{ color: "var(--text-muted)" }}>
            {g.doc_type ?? "—"}
          </span>
        </li>
      ))}
    </ul>
  );
}

// ----- W8 feedback section --------------------------------------------------

function FeedbackBody({
  summary,
  error,
}: {
  summary: FeedbackSummary | null;
  error?: string;
}) {
  if (error) return <div style={ERROR_STYLE}>error: {error}</div>;
  if (!summary) return <div style={MUTED}>…</div>;
  if (
    summary.by_doc_type.length === 0 &&
    summary.f3_edit_distance.length === 0 &&
    summary.by_signal_combo.length === 0
  ) {
    return (
      <div style={MUTED}>
        Nenhuma decisão ou F3 output registrado nos últimos {summary.days} dias.
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {summary.by_doc_type.length > 0 && (
        <div>
          <div style={{ ...MUTED, marginBottom: "4px" }}>
            By doc-type (last {summary.days}d):
          </div>
          <ul
            style={{
              listStyle: "none", padding: 0, margin: 0,
              display: "flex", flexDirection: "column", gap: "2px",
            }}
          >
            {summary.by_doc_type.map((r) => (
              <li
                key={r.doc_type}
                style={{
                  display: "grid",
                  gridTemplateColumns: "max-content 1fr",
                  gap: "12px",
                  ...MONO_SMALL,
                }}
              >
                <span style={{ color: "var(--text-muted)", minWidth: "120px" }}>
                  {r.doc_type} (n={r.n})
                </span>
                <span>
                  keep {(r.keep_ratio * 100).toFixed(0)}%
                  · retire {(r.retire_ratio * 100).toFixed(0)}%
                  · keep_perm {(r.keep_permanent_ratio * 100).toFixed(0)}%
                  · dismiss {(r.dismiss_ratio * 100).toFixed(0)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {summary.by_signal_combo.length > 0 && (
        <div>
          <div style={{ ...MUTED, marginBottom: "4px" }}>
            By signal combo (top 10, n≥4):
          </div>
          <ul
            style={{
              listStyle: "none", padding: 0, margin: 0,
              display: "flex", flexDirection: "column", gap: "2px",
            }}
          >
            {summary.by_signal_combo.slice(0, 10).map((r, i) => {
              const tuningCandidate = r.keep_ratio > 0.9;
              return (
                <li
                  key={`${r.doc_type}|${r.signal_combo}|${i}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "max-content 1fr",
                    gap: "12px",
                    ...MONO_SMALL,
                  }}
                >
                  <span
                    style={{
                      color: tuningCandidate
                        ? "var(--warning, #eab308)"
                        : "var(--text-muted)",
                      minWidth: "180px",
                    }}
                  >
                    {r.doc_type} + {r.signal_combo} (n={r.n})
                  </span>
                  <span
                    style={{
                      color: tuningCandidate
                        ? "var(--warning, #eab308)"
                        : "var(--text-primary)",
                    }}
                  >
                    keep {(r.keep_ratio * 100).toFixed(0)}%
                    {tuningCandidate ? "  ⚠️ tuning candidate" : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {summary.f3_edit_distance.length > 0 && (
        <div>
          <div style={{ ...MUTED, marginBottom: "4px" }}>
            F3 edit distance (accepted last {summary.days}d):
          </div>
          <ul
            style={{
              listStyle: "none", padding: 0, margin: 0,
              display: "flex", flexDirection: "column", gap: "2px",
            }}
          >
            {summary.f3_edit_distance.map((r) => (
              <li
                key={r.generator}
                style={{
                  display: "grid",
                  gridTemplateColumns: "max-content 1fr",
                  gap: "12px",
                  ...MONO_SMALL,
                }}
              >
                <span style={{ color: "var(--text-muted)", minWidth: "120px" }}>
                  {r.generator} (n={r.n})
                </span>
                <span>
                  p50 {r.p50.toFixed(2)} · p90 {r.p90.toFixed(2)}
                  · mean {r.mean.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ----- page ------------------------------------------------------------------

export default function KnowledgePage() {
  const [state, setState] = useState<KsState | null>(null);
  const [snapshots, setSnapshots] = useState<SnapshotEntry[] | null>(null);
  const [events, setEvents] = useState<EventRow[] | null>(null);
  const [watcher, setWatcher] = useState<KwSummary | null>(null);
  const [feedback, setFeedback] = useState<FeedbackSummary | null>(null);
  const [errors, setErrors] = useState<{
    state?: string;
    snapshots?: string;
    events?: string;
    watcher?: string;
    feedback?: string;
  }>({});

  useEffect(() => {
    let cancelled = false;

    fetch("/api/bevox/knowledge-state")
      .then((r) =>
        r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)),
      )
      .then((d: KsStateResponse) => !cancelled && setState(d.state))
      .catch(
        (e: Error) =>
          !cancelled && setErrors((p) => ({ ...p, state: e.message })),
      );

    fetch("/api/bevox/snapshots")
      .then((r) =>
        r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)),
      )
      .then(
        (d: SnapshotsResponse) => !cancelled && setSnapshots(d.snapshots),
      )
      .catch(
        (e: Error) =>
          !cancelled && setErrors((p) => ({ ...p, snapshots: e.message })),
      );

    fetch("/api/bevox/events?limit=100")
      .then((r) =>
        r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)),
      )
      .then((d: EventsResponse) => !cancelled && setEvents(d.events))
      .catch(
        (e: Error) =>
          !cancelled && setErrors((p) => ({ ...p, events: e.message })),
      );

    fetch("/api/bevox/knowledge-watcher")
      .then((r) =>
        r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)),
      )
      .then((d: KwSummary) => !cancelled && setWatcher(d))
      .catch(
        (e: Error) =>
          !cancelled && setErrors((p) => ({ ...p, watcher: e.message })),
      );

    fetch("/api/bevox/knowledge-watcher/feedback?days=30")
      .then((r) =>
        r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)),
      )
      .then((d: FeedbackSummary) => !cancelled && setFeedback(d))
      .catch(
        (e: Error) =>
          !cancelled && setErrors((p) => ({ ...p, feedback: e.message })),
      );

    return () => {
      cancelled = true;
    };
  }, []);

  const draftsCount = state?.draft_branches.length;
  const snapshotsCount = snapshots?.length;
  const eventsCount = events?.length;

  return (
    <ModuleStream
      title="Knowledge"
      subtitle="estado do bevox-knowledge (read-only — mutations via knowledge-sync CLI)"
    >
      <ModuleSection title="Status">
        <StatusBody state={state} error={errors.state} />
      </ModuleSection>

      <ModuleSection title="Drafts" count={draftsCount}>
        <DraftsBody state={state} error={errors.state} />
      </ModuleSection>

      <ModuleSection title="Snapshots" count={snapshotsCount}>
        <SnapshotsBody snapshots={snapshots} error={errors.snapshots} />
      </ModuleSection>

      <ModuleSection
        title="Events"
        count={eventsCount}
        defaultOpen={false}
      >
        <EventsBody events={events} error={errors.events} />
      </ModuleSection>

      <ModuleSection title="Watcher · Status">
        <WatcherStatusBody summary={watcher} error={errors.watcher} />
      </ModuleSection>

      <ModuleSection
        title="Watcher · Per-repo"
        count={watcher?.per_repo.length}
      >
        <WatcherPerRepoBody summary={watcher} error={errors.watcher} />
      </ModuleSection>

      <ModuleSection
        title="Watcher · Gaps by doc-type"
        count={
          watcher
            ? Object.keys(watcher.totals.gaps_by_doc_type).length
            : undefined
        }
      >
        <WatcherDocTypeBody summary={watcher} error={errors.watcher} />
      </ModuleSection>

      <ModuleSection
        title="Watcher · Recent gaps"
        count={watcher?.recent_gaps.length}
        defaultOpen={false}
      >
        <WatcherRecentGapsBody summary={watcher} error={errors.watcher} />
      </ModuleSection>

      <ModuleSection
        title="Watcher · Feedback patterns"
        count={feedback?.by_doc_type.length}
        defaultOpen={false}
      >
        <FeedbackBody summary={feedback} error={errors.feedback} />
      </ModuleSection>
    </ModuleStream>
  );
}
