"use client";

/**
 * Home widget — Knowledge sync status (left column, large).
 * Reads /api/bevox/knowledge-state (Task 9).
 */

import { useEffect, useState } from "react";
import { WidgetCard } from "./WidgetCard";
import type { KsState } from "@/lib/bevox/types";

interface Response {
  state: KsState | null;
  previous: KsState | null;
}

function HealthPill({ level }: { level: string }) {
  const color =
    level === "ok"
      ? "var(--success, #16a34a)"
      : level === "degraded"
        ? "var(--warning, #eab308)"
        : "var(--error, #ef4444)";
  return (
    <span
      style={{
        fontSize: "11px",
        fontWeight: 700,
        padding: "2px 8px",
        borderRadius: "999px",
        backgroundColor: "var(--accent-soft)",
        color,
        textTransform: "uppercase",
        letterSpacing: "1px",
      }}
    >
      {level}
    </span>
  );
}

export function KnowledgeStatusWidget() {
  const [data, setData] = useState<Response | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/bevox/knowledge-state")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d: Response) => !cancelled && setData(d))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <WidgetCard title="Knowledge sync status" size="large">
        <div style={{ color: "var(--error)", fontSize: "13px" }}>
          error: {error}
        </div>
      </WidgetCard>
    );
  }

  if (!data?.state) {
    return (
      <WidgetCard title="Knowledge sync status" size="large">
        <div style={{ color: "var(--text-muted)", fontSize: "13px" }}>…</div>
      </WidgetCard>
    );
  }

  const s = data.state;
  const workingTree = s.working_tree.clean ? "clean" : "dirty";
  const lastFetch = s.last.fetch_status ?? "unknown";

  return (
    <WidgetCard
      title="Knowledge sync status"
      size="large"
      accessory={<HealthPill level={s.health.overall} />}
    >
      <dl
        style={{
          display: "grid",
          gridTemplateColumns: "max-content 1fr",
          rowGap: "6px",
          columnGap: "16px",
          fontSize: "13px",
          margin: 0,
        }}
      >
        <dt style={{ color: "var(--text-muted)" }}>branch</dt>
        <dd style={{ margin: 0, fontFamily: "var(--font-jetbrains)" }}>
          {s.branch.current}
          {s.branch.tracking ? ` → ${s.branch.tracking}` : ""}
        </dd>

        <dt style={{ color: "var(--text-muted)" }}>ahead / behind</dt>
        <dd style={{ margin: 0, fontFamily: "var(--font-jetbrains)" }}>
          {s.branch.ahead} / {s.branch.behind}
        </dd>

        <dt style={{ color: "var(--text-muted)" }}>working tree</dt>
        <dd style={{ margin: 0 }}>{workingTree}</dd>

        <dt style={{ color: "var(--text-muted)" }}>last fetch</dt>
        <dd style={{ margin: 0 }}>
          {lastFetch}
          {s.last.fetch_at ? ` (${s.last.fetch_at.slice(11, 19)} UTC)` : ""}
        </dd>

        <dt style={{ color: "var(--text-muted)" }}>drift</dt>
        <dd style={{ margin: 0 }}>
          {s.conflicts.potential ? (
            <span style={{ color: "var(--error)" }}>
              conflict potential: {s.conflicts.reason ?? "unknown"}
            </span>
          ) : (
            "none"
          )}
        </dd>
      </dl>
    </WidgetCard>
  );
}
