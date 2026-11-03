"use client";

/**
 * Health module page.
 *
 * Per spec 35_specs/2026-04-10-e2-mission-control.md §5.2.4: a vertical
 * stream of three read-only sections — OVERALL, TIMERS SYSTEMD, SNAPSHOTS
 * FRESHNESS. Single data source: /api/bevox/health (Task 9), which already
 * aggregates state.json health + systemd timer status + snapshot freshness.
 *
 * Deliberately narrow: no Watcher deep-dive (that is a separate module's
 * concern), no CPU/RAM/Disk/Net metrics (those would come from
 * /api/system/monitor — an upstream endpoint outside this task's data
 * boundary), no restart / run-now / retry controls anywhere (spec §2.2 +
 * explicit Task 14 governance from Bernard).
 */

import { useEffect, useState } from "react";
import { ModuleStream } from "@/components/bevox/ModuleStream";
import { ModuleSection } from "@/components/bevox/ModuleSection";
import type { HealthOverall } from "@/lib/bevox/health";

interface Response {
  health: HealthOverall;
}

// E8 wave 1 — Services section types (read-only)
interface E8ServiceEntry {
  name: string;
  epic: string;
  critical: boolean;
  check_type: "systemd_active" | "http_url" | "file_freshness";
  status: "up" | "down" | "degraded" | "unknown";
  detail: string;
  checked_at: string;
  duration_ms: number;
}

interface E8HealthState {
  schema_version: number;
  generated_at: string;
  registry_version: number | null;
  run_id: string;
  duration_ms: number;
  overall: {
    level: "ok" | "degraded" | "down" | "unknown";
    detail: string | null;
    critical_total: number | null;
    critical_up: number | null;
    critical_not_up: number | null;
    services_total: number | null;
    services_up: number | null;
    services_degraded: number | null;
    services_down: number | null;
    services_unknown: number | null;
  };
  services: Record<string, E8ServiceEntry>;
}

// E8 wave 1 — Services section helpers

const E8_STATUS_ORDER: Record<string, number> = {
  down: 0,
  unknown: 1,
  degraded: 2,
  up: 3,
};

function e8SortServices(services: Record<string, E8ServiceEntry>): Array<[string, E8ServiceEntry]> {
  return Object.entries(services).sort(([idA, a], [idB, b]) => {
    if (a.critical !== b.critical) return a.critical ? -1 : 1;
    const orderA = E8_STATUS_ORDER[a.status] ?? 9;
    const orderB = E8_STATUS_ORDER[b.status] ?? 9;
    if (orderA !== orderB) return orderA - orderB;
    return idA.localeCompare(idB);
  });
}

function e8ComputeStaleness(generatedAt: string): { label: string; severity: "fresh" | "stale" | "very_stale" } {
  const ageMs = Date.now() - new Date(generatedAt).getTime();
  const ageSec = Math.floor(ageMs / 1000);
  if (ageSec < 300) {
    return { label: `${ageSec}s ago`, severity: "fresh" };
  }
  if (ageSec < 1800) {
    const min = Math.floor(ageSec / 60);
    return { label: `${min}m ago (stale)`, severity: "stale" };
  }
  const min = Math.floor(ageSec / 60);
  return { label: `${min}m ago (very stale)`, severity: "very_stale" };
}

function e8RelativeTime(isoStr: string): string {
  try {
    const ageSec = Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000);
    if (ageSec < 60) return `${ageSec}s`;
    if (ageSec < 3600) return `${Math.floor(ageSec / 60)}m`;
    return `${Math.floor(ageSec / 3600)}h`;
  } catch {
    return "?";
  }
}

