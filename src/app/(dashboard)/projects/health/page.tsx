"use client";

import { useCallback, useEffect, useState } from "react";
import type { DoctorReport } from "@/lib/projects/doctor-types";
import DriftMatrix from "./DriftMatrix";
import OrphansPanel from "./OrphansPanel";
import DraftsPanel from "./DraftsPanel";

/**
 * /projects/health — drift dashboard (W6).
 *
 * Spec: bevox-knowledge/35_specs/openclaw/2026-05-08-project-lifecycle-w6-v1.md
 *
 * Readonly view that consumes `openclaw project doctor --json` via
 * /api/projects/doctor and renders a capability x project matrix plus
 * orphans and pending knowledge drafts.
 */

type Settings = {
  skipKnowledge: boolean;
  skipRemote: boolean;
  skipOrphans: boolean;
};

type State =
  | { kind: "loading" }
  | { kind: "error"; message: string; raw?: unknown }
  | { kind: "ready"; report: DoctorReport };

const DEFAULT_SETTINGS: Settings = {
  skipKnowledge: false,
  skipRemote: false,
  skipOrphans: false,
};

function buildQuery(s: Settings): string {
  const params = new URLSearchParams();
  if (s.skipKnowledge) params.set("skipKnowledge", "1");
  if (s.skipRemote) params.set("skipRemote", "1");
  if (s.skipOrphans) params.set("skipOrphans", "1");
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export default function ProjectsHealthPage() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (s: Settings, signal?: AbortSignal) => {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/projects/doctor${buildQuery(s)}`, {
        cache: "no-store",
        signal,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setState({
          kind: "error",
          message: `${res.status} ${err.error ?? "unknown"}: ${err.detail ?? ""}`,
          raw: err,
        });
        return;
      }
      const body = (await res.json()) as DoctorReport;
      setState({ kind: "ready", report: body });
    } catch (err) {
      if ((err as { name?: string }).name === "AbortError") return;
      setState({ kind: "error", message: String(err) });
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(settings, controller.signal);
    return () => controller.abort();
    // settings change is handled via Refresh button; keep mount-only effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-2">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Project health (drift)
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Live readout of <code>openclaw project doctor</code>: declared vs
            detected capability state for every registered project, plus
            filesystem orphans and pending knowledge drafts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSettings((v) => !v)}
            className="rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            aria-expanded={showSettings}
          >
            Settings
          </button>
          <button
            type="button"
            onClick={() => load(settings)}
            disabled={refreshing}
            className="rounded bg-[#1e3a5f] px-3 py-1.5 text-xs font-semibold text-[#6ec1e4] hover:opacity-90 disabled:opacity-50"
          >
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </header>

      {showSettings ? (
        <section className="rounded border border-gray-200 bg-gray-50 p-3 text-xs">
          <p className="mb-2 font-medium text-gray-700">
            Debug / fast-path toggles (re-fetch after change):
          </p>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={settings.skipKnowledge}
                onChange={(e) =>
                  setSettings({ ...settings, skipKnowledge: e.target.checked })
                }
              />
              <span>
                <code>--skip-knowledge</code> (no fetch origin/main)
              </span>
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={settings.skipRemote}
                onChange={(e) =>
                  setSettings({ ...settings, skipRemote: e.target.checked })
                }
              />
              <span>
                <code>--skip-remote</code>
              </span>
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={settings.skipOrphans}
                onChange={(e) =>
                  setSettings({ ...settings, skipOrphans: e.target.checked })
                }
              />
              <span>
                <code>--skip-orphans</code>
              </span>
            </label>
          </div>
        </section>
      ) : null}

      {state.kind === "loading" ? (
        <div className="rounded border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
          Scanning projects… (doctor is I/O heavy; up to 30s)
        </div>
      ) : null}

      {state.kind === "error" ? (
        <div className="rounded border border-red-200 bg-red-50 p-4">
          <h2 className="text-sm font-semibold text-red-800">
            Failed to load drift report
          </h2>
          <pre className="mt-2 whitespace-pre-wrap text-xs text-red-900">
            {state.message}
          </pre>
          <button
            type="button"
            onClick={() => load(settings)}
            className="mt-3 rounded bg-red-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-800"
          >
            Retry
          </button>
        </div>
      ) : null}

      {state.kind === "ready" ? (
        <Ready
          report={state.report}
          generatedAt={state.report.generated_at}
        />
      ) : null}

      <Legend />
    </div>
  );
}

function Ready({
  report,
  generatedAt,
}: {
  report: DoctorReport;
  generatedAt: string;
}) {
  const s = report.summary;
  const driftClean = s.projects_with_drift === 0;
  const orphanClean = s.total_orphans === 0;
  const draftClean = s.drafts_pending === 0;

  return (
    <>
      <section
        className={`rounded border p-4 ${
          driftClean && orphanClean && draftClean
            ? "border-green-200 bg-green-50"
            : "border-gray-200 bg-white"
        }`}
      >
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 text-sm">
          <Stat
            label="Projects scanned"
            value={s.projects_scanned}
            tone="neutral"
          />
          <Stat
            label="With drift"
            value={s.projects_with_drift}
            tone={s.projects_with_drift === 0 ? "good" : "bad"}
          />
          <Stat
            label="Total drifts"
            value={s.total_drifts}
            tone={s.total_drifts === 0 ? "good" : "bad"}
          />
          <Stat
            label="Orphans"
            value={s.total_orphans}
            tone={s.total_orphans === 0 ? "good" : "warn"}
          />
          <Stat
            label="Pending drafts"
            value={s.drafts_pending}
            tone={s.drafts_pending === 0 ? "good" : "warn"}
          />
          <span className="ml-auto text-xs text-gray-500">
            generated {new Date(generatedAt).toLocaleString("pt-BR")}
          </span>
        </div>
      </section>

      <DriftMatrix report={report} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <OrphansPanel orphans={report.orphans} />
        <DraftsPanel drafts={report.drafts_pending} />
      </div>
    </>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "good" | "warn" | "bad" | "neutral";
}) {
  const color =
    tone === "good"
      ? "text-green-700"
      : tone === "bad"
        ? "text-red-700"
        : tone === "warn"
          ? "text-yellow-700"
          : "text-gray-900";
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-gray-500">
        {label}
      </div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
    </div>
  );
}

function Legend() {
  const items: Array<{ bg: string; icon: string; label: string }> = [
    { bg: "bg-green-500", icon: "✓", label: "provisioned" },
    { bg: "bg-yellow-500", icon: "~", label: "partial" },
    { bg: "bg-gray-300", icon: "·", label: "absent" },
    { bg: "bg-red-500", icon: "!", label: "drifted" },
    { bg: "bg-gray-200", icon: "—", label: "skipped" },
  ];
  return (
    <section className="rounded border border-gray-200 bg-white p-3 text-xs text-gray-600">
      <div className="mb-1 font-medium text-gray-700">Legend</div>
      <div className="flex flex-wrap items-center gap-4">
        {items.map((i) => (
          <div key={i.label} className="flex items-center gap-1.5">
            <span
              className={`inline-flex h-5 w-5 items-center justify-center rounded ${i.bg} text-[10px] font-bold text-white`}
              aria-hidden
            >
              {i.icon}
            </span>
            <span>{i.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
