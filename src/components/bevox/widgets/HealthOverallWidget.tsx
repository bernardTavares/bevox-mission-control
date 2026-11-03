"use client";

/**
 * Home widget — Health overall (right column, compact).
 * Reads /api/bevox/health (Task 9).
 */

import { useEffect, useState } from "react";
import { WidgetCard } from "./WidgetCard";
import type { HealthOverall } from "@/lib/bevox/health";

interface Response {
  health: HealthOverall;
}

export function HealthOverallWidget() {
  const [data, setData] = useState<Response | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/bevox/health")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d: Response) => !cancelled && setData(d))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <WidgetCard title="Health">
        <div style={{ color: "var(--error)", fontSize: "12px" }}>
          error: {error}
        </div>
      </WidgetCard>
    );
  }
  if (!data) {
    return (
      <WidgetCard title="Health">
        <div style={{ color: "var(--text-muted)", fontSize: "12px" }}>…</div>
      </WidgetCard>
    );
  }

  const h = data.health;
  const dot =
    h.level === "ok" ? "●" : h.level === "degraded" ? "●" : "●";
  const dotColor =
    h.level === "ok"
      ? "var(--success, #16a34a)"
      : h.level === "degraded"
        ? "var(--warning, #eab308)"
        : "var(--error, #ef4444)";

  return (
    <WidgetCard title="Health">
      <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
        <span style={{ fontSize: "22px", lineHeight: 1, color: dotColor }}>
          {dot}
        </span>
        <div>
          <div
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--text-primary)",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            {h.level}
          </div>
          <div
            style={{
              fontSize: "11px",
              color: "var(--text-muted)",
            }}
          >
            {h.warnings} warn · {h.errors} err
          </div>
        </div>
      </div>
    </WidgetCard>
  );
}
