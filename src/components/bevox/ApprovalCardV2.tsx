/**
 * ApprovalCardV2 — inline renderer of the 6-block approval card that the
 * knowledge-sync skill sends to Telegram.
 *
 * The card JSON is produced by `ks_approval_build_{commit,push,marker}_card`
 * in the skill (see ~/.openclaw/skills/knowledge-sync/lib/approval.sh). Every
 * card has the same 3 top-level shape — { summary, why_now, target,
 * evidence, risk } — but the `target` and `evidence` sub-objects differ per
 * action ('canonical commit' / 'canonical push' / 'canonical create-marker').
 *
 * Rendering mirrors the Telegram `ks_notify_format_approval_card` formatter
 * verbatim: 6 labeled blocks (ACAO / RESUMO / POR QUE AGORA / ALVO /
 * EVIDENCIA / RISCO / ROLLBACK), per-action target + evidence.
 *
 * This component is PURE presentation — zero fetching, zero buttons, zero
 * side effects. Telegram stays the source of decision (spec §2.2).
 */

import type { ReactNode } from "react";

// ----- types ----------------------------------------------------------------

/** The 3 canonical action types we render. Anything else falls through. */
export type CanonicalAction =
  | "canonical commit"
  | "canonical push"
  | "canonical create-marker";

/** Shared risk block across all actions. */
export interface RiskBlock {
  level?: "low" | "medium" | "high" | string;
  reason?: string;
  rollback?: string;
  modifiers_applied?: string[];
}

/** Commit-specific target block. */
export interface CommitTarget {
  branch?: string;
  scope?: string;
  files?: string[];
}

/** Commit-specific evidence block. */
export interface CommitEvidence {
  commit_message?: string;
  diffstat?: string;
  diff_preview?: string;
  diff_preview_file?: string;
  diff_preview_truncated?: boolean;
}

/** Push-specific target block. */
export interface PushTarget {
  branch?: string;
  remote?: string;
  commits_ahead?: number;
}

/** Push-specific evidence block. */
export interface PushEvidence {
  commits_preview?: string;
  is_fast_forward?: boolean;
}

/** Marker-specific target block. */
export interface MarkerTarget {
  tag?: string;
  head_sha?: string;
  version?: string;
  type?: string;
}

/** Marker-specific evidence block. */
export interface MarkerEvidence {
  marker_message?: string;
  recent_commits?: string;
}

/** Shape of the `card` field carried by each approval event payload. */
export interface CardV2 {
  summary?: string;
  why_now?: string;
  target?: CommitTarget | PushTarget | MarkerTarget | Record<string, unknown>;
  evidence?:
    | CommitEvidence
    | PushEvidence
    | MarkerEvidence
    | Record<string, unknown>;
  risk?: RiskBlock;
}

export interface ApprovalCardV2Props {
  shortId: string;
  action: string;
  card: CardV2 | null | undefined;
  /**
   * Derived state from the approval (pending / granted / executed / ...).
   * Rendered as a subtle pill in the header so reading history still shows
   * at a glance whether the card ended in success / rejection / expiry.
   */
  state?: string;
}

// ----- style tokens ---------------------------------------------------------

const LABEL_STYLE: React.CSSProperties = {
  fontFamily: "var(--font-heading)",
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "1.5px",
  textTransform: "uppercase",
  color: "var(--text-muted)",
  marginBottom: "4px",
};

const BODY_TEXT: React.CSSProperties = {
  fontSize: "13px",
  color: "var(--text-primary)",
  lineHeight: 1.5,
};

const MONO_BLOCK: React.CSSProperties = {
  fontFamily: "var(--font-jetbrains)",
  fontSize: "11px",
  color: "var(--text-primary)",
  backgroundColor: "var(--surface-elevated)",
  padding: "8px 10px",
  borderRadius: "4px",
  whiteSpace: "pre-wrap",
  overflowX: "auto",
};

const BLOCK_STYLE: React.CSSProperties = {
  marginBottom: "14px",
};

function Block({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={BLOCK_STYLE}>
      <div style={LABEL_STYLE}>{label}</div>
      <div style={BODY_TEXT}>{children}</div>
    </div>
  );
}

function Dash() {
  return <span style={{ color: "var(--text-muted)" }}>—</span>;
}

// ----- per-action target / evidence renderers ------------------------------

