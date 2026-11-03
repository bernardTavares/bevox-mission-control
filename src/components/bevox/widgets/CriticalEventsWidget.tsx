"use client";

/**
 * Home widget — Critical events feed (right column, compact).
 * Reads /api/bevox/events?severity=warn&limit=5 (Task 9).
 *
 * Shows up to the 3 most-recent events with severity >= warn so Bernard
 * sees at a glance whether anything needs attention. No severity=error
 * fetch separately — rendering both in one pass would require two API
 * calls and that is scope creep for v1.
 */

import { useEffect, useState } from "react";
import { WidgetCard } from "./WidgetCard";

interface EventRow {
  ts: string;
  event: string;
  severity: string | null;
  payload: unknown;
}

interface Response {
  events: EventRow[];
  count: number;
  limit: number;
}

function humanTime(iso: string): string {
  // "2026-04-10T23:51:40Z" → "23:51"
  return iso.length >= 16 ? iso.slice(11, 16) : iso;
}

export function CriticalEventsWidget() {
  const [data, setData] = useState<Response | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/bevox/events?severity=warn&limit=5")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d: Response) => !cancelled && setData(d))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <WidgetCard title="Critical events">
        <div style={{ color: "var(--error)", fontSize: "12px" }}>
          error: {error}
        </div>
      </WidgetCard>
    );
  }
  if (!data) {
    return (
      <WidgetCard title="Critical events">
        <div style={{ color: "var(--text-muted)", fontSize: "12px" }}>…</div>
      </WidgetCard>
    );
  }

  const topThree = data.events.slice(0, 3);

  if (topThree.length === 0) {
    return (
      <WidgetCard title="Critical events">
        <div style={{ color: "var(--text-muted)", fontSize: "12px" }}>
          nothing critical
        </div>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard title="Critical events">
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
        {topThree.map((e, i) => (
          <li
            key={`${e.ts}-${i}`}
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "8px",
              fontSize: "11px",
              fontFamily: "var(--font-jetbrains)",
            }}
          >
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
            <span
              style={{
                color: "var(--text-muted)",
                flexShrink: 0,
              }}
            >
              {humanTime(e.ts)}
            </span>
          </li>
        ))}
      </ul>
    </WidgetCard>
  );
}
