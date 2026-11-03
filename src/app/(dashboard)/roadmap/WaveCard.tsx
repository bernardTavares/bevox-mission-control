"use client";

import type { TrackerBlocker, TrackerEpic, TrackerWave } from "@/lib/roadmap/types";
import DepsChips from "./DepsChips";

interface Props {
  epic: TrackerEpic;
  wave: TrackerWave;
  allBlockers: TrackerBlocker[];
  /** Strategic variant: compact card for 3-column view. */
  variant?: "strategic" | "technical";
}

const STATUS_COLORS: Record<string, string> = {
  delivered: "bg-green-100 text-green-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  not_started: "bg-gray-100 text-gray-700",
  parked: "bg-slate-100 text-slate-600",
  blocked: "bg-red-100 text-red-800",
  partial: "bg-amber-100 text-amber-800",
};

export default function WaveCard({ epic, wave, allBlockers, variant = "strategic" }: Props) {
  const statusColor = STATUS_COLORS[wave.status] ?? "bg-gray-100 text-gray-700";

  return (
    <div className="border border-gray-200 rounded-md p-2 bg-white">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-mono text-gray-500">{epic.id}/{wave.id}</span>
        <span className={`text-[10px] rounded px-1.5 py-0.5 font-medium ${statusColor}`}>
          {wave.status}
        </span>
        {wave.delivered_at && (
          <span className="text-[10px] text-gray-400">{wave.delivered_at}</span>
        )}
      </div>
      <div className="text-sm font-medium text-gray-900 mt-0.5">{epic.name}</div>
      {variant === "technical" && wave.features && wave.features.length > 0 && (
        <ul className="mt-1 text-xs text-gray-600 list-disc list-inside space-y-0.5">
          {wave.features.slice(0, 3).map((f, i) => (
            <li key={i} className="line-clamp-1">{f}</li>
          ))}
          {wave.features.length > 3 && (
            <li className="italic text-gray-400">+{wave.features.length - 3} more</li>
          )}
        </ul>
      )}
      {variant === "technical" && wave.spec && (
        <a
          href={`https://github.com/bernardTavares/bevox-knowledge/blob/main/${wave.spec}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-block text-[11px] text-blue-600 hover:underline"
        >
          spec ↗
        </a>
      )}
      {(wave.blocker || wave.reason) && (
        <div className="mt-1 text-[11px] italic text-red-700">
          {wave.blocker || wave.reason}
        </div>
      )}
      <DepsChips
        epicId={epic.id}
        waveId={wave.id}
        allBlockers={allBlockers}
        compact={variant === "strategic"}
      />
    </div>
  );
}
