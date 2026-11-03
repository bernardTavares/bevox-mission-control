"use client";

/**
 * Cost module page.
 *
 * Per spec 35_specs/2026-04-10-e2-mission-control.md §5.2.5 (with Task 0.5
 * delta): three read-only sections — TOTAL DO DIA, POR MODELO, HISTÓRICO.
 * Single data source: the upstream /api/costs?timeframe=7d endpoint (exists
 * since the carlosazaustre/tenacitOS fork; reads
 * `data/usage-tracking.db` via src/lib/usage-queries.ts). We are NOT
 * building our own cost derivation yet — E9 Cost & Usage Center will
 * expand this page with budgets, alerts, projections, cost-per-agent
 * breakdowns, etc. For v1 utilitário the existing upstream layer is
 * enough.
 *
 * Route: /costs (plural) — matches upstream route group and the nav-config
 * decision from Task 8.
 *
 * Zero mutations: no budget editor, no alert threshold controls, no
 * "refresh" buttons, no POST. The upstream API has a POST handler for
 * budget updates — we do NOT call it.
 *
 * Replaces the upstream /(dashboard)/costs/page.tsx which was a 388-line
 * dashboard with recharts line/bar/pie charts + budget editor. That will
 * come back in E9 if needed; for now we keep the shell utilitário line.
 */

import { useEffect, useState } from "react";
import { ModuleStream } from "@/components/bevox/ModuleStream";
import { ModuleSection } from "@/components/bevox/ModuleSection";

interface ModelCostRow {
  model: string;
  cost: number;
  tokens?: number;
  inputTokens?: number;
  outputTokens?: number;
  percentOfTotal?: number;
}

interface DailyCostRow {
  date: string; // MM-DD from upstream
  cost: number;
  input?: number;
  output?: number;
}

interface CostResponse {
  today?: number;
  yesterday?: number;
  thisMonth?: number;
  lastMonth?: number;
  projected?: number;
  budget?: number;
  byModel?: ModelCostRow[];
  daily?: DailyCostRow[];
  message?: string;
}

// E9 wave 2 — cost alerts state shape (read-only from /api/cost-alerts/state)
interface CostAlertsState {
  generated_at: string;
  status: string;
  config_source: string;
  enabled: boolean | null;
  daily_threshold_usd: number | null;
  today_date: string;
  today_cost_usd: number | null;
  today_cost_pct_of_threshold: number | null;
  alert_active: boolean;
  warnings: string[];
}

// ----- shared styles --------------------------------------------------------

const MUTED: React.CSSProperties = {
  color: "var(--text-muted)",
  fontSize: "13px",
};

const ERROR_STYLE: React.CSSProperties = {
  color: "var(--error, #ef4444)",
  fontSize: "13px",
};

const MONO: React.CSSProperties = {
  fontFamily: "var(--font-jetbrains)",
  fontSize: "12px",
};

function formatUsd(n: number | undefined | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `$${n.toFixed(2)}`;
}