function HealthServicesSection() {
  const [state, setState] = useState<E8HealthState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/health/state")
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error((body as { detail?: string }).detail || `HTTP ${r.status}`);
        }
        return r.json();
      })
      .then((data: E8HealthState) => {
        if (!cancelled) {
          setState(data);
          setLoading(false);
        }
      })
      .catch((e: Error) => {
        if (!cancelled) {
          setError(String(e.message || e));
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div style={{ marginBottom: "24px", padding: "16px", border: "1px solid var(--border)", borderRadius: "8px" }}>
        <div style={{ fontSize: "16px", fontWeight: 600, marginBottom: "8px" }}>Services (E8)</div>
        <div style={{ color: "var(--text-muted)", fontSize: "13px" }}>Loading health state...</div>
      </div>
    );
  }
  if (error) {
    return (
      <div style={{ marginBottom: "24px", padding: "16px", border: "1px solid var(--border)", borderRadius: "8px" }}>
        <div style={{ fontSize: "16px", fontWeight: 600, marginBottom: "8px" }}>Services (E8)</div>
        <div style={{ color: "var(--error, #ef4444)", fontSize: "13px" }}>
          <strong>Error:</strong> {error}
        </div>
      </div>
    );
  }
  if (!state) return null;

  const staleness = e8ComputeStaleness(state.generated_at);
  const sorted = e8SortServices(state.services);

  const levelColors: Record<string, { bg: string; fg: string; border: string }> = {
    ok: { bg: "#dcfce7", fg: "#166534", border: "#86efac" },
    degraded: { bg: "#fef9c3", fg: "#854d0e", border: "#fde047" },
    down: { bg: "#fee2e2", fg: "#991b1b", border: "#fca5a5" },
    unknown: { bg: "#f3f4f6", fg: "#374151", border: "#d1d5db" },
  };
  const lvlColor = levelColors[state.overall.level] || levelColors.unknown;

  const stalenessColor: Record<string, string> = {
    fresh: "var(--text-muted)",
    stale: "#ca8a04",
    very_stale: "#dc2626",
  };

  const statusBadgeColors: Record<string, { bg: string; fg: string }> = {
    up: { bg: "#dcfce7", fg: "#166534" },
    down: { bg: "#fee2e2", fg: "#991b1b" },
    degraded: { bg: "#fef9c3", fg: "#854d0e" },
    unknown: { bg: "#f3f4f6", fg: "#374151" },
  };

  return (
    <div style={{ marginBottom: "24px", padding: "16px", border: "1px solid var(--border)", borderRadius: "8px" }}>
      <div style={{ fontSize: "16px", fontWeight: 600, marginBottom: "12px" }}>Services (E8)</div>

      {/* Overall header */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "16px", flexWrap: "wrap" }}>
        <span
          style={{
            padding: "4px 12px",
            borderRadius: "6px",
            border: `1px solid ${lvlColor.border}`,
            backgroundColor: lvlColor.bg,
            color: lvlColor.fg,
            fontWeight: 600,
            fontSize: "12px",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          {state.overall.level}
        </span>
        <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>
          <div>
            <strong style={{ color: "var(--text-primary)" }}>{state.overall.services_total ?? "?"}</strong> services ·{" "}
            <strong style={{ color: "var(--text-primary)" }}>{state.overall.critical_total ?? "?"}</strong> critical ·{" "}
            {state.overall.services_up ?? 0} up ·{" "}
            {state.overall.services_degraded ?? 0} degraded ·{" "}
            {state.overall.services_down ?? 0} down ·{" "}
            {state.overall.services_unknown ?? 0} unknown
          </div>
          <div style={{ fontSize: "11px", marginTop: "4px", color: stalenessColor[staleness.severity] }}>
            {staleness.label}
            <span style={{ marginLeft: "8px", color: "var(--text-muted)" }}>· run {state.run_id}</span>
          </div>
        </div>
      </div>

      {/* Services table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", fontSize: "12px", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left", color: "var(--text-muted)" }}>
              <th style={{ padding: "8px 12px 8px 0", fontWeight: 500 }}>Name</th>
              <th style={{ padding: "8px 12px 8px 0", fontWeight: 500 }}>Epic</th>
              <th style={{ padding: "8px 12px 8px 0", fontWeight: 500 }}>Status</th>
              <th style={{ padding: "8px 12px 8px 0", fontWeight: 500 }}>Detail</th>
              <th style={{ padding: "8px 0", fontWeight: 500 }}>Checked</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(([id, svc]) => {
              const sbc = statusBadgeColors[svc.status] || statusBadgeColors.unknown;
              return (
                <tr key={id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "8px 12px 8px 0" }}>
                    {svc.critical && <span title="critical" style={{ color: "#dc2626", marginRight: "4px" }}>●</span>}
                    {svc.name}
                  </td>
                  <td style={{ padding: "8px 12px 8px 0", fontSize: "11px", color: "var(--text-muted)" }}>{svc.epic}</td>
                  <td style={{ padding: "8px 12px 8px 0" }}>
                    <span
                      style={{
                        fontSize: "10px",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        backgroundColor: sbc.bg,
                        color: sbc.fg,
                      }}
                    >
                      {svc.status}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "8px 12px 8px 0",
                      fontSize: "11px",
                      color: "var(--text-muted)",
                      maxWidth: "400px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={svc.detail}
                  >
                    {svc.detail}
                  </td>
                  <td style={{ padding: "8px 0", fontSize: "11px", color: "var(--text-muted)" }}>
                    {e8RelativeTime(svc.checked_at)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// E8/F5 wave 1 — Hardening Posture section types (read-only)
interface E8F5HardeningItem {
  id: string;
  name: string;
  category: string;
  severity: "info" | "warn" | "critical";
  status: "ok" | "degraded" | "critical" | "unknown" | "not_applicable";
  detail: string;
  check_type: string;
  checked_at: string;
  duration_ms: number;
}

interface E8F5HardeningState {
  schema_version: number;
  generated_at: string;
  registry_version: number;
  run_id: string;
  duration_ms: number;
  overall: {
    level: "ok" | "degraded" | "critical" | "unknown";
    detail: string | null;
    items_total: number;
    items_ok: number;
    items_degraded: number;
    items_critical: number;
    items_unknown: number;
    items_not_applicable: number;
  };
  items: E8F5HardeningItem[];
}

// Sort: critical first → degraded → unknown → ok → not_applicable
const E8F5_STATUS_ORDER: Record<string, number> = {
  critical: 0, degraded: 1, unknown: 2, ok: 3, not_applicable: 4,
};

function HardeningPostureSection() {
  const [state, setState] = useState<E8F5HardeningState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSkipped, setShowSkipped] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/hardening/state")
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error((body as { detail?: string }).detail || `HTTP ${r.status}`);
        }
        return r.json();
      })
      .then((data: E8F5HardeningState) => {
        if (!cancelled) { setState(data); setLoading(false); }
      })
      .catch((e: Error) => {
        if (!cancelled) { setError(String(e.message || e)); setLoading(false); }
      });
    return () => { cancelled = true; };
  }, []);

  const wrapStyle: React.CSSProperties = {
    marginBottom: "24px", padding: "16px",
    border: "1px solid var(--border)", borderRadius: "8px",
  };

  if (loading) {
    return (
      <div style={wrapStyle}>
        <div style={{ fontSize: "16px", fontWeight: 600, marginBottom: "8px" }}>Hardening Posture (E8/F5)</div>
        <div style={{ color: "var(--text-muted)", fontSize: "13px" }}>Loading hardening state...</div>
      </div>
    );
  }
  if (error) {
    return (
      <div style={wrapStyle}>
        <div style={{ fontSize: "16px", fontWeight: 600, marginBottom: "8px" }}>Hardening Posture (E8/F5)</div>
        <div style={{ color: "var(--error, #ef4444)", fontSize: "13px" }}>
          <strong>Error:</strong> {error}
        </div>
      </div>
    );
  }
  if (!state) return null;

  const items = [...state.items].sort((a, b) => {
    const oa = E8F5_STATUS_ORDER[a.status] ?? 9;
    const ob = E8F5_STATUS_ORDER[b.status] ?? 9;
    return oa !== ob ? oa - ob : a.id.localeCompare(b.id);
  });
  const active = items.filter(i => i.status !== "not_applicable");
  const skipped = items.filter(i => i.status === "not_applicable");

  const levelColors: Record<string, { bg: string; fg: string; border: string }> = {
    ok: { bg: "#dcfce7", fg: "#166534", border: "#86efac" },
    degraded: { bg: "#fef9c3", fg: "#854d0e", border: "#fde047" },
    critical: { bg: "#fee2e2", fg: "#991b1b", border: "#fca5a5" },
    unknown: { bg: "#f3f4f6", fg: "#374151", border: "#d1d5db" },
  };
  const lvlColor = levelColors[state.overall.level] || levelColors.unknown;

  const statusBadgeColors: Record<string, { bg: string; fg: string }> = {
    ok: { bg: "#dcfce7", fg: "#166534" },
    degraded: { bg: "#fef9c3", fg: "#854d0e" },
    critical: { bg: "#fee2e2", fg: "#991b1b" },
    unknown: { bg: "#f3f4f6", fg: "#374151" },
    not_applicable: { bg: "#e0e7ff", fg: "#3730a3" },
  };

  // Staleness: spec §5.8 — >1h flagged
  const generatedMs = Date.parse(state.generated_at);
  const ageMs = Date.now() - generatedMs;
  const stale = ageMs > 3600 * 1000;

  const renderRow = (it: E8F5HardeningItem) => {
    const sbc = statusBadgeColors[it.status] || statusBadgeColors.unknown;
    return (
      <tr key={it.id} style={{ borderBottom: "1px solid var(--border)" }}>
        <td style={{ padding: "8px 12px 8px 0" }}>
          {it.severity === "critical" && (
            <span title="critical severity" style={{ color: "#dc2626", marginRight: "4px" }}>●</span>
          )}
          {it.name}
        </td>
        <td style={{ padding: "8px 12px 8px 0", fontSize: "11px", color: "var(--text-muted)" }}>{it.category}</td>
        <td style={{ padding: "8px 12px 8px 0", fontSize: "11px", color: "var(--text-muted)" }}>{it.severity}</td>
        <td style={{ padding: "8px 12px 8px 0" }}>
          <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px",
                         backgroundColor: sbc.bg, color: sbc.fg }}>
            {it.status}
          </span>
        </td>
        <td style={{ padding: "8px 0", fontSize: "11px", color: "var(--text-muted)",
                     maxWidth: "400px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
            title={it.detail}>
          {it.detail}
        </td>
      </tr>
    );
  };

  return (
    <div style={wrapStyle}>
      <div style={{ fontSize: "16px", fontWeight: 600, marginBottom: "12px" }}>Hardening Posture (E8/F5)</div>

      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "16px", flexWrap: "wrap" }}>
        <span style={{ padding: "4px 12px", borderRadius: "6px",
                       border: `1px solid ${lvlColor.border}`,
                       backgroundColor: lvlColor.bg, color: lvlColor.fg,
                       fontWeight: 600, fontSize: "12px",
                       textTransform: "uppercase", letterSpacing: "0.5px" }}>
          {state.overall.level}
        </span>
        <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>
          <div>
            <strong style={{ color: "var(--text-primary)" }}>{state.overall.items_total}</strong> items ·{" "}
            {state.overall.items_ok} ok ·{" "}
            {state.overall.items_degraded} degraded ·{" "}
            {state.overall.items_critical} critical ·{" "}
            {state.overall.items_unknown} unknown ·{" "}
            {state.overall.items_not_applicable} n/a
          </div>
          <div style={{ fontSize: "11px", marginTop: "4px",
                         color: stale ? "#dc2626" : "var(--text-muted)" }}>
            {stale ? "STALE — runner has not run for >1h" : "fresh"}
            <span style={{ marginLeft: "8px", color: "var(--text-muted)" }}>· run {state.run_id}</span>
          </div>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", fontSize: "12px", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left", color: "var(--text-muted)" }}>
              <th style={{ padding: "8px 12px 8px 0", fontWeight: 500 }}>Name</th>
              <th style={{ padding: "8px 12px 8px 0", fontWeight: 500 }}>Category</th>
              <th style={{ padding: "8px 12px 8px 0", fontWeight: 500 }}>Severity</th>
              <th style={{ padding: "8px 12px 8px 0", fontWeight: 500 }}>Status</th>
              <th style={{ padding: "8px 0", fontWeight: 500 }}>Detail</th>
            </tr>
          </thead>
          <tbody>
            {active.map(renderRow)}
          </tbody>
        </table>
      </div>

      {skipped.length > 0 && (
        <div style={{ marginTop: "12px" }}>
          <button
            onClick={() => setShowSkipped(!showSkipped)}
            style={{ background: "none", border: "none", padding: 0,
                     color: "var(--text-muted)", fontSize: "12px",
                     cursor: "pointer", textDecoration: "underline" }}
          >
            {showSkipped ? "▼" : "▶"} Skipped (not applicable): {skipped.length}
          </button>
          {showSkipped && (
            <div style={{ marginTop: "8px", overflowX: "auto" }}>
              <table style={{ width: "100%", fontSize: "12px", borderCollapse: "collapse" }}>
                <tbody>{skipped.map(renderRow)}</tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ----- shared style tokens --------------------------------------------------

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

const LEVEL_COLORS: Record<string, string> = {
  ok: "var(--success, #16a34a)",
  degraded: "var(--warning, #eab308)",
  critical: "var(--error, #ef4444)",
};

const STATUS_COLORS: Record<string, string> = {
  active: "var(--success, #16a34a)",
  inactive: "var(--warning, #eab308)",
  failed: "var(--error, #ef4444)",
  unknown: "var(--text-muted)",
};

// ----- section bodies ------------------------------------------------------

function OverallBody({
  health,
  error,
}: {
  health: HealthOverall | null;
  error?: string;
}) {
  if (error) return <div style={ERROR_STYLE}>error: {error}</div>;
  if (!health) return <div style={MUTED}>…</div>;

  const dotColor = LEVEL_COLORS[health.level] ?? "var(--text-muted)";
  const ksColor =
    LEVEL_COLORS[health.components.knowledge_sync] ?? "var(--text-muted)";

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "14px",
          marginBottom: "12px",
        }}
      >
        <span
          aria-hidden
          style={{
            fontSize: "32px",
            lineHeight: 1,
            color: dotColor,
          }}
        >
          ●
        </span>
        <div>
          <div
            style={{
              fontSize: "18px",
              fontWeight: 700,
              color: "var(--text-primary)",
              fontFamily: "var(--font-heading)",
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}
          >
            {health.level}
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            {health.warnings} warning{health.warnings === 1 ? "" : "s"} ·{" "}
            {health.errors} error{health.errors === 1 ? "" : "s"}
          </div>
        </div>
      </div>

      <dl
        style={{
          display: "grid",
          gridTemplateColumns: "max-content 1fr",
          rowGap: "4px",
          columnGap: "16px",
          margin: 0,
          fontSize: "13px",
        }}
      >
        <dt style={{ color: "var(--text-muted)" }}>knowledge-sync</dt>
        <dd
          style={{
            margin: 0,
            color: ksColor,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          {health.components.knowledge_sync}
        </dd>
      </dl>
    </div>
  );
}

function TimersBody({
  health,
  error,
}: {
  health: HealthOverall | null;
  error?: string;
}) {
  if (error) return <div style={ERROR_STYLE}>error: {error}</div>;
  if (!health) return <div style={MUTED}>…</div>;

  const timers = health.components.timers;
  if (timers.length === 0) {
    return <div style={MUTED}>Nenhum timer visível.</div>;
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
      {timers.map((t) => {
        const color = STATUS_COLORS[t.status] ?? "var(--text-muted)";
        return (
          <li
            key={t.unit}
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) max-content",
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
              title={t.unit}
            >
              {t.unit}
            </span>
            <span
              style={{
                color,
                fontWeight: 600,
                textTransform: "uppercase",
                fontSize: "10px",
                letterSpacing: "1px",
              }}
            >
              {t.status}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function humanDateTime(iso: string | null): string {
  if (!iso) return "—";
  return iso.length >= 16 ? iso.replace("T", " ").slice(0, 16) + " UTC" : iso;
}

function ageHuman(iso: string | null): string | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function SnapshotsBody({
  health,
  error,
}: {
  health: HealthOverall | null;
  error?: string;
}) {
  if (error) return <div style={ERROR_STYLE}>error: {error}</div>;
  if (!health) return <div style={MUTED}>…</div>;

  const snap = health.components.snapshots;

  const rows: Array<{ label: string; value: string | null; extra?: string }> = [
    {
      label: "last auto-hourly",
      value: snap.last_auto,
      extra: ageHuman(snap.last_auto) ?? undefined,
    },
    {
      label: "last manual",
      value: snap.last_manual,
      extra: ageHuman(snap.last_manual) ?? undefined,
    },
    {
      label: "last pre-canonical",
      value: snap.last_pre_canonical,
      extra: ageHuman(snap.last_pre_canonical) ?? undefined,
    },
  ];

  const staleColor = snap.stale
    ? "var(--warning, #eab308)"
    : "var(--success, #16a34a)";

  return (
    <div>
      <dl
        style={{
          display: "grid",
          gridTemplateColumns: "max-content 1fr",
          rowGap: "6px",
          columnGap: "16px",
          margin: 0,
          fontSize: "13px",
        }}
      >
        {rows.map((row) => (
          <>
            <dt key={`${row.label}-dt`} style={{ color: "var(--text-muted)" }}>
              {row.label}
            </dt>
            <dd
              key={`${row.label}-dd`}
              style={{ margin: 0, ...MONO }}
            >
              {humanDateTime(row.value)}
              {row.extra ? (
                <span style={{ color: "var(--text-muted)", marginLeft: "8px" }}>
                  ({row.extra})
                </span>
              ) : null}
            </dd>
          </>
        ))}

        <dt style={{ color: "var(--text-muted)" }}>auto-hourly freshness</dt>
        <dd
          style={{
            margin: 0,
            color: staleColor,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            fontSize: "12px",
          }}
        >
          {snap.stale ? "STALE" : "FRESH"}
        </dd>
      </dl>
      <div
        style={{
          marginTop: "10px",
          fontSize: "11px",
          color: "var(--text-muted)",
          fontStyle: "italic",
        }}
      >
        Threshold: auto-hourly snapshots older than 2h are flagged stale (spec §5.2.4).
      </div>
    </div>
  );
}

// ----- page ----------------------------------------------------------------

export default function HealthPage() {
  const [health, setHealth] = useState<HealthOverall | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/bevox/health")
      .then((r) =>
        r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)),
      )
      .then((d: Response) => !cancelled && setHealth(d.health))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ModuleStream
      title="Health"
      subtitle="estado operacional agregado — read-only (controles via systemctl/CLI)"
    >
      <HardeningPostureSection />

      <HealthServicesSection />

      <ModuleSection title="Overall">
        <OverallBody health={health} error={error ?? undefined} />
      </ModuleSection>

      <ModuleSection
        title="Timers systemd"
        count={health?.components.timers.length}
      >
        <TimersBody health={health} error={error ?? undefined} />
      </ModuleSection>

      <ModuleSection title="Snapshots freshness">
        <SnapshotsBody health={health} error={error ?? undefined} />
      </ModuleSection>
    </ModuleStream>
  );
}
