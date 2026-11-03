"use client";

/**
 * Home widget — Approvals pending (left column, large).
 * Reads /api/bevox/approvals?state=pending (Task 9).
 *
 * Read-only — Telegram remains the source of truth per spec §2.2. This
 * widget shows the count + the 3 most recent pending approvals so Bernard
 * can see at a glance whether anything is waiting.
 */

import { useEffect, useState } from "react";
import { WidgetCard } from "./WidgetCard";
import type { ApprovalSummary } from "@/lib/bevox/types";

interface Response {
  approvals: ApprovalSummary[];
  count: number;
  filter: string;
}

function humanAge(ageSeconds: number): string {
  if (ageSeconds < 60) return `<1 min`;
  const mins = Math.floor(ageSeconds / 60);
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  return `${hours} h`;
}

function CountPill({ count }: { count: number }) {
  if (count === 0) {
    return (
      <span
        style={{
          fontSize: "11px",
          fontWeight: 600,
          padding: "2px 8px",
          borderRadius: "999px",
          backgroundColor: "var(--surface-elevated)",
          color: "var(--text-muted)",
        }}
      >
        0
      </span>
    );
  }
  return (
    <span
      style={{
        fontSize: "11px",
        fontWeight: 700,
        padding: "2px 8px",
        borderRadius: "999px",
        backgroundColor: "var(--accent-soft)",
        color: "var(--accent)",
      }}
    >
      {count}
    </span>
  );
}

export function ApprovalsPendingWidget() {
  const [data, setData] = useState<Response | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/bevox/approvals?state=pending")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d: Response) => !cancelled && setData(d))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <WidgetCard title="Approvals pendentes" size="large">
        <div style={{ color: "var(--error)", fontSize: "13px" }}>
          error: {error}
        </div>
      </WidgetCard>
    );
  }

  if (!data) {
    return (
      <WidgetCard title="Approvals pendentes" size="large">
        <div style={{ color: "var(--text-muted)", fontSize: "13px" }}>…</div>
      </WidgetCard>
    );
  }

  const topThree = data.approvals.slice(0, 3);

  return (
    <WidgetCard
      title="Approvals pendentes"
      size="large"
      accessory={<CountPill count={data.count} />}
    >
      {data.count === 0 ? (
        <div style={{ color: "var(--text-muted)", fontSize: "13px" }}>
          Sem approvals pendentes.
        </div>
      ) : (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          {topThree.map((a) => (
            <li
              key={a.approval_id}
              style={{
                border: "1px solid var(--border)",
                borderRadius: "6px",
                padding: "8px 10px",
                backgroundColor: "var(--surface-elevated)",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-jetbrains)",
                  fontSize: "11px",
                  color: "var(--text-muted)",
                }}
              >
                [{a.short_id}]
              </div>
              <div
                style={{
                  fontSize: "13px",
                  color: "var(--text-primary)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={a.action}
              >
                {a.action}
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--text-muted)",
                  marginTop: "2px",
                }}
              >
                há {humanAge(a.age_seconds)}
              </div>
            </li>
          ))}
        </ul>
      )}
      <div
        style={{
          marginTop: "10px",
          fontSize: "11px",
          color: "var(--text-muted)",
        }}
      >
        Aprovação via Telegram — MC é read-only.
      </div>
    </WidgetCard>
  );
}