function formatSignedUsd(n: number): string {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}`;
}

function formatPct(n: number | undefined): string {
  if (n == null || !Number.isFinite(n)) return "";
  return `${n.toFixed(1)}%`;
}

function formatInt(n: number | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US").format(Math.round(n));
}

// ----- section bodies ------------------------------------------------------

function TotalTodayBody({
  data,
  error,
}: {
  data: CostResponse | null;
  error?: string;
}) {
  if (error) return <div style={ERROR_STYLE}>error: {error}</div>;
  if (!data) return <div style={MUTED}>…</div>;

  const today = data.today ?? 0;
  const yesterday = data.yesterday ?? 0;
  const delta = today - yesterday;

  const deltaColor =
    delta > 0
      ? "var(--warning, #eab308)"
      : delta < 0
        ? "var(--success, #16a34a)"
        : "var(--text-muted)";

  return (
    <div>
      <div
        style={{
          fontFamily: "var(--font-heading)",
          fontSize: "32px",
          fontWeight: 700,
          color: "var(--text-primary)",
          lineHeight: 1,
          marginBottom: "8px",
        }}
      >
        {formatUsd(today)}
      </div>
      <div
        style={{
          fontSize: "12px",
          color: "var(--text-muted)",
        }}
      >
        ontem: {formatUsd(yesterday)}
        <span
          style={{
            marginLeft: "12px",
            color: deltaColor,
            fontWeight: 600,
          }}
        >
          Δ {formatSignedUsd(delta)}
        </span>
      </div>
      {data.message ? (
        <div
          style={{
            marginTop: "10px",
            fontSize: "11px",
            color: "var(--text-muted)",
            fontStyle: "italic",
          }}
        >
          {data.message}
        </div>
      ) : null}
    </div>
  );
}

function ByModelBody({
  data,
  error,
}: {
  data: CostResponse | null;
  error?: string;
}) {
  if (error) return <div style={ERROR_STYLE}>error: {error}</div>;
  if (!data) return <div style={MUTED}>…</div>;

  const rows = data.byModel ?? [];
  if (rows.length === 0) {
    return <div style={MUTED}>Sem dados de custo por modelo.</div>;
  }

  // Sort descending by cost, keep top 10 (rest collapsed into a footer).
  const sorted = [...rows].sort((a, b) => (b.cost ?? 0) - (a.cost ?? 0));
  const shown = sorted.slice(0, 10);
  const overflow = sorted.length - shown.length;

  return (
    <div>
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
        {shown.map((row) => (
          <li
            key={row.model}
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) max-content max-content max-content",
              gap: "12px",
              alignItems: "baseline",
              ...MONO,
            }}
          >
            <span
              style={{
                color: "var(--text-primary)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={row.model}
            >
              {row.model}
            </span>
            <span style={{ color: "var(--text-muted)" }}>
              {formatInt(row.tokens)} tok
            </span>
            <span style={{ color: "var(--text-muted)" }}>
              {formatPct(row.percentOfTotal)}
            </span>
            <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>
              {formatUsd(row.cost)}
            </span>
          </li>
        ))}
      </ul>
      {overflow > 0 ? (
        <div
          style={{
            marginTop: "8px",
            fontSize: "11px",
            color: "var(--text-muted)",
          }}
        >
          showing top 10 of {sorted.length}
        </div>
      ) : null}
      <div
        style={{
          marginTop: "10px",
          fontSize: "11px",
          color: "var(--text-muted)",
          fontStyle: "italic",
        }}
      >
        Janela: últimos 7 dias.
      </div>
    </div>
  );
}

function HistoryBody({
  data,
  error,
}: {
  data: CostResponse | null;
  error?: string;
}) {
  if (error) return <div style={ERROR_STYLE}>error: {error}</div>;
  if (!data) return <div style={MUTED}>…</div>;

  const daily = data.daily ?? [];
  if (daily.length === 0) {
    return <div style={MUTED}>Sem dados históricos.</div>;
  }

  // Sort ascending by date so the bars read left-to-right chronologically.
  const sorted = [...daily].sort((a, b) => a.date.localeCompare(b.date));
  const maxCost = Math.max(...sorted.map((d) => d.cost ?? 0), 0.01);
  const total = sorted.reduce((acc, d) => acc + (d.cost ?? 0), 0);

  return (
    <div>
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
        {sorted.map((row) => {
          const widthPct = Math.max(
            1,
            Math.round(((row.cost ?? 0) / maxCost) * 100),
          );
          return (
            <li
              key={row.date}
              style={{
                display: "grid",
                gridTemplateColumns: "max-content minmax(0, 1fr) max-content",
                gap: "12px",
                alignItems: "center",
                ...MONO,
              }}
            >
              <span style={{ color: "var(--text-muted)" }}>{row.date}</span>
              <span
                aria-hidden
                style={{
                  height: "10px",
                  backgroundColor: "var(--accent-soft)",
                  borderRadius: "2px",
                  position: "relative",
                  overflow: "hidden",
                  display: "block",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    bottom: 0,
                    width: `${widthPct}%`,
                    backgroundColor: "var(--accent)",
                    borderRadius: "2px",
                  }}
                />
              </span>
              <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>
                {formatUsd(row.cost)}
              </span>
            </li>
          );
        })}
      </ul>
      <div
        style={{
          marginTop: "10px",
          display: "flex",
          justifyContent: "space-between",
          fontSize: "11px",
          color: "var(--text-muted)",
        }}
      >
        <span>Janela: últimos 7 dias ({sorted.length} pontos)</span>
        <span>
          Total: <strong>{formatUsd(total)}</strong>
        </span>
      </div>
    </div>
  );
}

// ----- page ----------------------------------------------------------------

export default function CostsPage() {
  const [data, setData] = useState<CostResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<CostAlertsState | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/costs?timeframe=7d")
      .then((r) =>
        r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)),
      )
      .then((d: CostResponse) => !cancelled && setData(d))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, []);

  // E9 wave 2 — parallel fetch of cost alerts state. Silent on error
  // (alerts are optional — failure must not break the existing page).
  useEffect(() => {
    let cancelled = false;
    fetch("/api/cost-alerts/state")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: CostAlertsState | null) => !cancelled && setAlerts(d))
      .catch(() => !cancelled && setAlerts(null));
    return () => {
      cancelled = true;
    };
  }, []);

  const modelCount = data?.byModel?.length;

  return (
    <ModuleStream
      title="Cost"
      subtitle="uso agregado do OpenClaw — read-only (budgets e alertas vêm em E9)"
    >
      {alerts?.alert_active && (
        <ModuleSection title="⚠ Daily budget exceeded">
          <div style={{ fontSize: "13px", lineHeight: "1.6" }}>
            <div>
              Spent <strong>${alerts.today_cost_usd?.toFixed(4)}</strong> of
              {" "}
              ${alerts.daily_threshold_usd?.toFixed(2)} threshold (
              {alerts.today_cost_pct_of_threshold?.toFixed(1)}%)
            </div>
            <div style={MUTED}>
              UTC date: {alerts.today_date} · last evaluated:{" "}
              {alerts.generated_at}
            </div>
            <div style={MUTED}>
              Edit threshold:{" "}
              <code style={MONO}>
                ~/.openclaw/cost/cost-alerts.override.yml
              </code>
            </div>
          </div>
        </ModuleSection>
      )}

      <ModuleSection title="Total do dia">
        <TotalTodayBody data={data} error={error ?? undefined} />
      </ModuleSection>

      <ModuleSection title="Por modelo" count={modelCount}>
        <ByModelBody data={data} error={error ?? undefined} />
      </ModuleSection>

      <ModuleSection title="Histórico">
        <HistoryBody data={data} error={error ?? undefined} />
      </ModuleSection>
    </ModuleStream>
  );
}
