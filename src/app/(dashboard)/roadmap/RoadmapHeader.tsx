"use client";

import type { TrackerSummary } from "@/lib/roadmap/types";

interface Props {
  summary: TrackerSummary;
  generatedAt: string;
}

export default function RoadmapHeader({ summary, generatedAt }: Props) {
  return (
    <header className="mb-4">
      <div className="flex items-baseline gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-900">Roadmap</h1>
        <span className="text-xs text-gray-400">
          gerado em {new Date(generatedAt).toLocaleString("pt-BR")}
        </span>
      </div>
      <p className="text-sm text-gray-600 mt-1">
        Visão estratégica (Agora / Próximo / Depois) + técnica (epics, waves, deps).
      </p>
      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        <div className="border border-gray-200 rounded p-2">
          <div className="text-gray-500">Epics</div>
          <div className="text-gray-900 font-medium">
            {summary.epics_delivered} delivered · {summary.epics_partial} partial ·{" "}
            {summary.epics_not_started} not started
          </div>
        </div>
        <div className="border border-gray-200 rounded p-2">
          <div className="text-gray-500">Waves</div>
          <div className="text-gray-900 font-medium">
            {summary.waves_delivered}/{summary.total_waves} delivered ·{" "}
            {summary.waves_in_progress} in progress
          </div>
        </div>
        <div className="border border-gray-200 rounded p-2">
          <div className="text-gray-500">Blockers</div>
          <div className="text-gray-900 font-medium">
            {summary.blockers_active} active · {summary.blockers_resolved} resolved
          </div>
        </div>
        <div className="border border-gray-200 rounded p-2">
          <div className="text-gray-500">Risks</div>
          <div className="text-gray-900 font-medium">
            {summary.risks_open} open · {summary.risks_mitigated} mitigated
          </div>
        </div>
      </div>
    </header>
  );
}
