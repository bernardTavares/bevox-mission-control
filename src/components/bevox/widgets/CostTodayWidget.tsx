"use client";

/**
 * Home widget — Cost today (right column, compact).
 * Reads upstream /api/costs?timeframe=1d (discovery Task 0.5: plural /costs
 * is the real route, {today, yesterday, daily, byAgent, byModel} response).
 *
 * The cost DB lives under process.cwd()/data/usage-tracking.db for the
 * upstream app — if it does not exist yet, the upstream API returns all
 * zeros and we render '$0.00' with a '—' delta. Graceful and useful.
 */

import { useEffect, useState } from "react";
import { WidgetCard } from "./WidgetCard";

interface UpstreamCostsResponse {
  today?: number;
  yesterday?: number;
  // Other fields ignored for the Home widget.
}

interface ComputedCost {
  today: number;
  delta: number;
}

export function CostTodayWidget() {
  const [data, setData] = useState<ComputedCost | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/costs?timeframe=1d")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d: UpstreamCostsResponse) => {
        if (cancelled) return;
        const today = d.today ?? 0;
        const yesterday = d.yesterday ?? 0;
        setData({ today, delta: today - yesterday });
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <WidgetCard title="Cost today">
        <div style={{ color: "var(--error)", fontSize: "12px" }}>
          error: {error}
        </div>
      </WidgetCard>
    );
  }
  if (!data) {
    return (
      <WidgetCard title="Cost today">
        <div style={{ color: "var(--text-muted)", fontSize: "12px" }}>…</div>
      </WidgetCard>
    );
  }

  const sign = data.delta >= 0 ? "+" : "";
  const deltaColor =
    data.delta > 0
      ? "var(--warning, #eab308)"
      : data.delta < 0
        ? "var(--success, #16a34a)"
        : "var(--text-muted)";

  return (
    <WidgetCard title="Cost today">
      <div
        style={{
          fontFamily: "var(--font-heading)",
          fontSize: "22px",
          fontWeight: 700,
          color: "var(--text-primary)",
        }}
      >
        ${data.today.toFixed(2)}
      </div>
      <div
        style={{
          fontSize: "11px",
          color: deltaColor,
          marginTop: "2px",
        }}
      >
        Δ {sign}
        {data.delta.toFixed(2)} vs ontem
      </div>
    </WidgetCard>
  );
}
