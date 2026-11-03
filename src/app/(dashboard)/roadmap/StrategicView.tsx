"use client";

import type { CategorizedWaves, TrackerBlocker } from "@/lib/roadmap/types";
import WaveCard from "./WaveCard";

interface Props {
  categorized: CategorizedWaves;
  allBlockers: TrackerBlocker[];
}

const COLUMNS: Array<{
  key: keyof CategorizedWaves;
  title: string;
  hint: string;
}> = [
  { key: "agora", title: "Agora", hint: "in_progress + partial" },
  { key: "proximo", title: "Próximo", hint: "not_started com trabalho em andamento" },
  { key: "depois", title: "Depois", hint: "not_started sem delivery ainda" },
];

export default function StrategicView({ categorized, allBlockers }: Props) {
  const allEmpty =
    categorized.agora.length === 0 &&
    categorized.proximo.length === 0 &&
    categorized.depois.length === 0;

  if (allEmpty) {
    return (
      <div className="border border-dashed border-gray-300 rounded-md p-6 text-center">
        <p className="text-sm text-gray-500">
          Nenhuma wave em andamento ou planejada no tracker.
        </p>
        <a href="/kanban" className="text-sm text-blue-600 hover:underline">
          Ir para Kanban →
        </a>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {COLUMNS.map((col) => (
        <section key={col.key} className="flex flex-col gap-2">
          <header className="border-b border-gray-200 pb-1">
            <h3 className="text-sm font-semibold text-gray-900">{col.title}</h3>
            <p className="text-[11px] text-gray-500">{col.hint}</p>
            <p className="text-[11px] text-gray-400">{categorized[col.key].length} wave(s)</p>
          </header>
          <div className="flex flex-col gap-2">
            {categorized[col.key].length === 0 ? (
              <p className="text-xs text-gray-400 italic px-2">vazio</p>
            ) : (
              categorized[col.key].map(({ epic, wave }) => (
                <WaveCard
                  key={`${epic.id}/${wave.id}`}
                  epic={epic}
                  wave={wave}
                  allBlockers={allBlockers}
                  variant="strategic"
                />
              ))
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