function CommitTargetBlock({ target }: { target: CommitTarget }) {
  return (
    <dl
      style={{
        display: "grid",
        gridTemplateColumns: "max-content 1fr",
        rowGap: "4px",
        columnGap: "12px",
        margin: 0,
      }}
    >
      <dt style={{ color: "var(--text-muted)" }}>Branch</dt>
      <dd style={{ margin: 0, fontFamily: "var(--font-jetbrains)" }}>
        {target.branch || <Dash />}
      </dd>
      <dt style={{ color: "var(--text-muted)" }}>Escopo</dt>
      <dd style={{ margin: 0 }}>{target.scope || <Dash />}</dd>
      <dt style={{ color: "var(--text-muted)" }}>Arquivos</dt>
      <dd style={{ margin: 0 }}>
        {target.files && target.files.length > 0 ? (
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              fontFamily: "var(--font-jetbrains)",
              fontSize: "12px",
            }}
          >
            {target.files.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        ) : (
          <Dash />
        )}
      </dd>
    </dl>
  );
}

function CommitEvidenceBlock({ evidence }: { evidence: CommitEvidence }) {
  return (
    <div>
      <div style={{ marginBottom: "6px" }}>
        <span style={{ color: "var(--text-muted)" }}>Commit msg: </span>
        <span style={{ fontFamily: "var(--font-jetbrains)" }}>
          {evidence.commit_message || "—"}
        </span>
      </div>
      {evidence.diffstat ? (
        <div style={{ marginBottom: "6px" }}>
          <div style={{ color: "var(--text-muted)", marginBottom: "2px" }}>
            Diffstat:
          </div>
          <pre style={MONO_BLOCK}>{evidence.diffstat}</pre>
        </div>
      ) : null}
      {evidence.diff_preview ? (
        <div>
          <div style={{ color: "var(--text-muted)", marginBottom: "2px" }}>
            Preview ({evidence.diff_preview_file || "?"}):
          </div>
          <pre style={MONO_BLOCK}>
            {evidence.diff_preview}
            {evidence.diff_preview_truncated ? "\n[truncado]" : ""}
          </pre>
        </div>
      ) : null}
    </div>
  );
}

function PushTargetBlock({ target }: { target: PushTarget }) {
  return (
    <dl
      style={{
        display: "grid",
        gridTemplateColumns: "max-content 1fr",
        rowGap: "4px",
        columnGap: "12px",
        margin: 0,
      }}
    >
      <dt style={{ color: "var(--text-muted)" }}>Branch</dt>
      <dd style={{ margin: 0, fontFamily: "var(--font-jetbrains)" }}>
        {target.branch ? `${target.branch} → ${target.remote ?? "origin"}/${target.branch}` : <Dash />}
      </dd>
      <dt style={{ color: "var(--text-muted)" }}>Commits a subir</dt>
      <dd style={{ margin: 0 }}>{target.commits_ahead ?? 0}</dd>
    </dl>
  );
}

function PushEvidenceBlock({ evidence }: { evidence: PushEvidence }) {
  return (
    <div>
      {evidence.commits_preview ? (
        <div style={{ marginBottom: "6px" }}>
          <div style={{ color: "var(--text-muted)", marginBottom: "2px" }}>
            Commits:
          </div>
          <pre style={MONO_BLOCK}>{evidence.commits_preview}</pre>
        </div>
      ) : null}
      <div>
        <span style={{ color: "var(--text-muted)" }}>Fast-forward: </span>
        <span>{evidence.is_fast_forward ? "yes" : "no"}</span>
      </div>
    </div>
  );
}

function MarkerTargetBlock({ target }: { target: MarkerTarget }) {
  return (
    <dl
      style={{
        display: "grid",
        gridTemplateColumns: "max-content 1fr",
        rowGap: "4px",
        columnGap: "12px",
        margin: 0,
      }}
    >
      <dt style={{ color: "var(--text-muted)" }}>Tag</dt>
      <dd style={{ margin: 0, fontFamily: "var(--font-jetbrains)" }}>
        {target.tag || <Dash />}
      </dd>
      <dt style={{ color: "var(--text-muted)" }}>HEAD</dt>
      <dd style={{ margin: 0, fontFamily: "var(--font-jetbrains)" }}>
        {target.head_sha ? target.head_sha.slice(0, 10) : <Dash />}
      </dd>
      <dt style={{ color: "var(--text-muted)" }}>Versão</dt>
      <dd style={{ margin: 0 }}>{target.version || <Dash />}</dd>
      <dt style={{ color: "var(--text-muted)" }}>Tipo</dt>
      <dd style={{ margin: 0 }}>{target.type || <Dash />}</dd>
    </dl>
  );
}

