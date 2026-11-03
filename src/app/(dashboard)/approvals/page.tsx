"use client";

/**
 * Approvals module page.
 *
 * Per spec 35_specs/2026-04-10-e2-mission-control.md §5.2.3: a vertical
 * stream of three read-only sections — PENDING, GRANTED, HISTORY. Every
 * pending / granted approval renders the full 6-block card v2 inline,
 * mirroring what Bernard sees on Telegram. Telegram remains the single
 * source of decision — there are NO approve / reject / execute buttons
 * on this page (spec §2.2).
 *
 * Single endpoint: /api/bevox/approvals?state=all. The endpoint already
 * derives state server-side via approvals.ts (Task 9), so the page just
 * partitions the response into the 3 sections client-side.
 */

import { useEffect, useState } from "react";
import { ModuleStream } from "@/components/bevox/ModuleStream";
import { ModuleSection } from "@/components/bevox/ModuleSection";
import {
  ApprovalCardV2,
  type CardV2,
} from "@/components/bevox/ApprovalCardV2";
import type { ApprovalSummary } from "@/lib/bevox/types";

interface Response {
  approvals: ApprovalSummary[];
  count: number;
  filter: string;
}

const HISTORY_LIMIT = 20;

const MUTED: React.CSSProperties = {
  color: "var(--text-muted)",
  fontSize: "13px",
};

const ERROR_STYLE: React.CSSProperties = {
  color: "var(--error, #ef4444)",
  fontSize: "13px",
};

// ----- section bodies ------------------------------------------------------

function ApprovalListBody({
  items,
  error,
  emptyText,
}: {
  items: ApprovalSummary[] | null;
  error?: string;
  emptyText: string;
}) {
  if (error) return <div style={ERROR_STYLE}>error: {error}</div>;
  if (!items) return <div style={MUTED}>…</div>;
  if (items.length === 0) return <div style={MUTED}>{emptyText}</div>;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      {items.map((a) => (
        <ApprovalCardV2
          key={a.approval_id}
          shortId={a.short_id}
          action={a.action}
          card={a.card as CardV2 | null | undefined}
          state={a.state}
        />
      ))}
    </div>
  );
}

function HistoryBody({
  items,
  error,
}: {
  items: ApprovalSummary[] | null;
  error?: string;
}) {
  if (error) return <div style={ERROR_STYLE}>error: {error}</div>;
  if (!items) return <div style={MUTED}>…</div>;
  if (items.length === 0) {
    return <div style={MUTED}>Sem approvals resolvidos no histórico.</div>;
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
      {items.map((a) => {
        const stateColor =
          a.state === "executed"
            ? "var(--success, #16a34a)"
            : a.state === "rejected"
              ? "var(--error, #ef4444)"
              : "var(--text-muted)";
        return (
          <li
            key={a.approval_id}
            style={{
              display: "grid",
              gridTemplateColumns: "max-content minmax(0, 1fr) max-content",
              gap: "12px",
              alignItems: "baseline",
              fontFamily: "var(--font-jetbrains)",
              fontSize: "12px",
            }}
          >
            <span style={{ color: "var(--text-muted)" }}>[{a.short_id}]</span>
            <span
              style={{
                color: "var(--text-primary)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={a.action}
            >
              {a.action}
            </span>
            <span
              style={{
                color: stateColor,
                fontWeight: 600,
                textTransform: "uppercase",
                fontSize: "10px",
                letterSpacing: "1px",
              }}
            >
              {a.state}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

// ----- page ----------------------------------------------------------------

export default function ApprovalsPage() {
  const [all, setAll] = useState<ApprovalSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/bevox/approvals?state=all")
      .then((r) =>
        r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)),
      )
      .then((d: Response) => {
        if (!cancelled) setAll(d.approvals);
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, []);

  const pending = all?.filter((a) => a.state === "pending") ?? null;
  const granted = all?.filter((a) => a.state === "granted") ?? null;
  const history =
    all?.filter(
      (a) =>
        a.state === "executed" ||
        a.state === "rejected" ||
        a.state === "expired",
    ) ?? null;
  const historyCapped = history?.slice(0, HISTORY_LIMIT) ?? null;

  return (
    <ModuleStream
      title="Approvals"
      subtitle="Telegram é a source única de decisão — Mission Control apenas visualiza."
    >
      <ModuleSection title="Pending" count={pending?.length}>
        <ApprovalListBody
          items={pending}
          error={error ?? undefined}
          emptyText="Sem approvals pendentes."
        />
      </ModuleSection>

      <ModuleSection title="Granted (aguardando execução)" count={granted?.length}>
        <ApprovalListBody
          items={granted}
          error={error ?? undefined}
          emptyText="Nenhum approval granted aguardando execução."
        />
      </ModuleSection>

      <ModuleSection
        title="History"
        count={history?.length}
        defaultOpen={false}
      >
        <HistoryBody items={historyCapped} error={error ?? undefined} />
        {history && history.length > HISTORY_LIMIT ? (
          <div style={{ ...MUTED, marginTop: "8px" }}>
            showing most recent {HISTORY_LIMIT} of {history.length}
          </div>
        ) : null}
      </ModuleSection>
    </ModuleStream>
  );
}
