"use client";

import { useEffect, useState } from "react";

interface RecurringCost {
  name: string;
  category: string;
  amount_brl: number;
  notes: string | null;
}

interface FinanceState {
  generated_at: string;
  as_of: string | null;
  currency: string;
  status: string;
  usd_brl_used: number | null;
  cash_on_hand_brl: number | null;
  mrr_brl: number | null;
  recurring_costs_monthly_brl: number | null;
  ai_variable_cost_30d_usd: number | null;
  ai_variable_cost_30d_brl: number | null;
  ai_variable_cost_window_days: number;
  burn_monthly_brl: number | null;
  net_monthly_brl: number | null;
  is_profitable: boolean | null;
  runway_months: number | null;
  recurring_costs_breakdown: RecurringCost[];
  inputs: {
    snapshot_source: string;
    snapshot_path: string | null;
    e9_cost_db: string;
  };
  missing_fields: string[];
  warnings: string[];
}

function formatBRL(value: number | null): string {
  if (value === null) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatRunway(
  runway: number | null,
  is_profitable: boolean | null,
): string {
  if (is_profitable) return "∞ (profitable)";
  if (runway === null) return "—";
  return `${runway.toFixed(1)} months`;
}

export default function FinancePage() {
  const [state, setState] = useState<FinanceState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/finance/state")
      .then((r) => {
        if (!r.ok) {
          return r.json().then((body) => {
            throw new Error(`${r.status}: ${body.error || "unknown"}`);
          });
        }
        return r.json();
      })
      .then(setState)
      .catch((e) => setError(String(e)));
  }, []);

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Finance (E11)</h1>
        <div className="p-4 bg-red-900/30 border border-red-700 rounded text-red-200">
          Failed to load finance state: {error}
        </div>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Finance (E11)</h1>
        <div className="text-neutral-400">Loading...</div>
      </div>
    );
  }

  const hasWarnings = state.warnings.length > 0 || state.status !== "ok";

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Finance (E11) — runway estimator</h1>
        <p className="text-sm text-neutral-400 mt-1">
          Snapshot generated at {state.generated_at} · source:{" "}
          <code>{state.inputs.snapshot_source}</code> · as_of: {state.as_of ?? "—"}
        </p>
      </div>

      {/* Hero row: 4 big numbers */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 bg-neutral-900 border border-neutral-800 rounded">
          <div className="text-xs uppercase text-neutral-500">Cash on hand</div>
          <div className="text-2xl font-bold mt-1">
            {formatBRL(state.cash_on_hand_brl)}
          </div>
        </div>
        <div className="p-4 bg-neutral-900 border border-neutral-800 rounded">
          <div className="text-xs uppercase text-neutral-500">MRR</div>
          <div className="text-2xl font-bold mt-1">{formatBRL(state.mrr_brl)}</div>
        </div>
        <div className="p-4 bg-neutral-900 border border-neutral-800 rounded">
          <div className="text-xs uppercase text-neutral-500">
            Monthly outflow (burn)
          </div>
          <div className="text-2xl font-bold mt-1">
            {formatBRL(state.burn_monthly_brl)}
          </div>
          <div className="text-xs text-neutral-500 mt-1">
            net: {formatBRL(state.net_monthly_brl)}
          </div>
        </div>
        <div className="p-4 bg-neutral-900 border border-neutral-800 rounded">
          <div className="text-xs uppercase text-neutral-500">Runway</div>
          <div className="text-2xl font-bold mt-1">
            {formatRunway(state.runway_months, state.is_profitable)}
          </div>
        </div>
      </div>

      {/* AI variable cost */}
      <div className="p-4 bg-neutral-900 border border-neutral-800 rounded">
        <div className="text-xs uppercase text-neutral-500">
          AI variable cost ({state.ai_variable_cost_window_days}d, from E9)
        </div>
        <div className="mt-1">
          <span className="text-lg font-semibold">
            {formatBRL(state.ai_variable_cost_30d_brl)}
          </span>
          <span className="text-sm text-neutral-400 ml-2">
            (USD ${state.ai_variable_cost_30d_usd?.toFixed(4) ?? "—"} × FX{" "}
            {state.usd_brl_used?.toFixed(2) ?? "—"})
          </span>
        </div>
      </div>

      {/* Recurring breakdown */}
      <div>
        <h2 className="text-lg font-semibold mb-2">Recurring costs breakdown</h2>
        {state.recurring_costs_breakdown.length === 0 ? (
          <div className="text-neutral-500 text-sm">No recurring costs catalogued.</div>
        ) : (
          <table className="w-full text-sm border border-neutral-800">
            <thead className="bg-neutral-900">
              <tr>
                <th className="text-left p-2">Name</th>
                <th className="text-left p-2">Category</th>
                <th className="text-right p-2">Monthly (BRL)</th>
                <th className="text-left p-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {state.recurring_costs_breakdown.map((c, i) => (
                <tr key={i} className="border-t border-neutral-800">
                  <td className="p-2">{c.name}</td>
                  <td className="p-2 text-neutral-400">{c.category}</td>
                  <td className="p-2 text-right">{formatBRL(c.amount_brl)}</td>
                  <td className="p-2 text-neutral-500 text-xs">{c.notes ?? ""}</td>
                </tr>
              ))}
              <tr className="border-t border-neutral-700 bg-neutral-900/50 font-semibold">
                <td className="p-2" colSpan={2}>
                  Total
                </td>
                <td className="p-2 text-right">
                  {formatBRL(state.recurring_costs_monthly_brl)}
                </td>
                <td className="p-2"></td>
              </tr>
            </tbody>
          </table>
        )}
      </div>

      {/* Status / warnings */}
      {hasWarnings && (
        <div className="p-4 bg-yellow-900/20 border border-yellow-700/50 rounded">
          <div className="font-semibold text-yellow-200">
            Status: {state.status}
          </div>
          {state.missing_fields.length > 0 && (
            <div className="text-sm text-yellow-300 mt-2">
              Missing fields:{" "}
              <code>{state.missing_fields.join(", ")}</code>
            </div>
          )}
          {state.warnings.length > 0 && (
            <ul className="text-sm text-yellow-300 mt-2 list-disc list-inside">
              {state.warnings.map((w, i) => (
                <li key={i}>
                  <code>{w}</code>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Edit hint */}
      <div className="text-xs text-neutral-500 pt-4 border-t border-neutral-800">
        To update inputs: edit{" "}
        <code>~/.openclaw/finance/finance-snapshot.override.yml</code> on the
        host and wait for the next hourly tick.
      </div>
    </div>
  );
}
