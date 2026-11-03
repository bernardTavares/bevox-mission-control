"use client";

import type { DoctorReport } from "@/lib/projects/doctor-types";

interface Props {
  orphans: DoctorReport["orphans"];
}

const CATEGORY_LABEL: Record<string, string> = {
  code_dirs: "Code dirs",
  bot_profiles: "Bot profiles",
  workspaces: "Workspaces",
  bevox_knowledge_slots: "Knowledge slots",
};

const CATEGORY_HINT: Record<string, string> = {
  code_dirs:
    "~/code/* without a project entry. Adopt via `openclaw project adopt`.",
  bot_profiles:
    "~/.openclaw-* profiles without a matching slug. Investigate or remove via CLI.",
  workspaces:
    "~/.openclaw/workspace-* without a matching agent or project. Inspect manually.",
  bevox_knowledge_slots:
    "Folders inside bevox-knowledge that don't map to any registered project.",
};

export default function OrphansPanel({ orphans }: Props) {
  const categories = Object.keys(orphans).filter(
    (k) => Array.isArray(orphans[k]) && orphans[k].length > 0,
  );
  const total = categories.reduce((acc, k) => acc + orphans[k].length, 0);

  if (total === 0) {
    return (
      <section className="rounded border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">Orphans</h2>
        <p className="mt-1 text-xs text-green-700">
          No orphans detected. Filesystem matches the registry.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded border border-gray-200 bg-white p-4">
      <header className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Orphans</h2>
        <span className="text-xs text-gray-500">
          {total} item{total > 1 ? "s" : ""} across {categories.length}{" "}
          categor{categories.length > 1 ? "ies" : "y"}
        </span>
      </header>
      <div className="space-y-3">
        {categories.map((cat) => (
          <details key={cat} className="rounded border border-gray-100">
            <summary className="cursor-pointer bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700">
              {CATEGORY_LABEL[cat] ?? cat}{" "}
              <span className="text-gray-400">({orphans[cat].length})</span>
            </summary>
            <div className="px-3 py-2">
              {CATEGORY_HINT[cat] ? (
                <p className="mb-1 text-[11px] italic text-gray-500">
                  {CATEGORY_HINT[cat]}
                </p>
              ) : null}
              <ul className="space-y-0.5">
                {orphans[cat].map((path) => (
                  <li
                    key={path}
                    className="font-mono text-[11px] text-gray-700"
                  >
                    {path}
                  </li>
                ))}
              </ul>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