function MarkerEvidenceBlock({ evidence }: { evidence: MarkerEvidence }) {
  return (
    <div>
      <div style={{ marginBottom: "6px" }}>
        <span style={{ color: "var(--text-muted)" }}>Mensagem do marker: </span>
        <span>{evidence.marker_message || "—"}</span>
      </div>
      {evidence.recent_commits ? (
        <div>
          <div style={{ color: "var(--text-muted)", marginBottom: "2px" }}>
            Commits recentes marcados:
          </div>
          <pre style={MONO_BLOCK}>{evidence.recent_commits}</pre>
        </div>
      ) : null}
    </div>
  );
}

function GenericKeyValueBlock({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data);
  if (entries.length === 0) return <Dash />;
  return (
    <dl
      style={{
        display: "grid",
        gridTemplateColumns: "max-content 1fr",
        rowGap: "4px",
        columnGap: "12px",
        margin: 0,
      }}
    >
      {entries.map(([k, v]) => (
        <ReactFragment key={k} k={k} v={v} />
      ))}
    </dl>
  );
}

function ReactFragment({ k, v }: { k: string; v: unknown }) {
  return (
    <>
      <dt style={{ color: "var(--text-muted)" }}>{k}</dt>
      <dd
        style={{
          margin: 0,
          fontFamily: "var(--font-jetbrains)",
          fontSize: "11px",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {typeof v === "string" ? v : JSON.stringify(v)}
      </dd>
    </>
  );
}

// ----- state pill ----------------------------------------------------------

function StatePill({ state }: { state: string }) {
  const styleByState: Record<string, React.CSSProperties> = {
    pending: {
      backgroundColor: "var(--accent-soft)",
      color: "var(--accent)",
    },
    granted: {
      backgroundColor: "var(--accent-soft)",
      color: "var(--accent)",
    },
    executed: {
      backgroundColor: "rgba(22, 163, 74, 0.15)",
      color: "var(--success, #16a34a)",
    },
    rejected: {
      backgroundColor: "rgba(239, 68, 68, 0.15)",
      color: "var(--error, #ef4444)",
    },
    expired: {
      backgroundColor: "var(--surface-elevated)",
      color: "var(--text-muted)",
    },
  };
  const style = styleByState[state] ?? {
    backgroundColor: "var(--surface-elevated)",
    color: "var(--text-muted)",
  };
  return (
    <span
      style={{
        fontSize: "10px",
        fontWeight: 700,
        letterSpacing: "1px",
        textTransform: "uppercase",
        padding: "2px 8px",
        borderRadius: "999px",
        ...style,
      }}
    >
      {state}
    </span>
  );
}

// ----- risk pill -----------------------------------------------------------

function RiskPill({ level }: { level: string | undefined }) {
  if (!level) return null;
  const styleByLevel: Record<string, React.CSSProperties> = {
    low: {
      backgroundColor: "rgba(22, 163, 74, 0.15)",
      color: "var(--success, #16a34a)",
    },
    medium: {
      backgroundColor: "rgba(234, 179, 8, 0.15)",
      color: "var(--warning, #eab308)",
    },
    high: {
      backgroundColor: "rgba(239, 68, 68, 0.15)",
      color: "var(--error, #ef4444)",
    },
  };
  const s = styleByLevel[level] ?? {
    backgroundColor: "var(--surface-elevated)",
    color: "var(--text-muted)",
  };
  return (
    <span
      style={{
        fontSize: "10px",
        fontWeight: 700,
        letterSpacing: "1px",
        textTransform: "uppercase",
        padding: "2px 8px",
        borderRadius: "999px",
        ...s,
      }}
    >
      {level}
    </span>
  );
}

// ----- main component ------------------------------------------------------

export function ApprovalCardV2({
  shortId,
  action,
  card,
  state,
}: ApprovalCardV2Props) {
  // Fallback: no card JSON at all (very old approval). Show the minimum.
  if (!card) {
    return (
      <article
        style={{
          border: "1px solid var(--border)",
          borderRadius: "8px",
          backgroundColor: "var(--surface-elevated)",
          padding: "12px 14px",
        }}
      >
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: "10px",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-jetbrains)",
              fontSize: "11px",
              color: "var(--text-muted)",
            }}
          >
            [{shortId}]
          </span>
          {state ? <StatePill state={state} /> : null}
        </header>
        <div style={{ fontSize: "13px", marginTop: "4px" }}>{action}</div>
        <div
          style={{
            color: "var(--text-muted)",
            fontSize: "11px",
            marginTop: "6px",
          }}
        >
          (sem card — approval antigo)
        </div>
      </article>
    );
  }

  const isCommit = action === "canonical commit";
  const isPush = action === "canonical push";
  const isMarker = action === "canonical create-marker";

  return (
    <article
      data-mc-approval-card
      data-mc-action={action}
      data-mc-state={state ?? ""}
      style={{
        border: "1px solid var(--border)",
        borderRadius: "8px",
        backgroundColor: "var(--surface-elevated)",
        padding: "14px 16px",
      }}
    >
      {/* Header: shortId + state pill */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: "10px",
          marginBottom: "12px",
          paddingBottom: "10px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-jetbrains)",
            fontSize: "11px",
            color: "var(--text-muted)",
            fontWeight: 700,
          }}
        >
          [{shortId}]
        </span>
        {state ? <StatePill state={state} /> : null}
      </header>

      {/* Block 1: ACAO */}
      <Block label="Ação">
        <span style={{ fontFamily: "var(--font-jetbrains)" }}>{action}</span>
      </Block>

      {/* Block 2: RESUMO */}
      <Block label="Resumo">{card.summary || <Dash />}</Block>

      {/* Block 3: POR QUE AGORA */}
      <Block label="Por que agora">{card.why_now || <Dash />}</Block>

      {/* Block 4: ALVO (per-action) */}
      <Block label="Alvo">
        {isCommit && card.target ? (
          <CommitTargetBlock target={card.target as CommitTarget} />
        ) : isPush && card.target ? (
          <PushTargetBlock target={card.target as PushTarget} />
        ) : isMarker && card.target ? (
          <MarkerTargetBlock target={card.target as MarkerTarget} />
        ) : card.target ? (
          <GenericKeyValueBlock data={card.target as Record<string, unknown>} />
        ) : (
          <Dash />
        )}
      </Block>

      {/* Block 5: EVIDENCIA (per-action) */}
      <Block label="Evidência">
        {isCommit && card.evidence ? (
          <CommitEvidenceBlock evidence={card.evidence as CommitEvidence} />
        ) : isPush && card.evidence ? (
          <PushEvidenceBlock evidence={card.evidence as PushEvidence} />
        ) : isMarker && card.evidence ? (
          <MarkerEvidenceBlock evidence={card.evidence as MarkerEvidence} />
        ) : card.evidence ? (
          <GenericKeyValueBlock data={card.evidence as Record<string, unknown>} />
        ) : (
          <Dash />
        )}
      </Block>

      {/* Block 6: RISCO / ROLLBACK */}
      <Block label="Risco / Rollback">
        {card.risk ? (
          <div>
            <div style={{ marginBottom: "6px" }}>
              <RiskPill level={card.risk.level} />
            </div>
            {card.risk.reason ? (
              <div style={{ marginBottom: "4px" }}>
                <span style={{ color: "var(--text-muted)" }}>Razão: </span>
                {card.risk.reason}
              </div>
            ) : null}
            {card.risk.rollback ? (
              <div>
                <span style={{ color: "var(--text-muted)" }}>Rollback: </span>
                <span
                  style={{
                    fontFamily: "var(--font-jetbrains)",
                    fontSize: "12px",
                  }}
                >
                  {card.risk.rollback}
                </span>
              </div>
            ) : null}
          </div>
        ) : (
          <Dash />
        )}
      </Block>

      {/* Footer: source-of-truth reminder */}
      <footer
        style={{
          marginTop: "4px",
          paddingTop: "10px",
          borderTop: "1px solid var(--border)",
          fontSize: "11px",
          color: "var(--text-muted)",
          fontStyle: "italic",
        }}
      >
        Aprovação via Telegram — Mission Control é read-only.
      </footer>
    </article>
  );
}
